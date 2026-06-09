import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetAuditSession,
  useGetAuditResults,
  useGetAuditErt,
  useSubmitAuditErt,
  useUploadAuditCsv,
  getGetAuditErtQueryKey,
  getGetAuditResultsQueryKey,
  getGetAuditSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Info,
  ChevronDown,
  ChevronRight,
  Upload,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  BarChart3,
  ClipboardList,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ERT_QUESTIONS, ERT_PILLAR_CONFIG, ERT_DECISION_TABLE } from "@/lib/ert-questions";
import { useRef } from "react";

const TABS = [
  { id: "csv", label: "CSV Analysis", icon: BarChart3 },
  { id: "ert", label: "ERT Assessment", icon: Shield },
  { id: "findings", label: "Findings", icon: AlertTriangle },
  { id: "report", label: "Report", icon: FileText },
] as const;
type TabId = typeof TABS[number]["id"];

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, string> = {
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Moderate: "bg-amber-100 text-amber-700 border-amber-200",
    High: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${config[level] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {level === "High" && <XCircle className="mr-1.5 h-4 w-4" />}
      {level === "Moderate" && <AlertTriangle className="mr-1.5 h-4 w-4" />}
      {level === "Low" && <CheckCircle2 className="mr-1.5 h-4 w-4" />}
      {level} Risk
    </span>
  );
}

function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
  if (passed === null || passed === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  return passed ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
      <CheckCircle2 className="h-3.5 w-3.5" /> Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold">
      <XCircle className="h-3.5 w-3.5" /> Fail
    </span>
  );
}

// ─── CSV ANALYSIS TAB ─────────────────────────────────────────────────────────
function CsvAnalysisTab({ sessionId }: { sessionId: number }) {
  const { data: results, isLoading } = useGetAuditResults(sessionId);
  const uploadCsv = useUploadAuditCsv();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [csvFilename, setCsvFilename] = useState("");

  const STANDARD_FIELDS = [
    { key: "employeeId", label: "Employee ID" },
    { key: "gender", label: "Gender" },
    { key: "race", label: "Race / Ethnicity" },
    { key: "age", label: "Age / DOB" },
    { key: "department", label: "Department" },
    { key: "jobTitle", label: "Job Title" },
    { key: "hireDate", label: "Hire Date" },
    { key: "terminationDate", label: "Termination Date" },
    { key: "promotionDate", label: "Promotion Date" },
    { key: "baseSalary", label: "Base Salary" },
    { key: "finalDecision", label: "Final Decision" },
  ];

  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvContent, setCsvContent] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      const headers = text.split("\n")[0]?.split(",").map((h) => h.trim().replace(/"/g, "")) ?? [];
      setCsvHeaders(headers);
      const autoMap: Record<string, string> = {};
      for (const field of STANDARD_FIELDS) {
        const match = headers.find((h) => h.toLowerCase().includes(field.key.toLowerCase()));
        if (match) autoMap[field.key] = match;
      }
      setColumnMap(autoMap);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvContent) return;
    setIsUploading(true);
    try {
      await uploadCsv.mutateAsync({ id: sessionId, data: { filename: csvFilename, csvData: csvContent, columnMap } });
      queryClient.invalidateQueries({ queryKey: getGetAuditResultsQueryKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: getGetAuditSessionQueryKey(sessionId) });
      setShowUpload(false);
    } finally {
      setIsUploading(false);
    }
  };

  const hiringImpact = results?.statisticalResults?.filter((r) => r.metricType.startsWith("adverse_impact_hiring")) ?? [];
  const promotionImpact = results?.statisticalResults?.filter((r) => r.metricType.startsWith("adverse_impact_promotion")) ?? [];
  const terminationImpact = results?.statisticalResults?.filter((r) => r.metricType.startsWith("adverse_impact_termination")) ?? [];
  const compensationGap = results?.statisticalResults?.filter((r) => r.metricType.startsWith("compensation_gap")) ?? [];

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  if (!results?.csvUpload && !showUpload) {
    return (
      <div className="text-center py-12 space-y-4">
        <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <div>
          <h3 className="font-semibold text-foreground">No CSV uploaded yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Upload your workforce CSV to run the statistical analysis.</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload CSV
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results?.csvUpload && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {results.overallRiskLevel && <RiskBadge level={results.overallRiskLevel} />}
            <span className="text-sm text-muted-foreground">
              {results.csvUpload.filename} · {results.csvUpload.rowCount ?? 0} rows
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)} className="gap-2">
            <Upload className="h-4 w-4" />
            Re-upload CSV
          </Button>
        </div>
      )}

      {showUpload && (
        <Card className="border border-dashed">
          <CardContent className="p-5 space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                 onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium">{csvFilename || "Click to upload CSV"}</p>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
            {csvHeaders.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {STANDARD_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Label className="text-xs w-28 flex-shrink-0">{field.label}</Label>
                    <Select value={columnMap[field.key] ?? "__none__"} onValueChange={(v) => setColumnMap((p) => ({ ...p, [field.key]: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Not mapped" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not mapped</SelectItem>
                        {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUpload} disabled={!csvContent || isUploading}>
                {isUploading ? "Analyzing…" : "Run Analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reusable 4/5ths analysis table renderer */}
      {[
        {
          rows: hiringImpact,
          title: "Hiring Adverse Impact — 4/5ths Rule",
          tooltip: "EEOC 4/5ths Rule (29 CFR §1607.4D): A selection rate for any protected group that is less than 80% of the highest-rate group indicates adverse impact. Applies to AI-assisted hiring decisions.",
          rateALabel: "Group A Hire Rate",
          rateBLabel: "Group B Hire Rate",
          valueLabel: "Ratio",
          citation: "EEOC Uniform Guidelines on Employee Selection Procedures, 29 CFR §1607.4(D)",
        },
        {
          rows: promotionImpact,
          title: "Promotion Adverse Impact — 4/5ths Rule",
          tooltip: "Adverse impact in promotions: compares promotion rates across protected classes. A ratio below 0.80 indicates potential disparate impact. Citation: 29 CFR §1607.4(D); Title VII §703(a).",
          rateALabel: "Group A Promo Rate",
          rateBLabel: "Group B Promo Rate",
          valueLabel: "Ratio",
          citation: "Title VII §703(a); EEOC UGESP 29 CFR §1607.4(D)",
        },
        {
          rows: terminationImpact,
          title: "Termination Disparity",
          tooltip: "Compares termination rates across gender groups. A ratio above 1.25 (Group A terminated 25% more often than Group B) is flagged. Citation: Title VII §703(a); McDonnell Douglas Corp. v. Green, 411 U.S. 792 (1973).",
          rateALabel: "Group A Term. Rate",
          rateBLabel: "Group B Term. Rate",
          valueLabel: "Rate Ratio",
          citation: "Title VII §703(a)(1); McDonnell Douglas Corp. v. Green, 411 U.S. 792 (1973)",
        },
      ].map(({ rows, title, tooltip, rateALabel, rateBLabel, valueLabel, citation }) =>
        rows.length > 0 ? (
          <div key={title} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <Tooltip>
                <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group A</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group B</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">{rateALabel}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">{rateBLabel}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">{valueLabel}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">p-value</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pass/Fail</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className={r.passed === false ? "bg-red-50" : "hover:bg-muted/20"}>
                      <td className="px-4 py-3 font-medium">{r.groupA}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.groupB}</td>
                      <td className="px-4 py-3 text-right">{r.groupARate != null ? `${(r.groupARate * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-right">{r.groupBRate != null ? `${(r.groupBRate * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.value != null ? r.value.toFixed(3) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {r.pValue != null ? (
                          <span className={r.significant ? "font-semibold text-red-600" : "text-muted-foreground"}>
                            {r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(4)}
                            {r.significant && <span className="ml-1 text-[10px] font-bold">*</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center"><PassFailBadge passed={r.passed} /></td>
                      <td className="px-4 py-3 text-center">
                        {r.riskLevel && (
                          <span className={`text-xs font-semibold ${r.riskLevel === "High" ? "text-red-600" : r.riskLevel === "Moderate" ? "text-amber-600" : "text-emerald-600"}`}>
                            {r.riskLevel}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground italic">Citation: {citation}</p>
          </div>
        ) : null
      )}

      {/* Compensation Gap Table */}
      {compensationGap.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Compensation Gap Analysis</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Gaps &gt;5% may indicate potential discrimination under Title VII §703(a), the Equal Pay Act, and the ADEA (for age). Compares mean salaries between groups.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group A</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group B</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group A Mean Salary</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group B Mean Salary</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gap %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">p-value</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pass/Fail</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {compensationGap.map((r) => (
                  <tr key={r.id} className={r.passed === false ? "bg-red-50" : "hover:bg-muted/20"}>
                    <td className="px-4 py-3 font-medium">{r.groupA}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.groupB}</td>
                    <td className="px-4 py-3 text-right">{r.groupARate != null ? `$${r.groupARate.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{r.groupBRate != null ? `$${r.groupBRate.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.value != null ? `${(r.value * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.pValue != null ? (
                        <span className={r.significant ? "font-semibold text-red-600" : "text-muted-foreground"}>
                          {r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(4)}
                          {r.significant && <span className="ml-1 text-[10px] font-bold">*</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center"><PassFailBadge passed={r.passed} /></td>
                    <td className="px-4 py-3 text-center">
                      {r.riskLevel && (
                        <span className={`text-xs font-semibold ${r.riskLevel === "High" ? "text-red-600" : r.riskLevel === "Moderate" ? "text-amber-600" : "text-emerald-600"}`}>
                          {r.riskLevel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Citation: Title VII §703(a); Equal Pay Act of 1963 (29 U.S.C. §206(d)); ADEA §4(a) (age-based gaps)
          </p>
        </div>
      )}

      {results?.statisticalResults && results.statisticalResults.length === 0 && results.csvUpload && (
        <Card className="border bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              No adverse impact or compensation disparities detected. All group ratios are within acceptable thresholds.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Statistical significance note:</strong> Results from groups with fewer than 30 employees should be interpreted
            with caution. Small sample sizes may produce unstable ratios. Consult legal counsel before acting on findings
            from small groups.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ERT ASSESSMENT TAB ───────────────────────────────────────────────────────
function ErtAssessmentTab({ sessionId }: { sessionId: number }) {
  const { data: ertData, isLoading } = useGetAuditErt(sessionId);
  const submitErt = useSubmitAuditErt();
  const queryClient = useQueryClient();

  const [localResponses, setLocalResponses] = useState<Record<string, { answered: boolean; notes: string }>>({});
  const [openPillars, setOpenPillars] = useState<Record<string, boolean>>({ equity: true, reliability: false, transparency: false });
  const [saving, setSaving] = useState(false);

  const getResponse = (qId: string) => {
    if (localResponses[qId] !== undefined) return localResponses[qId];
    const server = ertData?.responses?.find((r) => r.questionId === qId);
    return { answered: server?.answered ?? false, notes: server?.notes ?? "" };
  };

  const handleCheck = (qId: string, checked: boolean) => {
    setLocalResponses((prev) => ({ ...prev, [qId]: { ...getResponse(qId), answered: checked } }));
  };

  const handleNotes = (qId: string, notes: string) => {
    setLocalResponses((prev) => ({ ...prev, [qId]: { ...getResponse(qId), notes } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const responses = ERT_QUESTIONS.map((q) => {
        const r = getResponse(q.id);
        return { questionId: q.id, answered: r.answered, notes: r.notes || undefined };
      });
      await submitErt.mutateAsync({ id: sessionId, data: { responses } });
      queryClient.invalidateQueries({ queryKey: getGetAuditErtQueryKey(sessionId) });
      setLocalResponses({});
    } finally {
      setSaving(false);
    }
  };

  const pillarQuestions = (pillar: string) => ERT_QUESTIONS.filter((q) => q.pillar === pillar);

  const localScore = (pillar: string) => {
    const qs = pillarQuestions(pillar);
    const answered = qs.filter((q) => getResponse(q.id).answered).length;
    return (answered / qs.length) * 100;
  };

  const overallLocal = ["equity", "reliability", "transparency"].reduce((sum, p) => sum + localScore(p), 0) / 3;

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border col-span-4 md:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ERT Readiness Score</p>
            <div className="text-4xl font-bold font-[Outfit] text-primary">{overallLocal.toFixed(0)}%</div>
            <Progress value={overallLocal} className="mt-3 h-2" />
          </CardContent>
        </Card>
        {(["equity", "reliability", "transparency"] as const).map((pillar) => {
          const cfg = ERT_PILLAR_CONFIG[pillar];
          const score = localScore(pillar);
          return (
            <Card key={pillar} className={`border col-span-4 md:col-span-1 ${cfg.bgColor}`}>
              <CardContent className="p-4">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${cfg.textColor}`}>{cfg.label}</p>
                <p className={`text-2xl font-bold font-[Outfit] ${cfg.textColor}`}>{score.toFixed(0)}%</p>
                <Progress value={score} className="mt-2 h-1.5" style={{ "--progress-background": cfg.color } as React.CSSProperties} />
                <p className="mt-1.5 text-xs text-muted-foreground">{pillarQuestions(pillar).filter((q) => getResponse(q.id).answered).length} of {pillarQuestions(pillar).length} yes</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Questions by pillar */}
      {(["equity", "reliability", "transparency"] as const).map((pillar) => {
        const cfg = ERT_PILLAR_CONFIG[pillar];
        const qs = pillarQuestions(pillar);
        const score = localScore(pillar);
        const passing = score >= 60;
        return (
          <Collapsible key={pillar} open={openPillars[pillar]} onOpenChange={(o) => setOpenPillars((p) => ({ ...p, [pillar]: o }))}>
            <Card className={`border ${cfg.borderColor}`}>
              <CollapsibleTrigger asChild>
                <CardHeader className={`pb-3 cursor-pointer ${cfg.bgColor} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-[Outfit] text-base font-semibold ${cfg.textColor}`}>
                        {cfg.label} Gate
                      </span>
                      <span className={`text-sm font-mono ${cfg.textColor}`}>{score.toFixed(0)}%</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${passing ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {passing ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 ${cfg.textColor} transition-transform ${openPillars[pillar] ? "rotate-180" : ""}`} />
                  </div>
                  <p className={`text-xs font-medium mt-1 ${cfg.textColor}`}>{cfg.gateQuestion}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-emerald-700">✓ {cfg.passLabel}</p>
                    <p className="text-xs text-red-600">✗ {cfg.failLabel}</p>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 divide-y">
                  {qs.map((q) => {
                    const resp = getResponse(q.id);
                    const isCore = (cfg.coreQuestions as readonly string[]).includes(q.id);
                    return (
                      <div key={q.id} className="py-4 space-y-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={q.id}
                            checked={resp.answered}
                            onCheckedChange={(c) => handleCheck(q.id, c === true)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-start gap-2 flex-wrap">
                              <label htmlFor={q.id} className="text-sm font-medium text-foreground cursor-pointer leading-snug">
                                {q.text}
                              </label>
                              {isCore && (
                                <span className="inline-flex items-center shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  ERT Reference Card
                                </span>
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground">
                                  <Info className="h-3 w-3" /> Legal basis
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">{q.tooltip}</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <div className="pl-7">
                          <Textarea
                            placeholder="Optional notes…"
                            value={resp.notes}
                            onChange={(e) => handleNotes(q.id, e.target.value)}
                            className="h-16 text-xs resize-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {/* Per-pillar action on fail */}
                  {!passing && (
                    <div className="py-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 font-medium">{cfg.actionOnFail}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* AIAJ Quick-Decision Table */}
      <Card className="border border-primary/20">
        <CardHeader className="pb-2 bg-primary/5 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h4 className="font-[Outfit] font-semibold text-sm text-primary">AIAJ ERT Quick-Decision Table</h4>
          </div>
          <p className="text-xs text-muted-foreground">Run every AI hiring decision through all three gates. If it can't pass all three — it's not ready.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-xs">
            {ERT_DECISION_TABLE.map((row, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="font-mono font-bold w-24 shrink-0 text-foreground">{row.gates}</span>
                <span className={`font-semibold w-28 shrink-0 ${row.color === "emerald" ? "text-emerald-700" : row.color === "amber" ? "text-amber-700" : "text-red-700"}`}>
                  {row.verdict}
                </span>
                <span className="text-muted-foreground">{row.action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AIAJ Quote */}
      <blockquote className="border-l-4 border-primary/40 pl-4 py-1">
        <p className="text-xs italic text-muted-foreground leading-relaxed">
          "E-R-T isn't a checklist you do once before launch — it's the ongoing operating system for how your HR team relates to AI.
          If you can't answer yes to all three on any given Tuesday, the tool isn't ready for that Tuesday."
        </p>
        <footer className="mt-1 text-xs font-semibold text-primary/80">
          — Alaric Scott Jr. | Founder &amp; CEO, AIAJ Academy | Creator, EquiHire AI
        </footer>
      </blockquote>

      {/* Reference link */}
      <div className="text-xs text-muted-foreground">
        Framework source:{" "}
        <a href="https://aiajacademy.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
          AIAJ Academy — ERT Framework Reference Card <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? "Saving…" : "Save Assessment"}
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── FINDINGS TAB ─────────────────────────────────────────────────────────────
function FindingsTab({ sessionId }: { sessionId: number }) {
  const { data: results, isLoading } = useGetAuditResults(sessionId);
  const { data: ertData } = useGetAuditErt(sessionId);

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const findings = results?.findings ?? [];
  const ertFindings = (ertData?.pillarScores ?? []).filter((p) => p.score < 60).map((p) => ({
    severity: p.score < 30 ? "High" : "Moderate",
    category: `ERT ${p.pillar}`,
    description: `ERT ${p.pillar} pillar score is ${p.score.toFixed(0)}% (${p.answeredCount} of ${p.totalCount} controls confirmed). This pillar requires attention.`,
    legalBasis: p.pillar === "Equity" ? "Title VII §703, EEOC UGESP 29 CFR Part 1607" : p.pillar === "Reliability" ? "EEOC UGESP 29 CFR §1607.14; NIST AI RMF 1.0" : "Illinois AEDT, NYC Local Law 144, AIAJ ERT Framework",
  }));

  const allFindings = [...findings, ...ertFindings];
  const highCount = allFindings.filter((f) => f.severity === "High").length;
  const modCount = allFindings.filter((f) => f.severity === "Moderate").length;
  const lowCount = allFindings.filter((f) => f.severity === "Low").length;

  if (allFindings.length === 0) {
    return (
      <Card className="border bg-emerald-50 border-emerald-200">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-semibold text-emerald-900">No findings</h3>
          <p className="text-sm text-emerald-700 mt-1">
            All statistical tests pass and ERT pillars are above threshold.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="flex gap-4">
        {highCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            {highCount} High
          </div>
        )}
        {modCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {modCount} Moderate
          </div>
        )}
        {lowCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-100 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
            <Info className="h-3.5 w-3.5" />
            {lowCount} Low
          </div>
        )}
      </div>

      {allFindings.map((f, idx) => (
        <Card key={idx} className={`border ${f.severity === "High" ? "border-red-200" : f.severity === "Moderate" ? "border-amber-200" : "border-blue-200"}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {f.severity === "High" ? <XCircle className="h-5 w-5 text-red-500" /> : f.severity === "Moderate" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <Info className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold uppercase tracking-wide ${f.severity === "High" ? "text-red-700" : f.severity === "Moderate" ? "text-amber-700" : "text-blue-700"}`}>
                    {f.severity}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.category}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{f.description}</p>
                <p className="mt-1.5 text-xs text-muted-foreground italic">Legal basis: {f.legalBasis}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── REPORT TAB ───────────────────────────────────────────────────────────────
function ReportTab({ sessionId }: { sessionId: number }) {
  const { data: session } = useGetAuditSession(sessionId);
  const { data: results } = useGetAuditResults(sessionId);
  const { data: ertData } = useGetAuditErt(sessionId);

  const findings = results?.findings ?? [];
  const ertFindings = (ertData?.pillarScores ?? []).filter((p) => p.score < 60).map((p) => ({
    severity: p.score < 30 ? "High" : "Moderate",
    category: `ERT ${p.pillar}`,
    description: `ERT ${p.pillar} pillar score is ${p.score.toFixed(0)}% (${p.answeredCount} of ${p.totalCount} controls confirmed).`,
    legalBasis: "AIAJ Academy ERT Framework; Title VII §703",
  }));
  const allFindings = [...findings, ...ertFindings];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div id="compliance-report" className="print-full space-y-6 rounded-lg border bg-white p-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-[Outfit] text-2xl font-bold text-slate-900">
                Compliance Audit Report
              </h1>
              <p className="mt-0.5 text-slate-500 text-sm">
                Title VII Disparate Impact &amp; ERT Framework Assessment
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div className="font-semibold text-slate-700">{session?.name}</div>
              <div>Generated {format(new Date(), "MMMM d, yyyy")}</div>
            </div>
          </div>
        </div>

        {/* Session metadata */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Audit Session</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-slate-600">
            <div><span className="font-medium text-slate-700">Name:</span> {session?.name}</div>
            <div><span className="font-medium text-slate-700">Vendor/System:</span> {session?.vendorSystem ?? "Not specified"}</div>
            <div><span className="font-medium text-slate-700">Cadence:</span> {session?.cadence}</div>
            <div><span className="font-medium text-slate-700">Status:</span> {session?.status}</div>
            {session?.windowStart && <div><span className="font-medium text-slate-700">Window:</span> {session.windowStart} – {session.windowEnd}</div>}
            <div><span className="font-medium text-slate-700">Created:</span> {session?.createdAt ? format(parseISO(session.createdAt), "MMMM d, yyyy") : "—"}</div>
          </div>
        </div>

        {/* Overall risk */}
        {results?.overallRiskLevel && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-2">Overall Disparate Impact Risk</h2>
            <RiskBadge level={results.overallRiskLevel} />
          </div>
        )}

        {/* ERT Scores */}
        {ertData && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-3">ERT Assessment Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Overall ERT</div>
                <div className="text-2xl font-bold text-slate-900 font-[Outfit]">{ertData.overallScore.toFixed(0)}%</div>
              </div>
              {ertData.pillarScores.map((ps) => (
                <div key={ps.pillar} className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">{ps.pillar}</div>
                  <div className="text-2xl font-bold text-slate-900 font-[Outfit]">{ps.score.toFixed(0)}%</div>
                  <div className="text-xs text-slate-400">{ps.answeredCount}/{ps.totalCount}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistical tables */}
        {results && results.statisticalResults.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-3">Statistical Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-3 py-2 text-left">Metric</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Group A</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Group B</th>
                    <th className="border border-slate-200 px-3 py-2 text-right">Value</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Pass/Fail</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {results.statisticalResults.map((r) => (
                    <tr key={r.id} className={r.passed === false ? "bg-red-50" : ""}>
                      <td className="border border-slate-200 px-3 py-1.5">{r.metricType.replace(/_/g, " ")}</td>
                      <td className="border border-slate-200 px-3 py-1.5">{r.groupA}</td>
                      <td className="border border-slate-200 px-3 py-1.5">{r.groupB}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-right font-mono">{r.value != null ? r.value.toFixed(3) : "—"}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center">{r.passed == null ? "—" : r.passed ? "PASS" : "FAIL"}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center">{r.riskLevel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Findings */}
        {allFindings.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-3">Findings ({allFindings.length})</h2>
            <div className="space-y-2">
              {allFindings.map((f, idx) => (
                <div key={idx} className={`rounded border p-3 text-xs ${f.severity === "High" ? "border-red-300 bg-red-50" : f.severity === "Moderate" ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
                  <div className="font-bold mb-0.5">[{f.severity}] {f.category}</div>
                  <div>{f.description}</div>
                  <div className="mt-0.5 italic text-slate-500">Legal basis: {f.legalBasis}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methodology */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-2">Methodology Notes</h2>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Adverse impact computed using the EEOC 4/5ths rule per 29 CFR §1607.4(D)</li>
            <li>Compensation gaps flagged at &gt;5% mean salary difference between groups</li>
            <li>ERT scores computed as: (yes answers ÷ total questions per pillar) × 100</li>
            <li>Groups with fewer than 30 employees are flagged for small-sample caution</li>
          </ul>
        </div>

        {/* Sources */}
        <div className="border-t border-slate-200 pt-4">
          <h2 className="font-semibold text-slate-900 mb-2">Sources &amp; Legal References</h2>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Title VII of the Civil Rights Act of 1964 (42 U.S.C. §2000e)</li>
            <li>EEOC Uniform Guidelines on Employee Selection Procedures, 29 CFR Part 1607</li>
            <li>AIAJ Academy — ERT Framework for AI in HR (https://aiajacademy.io/hr)</li>
            <li>California Civil Rights Department — Employment Discrimination (https://calcivilrights.ca.gov/employment/)</li>
            <li>Griggs v. Duke Power Co., 401 U.S. 424 (1971)</li>
            <li>Watson v. Fort Worth Bank &amp; Trust, 487 U.S. 977 (1988)</li>
            <li>Equal Pay Act of 1963 (29 U.S.C. §206(d))</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN AUDIT DETAIL PAGE ───────────────────────────────────────────────────
export default function AuditDetail() {
  const [, params] = useRoute("/audits/:id");
  const sessionId = parseInt(params?.id ?? "0", 10);
  const [activeTab, setActiveTab] = useState<TabId>("csv");

  const { data: session, isLoading } = useGetAuditSession(sessionId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Audit session not found.</p>
        <Link href="/audits"><Button variant="link">← Back to audits</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/audits">
          <Button variant="ghost" size="icon" className="mt-0.5 h-8 w-8 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-[Outfit] text-xl font-bold text-foreground">{session.name}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              session.status === "complete" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
              session.status === "in_progress" ? "bg-blue-100 text-blue-700 border-blue-200" :
              "bg-amber-100 text-amber-700 border-amber-200"
            }`}>
              {session.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {session.vendorSystem && `${session.vendorSystem} · `}
            {session.cadence}
            {session.windowStart && session.windowEnd && ` · ${session.windowStart} to ${session.windowEnd}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "csv" && <CsvAnalysisTab sessionId={sessionId} />}
        {activeTab === "ert" && <ErtAssessmentTab sessionId={sessionId} />}
        {activeTab === "findings" && <FindingsTab sessionId={sessionId} />}
        {activeTab === "report" && <ReportTab sessionId={sessionId} />}
      </div>
    </div>
  );
}
