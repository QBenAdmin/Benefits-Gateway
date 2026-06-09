import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { useCreateAuditSession, useUploadAuditCsv } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle2,
  FileText,
  Info,
} from "lucide-react";

const CADENCES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "calendar_year", label: "Calendar Year" },
  { value: "rolling_12", label: "12-Month Rolling" },
];

const STANDARD_FIELDS = [
  { key: "employeeId", label: "Employee ID", required: false },
  { key: "gender", label: "Gender", required: true },
  { key: "race", label: "Race / Ethnicity", required: true },
  { key: "age", label: "Age / Date of Birth", required: false },
  { key: "department", label: "Department", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
  { key: "hireDate", label: "Hire Date", required: false },
  { key: "terminationDate", label: "Termination Date", required: false },
  { key: "promotionDate", label: "Promotion Date", required: false },
  { key: "baseSalary", label: "Base Salary", required: false },
  { key: "finalDecision", label: "Final Decision (hired/rejected)", required: false },
];

interface ColumnMap {
  [key: string]: string;
}

export default function NewAudit() {
  const [, setLocation] = useLocation();
  const createSession = useCreateAuditSession();
  const uploadCsv = useUploadAuditCsv();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [vendorSystem, setVendorSystem] = useState("");
  const [cadence, setCadence] = useState("quarterly");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvFilename, setCsvFilename] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      // Use PapaParse for robust CSV parsing (handles quoted commas, CRLF, etc.)
      const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
      const rawRows = result.data as string[][];
      if (rawRows.length > 0) {
        const headers = rawRows[0].map((h) => h.trim());
        setCsvHeaders(headers);
        const preview = rawRows.slice(1, 6).map((row) => row.map((v) => v.trim()));
        setCsvPreview(preview);
        // Auto-map common column names
        const autoMap: ColumnMap = {};
        for (const field of STANDARD_FIELDS) {
          const match = headers.find((h) =>
            h.toLowerCase().includes(field.key.toLowerCase()) ||
            h.toLowerCase().includes(field.label.toLowerCase().split(" ")[0])
          );
          if (match) autoMap[field.key] = match;
        }
        setColumnMap(autoMap);
      }
    };
    reader.readAsText(file);
  };

  const handleStep1Next = async () => {
    if (!name || !cadence) { setError("Audit name and cadence are required."); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await createSession.mutateAsync({
        data: { name, vendorSystem: vendorSystem || undefined, cadence, windowStart: windowStart || undefined, windowEnd: windowEnd || undefined },
      });
      setSessionId(session.id);
      setStep(2);
    } catch {
      setError("Failed to create audit session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Next = () => {
    if (!csvContent) { setError("Please upload a CSV file."); return; }
    setError(null);
    setStep(3);
  };

  const handleRunAnalysis = async () => {
    if (!sessionId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await uploadCsv.mutateAsync({
        id: sessionId,
        data: { filename: csvFilename, csvData: csvContent, columnMap },
      });
      setLocation(`/audits/${sessionId}`);
    } catch {
      setError("Failed to run analysis. Please check your CSV and column mapping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipToSession = () => {
    if (sessionId) setLocation(`/audits/${sessionId}`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-[Outfit] text-2xl font-bold text-foreground">New Compliance Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a Title VII disparate impact analysis and ERT assessment
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              s < step ? "bg-emerald-500 text-white" : s === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span className={`text-sm ${s === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {s === 1 ? "Name & Vendor" : s === 2 ? "Column Mapping" : "Confirm & Run"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Name & Vendor */}
      {step === 1 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Audit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Audit Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g., Q3 2026 Hiring AI Audit — Workday"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor / AI System Being Audited</Label>
              <Input
                id="vendor"
                placeholder="e.g., Workday HCM, SAP SuccessFactors, Oracle HCM"
                value={vendorSystem}
                onChange={(e) => setVendorSystem(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="windowStart">Window Start Date</Label>
                <Input
                  id="windowStart"
                  type="date"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="windowEnd">Window End Date</Label>
                <Input
                  id="windowEnd"
                  type="date"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadence">Audit Cadence <span className="text-destructive">*</span></Label>
              <Select value={cadence} onValueChange={setCadence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleStep1Next} disabled={isSubmitting} className="gap-2">
                Next: Upload CSV
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Upload Workforce CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {csvFilename || "Click to upload your HRIS export"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV format from any HRIS, HCM, or ERP system
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {csvHeaders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>Map your CSV columns to standard compliance fields. Required fields marked with *.</span>
                  </div>
                  <div className="space-y-2">
                    {STANDARD_FIELDS.map((field) => (
                      <div key={field.key} className="grid grid-cols-2 gap-3 items-center">
                        <Label className="text-sm">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Select
                          value={columnMap[field.key] ?? "__none__"}
                          onValueChange={(v) =>
                            setColumnMap((prev) => ({
                              ...prev,
                              [field.key]: v === "__none__" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Not mapped</SelectItem>
                            {csvHeaders.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Data preview */}
                  {csvPreview.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Preview (first 5 rows)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="text-xs w-full border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              {csvHeaders.slice(0, 8).map((h) => (
                                <th key={h} className="border border-border px-2 py-1 text-left font-medium text-muted-foreground">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                {row.slice(0, 8).map((cell, j) => (
                                  <td key={j} className="border border-border px-2 py-1">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleStep2Next} disabled={!csvContent} className="gap-2">
                  Next: Confirm
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Confirm & Run */}
      {step === 3 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Confirm &amp; Run Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audit Name</span>
                <span className="font-medium">{name}</span>
              </div>
              {vendorSystem && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor / System</span>
                  <span className="font-medium">{vendorSystem}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadence</span>
                <span className="font-medium">{CADENCES.find((c) => c.value === cadence)?.label}</span>
              </div>
              {windowStart && windowEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window</span>
                  <span className="font-medium">{windowStart} to {windowEnd}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">CSV File</span>
                <span className="font-medium">{csvFilename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mapped Fields</span>
                <span className="font-medium">
                  {Object.values(columnMap).filter(Boolean).length} of {STANDARD_FIELDS.length}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Analysis will apply the <strong>EEOC 4/5ths rule</strong> (29 CFR §1607.4D) and compute compensation gaps.
                Results with fewer than 30 employees per group should be interpreted with caution.
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkipToSession}>
                  Skip CSV, go to session
                </Button>
                <Button onClick={handleRunAnalysis} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? "Running…" : "Run Analysis"}
                  {!isSubmitting && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
