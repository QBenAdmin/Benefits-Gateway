import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useCreateEmployer,
  useUploadEmployerCensus,
  useCreateBenefitPlan,
  useListCarriers,
  useCreateEnrollmentPeriod,
  useCreateDocument,
  getListCarriersQueryKey,
  getListEmployersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, Heart, Calendar, FileText, BookOpen, Bell,
  CheckCircle2, Upload, Plus, Trash2, ArrowLeft, ArrowRight, Check,
  ChevronRight, File, X,
} from "lucide-react";

// ── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: "Employer Info",     icon: Building2 },
  { num: 2, label: "Census",            icon: Users },
  { num: 3, label: "Benefit Plans",     icon: Heart },
  { num: 4, label: "Enrollment Setup",  icon: Calendar },
  { num: 5, label: "Compliance Docs",   icon: FileText },
  { num: 6, label: "Benefits Guide",    icon: BookOpen },
  { num: 7, label: "Annual Notices",    icon: Bell },
];

const INDUSTRIES = [
  "Agriculture, Forestry, Fishing & Hunting",
  "Mining, Quarrying, and Oil & Gas Extraction",
  "Construction",
  "Manufacturing",
  "Wholesale Trade",
  "Retail Trade",
  "Transportation & Warehousing",
  "Information Technology",
  "Computer Programming Services",
  "Finance & Insurance",
  "Real Estate & Rental",
  "Professional, Scientific & Technical Services",
  "Management of Companies & Enterprises",
  "Administrative Support & Waste Management",
  "Educational Services",
  "Health Care & Social Assistance",
  "Arts, Entertainment & Recreation",
  "Accommodation & Food Services",
  "Other Services",
  "Public Administration",
  "Commercial Physical & Biological Research",
  "Engineering & Management Services",
  "Nonprofit / Association",
];

const COMPLIANCE_DOCS = [
  { key: "sbc",  label: "Summary of Benefits & Coverage (SBC)",  required: true },
  { key: "soc",  label: "Summary of Coverage (SOC)",             required: false },
  { key: "eoc",  label: "Evidence of Coverage (EOC)",            required: false },
  { key: "spd",  label: "Summary Plan Description (SPD)",        required: true },
  { key: "wrap", label: "Wrap Document",                         required: false },
  { key: "coc",  label: "Certificate of Coverage (COC)",         required: false },
  { key: "coi",  label: "Certificate of Insurance (COI)",        required: false },
];

const ANNUAL_NOTICES = [
  { key: "hipaa",      label: "HIPAA Notice of Privacy Practices" },
  { key: "chip",       label: "CHIP Notice (Children's Health Insurance Program)" },
  { key: "medicare_d", label: "Medicare Part D — Notice of Creditable Coverage" },
  { key: "whcra",      label: "WHCRA Notice (Women's Health & Cancer Rights Act)" },
  { key: "newborns",   label: "Newborns' & Mothers' Health Protection Act Notice" },
  { key: "mhpaea",     label: "Mental Health Parity (MHPAEA) Notice" },
  { key: "michelle",   label: "Michelle's Law Notice" },
];

// ── Types ───────────────────────────────────────────────────────────────────
type PlanDraft = {
  name: string; type: string; carrierId: number;
  employeeCost: string; employerCost: string; deductible: string;
  groupNumber: string; planYear: string;
};

type UploadedFile = { fileName: string; fileSize: number; file: File } | null;

type S1State = {
  name: string; city: string; state: string; zip: string; ein: string;
  industry: string; contactName: string; contactEmail: string; phone: string;
};

type S4State = {
  eligibilityClass: string; waitingPeriod: string;
  newHireWindow: string; lifeEventWindow: string;
  openEnrollStart: string; openEnrollEnd: string;
  allowChanges: boolean; requireApproval: boolean;
};

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        const Icon = s.icon;
        return (
          <div key={s.num} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                done    ? "bg-[#9E1E34] border-[#9E1E34] text-white"
                : active ? "bg-white border-[#9E1E34] text-[#9E1E34]"
                : "bg-white border-border text-muted-foreground"
              }`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                active ? "text-[#9E1E34]" : done ? "text-[#9E1E34]/70" : "text-muted-foreground"
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mx-1 mt-[-14px] ${done ? "bg-[#9E1E34]" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── File upload button ──────────────────────────────────────────────────────
function FileUploadButton({
  label, accept, file, onFile, required = false,
}: {
  label: string; accept: string; file: UploadedFile;
  onFile: (f: UploadedFile) => void; required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed p-3 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {file
          ? <File className="h-4 w-4 text-[#9E1E34] shrink-0" />
          : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {file
            ? <p className="text-xs text-muted-foreground truncate">{file.fileName} ({(file.fileSize / 1024).toFixed(1)} KB)</p>
            : <p className="text-xs text-muted-foreground">{required ? "Required" : "Optional"} — PDF, DOC, or Excel</p>
          }
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {file && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onFile(null)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => ref.current?.click()}>
          {file ? "Replace" : "Upload"}
        </Button>
        <input
          ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile({ fileName: f.name, fileSize: f.size, file: f });
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function stepDescription(step: number): string {
  const desc: Record<number, string> = {
    1: "Enter the employer's basic information including company name, location, and SIC industry code.",
    2: "Upload a census file (CSV or Excel) or paste CSV data to import employees.",
    3: "Add the benefit plans being offered to employees — medical, dental, vision, life, and disability.",
    4: "Configure who is eligible, waiting periods, and when employees can enroll or make changes.",
    5: "Upload required compliance documents — SBC, SPD, EOC, Wrap Document, and coverage certificates.",
    6: "Upload the Benefits Guide that employees will receive explaining their benefits.",
    7: "Upload required annual notices. All fields are optional if they are already in the Benefits Guide.",
  };
  return desc[step] ?? "";
}

// ── Main wizard ─────────────────────────────────────────────────────────────
export default function EmployerSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [employerId, setEmployerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [s1, setS1] = useState<S1State>({
    name: "", city: "", state: "CA", zip: "", ein: "",
    industry: "", contactName: "", contactEmail: "", phone: "",
  });

  // Step 2 state
  const [censusMode, setCensusMode] = useState<"file" | "paste">("file");
  const [censusFile, setCensusFile] = useState<UploadedFile>(null);
  const [csvPaste, setCsvPaste] = useState("");
  const [censusUploaded, setCensusUploaded] = useState(false);

  // Step 3 state
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [planForm, setPlanForm] = useState<PlanDraft>({
    name: "", type: "medical", carrierId: 0,
    employeeCost: "", employerCost: "", deductible: "", groupNumber: "", planYear: "2025",
  });
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Step 4 state
  const [s4, setS4] = useState<S4State>({
    eligibilityClass: "full_time_only",
    waitingPeriod: "first_of_next_month",
    newHireWindow: "30",
    lifeEventWindow: "30",
    openEnrollStart: "",
    openEnrollEnd: "",
    allowChanges: true,
    requireApproval: true,
  });

  // Steps 5-7 state
  const [complianceFiles, setComplianceFiles] = useState<Record<string, UploadedFile>>({});
  const [guideFile, setGuideFile] = useState<UploadedFile>(null);
  const [noticeFiles, setNoticeFiles] = useState<Record<string, UploadedFile>>({});

  // Hooks
  const createEmployer     = useCreateEmployer();
  const uploadCensus       = useUploadEmployerCensus();
  const createPlan         = useCreateBenefitPlan();
  const createPeriod       = useCreateEnrollmentPeriod();
  const createDoc          = useCreateDocument();
  const { data: carriers } = useListCarriers({ query: { queryKey: getListCarriersQueryKey() } });

  // ── Navigation handler ────────────────────────────────────────────────────
  async function handleNext() {
    setLoading(true);
    try {
      if      (step === 1) await doStep1();
      else if (step === 2) await doStep2();
      else if (step === 3) await doStep3();
      else if (step === 4) await doStep4();
      else if (step === 5) await doStep5();
      else if (step === 6) await doStep6();
      else if (step === 7) await doStep7();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Create employer ───────────────────────────────────────────────
  async function doStep1() {
    if (!s1.name.trim())     throw new Error("Company name is required");
    if (!s1.city.trim())     throw new Error("City is required");
    if (!s1.zip.trim())      throw new Error("ZIP code is required");
    if (!s1.industry)        throw new Error("Industry is required");

    const emp = await createEmployer.mutateAsync({
      data: {
        name:         s1.name.trim(),
        ein:          s1.ein.trim()          || undefined,
        industry:     s1.industry,
        city:         s1.city.trim(),
        state:        s1.state,
        zip:          s1.zip.trim(),
        contactName:  s1.contactName.trim()  || undefined,
        contactEmail: s1.contactEmail.trim() || undefined,
        phone:        s1.phone.trim()        || undefined,
      },
    });
    setEmployerId(emp.id);
    queryClient.invalidateQueries({ queryKey: getListEmployersQueryKey() });
    setStep(2);
  }

  // ── Step 2: Upload census ─────────────────────────────────────────────────
  async function doStep2() {
    if (!employerId) throw new Error("Employer not created yet");
    let csv = "";

    if (censusMode === "file" && censusFile) {
      csv = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = (e) => res(e.target?.result as string);
        reader.onerror = () => rej(new Error("Failed to read file"));
        reader.readAsText(censusFile.file);
      });
    } else if (censusMode === "paste" && csvPaste.trim()) {
      csv = csvPaste.trim();
    }

    if (csv) {
      await uploadCensus.mutateAsync({ id: employerId, data: { csvData: csv } });
      setCensusUploaded(true);
      toast({ title: "Census uploaded", description: "Employee records imported successfully." });
    }
    setStep(3);
  }

  // ── Step 3: Submit benefit plans ──────────────────────────────────────────
  async function doStep3() {
    if (!employerId) throw new Error("Employer not created yet");
    if (plans.length === 0) {
      toast({ title: "No plans added", description: "You can add plans later from the Benefits Plans page." });
    }
    for (const p of plans) {
      await createPlan.mutateAsync({
        data: {
          employerId,
          name:         p.name,
          type:         p.type,
          carrierId:    p.carrierId,
          employeeCost: p.employeeCost ? Number(p.employeeCost) : undefined,
          employerCost: p.employerCost ? Number(p.employerCost) : undefined,
          deductible:   p.deductible   ? Number(p.deductible)   : undefined,
          groupNumber:  p.groupNumber || undefined,
          planYear:     p.planYear    || undefined,
          effectiveDate: `${p.planYear || "2025"}-01-01`,
          renewalDate:   `${p.planYear || "2025"}-12-31`,
        },
      });
    }
    setStep(4);
  }

  // ── Step 4: Create enrollment period ─────────────────────────────────────
  async function doStep4() {
    if (!employerId) throw new Error("Employer not created yet");
    if (!s4.openEnrollStart || !s4.openEnrollEnd)
      throw new Error("Open enrollment start and end dates are required");

    await createPeriod.mutateAsync({
      data: {
        employerId,
        name:                      "Open Enrollment 2025",
        type:                      "open",
        startDate:                 new Date(s4.openEnrollStart).toISOString(),
        endDate:                   new Date(s4.openEnrollEnd).toISOString(),
        eligibilityClass:          s4.eligibilityClass,
        waitingPeriod:             s4.waitingPeriod,
        newHireWindow:             Number(s4.newHireWindow),
        lifeEventWindow:           Number(s4.lifeEventWindow),
        allowEmployeeChanges:      s4.allowChanges,
        requireApprovalOutsidePeriod: s4.requireApproval,
      },
    });
    setStep(5);
  }

  // ── Step 5: Upload compliance docs ───────────────────────────────────────
  async function doStep5() {
    if (!employerId) throw new Error("Employer not created yet");
    for (const doc of COMPLIANCE_DOCS) {
      const f = complianceFiles[doc.key];
      if (f) {
        await createDoc.mutateAsync({
          data: {
            employerId,
            name:     doc.label,
            type:     doc.key,
            fileName: f.fileName,
            fileSize: f.fileSize,
            isPdfFillable: false,
          },
        });
      }
    }
    setStep(6);
  }

  // ── Step 6: Upload benefits guide ─────────────────────────────────────────
  async function doStep6() {
    if (!employerId) throw new Error("Employer not created yet");
    if (guideFile) {
      await createDoc.mutateAsync({
        data: {
          employerId,
          name:          "Benefits Guide",
          type:          "benefits_guide",
          fileName:      guideFile.fileName,
          fileSize:      guideFile.fileSize,
          isPdfFillable: false,
        },
      });
    }
    setStep(7);
  }

  // ── Step 7: Upload annual notices + finish ────────────────────────────────
  async function doStep7() {
    if (!employerId) throw new Error("Employer not created yet");
    for (const notice of ANNUAL_NOTICES) {
      const f = noticeFiles[notice.key];
      if (f) {
        await createDoc.mutateAsync({
          data: {
            employerId,
            name:          notice.label,
            type:          "annual_notice",
            fileName:      f.fileName,
            fileSize:      f.fileSize,
            isPdfFillable: false,
          },
        });
      }
    }
    toast({ title: "Employer setup complete!", description: `${s1.name} has been successfully configured.` });
    navigate("/employers");
  }

  // ── Add plan to draft list ────────────────────────────────────────────────
  function addPlan() {
    if (!planForm.name.trim()) {
      toast({ title: "Plan name is required", variant: "destructive" }); return;
    }
    if (!planForm.carrierId) {
      toast({ title: "Carrier is required", variant: "destructive" }); return;
    }
    setPlans(prev => [...prev, { ...planForm }]);
    setPlanForm({ name: "", type: "medical", carrierId: 0, employeeCost: "", employerCost: "", deductible: "", groupNumber: "", planYear: "2025" });
    setShowPlanForm(false);
  }

  const isLastStep = step === 7;
  const StepIcon = STEPS[step - 1].icon;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">New Employer Setup</h2>
        <p className="text-muted-foreground mt-1">Complete each step to fully configure the employer group.</p>
      </div>

      <StepIndicator current={step} />

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAE0DC] flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-[#9E1E34]" />
            </div>
            <div>
              <CardTitle>Step {step}: {STEPS[step - 1].label}</CardTitle>
              <CardDescription>{stepDescription(step)}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {step === 1 && <Step1 s={s1} setS={setS1} />}
          {step === 2 && (
            <Step2
              mode={censusMode} setMode={setCensusMode}
              file={censusFile} setFile={setCensusFile}
              paste={csvPaste}  setPaste={setCsvPaste}
              uploaded={censusUploaded}
            />
          )}
          {step === 3 && (
            <Step3
              plans={plans} setPlans={setPlans}
              planForm={planForm} setPlanForm={setPlanForm}
              showForm={showPlanForm} setShowForm={setShowPlanForm}
              carriers={carriers ?? []}
              addPlan={addPlan}
            />
          )}
          {step === 4 && <Step4 s={s4} setS={setS4} />}
          {step === 5 && <Step5 files={complianceFiles} setFiles={setComplianceFiles} />}
          {step === 6 && <Step6 file={guideFile} setFile={setGuideFile} />}
          {step === 7 && <Step7 files={noticeFiles} setFiles={setNoticeFiles} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 1 || loading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-3">
          {step > 1 && !isLastStep && (
            <Button
              variant="ghost"
              onClick={() => setStep(s => s + 1)}
              disabled={loading}
              className="text-muted-foreground text-sm"
            >
              Skip <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={loading}
            className="gap-2 bg-[#9E1E34] hover:bg-[#5E0E20] text-white min-w-[150px]"
          >
            {loading
              ? "Saving…"
              : isLastStep
                ? <><CheckCircle2 className="h-4 w-4" /> Finish Setup</>
                : <>Next <ArrowRight className="h-4 w-4" /></>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Employer Info ───────────────────────────────────────────────────
function Step1({ s, setS }: { s: S1State; setS: (v: S1State) => void }) {
  const upd = (k: keyof S1State) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="s1-name">Company Name <span className="text-red-500">*</span></Label>
        <Input id="s1-name" value={s.name} onChange={upd("name")} placeholder="Acme Corporation" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s1-ein">EIN (Tax ID)</Label>
        <Input id="s1-ein" value={s.ein} onChange={upd("ein")} placeholder="XX-XXXXXXX" />
      </div>
      <div className="space-y-1.5">
        <Label>Industry / SIC Code <span className="text-red-500">*</span></Label>
        <Select value={s.industry} onValueChange={(v) => setS({ ...s, industry: v })}>
          <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s1-city">City <span className="text-red-500">*</span></Label>
        <Input id="s1-city" value={s.city} onChange={upd("city")} placeholder="Sacramento" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="s1-state">State</Label>
          <Input id="s1-state" value={s.state} onChange={upd("state")} placeholder="CA" maxLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s1-zip">ZIP <span className="text-red-500">*</span></Label>
          <Input id="s1-zip" value={s.zip} onChange={upd("zip")} placeholder="95670" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s1-cname">Primary Contact Name</Label>
        <Input id="s1-cname" value={s.contactName} onChange={upd("contactName")} placeholder="HR Administrator" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s1-cemail">Contact Email</Label>
        <Input id="s1-cemail" type="email" value={s.contactEmail} onChange={upd("contactEmail")} placeholder="hr@company.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s1-cphone">Contact Phone</Label>
        <Input id="s1-cphone" value={s.phone} onChange={upd("phone")} placeholder="555-555-0100" />
      </div>
    </div>
  );
}

// ── Step 2: Census ──────────────────────────────────────────────────────────
function Step2({
  mode, setMode, file, setFile, paste, setPaste, uploaded,
}: {
  mode: "file" | "paste"; setMode: (m: "file" | "paste") => void;
  file: UploadedFile; setFile: (f: UploadedFile) => void;
  paste: string; setPaste: (s: string) => void;
  uploaded: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-6">
      {uploaded && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Census uploaded successfully — you can proceed to the next step.
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={mode === "file" ? "default" : "outline"} size="sm"
          onClick={() => setMode("file")}
          className={mode === "file" ? "bg-[#9E1E34] hover:bg-[#5E0E20] text-white" : ""}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" /> File Upload
        </Button>
        <Button
          variant={mode === "paste" ? "default" : "outline"} size="sm"
          onClick={() => setMode("paste")}
          className={mode === "paste" ? "bg-[#9E1E34] hover:bg-[#5E0E20] text-white" : ""}
        >
          Paste CSV
        </Button>
      </div>

      {mode === "file" ? (
        <div className="space-y-3">
          <div
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-[#9E1E34]/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            {file ? (
              <>
                <p className="font-medium text-[#9E1E34]">{file.fileName}</p>
                <p className="text-sm text-muted-foreground mt-1">{(file.fileSize / 1024).toFixed(1)} KB — click to replace</p>
              </>
            ) : (
              <>
                <p className="font-medium">Drop your census file here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Accepts .csv or .xlsx files</p>
              </>
            )}
          </div>
          <input
            ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile({ fileName: f.name, fileSize: f.size, file: f });
              e.target.value = "";
            }}
          />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Expected CSV columns:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block">
              firstName, lastName, email, dateOfBirth, city, state, zip, employeeId, eligibility, annualSalary
            </code>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder={"firstName,lastName,email,dateOfBirth,city,state,zip\nJane,Doe,jane@company.com,1990-01-15,Sacramento,CA,95670"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
          />
          <p className="text-xs text-muted-foreground">Paste CSV data with a header row. Date format: YYYY-MM-DD.</p>
        </div>
      )}

      <div className="rounded-lg bg-[#FAE0DC]/40 border border-[#9E1E34]/20 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> You can skip this step and add employees individually from the Employees page after setup.
      </div>
    </div>
  );
}

// ── Step 3: Benefit Plans ───────────────────────────────────────────────────
const PLAN_TYPES = [
  { value: "medical",    label: "Medical" },
  { value: "dental",     label: "Dental" },
  { value: "vision",     label: "Vision" },
  { value: "life",       label: "Life" },
  { value: "disability", label: "Disability" },
];

function Step3({
  plans, setPlans, planForm, setPlanForm, showForm, setShowForm, carriers, addPlan,
}: {
  plans: PlanDraft[]; setPlans: (p: PlanDraft[]) => void;
  planForm: PlanDraft; setPlanForm: (p: PlanDraft) => void;
  showForm: boolean; setShowForm: (v: boolean) => void;
  carriers: { id: number; name: string }[];
  addPlan: () => void;
}) {
  const updF = (k: keyof PlanDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPlanForm({ ...planForm, [k]: e.target.value });

  return (
    <div className="space-y-5">
      {plans.length > 0 && (
        <div className="divide-y divide-border border rounded-lg">
          {plans.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {p.type} · {carriers.find(c => c.id === p.carrierId)?.name ?? "Unknown carrier"}
                  {p.employeeCost ? ` · $${p.employeeCost}/mo employee` : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPlans(plans.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <p className="text-sm font-semibold">New Plan</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan Name <span className="text-red-500">*</span></Label>
              <Input value={planForm.name} onChange={updF("name")} placeholder="Blue Shield PPO Gold" />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Type <span className="text-red-500">*</span></Label>
              <Select value={planForm.type} onValueChange={(v) => setPlanForm({ ...planForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Carrier <span className="text-red-500">*</span></Label>
              <Select
                value={planForm.carrierId ? String(planForm.carrierId) : ""}
                onValueChange={(v) => setPlanForm({ ...planForm, carrierId: Number(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Select carrier…" /></SelectTrigger>
                <SelectContent>
                  {carriers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Group / Plan Number</Label>
              <Input value={planForm.groupNumber} onChange={updF("groupNumber")} placeholder="GRP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Employee Monthly Cost ($)</Label>
              <Input type="number" value={planForm.employeeCost} onChange={updF("employeeCost")} placeholder="185.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Employer Monthly Cost ($)</Label>
              <Input type="number" value={planForm.employerCost} onChange={updF("employerCost")} placeholder="620.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Individual Deductible ($)</Label>
              <Input type="number" value={planForm.deductible} onChange={updF("deductible")} placeholder="500.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Year</Label>
              <Input value={planForm.planYear} onChange={updF("planYear")} placeholder="2025" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addPlan} className="bg-[#9E1E34] hover:bg-[#5E0E20] text-white">
              <Plus className="h-4 w-4 mr-1.5" /> Add Plan
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full border-dashed gap-2 h-12">
          <Plus className="h-4 w-4" /> Add Benefit Plan
        </Button>
      )}

      {plans.length === 0 && !showForm && (
        <p className="text-sm text-center text-muted-foreground">
          No plans added yet. You can skip this step and add plans later from the Benefits Plans page.
        </p>
      )}
    </div>
  );
}

// ── Step 4: Enrollment Setup ────────────────────────────────────────────────
function Step4({ s, setS }: { s: S4State; setS: (v: S4State) => void }) {
  const upd = (k: keyof S4State, v: string | boolean) => setS({ ...s, [k]: v });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <Label>Who Is Eligible for Benefits?</Label>
          <Select value={s.eligibilityClass} onValueChange={(v) => upd("eligibilityClass", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time_only">Full-time employees only (30+ hrs/wk)</SelectItem>
              <SelectItem value="full_and_part_time">Full-time and part-time (20+ hrs/wk)</SelectItem>
              <SelectItem value="all_employees">All employees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Benefits Waiting Period</Label>
          <Select value={s.waitingPeriod} onValueChange={(v) => upd("waitingPeriod", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate (day of hire)</SelectItem>
              <SelectItem value="30_days">30 days after hire</SelectItem>
              <SelectItem value="60_days">60 days after hire</SelectItem>
              <SelectItem value="90_days">90 days after hire</SelectItem>
              <SelectItem value="first_of_next_month">First of the month following hire</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Open Enrollment Start <span className="text-red-500">*</span></Label>
          <Input type="date" value={s.openEnrollStart} onChange={(e) => upd("openEnrollStart", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Open Enrollment End <span className="text-red-500">*</span></Label>
          <Input type="date" value={s.openEnrollEnd} onChange={(e) => upd("openEnrollEnd", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>New Hire Enrollment Window</Label>
          <Select value={s.newHireWindow} onValueChange={(v) => upd("newHireWindow", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days from hire date</SelectItem>
              <SelectItem value="60">60 days from hire date</SelectItem>
              <SelectItem value="90">90 days from hire date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Qualifying Life Event Window</Label>
          <Select value={s.lifeEventWindow} onValueChange={(v) => upd("lifeEventWindow", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days from event</SelectItem>
              <SelectItem value="60">60 days from event</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Allow Mid-Year Changes</p>
            <p className="text-xs text-muted-foreground">Employees can make changes outside open enrollment for qualifying life events</p>
          </div>
          <Switch checked={s.allowChanges} onCheckedChange={(v) => upd("allowChanges", v)} />
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm font-medium">Require HR Approval for Out-of-Period Changes</p>
            <p className="text-xs text-muted-foreground">Mid-year change requests must be reviewed and approved by an administrator</p>
          </div>
          <Switch checked={s.requireApproval} onCheckedChange={(v) => upd("requireApproval", v)} />
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Compliance Docs ─────────────────────────────────────────────────
function Step5({
  files, setFiles,
}: { files: Record<string, UploadedFile>; setFiles: (f: Record<string, UploadedFile>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload the required plan documents for this employer group. Documents marked <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">Required</Badge> should be uploaded before the plan goes live.
      </p>
      <div className="space-y-3">
        {COMPLIANCE_DOCS.map(doc => (
          <div key={doc.key} className="flex items-center gap-3">
            <div className="flex-1">
              <FileUploadButton
                label={doc.label}
                accept=".pdf,.doc,.docx"
                file={files[doc.key] ?? null}
                onFile={(f) => setFiles({ ...files, [doc.key]: f })}
                required={doc.required}
              />
            </div>
            {doc.required && (
              <Badge variant="outline" className="text-xs shrink-0 border-amber-400 text-amber-700 bg-amber-50">
                Required
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 6: Benefits Guide ──────────────────────────────────────────────────
function Step6({ file, setFile }: { file: UploadedFile; setFile: (f: UploadedFile) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Upload the Benefits Guide that will be distributed to employees. This document should explain all available plans, costs, and enrollment instructions in employee-friendly language.
      </p>
      <div
        className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-[#9E1E34]/50 transition-colors"
        onClick={() => ref.current?.click()}
      >
        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        {file ? (
          <>
            <p className="font-medium text-[#9E1E34]">{file.fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">{(file.fileSize / 1024).toFixed(1)} KB</p>
            <Button
              variant="ghost" size="sm" className="mt-2 text-xs"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
            >
              <X className="h-3 w-3 mr-1" /> Remove
            </Button>
          </>
        ) : (
          <>
            <p className="font-medium">Click to upload the Benefits Guide</p>
            <p className="text-sm text-muted-foreground mt-1">PDF or Word document — typically 10–30 pages</p>
          </>
        )}
      </div>
      <input
        ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile({ fileName: f.name, fileSize: f.size, file: f });
          e.target.value = "";
        }}
      />
      <div className="rounded-lg bg-[#FAE0DC]/40 border border-[#9E1E34]/20 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> You can skip this step and upload the Benefits Guide later from the Documents page.
      </div>
    </div>
  );
}

// ── Step 7: Annual Notices ──────────────────────────────────────────────────
function Step7({
  files, setFiles,
}: { files: Record<string, UploadedFile>; setFiles: (f: Record<string, UploadedFile>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload any required annual notices not already included in the Benefits Guide. All notices below are optional.
      </p>
      <div className="space-y-3">
        {ANNUAL_NOTICES.map(notice => (
          <FileUploadButton
            key={notice.key}
            label={notice.label}
            accept=".pdf,.doc,.docx"
            file={files[notice.key] ?? null}
            onFile={(f) => setFiles({ ...files, [notice.key]: f })}
            required={false}
          />
        ))}
      </div>
    </div>
  );
}
