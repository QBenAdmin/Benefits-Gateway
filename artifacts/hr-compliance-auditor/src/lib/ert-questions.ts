export interface ErtQuestion {
  id: string;
  pillar: "equity" | "reliability" | "transparency";
  text: string;
  tooltip: string;
  sourceRef?: string;
}

export const ERT_QUESTIONS: ErtQuestion[] = [
  // ── EQUITY PILLAR — "Does this tool produce fair outcomes across all protected classes?" ──
  {
    id: "e1",
    pillar: "equity",
    text: "What data was this tool trained on, and which demographic groups are represented? Has the vendor provided disaggregated representation data?",
    tooltip: "Training data composition directly determines who is advantaged or disadvantaged. Disparate representation in training sets is the leading cause of proxy discrimination under Title VII §703.",
    sourceRef: "AIAJ ERT Reference Card — Equity Gate, Q1",
  },
  {
    id: "e2",
    pillar: "equity",
    text: "Has a disparate impact test (4/5ths rule) been run on AI-assisted hiring decisions for this tool?",
    tooltip: "EEOC UGESP (29 CFR §1607.4D): a selection rate for any protected group that is less than 80% of the rate for the highest group indicates adverse impact. This test is mandatory for all AI-assisted selection procedures.",
    sourceRef: "AIAJ ERT Reference Card — Equity Gate, Q2",
  },
  {
    id: "e3",
    pillar: "equity",
    text: "Is an opt-out pathway available for candidates who prefer an alternative assessment method not mediated by AI?",
    tooltip: "Providing opt-out alternatives mitigates disparate impact liability and aligns with EEOC guidance under Griggs v. Duke Power Co., 401 U.S. 424 (1971) and the NYC Local Law 144 reasonable accommodation requirement.",
    sourceRef: "AIAJ ERT Reference Card — Equity Gate, Q3",
  },
  {
    id: "e4",
    pillar: "equity",
    text: "Has a re-audit been scheduled within 90 days of this tool's launch or most recent model update?",
    tooltip: "The AIAJ ERT Framework requires a 90-day re-audit cadence after launch or any significant model update. EEOC UGESP §1607.4 requires employers to maintain and monitor selection procedure records continuously.",
    sourceRef: "AIAJ ERT Reference Card — Equity Gate, Q4",
  },
  {
    id: "e5",
    pillar: "equity",
    text: "Has the vendor contractually agreed to provide bias audit results from an independent third party?",
    tooltip: "Independent audits reduce conflict-of-interest risk and align with NYC Local Law 144 (mandatory annual bias audit for automated employment decision tools) and emerging federal AI procurement standards.",
  },
  {
    id: "e6",
    pillar: "equity",
    text: "Are job-relevance validation studies available for all criteria the AI uses to rank or score candidates?",
    tooltip: "Under 29 CFR Part 1607 (UGESP), all selection criteria must be validated as job-related and consistent with business necessity — even when applied by an AI system. Absence of validation is the primary basis for disparate impact litigation.",
  },

  // ── RELIABILITY PILLAR — "Does it work consistently — and do we know when it breaks?" ──
  {
    id: "r1",
    pillar: "reliability",
    text: "Does the system alert recruiters when applications fail or are dropped, rather than failing silently without notification?",
    tooltip: "Silent failures create undetectable disparate impact. Active alerting is required for demonstrable good-faith compliance under EEOC enforcement guidance and the NIST AI Risk Management Framework (GOVERN function).",
    sourceRef: "AIAJ ERT Reference Card — Reliability Gate, Q1",
  },
  {
    id: "r2",
    pillar: "reliability",
    text: "Can recruiters override any AI score and manually move a candidate forward in the hiring process?",
    tooltip: "Human override capability is mandatory for responsible AI governance. It prevents \"robo-rejection\" liability and satisfies the business-necessity defense requirement under Title VII §703(k). Without override, employers bear full liability for AI errors.",
    sourceRef: "AIAJ ERT Reference Card — Reliability Gate, Q2",
  },
  {
    id: "r3",
    pillar: "reliability",
    text: "Does the vendor contract include a 14-day maximum SLA for bias incident response and remediation?",
    tooltip: "The AIAJ ERT Framework specifies a 14-day maximum bias-incident SLA as a vendor contract requirement. EEOC enforcement timelines make rapid response critical to avoiding systemic violation findings.",
    sourceRef: "AIAJ ERT Reference Card — Reliability Gate, Q3",
  },
  {
    id: "r4",
    pillar: "reliability",
    text: "Does the vendor contract include a right-to-audit clause allowing independent statistical review of AI outputs?",
    tooltip: "Contractual audit rights are essential for EEOC recordkeeping compliance under 29 CFR §1602 and for demonstrating due diligence in Title VII litigation. Without this clause, employers cannot perform the ongoing adverse impact monitoring the law requires.",
    sourceRef: "AIAJ ERT Reference Card — Reliability Gate, Q4",
  },
  {
    id: "r5",
    pillar: "reliability",
    text: "Is there a documented process for detecting and responding to AI model drift (degradation in accuracy or fairness over time)?",
    tooltip: "Model drift can silently introduce or worsen disparate impact long after a successful initial audit. Continuous monitoring is a core requirement of the NIST AI RMF 1.0 (MEASURE 2.5) and EEOC's expectation of ongoing compliance.",
  },
  {
    id: "r6",
    pillar: "reliability",
    text: "Are rollback procedures documented and tested for cases where the AI produces anomalous or potentially discriminatory outputs?",
    tooltip: "Incident response and rollback plans reduce employer liability under Title VII's business-necessity defense and demonstrate the proactive good-faith compliance posture the EEOC looks for when assessing systemic discrimination claims.",
  },

  // ── TRANSPARENCY PILLAR — "Can candidates, employees, and regulators see how it works?" ──
  {
    id: "t1",
    pillar: "transparency",
    text: "Is written disclosure of AI use included in all job postings and candidate rejection communications?",
    tooltip: "Written candidate disclosure is required by Illinois AEDT Law (820 ILCS 42), NYC Local Law 144, and is strongly recommended in EEOC AI Fairness Initiative guidance. Absence of disclosure is an independent legal exposure separate from disparate impact.",
    sourceRef: "AIAJ ERT Reference Card — Transparency Gate, Q1",
  },
  {
    id: "t2",
    pillar: "transparency",
    text: "Can the system explain, in plain language, why any specific candidate was scored or ranked the way they were?",
    tooltip: "'Algorithm said so' is not a legally defensible answer. Scoring explainability is required under NYC Local Law 144's notice provisions, California's proposed AB 331, and the EU AI Act. It also supports applicant appeal rights under Title VII.",
    sourceRef: "AIAJ ERT Reference Card — Transparency Gate, Q2",
  },
  {
    id: "t3",
    pillar: "transparency",
    text: "Is an AI use policy documented and made available to all employees (not just HR)?",
    tooltip: "An organization-wide AI use policy reduces Title VII liability by demonstrating institutional controls and good-faith compliance. The AIAJ ERT Framework requires this as a Transparency gate prerequisite.",
    sourceRef: "AIAJ ERT Reference Card — Transparency Gate, Q3",
  },
  {
    id: "t4",
    pillar: "transparency",
    text: "Has an AI ethics policy been added to the employee handbook and communicated to all staff?",
    tooltip: "Employee handbook inclusion establishes constructive notice and creates a paper trail that supports business-necessity defenses under Title VII §703(k). It also signals the organizational culture commitment required by the AIAJ ERT Framework.",
    sourceRef: "AIAJ ERT Reference Card — Transparency Gate, Q4",
  },
  {
    id: "t5",
    pillar: "transparency",
    text: "Has the organization documented in writing the business justification for deploying this AI tool in this specific HR function?",
    tooltip: "Written business-necessity documentation is the primary defense against a prima facie disparate impact case under Title VII §703(k). Without it, employers cannot successfully rebut statistical findings of adverse impact.",
  },
  {
    id: "t6",
    pillar: "transparency",
    text: "Are escalation and appeal pathways documented for employees or applicants who believe AI was used unfairly against them?",
    tooltip: "Appeals processes align with procedural fairness principles, reduce Title VII litigation risk, and demonstrate the good-faith compliance efforts the EEOC weighs in systemic investigations. They also satisfy an applicant's due process expectations.",
  },
];

export const ERT_PILLAR_CONFIG = {
  equity: {
    label: "Equity",
    gateQuestion: "Does this tool produce fair outcomes across all protected classes?",
    passLabel: "PASS: Selection rate gap <20% across all groups.",
    failLabel: "FAIL: Any group below 80% of top group. Do not launch.",
    color: "#C9A84C",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    textColor: "text-amber-700",
    progressColor: "bg-amber-500",
    description: "Examines whether the AI tool produces equitable outcomes across all protected classes — race, gender, and age.",
    actionOnFail: "Do not launch. Fix training data or model. Re-test.",
    coreQuestions: ["e1", "e2", "e3", "e4"],
  },
  reliability: {
    label: "Reliability",
    gateQuestion: "Does it work consistently — and do we know when it breaks?",
    passLabel: "PASS: Error logging active, overrides in place, SLA documented.",
    failLabel: "FAIL: Silent failures, no override, no SLA.",
    color: "#0891B2",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    textColor: "text-cyan-700",
    progressColor: "bg-cyan-500",
    description: "Evaluates whether the system surfaces failures, allows human override, and contractually guarantees audit and incident response rights.",
    actionOnFail: "Do not launch. Require error logging + override controls. Re-test.",
    coreQuestions: ["r1", "r2", "r3", "r4"],
  },
  transparency: {
    label: "Transparency",
    gateQuestion: "Can candidates, employees, and regulators see how it works?",
    passLabel: "PASS: Disclosure published, scoring explainable, policy documented.",
    failLabel: "FAIL: No disclosure. 'Algorithm said so' is not an answer.",
    color: "#2D936C",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-700",
    progressColor: "bg-emerald-500",
    description: "Assesses whether the AI tool's operation, scoring logic, and use are disclosed to candidates, employees, and documented for regulators.",
    actionOnFail: "Delay launch. Draft disclosure + explainability docs. 2-week fix.",
    coreQuestions: ["t1", "t2", "t3", "t4"],
  },
} as const;

export type ErtPillar = keyof typeof ERT_PILLAR_CONFIG;

/** AIAJ ERT Quick-Decision Table — from the official Reference Card */
export const ERT_DECISION_TABLE = [
  {
    equity: true, reliability: true, transparency: true,
    gates: "E✓ R✓ T✓",
    verdict: "Ready to Launch",
    action: "Launch. Schedule 90-day re-audit. Document everything.",
    color: "emerald",
  },
  {
    equity: false, reliability: true, transparency: true,
    gates: "E✗ R✓ T✓",
    verdict: "Do Not Launch",
    action: "Equity gate failed. Fix training data or model. Re-test before deploying.",
    color: "red",
  },
  {
    equity: true, reliability: false, transparency: true,
    gates: "E✓ R✗ T✓",
    verdict: "Do Not Launch",
    action: "Reliability gate failed. Require error logging + override controls. Re-test.",
    color: "red",
  },
  {
    equity: true, reliability: true, transparency: false,
    gates: "E✓ R✓ T✗",
    verdict: "Delay Launch",
    action: "Transparency gate failed. Draft disclosure + explainability docs. Allow 2-week fix.",
    color: "amber",
  },
  {
    equity: false, reliability: false, transparency: false,
    gates: "E✗ R✗ T✗",
    verdict: "Do Not Launch",
    action: "Multiple gates failed. Do not launch. Re-evaluate the vendor entirely.",
    color: "red",
  },
] as const;
