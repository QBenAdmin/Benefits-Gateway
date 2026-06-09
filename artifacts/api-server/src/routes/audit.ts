import { Router } from "express";
import { parse } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";
import { db } from "@workspace/db";
import {
  auditSessionsTable,
  auditErtResponsesTable,
  auditStatisticalResultsTable,
  auditCsvUploadsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateAuditSessionBody,
  UpdateAuditSessionBody,
  SubmitAuditErtBody,
  UploadAuditCsvBody,
} from "@workspace/api-zod";

const router = Router();

// ─── REGULATORY FEED CACHE ────────────────────────────────────────────────────
let feedCache: { data: unknown; expiresAt: number } | null = null;

function xmlText(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // fast-xml-parser wraps CDATA in { "#text": "...", "@_type": "..." }
    if ("#text" in obj) return String(obj["#text"]);
    // Some parsers use __text
    if ("__text" in obj) return String(obj["__text"]);
  }
  return String(val);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchFeed(url: string): Promise<Array<{ title: string; link: string; pubDate: string; excerpt: string | null }>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "#text",
    parseTagValue: false,
    // Treat title/description/link as raw text — EEOC embeds HTML <a> tags in <title>
    stopNodes: ["*.title", "*.description", "*.link"],
  });
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) return [];
  const items: unknown[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  return items.slice(0, 10).map((item) => {
    const i = item as Record<string, unknown>;
    const rawTitle = xmlText(i.title);
    const rawDescription = xmlText(i.description);
    // Strip HTML from title (EEOC wraps titles in <a> tags)
    const cleanTitle = stripHtml(rawTitle);
    // For link, prefer guid if link parses oddly
    const rawLink = xmlText(i.link) || xmlText((i as Record<string, unknown>).guid);
    return {
      title: cleanTitle || rawTitle,
      link: stripHtml(rawLink),
      pubDate: xmlText(i.pubDate),
      excerpt: rawDescription ? stripHtml(rawDescription).slice(0, 220).trim() : null,
    };
  });
}

// ─── STATISTICAL COMPUTATION ─────────────────────────────────────────────────
type Row = Record<string, string>;
type ColumnMap = {
  employeeId?: string;
  gender?: string;
  race?: string;
  age?: string;
  department?: string;
  jobTitle?: string;
  hireDate?: string;
  terminationDate?: string;
  promotionDate?: string;
  baseSalary?: string;
  finalDecision?: string;
};

interface StatResult {
  metricType: string;
  groupA: string;
  groupB: string;
  groupARate: number | null;
  groupBRate: number | null;
  value: number | null;
  threshold: number | null;
  passed: boolean | null;
  riskLevel: string | null;
  pValue: number | null;
  significant: boolean | null;
  testType: string | null;
}

// ─── SIGNIFICANCE TESTING MATH ───────────────────────────────────────────────

/** Abramowitz & Stegun polynomial approximation for erfc(x), max error ~1.5e-7 */
function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-x * x);
}

/** Two-tailed p-value for Pearson chi-square statistic with df = 1 */
function chiSquarePValue1df(chi2: number): number {
  if (chi2 <= 0) return 1;
  return erfc(Math.sqrt(chi2 / 2));
}

/** Lanczos log-gamma approximation (Numerical Recipes) */
function lgamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
  let y = z;
  const tmp = z + 5.5 - (z + 0.5) * Math.log(z + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / z);
}

/** Regularized incomplete beta function I_x(a, b) via Lentz continued fraction */
function incompleteBetaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 3e-7;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  return x < (a + 1) / (a + b + 2)
    ? bt * incompleteBetaCF(x, a, b) / a
    : 1 - bt * incompleteBetaCF(1 - x, b, a) / b;
}

/**
 * Two-tailed p-value for Welch's t-statistic with given degrees of freedom.
 * Uses the regularized incomplete beta function: p = I_{df/(df+t²)}(df/2, 0.5)
 */
function tTestPValue(t: number, df: number): number {
  if (df <= 0 || !isFinite(t)) return 1;
  const x = df / (df + t * t);
  return incompleteBeta(x, df / 2, 0.5);
}

/**
 * Chi-square test on a 2×2 contingency table.
 *   a = groupA positives, b = groupA negatives
 *   c = groupB positives, d = groupB negatives
 * Returns chi-square statistic and two-tailed p-value (df=1, no Yates' correction).
 */
function chiSquare2x2(a: number, b: number, c: number, d: number): { chi2: number; pValue: number } {
  const n = a + b + c + d;
  if (n < 5) return { chi2: 0, pValue: 1 };
  const ea = (a + b) * (a + c) / n;
  const eb = (a + b) * (b + d) / n;
  const ec = (c + d) * (a + c) / n;
  const ed = (c + d) * (b + d) / n;
  if (ea < 1 || eb < 1 || ec < 1 || ed < 1) return { chi2: 0, pValue: 1 }; // insufficient expected counts
  const chi2 = (a - ea) ** 2 / ea + (b - eb) ** 2 / eb + (c - ec) ** 2 / ec + (d - ed) ** 2 / ed;
  return { chi2, pValue: chiSquarePValue1df(chi2) };
}

/**
 * Welch's t-test for two independent samples with possibly unequal variances.
 * Returns t-statistic, Welch-Satterthwaite degrees of freedom, and two-tailed p-value.
 */
function welchTTest(
  meanA: number, varA: number, nA: number,
  meanB: number, varB: number, nB: number
): { t: number; df: number; pValue: number } {
  if (nA < 2 || nB < 2) return { t: 0, df: 0, pValue: 1 };
  const se2 = varA / nA + varB / nB;
  if (se2 <= 0) return { t: 0, df: 0, pValue: 1 };
  const t = (meanA - meanB) / Math.sqrt(se2);
  // Welch-Satterthwaite degrees of freedom
  const df = se2 ** 2 / ((varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1));
  return { t, df, pValue: tTestPValue(t, df) };
}

// ─── ANALYSIS HELPERS ────────────────────────────────────────────────────────

function isSelected(decision: string): boolean {
  const d = decision.toLowerCase().trim();
  return d === "hired" || d === "selected" || d === "yes" || d === "1" || d === "true";
}

function isPromoted(promotionDate: string): boolean {
  return promotionDate.trim() !== "" && promotionDate.toLowerCase() !== "null" && promotionDate.toLowerCase() !== "n/a";
}

function isTerminated(terminationDate: string): boolean {
  return terminationDate.trim() !== "" && terminationDate.toLowerCase() !== "null" && terminationDate.toLowerCase() !== "n/a";
}

/** Returns { selected, total } for the group — used for both rate computation and chi-square. */
function getGroupCounts(rows: Row[], groupCol: string, groupValue: string, testFn: (row: Row) => boolean): { selected: number; total: number } {
  const group = rows.filter((r) => r[groupCol]?.toLowerCase().trim() === groupValue.toLowerCase().trim());
  const selected = group.filter(testFn).length;
  return { selected, total: group.length };
}

/** Returns { mean, variance (Bessel-corrected), n } for salary analysis. */
function getSalaryStats(rows: Row[], groupCol: string, groupValue: string, salaryCol: string): { mean: number; variance: number; n: number } | null {
  const group = rows.filter((r) => r[groupCol]?.toLowerCase().trim() === groupValue.toLowerCase().trim());
  const salaries = group.map((r) => parseFloat(r[salaryCol] ?? "")).filter((n) => !isNaN(n));
  if (salaries.length < 2) return null;
  const mean = salaries.reduce((a, b) => a + b, 0) / salaries.length;
  const variance = salaries.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (salaries.length - 1);
  return { mean, variance, n: salaries.length };
}

function getRiskLevel(ratio: number): string {
  if (ratio >= 0.9) return "Low";
  if (ratio >= 0.8) return "Moderate";
  return "High";
}

/**
 * Adds an adverse impact result for a 2×2 chi-square test (4/5ths rule + significance).
 * groupA is the scrutinised group; groupB is the comparator (typically majority group).
 */
function addAdverseImpact(
  results: StatResult[],
  rows: Row[],
  groupCol: string,
  groupA: string,
  groupALabel: string,
  groupB: string,
  groupBLabel: string,
  metricType: string,
  testFn: (row: Row) => boolean,
  threshold = 0.8
): void {
  const countA = getGroupCounts(rows, groupCol, groupA, testFn);
  const countB = getGroupCounts(rows, groupCol, groupB, testFn);
  if (countA.total === 0 || countB.total === 0) return;
  const rateA = countA.selected / countA.total;
  const rateB = countB.selected / countB.total;
  if (rateA <= 0 || rateB <= 0) return;
  const ratio = rateA / rateB;

  // Chi-square 2×2: [selected_A, not_selected_A, selected_B, not_selected_B]
  const { pValue } = chiSquare2x2(
    countA.selected, countA.total - countA.selected,
    countB.selected, countB.total - countB.selected
  );

  results.push({
    metricType,
    groupA: groupALabel,
    groupB: groupBLabel,
    groupARate: rateA,
    groupBRate: rateB,
    value: ratio,
    threshold,
    passed: ratio >= threshold,
    riskLevel: getRiskLevel(ratio),
    pValue,
    significant: pValue < 0.05,
    testType: "chi-square-2x2",
  });
}

function normalizeAgeGroup(ageOrDob: string): string | null {
  const n = parseInt(ageOrDob, 10);
  if (!isNaN(n) && n > 1900) {
    const age = new Date().getFullYear() - n;
    return age < 40 ? "Under 40" : "40 and over";
  }
  if (!isNaN(n)) return n < 40 ? "Under 40" : "40 and over";
  try {
    const d = new Date(ageOrDob);
    if (!isNaN(d.getTime())) {
      const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
      return age < 40 ? "Under 40" : "40 and over";
    }
  } catch { /* ignore */ }
  return null;
}

function runStatisticalAnalysis(rows: Row[], columnMap: ColumnMap): StatResult[] {
  const results: StatResult[] = [];

  // Build a "mapped" array where column values are accessible via standardised keys
  const mapped = rows.map((r) => {
    const m: Row = {};
    for (const [key, col] of Object.entries(columnMap)) {
      if (col && r[col] !== undefined) m[`_${key}`] = r[col];
    }
    for (const [k, v] of Object.entries(r)) m[k] = v;
    return m;
  });

  const genderCol = columnMap.gender ? "_gender" : null;
  const raceCol = columnMap.race ? "_race" : null;
  const ageCol = columnMap.age ? "_age" : null;
  const mappedSalaryCol = columnMap.baseSalary ? "_baseSalary" : null;

  const hasDecision = !!columnMap.finalDecision;
  const hasPromotion = !!columnMap.promotionDate;
  const hasTermination = !!columnMap.terminationDate;

  // ── Hiring — 4/5ths + chi-square: Gender ─────────────────────────────────
  if (genderCol && hasDecision) {
    const selFn = (r: Row) => isSelected(r["_finalDecision"] ?? "");
    const hasMale = mapped.some((r) => r[genderCol]?.toLowerCase().trim() === "male");
    const maleKey = hasMale ? "male" : "m";
    const femaleKey = hasMale ? "female" : "f";
    addAdverseImpact(results, mapped, genderCol, femaleKey, "Female", maleKey, "Male",
      "adverse_impact_hiring_gender", selFn);
  }

  // ── Hiring — 4/5ths + chi-square: Race ───────────────────────────────────
  if (raceCol && hasDecision) {
    const selFn = (r: Row) => isSelected(r["_finalDecision"] ?? "");
    const races = [...new Set(mapped.map((r) => r[raceCol]?.toLowerCase().trim()).filter(Boolean))];
    const whiteKey = ["white", "caucasian"].find((k) => races.includes(k)) ?? "white";
    for (const race of races) {
      if (!race || race === whiteKey) continue;
      const label = race.charAt(0).toUpperCase() + race.slice(1);
      addAdverseImpact(results, mapped, raceCol, race, label, whiteKey, "White",
        "adverse_impact_hiring_race", selFn);
    }
  }

  // ── Hiring — 4/5ths + chi-square: Age (ADEA 40+) ─────────────────────────
  if (ageCol && hasDecision) {
    const selFn = (r: Row) => isSelected(r["_finalDecision"] ?? "");
    const ageMapped = mapped
      .map((r) => ({ ...r, _ageGroup: normalizeAgeGroup(r[ageCol] ?? "") }))
      .filter((r) => r._ageGroup !== null) as (Row & { _ageGroup: string })[];
    if (ageMapped.length > 0) {
      const countOver = getGroupCounts(ageMapped, "_ageGroup", "40 and over", selFn);
      const countUnder = getGroupCounts(ageMapped, "_ageGroup", "Under 40", selFn);
      if (countOver.total > 0 && countUnder.total > 0) {
        const overRate = countOver.selected / countOver.total;
        const underRate = countUnder.selected / countUnder.total;
        if (overRate > 0 && underRate > 0) {
          const ratio = overRate / underRate;
          const { pValue } = chiSquare2x2(
            countOver.selected, countOver.total - countOver.selected,
            countUnder.selected, countUnder.total - countUnder.selected
          );
          results.push({
            metricType: "adverse_impact_hiring_age",
            groupA: "Age 40+", groupB: "Under 40",
            groupARate: overRate, groupBRate: underRate,
            value: ratio, threshold: 0.8, passed: ratio >= 0.8,
            riskLevel: getRiskLevel(ratio),
            pValue, significant: pValue < 0.05, testType: "chi-square-2x2",
          });
        }
      }
    }
  }

  // ── Promotion — 4/5ths + chi-square: Gender ───────────────────────────────
  if (genderCol && hasPromotion) {
    const promFn = (r: Row) => isPromoted(r["_promotionDate"] ?? "");
    const hasMale = mapped.some((r) => r[genderCol]?.toLowerCase().trim() === "male");
    const maleKey = hasMale ? "male" : "m";
    const femaleKey = hasMale ? "female" : "f";
    addAdverseImpact(results, mapped, genderCol, femaleKey, "Female", maleKey, "Male",
      "adverse_impact_promotion_gender", promFn);
  }

  // ── Promotion — 4/5ths + chi-square: Race ─────────────────────────────────
  if (raceCol && hasPromotion) {
    const promFn = (r: Row) => isPromoted(r["_promotionDate"] ?? "");
    const races = [...new Set(mapped.map((r) => r[raceCol]?.toLowerCase().trim()).filter(Boolean))];
    const whiteKey = ["white", "caucasian"].find((k) => races.includes(k)) ?? "white";
    for (const race of races) {
      if (!race || race === whiteKey) continue;
      const label = race.charAt(0).toUpperCase() + race.slice(1);
      addAdverseImpact(results, mapped, raceCol, race, label, whiteKey, "White",
        "adverse_impact_promotion_race", promFn);
    }
  }

  // ── Termination disparity — chi-square: Gender ────────────────────────────
  if (genderCol && hasTermination) {
    const termFn = (r: Row) => isTerminated(r["_terminationDate"] ?? "");
    const hasMale = mapped.some((r) => r[genderCol]?.toLowerCase().trim() === "male");
    const maleKey = hasMale ? "male" : "m";
    const femaleKey = hasMale ? "female" : "f";
    const countF = getGroupCounts(mapped, genderCol, femaleKey, termFn);
    const countM = getGroupCounts(mapped, genderCol, maleKey, termFn);
    if (countF.total > 0 && countM.total > 0) {
      const femaleRate = countF.selected / countF.total;
      const maleRate = countM.selected / countM.total;
      if (femaleRate > 0 && maleRate > 0) {
        const ratio = femaleRate / maleRate;
        const { pValue } = chiSquare2x2(
          countF.selected, countF.total - countF.selected,
          countM.selected, countM.total - countM.selected
        );
        results.push({
          metricType: "adverse_impact_termination_gender",
          groupA: "Female", groupB: "Male",
          groupARate: femaleRate, groupBRate: maleRate,
          value: ratio, threshold: 1.25, passed: ratio <= 1.25,
          riskLevel: ratio > 1.5 ? "High" : ratio > 1.25 ? "Moderate" : "Low",
          pValue, significant: pValue < 0.05, testType: "chi-square-2x2",
        });
      }
    }
  }

  // ── Compensation gap — Welch t-test: Gender ───────────────────────────────
  if (genderCol && mappedSalaryCol) {
    const hasMale = mapped.some((r) => r[genderCol]?.toLowerCase().trim() === "male");
    const maleKey = hasMale ? "male" : "m";
    const femaleKey = hasMale ? "female" : "f";
    const statsF = getSalaryStats(mapped, genderCol, femaleKey, mappedSalaryCol);
    const statsM = getSalaryStats(mapped, genderCol, maleKey, mappedSalaryCol);
    if (statsF && statsM) {
      const gap = (statsM.mean - statsF.mean) / statsM.mean;
      const { pValue } = welchTTest(statsF.mean, statsF.variance, statsF.n, statsM.mean, statsM.variance, statsM.n);
      results.push({
        metricType: "compensation_gap_gender",
        groupA: "Female", groupB: "Male",
        groupARate: statsF.mean, groupBRate: statsM.mean,
        value: gap, threshold: 0.05,
        passed: gap <= 0.05,
        riskLevel: gap > 0.1 ? "High" : gap > 0.05 ? "Moderate" : "Low",
        pValue, significant: pValue < 0.05, testType: "welch-t-test",
      });
    }
  }

  // ── Compensation gap — Welch t-test: Race ─────────────────────────────────
  if (raceCol && mappedSalaryCol) {
    const races = [...new Set(mapped.map((r) => r[raceCol]?.toLowerCase().trim()).filter(Boolean))];
    const whiteKey = ["white", "caucasian"].find((k) => races.includes(k)) ?? "white";
    const statsW = getSalaryStats(mapped, raceCol, whiteKey, mappedSalaryCol);
    for (const race of races) {
      if (!race || race === whiteKey) continue;
      const statsR = getSalaryStats(mapped, raceCol, race, mappedSalaryCol);
      if (statsW && statsR) {
        const gap = (statsW.mean - statsR.mean) / statsW.mean;
        const { pValue } = welchTTest(statsR.mean, statsR.variance, statsR.n, statsW.mean, statsW.variance, statsW.n);
        results.push({
          metricType: "compensation_gap_race",
          groupA: race.charAt(0).toUpperCase() + race.slice(1), groupB: "White",
          groupARate: statsR.mean, groupBRate: statsW.mean,
          value: gap, threshold: 0.05,
          passed: gap <= 0.05,
          riskLevel: gap > 0.1 ? "High" : gap > 0.05 ? "Moderate" : "Low",
          pValue, significant: pValue < 0.05, testType: "welch-t-test",
        });
      }
    }
  }

  // ── Compensation gap — Welch t-test: Age (ADEA 40+) ──────────────────────
  if (ageCol && mappedSalaryCol) {
    const ageMapped = mapped
      .map((r) => ({ ...r, _ageGroup: normalizeAgeGroup(r[ageCol] ?? "") }))
      .filter((r) => r._ageGroup !== null) as (Row & { _ageGroup: string })[];
    if (ageMapped.length > 0) {
      const statsOver = getSalaryStats(ageMapped, "_ageGroup", "40 and over", mappedSalaryCol);
      const statsUnder = getSalaryStats(ageMapped, "_ageGroup", "Under 40", mappedSalaryCol);
      if (statsOver && statsUnder) {
        const gap = (statsUnder.mean - statsOver.mean) / statsUnder.mean;
        const { pValue } = welchTTest(statsOver.mean, statsOver.variance, statsOver.n, statsUnder.mean, statsUnder.variance, statsUnder.n);
        results.push({
          metricType: "compensation_gap_age",
          groupA: "Age 40+", groupB: "Under 40",
          groupARate: statsOver.mean, groupBRate: statsUnder.mean,
          value: gap, threshold: 0.05,
          passed: gap <= 0.05,
          riskLevel: gap > 0.1 ? "High" : gap > 0.05 ? "Moderate" : "Low",
          pValue, significant: pValue < 0.05, testType: "welch-t-test",
        });
      }
    }
  }

  return results;
}

function generateFindings(results: StatResult[]): Array<{ severity: string; category: string; description: string; legalBasis: string; metricType: string | null; groupA: string | null; groupB: string | null; value: number | null }> {
  return results
    .filter((r) => r.passed === false)
    .map((r) => {
      let severity = "Low";
      if (r.riskLevel === "High") severity = "High";
      else if (r.riskLevel === "Moderate") severity = "Moderate";

      let category = "Disparate Impact";
      let description = "";
      let legalBasis = "EEOC Uniform Guidelines on Employee Selection Procedures, 29 CFR Part 1607 (4/5ths Rule)";

      const ratioStr = (r.value ?? 0).toFixed(3);
      const rateAStr = `${((r.groupARate ?? 0) * 100).toFixed(1)}%`;
      const rateBStr = `${((r.groupBRate ?? 0) * 100).toFixed(1)}%`;
      // Significance qualifier appended to all findings
      const sigNote = r.pValue != null
        ? ` Statistical test (${r.testType ?? ""}): p = ${r.pValue.toFixed(4)}${r.significant ? " — statistically significant (p < 0.05)." : " — not statistically significant at α=0.05 (pattern warrants monitoring)."}`
        : "";

      if (r.metricType === "adverse_impact_hiring_gender") {
        description = `Adverse impact in hiring for gender: ${r.groupA} selection rate (${rateAStr}) is below 80% of ${r.groupB} rate (${rateBStr}). Ratio: ${ratioStr}.${sigNote}`;
      } else if (r.metricType === "adverse_impact_hiring_race") {
        description = `Adverse impact in hiring for race/ethnicity: ${r.groupA} selection rate (${rateAStr}) is below 80% of ${r.groupB} rate (${rateBStr}). Ratio: ${ratioStr}.${sigNote}`;
      } else if (r.metricType === "adverse_impact_hiring_age") {
        description = `Adverse impact in hiring for age: ${r.groupA} selection rate (${rateAStr}) is below 80% of ${r.groupB} rate (${rateBStr}). Ratio: ${ratioStr}.${sigNote}`;
        legalBasis = "Age Discrimination in Employment Act of 1967 (ADEA), 29 U.S.C. §623; EEOC UGESP 29 CFR Part 1607";
      } else if (r.metricType === "adverse_impact_promotion_gender") {
        description = `Adverse impact in promotions for gender: ${r.groupA} promotion rate (${rateAStr}) is below 80% of ${r.groupB} rate (${rateBStr}). Ratio: ${ratioStr}.${sigNote}`;
      } else if (r.metricType === "adverse_impact_promotion_race") {
        description = `Adverse impact in promotions for race/ethnicity: ${r.groupA} promotion rate (${rateAStr}) is below 80% of ${r.groupB} rate (${rateBStr}). Ratio: ${ratioStr}.${sigNote}`;
      } else if (r.metricType === "adverse_impact_termination_gender") {
        description = `Disproportionate termination by gender: ${r.groupA} termination rate (${rateAStr}) is ${(r.value ?? 1).toFixed(2)}× the ${r.groupB} rate (${rateBStr}), exceeding the 1.25 threshold.${sigNote}`;
        legalBasis = "Title VII §703(a)(1); EEOC Compliance Manual §15-V (Disparate Treatment); McDonnell Douglas Corp. v. Green, 411 U.S. 792 (1973)";
      } else if (r.metricType.startsWith("compensation_gap")) {
        category = "Compensation Disparity";
        const dim = r.metricType.includes("gender") ? "gender" : r.metricType.includes("age") ? "age" : "race/ethnicity";
        const gapStr = `${((r.value ?? 0) * 100).toFixed(1)}%`;
        const groupASalary = `$${(r.groupARate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        const groupBSalary = `$${(r.groupBRate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        description = `Compensation gap by ${dim}: ${r.groupA} mean salary (${groupASalary}) is ${gapStr} lower than ${r.groupB} (${groupBSalary}). Gap exceeds the 5% threshold.${sigNote}`;
        legalBasis = "Title VII of the Civil Rights Act, 42 U.S.C. §2000e; Equal Pay Act of 1963 (29 U.S.C. §206(d)); Lilly Ledbetter Fair Pay Act of 2009";
      }

      return {
        severity,
        category,
        description: description || `Compliance check failed for metric: ${r.metricType} — ${r.groupA} vs ${r.groupB}. Value: ${ratioStr}.${sigNote}`,
        legalBasis,
        metricType: r.metricType,
        groupA: r.groupA,
        groupB: r.groupB,
        value: r.value,
      };
    });
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /audit/sessions  (supports ?page=1&limit=50; returns pagination metadata)
router.get("/audit/sessions", async (req, res) => {
  const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const [sessions, allSessions] = await Promise.all([
    db.select().from(auditSessionsTable).orderBy(auditSessionsTable.createdAt).limit(limitNum).offset(offset),
    db.select({ id: auditSessionsTable.id }).from(auditSessionsTable),
  ]);
  const total = allSessions.length;
  res.json({ sessions, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

// POST /audit/sessions
router.post("/audit/sessions", async (req, res) => {
  const parsed = CreateAuditSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [session] = await db.insert(auditSessionsTable).values(parsed.data).returning();
  res.status(201).json(session);
});

// GET /audit/sessions/:id
router.get("/audit/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [session] = await db.select().from(auditSessionsTable).where(eq(auditSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(session);
});

// PATCH /audit/sessions/:id
router.patch("/audit/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateAuditSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db.update(auditSessionsTable).set(parsed.data).where(eq(auditSessionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// DELETE /audit/sessions/:id
router.delete("/audit/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(auditErtResponsesTable).where(eq(auditErtResponsesTable.sessionId, id));
  await db.delete(auditStatisticalResultsTable).where(eq(auditStatisticalResultsTable.sessionId, id));
  await db.delete(auditCsvUploadsTable).where(eq(auditCsvUploadsTable.sessionId, id));
  await db.delete(auditSessionsTable).where(eq(auditSessionsTable.id, id));
  res.status(204).send();
});

// GET /audit/sessions/:id/ert
router.get("/audit/sessions/:id/ert", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const responses = await db.select().from(auditErtResponsesTable).where(eq(auditErtResponsesTable.sessionId, id));

  const pillars = [
    { prefix: "e", name: "Equity", count: 6 },
    { prefix: "r", name: "Reliability", count: 6 },
    { prefix: "t", name: "Transparency", count: 6 },
  ];

  const pillarScores = pillars.map(({ prefix, name, count }) => {
    const pillarResponses = responses.filter((r) => r.questionId.startsWith(prefix));
    const answeredCount = pillarResponses.filter((r) => r.answered).length;
    return {
      pillar: name,
      score: count > 0 ? (answeredCount / count) * 100 : 0,
      answeredCount,
      totalCount: count,
    };
  });

  const overallScore = pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length;

  res.json({
    responses: responses.map((r) => ({ questionId: r.questionId, answered: r.answered, notes: r.notes })),
    pillarScores,
    overallScore,
  });
});

// POST /audit/sessions/:id/ert
router.post("/audit/sessions/:id/ert", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = SubmitAuditErtBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  // Upsert responses
  for (const resp of parsed.data.responses) {
    const existing = await db.select().from(auditErtResponsesTable)
      .where(eq(auditErtResponsesTable.sessionId, id));
    const found = existing.find((r) => r.questionId === resp.questionId);
    if (found) {
      await db.update(auditErtResponsesTable)
        .set({ answered: resp.answered, notes: resp.notes ?? null })
        .where(eq(auditErtResponsesTable.id, found.id));
    } else {
      await db.insert(auditErtResponsesTable).values({
        sessionId: id,
        questionId: resp.questionId,
        answered: resp.answered,
        notes: resp.notes ?? null,
      });
    }
  }

  // Return updated result (reuse GET logic)
  const responses = await db.select().from(auditErtResponsesTable).where(eq(auditErtResponsesTable.sessionId, id));
  const pillars = [
    { prefix: "e", name: "Equity", count: 6 },
    { prefix: "r", name: "Reliability", count: 6 },
    { prefix: "t", name: "Transparency", count: 6 },
  ];
  const pillarScores = pillars.map(({ prefix, name, count }) => {
    const pillarResponses = responses.filter((r) => r.questionId.startsWith(prefix));
    const answeredCount = pillarResponses.filter((r) => r.answered).length;
    return { pillar: name, score: count > 0 ? (answeredCount / count) * 100 : 0, answeredCount, totalCount: count };
  });
  const overallScore = pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length;
  res.json({ responses: responses.map((r) => ({ questionId: r.questionId, answered: r.answered, notes: r.notes })), pillarScores, overallScore });
});

// POST /audit/sessions/:id/csv
router.post("/audit/sessions/:id/csv", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = UploadAuditCsvBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { filename, csvData, columnMap } = parsed.data;

  let rows: Row[] = [];
  try {
    rows = parse(csvData, { columns: true, skip_empty_lines: true, trim: true }) as Row[];
  } catch {
    res.status(400).json({ error: "Failed to parse CSV" });
    return;
  }

  // Store CSV upload metadata
  await db.delete(auditCsvUploadsTable).where(eq(auditCsvUploadsTable.sessionId, id));
  const [upload] = await db.insert(auditCsvUploadsTable).values({
    sessionId: id,
    filename,
    rowCount: rows.length,
    columnMap: JSON.stringify(columnMap),
  }).returning();

  // Run statistical analysis
  const statResults = runStatisticalAnalysis(rows, columnMap);

  // Delete old results and insert new
  await db.delete(auditStatisticalResultsTable).where(eq(auditStatisticalResultsTable.sessionId, id));
  const insertedResults = statResults.length > 0
    ? await db.insert(auditStatisticalResultsTable).values(statResults.map((r) => ({ ...r, sessionId: id }))).returning()
    : [];

  // Generate findings
  const findings = generateFindings(statResults);

  const failCount = statResults.filter((r) => r.passed === false).length;
  const overallRiskLevel = failCount === 0 ? "Low" : failCount <= 2 ? "Moderate" : "High";

  // Update session status
  await db.update(auditSessionsTable).set({ status: "complete" }).where(eq(auditSessionsTable.id, id));

  res.json({
    sessionId: id,
    statisticalResults: insertedResults,
    findings,
    overallRiskLevel,
    csvUpload: { id: upload.id, filename: upload.filename, rowCount: upload.rowCount, createdAt: upload.createdAt.toISOString() },
  });
});

// GET /audit/sessions/:id/results
router.get("/audit/sessions/:id/results", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const statResults = await db.select().from(auditStatisticalResultsTable).where(eq(auditStatisticalResultsTable.sessionId, id));
  const csvUploads = await db.select().from(auditCsvUploadsTable).where(eq(auditCsvUploadsTable.sessionId, id));
  const csvUpload = csvUploads[0];

  const findings = generateFindings(statResults.map((r) => ({
    metricType: r.metricType,
    groupA: r.groupA,
    groupB: r.groupB,
    groupARate: r.groupARate,
    groupBRate: r.groupBRate,
    value: r.value,
    threshold: r.threshold,
    passed: r.passed,
    riskLevel: r.riskLevel,
    pValue: r.pValue ?? null,
    significant: r.significant ?? null,
    testType: r.testType ?? null,
  })));

  const failCount = statResults.filter((r) => r.passed === false).length;
  const overallRiskLevel = failCount === 0 ? "Low" : failCount <= 2 ? "Moderate" : "High";

  res.json({
    sessionId: id,
    statisticalResults: statResults,
    findings,
    overallRiskLevel,
    csvUpload: csvUpload ? { id: csvUpload.id, filename: csvUpload.filename, rowCount: csvUpload.rowCount, createdAt: csvUpload.createdAt.toISOString() } : null,
  });
});

// GET /audit/regulatory-feed
router.get("/audit/regulatory-feed", async (_req, res) => {
  if (feedCache && feedCache.expiresAt > Date.now()) {
    res.json(feedCache.data);
    return;
  }

  const [eeoc, caCrd] = await Promise.allSettled([
    fetchFeed("https://www.eeoc.gov/rss/newsroom"),
    fetchFeed("https://calcivilrights.ca.gov/feed/"),
  ]);

  // Attach source field to each item to match the OpenAPI RegulatoryFeedItem schema
  const eeocItems = (eeoc.status === "fulfilled" ? eeoc.value : []).map((item) => ({ ...item, source: "EEOC" }));
  const caCrdItems = (caCrd.status === "fulfilled" ? caCrd.value : []).map((item) => ({ ...item, source: "CA CRD" }));

  const data = {
    eeoc: eeocItems,
    caCrd: caCrdItems,
    lastRefreshed: new Date().toISOString(),
  };

  feedCache = { data, expiresAt: Date.now() + 30 * 60 * 1000 };
  res.json(data);
});

// GET /audit/dashboard
router.get("/audit/dashboard", async (_req, res) => {
  const sessions = await db.select().from(auditSessionsTable).orderBy(auditSessionsTable.createdAt);

  const totalAudits = sessions.length;

  // Count passing audits: sessions that are complete and have no failed statistical results
  const sessionIds = sessions.map((s) => s.id);
  let passingAudits = 0;
  for (const session of sessions.filter((s) => s.status === "complete")) {
    const results = await db.select().from(auditStatisticalResultsTable).where(eq(auditStatisticalResultsTable.sessionId, session.id));
    const anyFail = results.some((r) => r.passed === false);
    if (!anyFail) passingAudits++;
  }

  const openAudits = sessions.filter((s) => s.status === "draft" || s.status === "in_progress").length;

  const completeSessions = sessions.filter((s) => s.status === "complete").sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const lastAuditDate = completeSessions.length > 0 ? completeSessions[0].createdAt.toISOString() : null;

  const recentSessions = sessions.slice(-5).reverse();

  res.json({
    totalAudits,
    passingAudits,
    openAudits,
    lastAuditDate,
    recentSessions,
  });
});

export default router;
