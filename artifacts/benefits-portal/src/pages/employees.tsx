import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  useListEmployees,
  useCreateEmployee,
  useImportEmployeesCsv,
  useListEmployers,
  getListEmployeesQueryKey,
  getListEmployersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Plus, Upload, MoreHorizontal, User, FileText,
  CheckCircle2, Building2, ChevronRight, X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Employer picker ──────────────────────────────────────────────────────────
function EmployerPicker({ onSelect }: { onSelect: (id: number, name: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: employers, isLoading } = useListEmployers({
    query: { queryKey: getListEmployersQueryKey() },
  });

  const filtered = employers?.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Employees</h2>
        <p className="text-muted-foreground mt-1">Select an employer to view and manage their employees.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employers…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No employers found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.id, emp.name)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-white hover:border-[#9E1E34]/40 hover:bg-[#FAE0DC]/20 transition-all p-4 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FAE0DC] flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-[#9E1E34]" />
                </div>
                <div>
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[emp.city, emp.state].filter(Boolean).join(", ")}
                    {emp.industry ? ` · ${emp.industry}` : ""}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[#9E1E34] transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Employees() {
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(null);
  const [selectedEmployerName, setSelectedEmployerName] = useState<string>("");
  const [search, setSearch] = useState("");

  function handleSelectEmployer(id: number, name: string) {
    setSelectedEmployerId(id);
    setSelectedEmployerName(name);
    setSearch("");
  }

  function handleClearEmployer() {
    setSelectedEmployerId(null);
    setSelectedEmployerName("");
    setSearch("");
  }

  if (!selectedEmployerId) {
    return <EmployerPicker onSelect={handleSelectEmployer} />;
  }

  return (
    <EmployeeList
      employerId={selectedEmployerId}
      employerName={selectedEmployerName}
      search={search}
      setSearch={setSearch}
      onClearEmployer={handleClearEmployer}
    />
  );
}

// ── Employee list ─────────────────────────────────────────────────────────────
function EmployeeList({
  employerId, employerName, search, setSearch, onClearEmployer,
}: {
  employerId: number; employerName: string;
  search: string; setSearch: (s: string) => void;
  onClearEmployer: () => void;
}) {
  const { data: employees, isLoading } = useListEmployees(
    { employerId, search: search || undefined },
    { query: { queryKey: getListEmployeesQueryKey({ employerId, search: search || undefined }) } }
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <button onClick={onClearEmployer} className="hover:text-[#9E1E34] transition-colors font-medium">
              Employees
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{employerName}</span>
          </div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">{employerName}</h2>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${employees?.length ?? 0} employee${employees?.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClearEmployer} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Change Employer
          </Button>
          <ImportCsvDialog employerId={employerId} />
          <AddEmployeeDialog employerId={employerId} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invitation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : employees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No employees found for {employerName}.
                  </TableCell>
                </TableRow>
              ) : (
                employees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                          <span className="text-xs text-muted-foreground">{emp.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.invitationStatus === "accepted" ? "default" : emp.invitationStatus === "pending" ? "secondary" : "outline"}
                        className="capitalize"
                      >
                        {emp.invitationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{emp.department || "—"}</TableCell>
                    <TableCell>{emp.hireDate ? format(new Date(emp.hireDate), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/employees/${emp.id}`}>
                            <DropdownMenuItem className="cursor-pointer">View Profile</DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Import CSV dialog ─────────────────────────────────────────────────────────
function ImportCsvDialog({ employerId }: { employerId: number }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const importCsv = useImportEmployeesCsv();

  const EXPECTED_HEADERS = ["first_name", "last_name", "email", "department", "job_title", "hire_date", "employee_id", "phone"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvData(text);
      const lines = text.trim().split(/\r?\n/).slice(0, 4);
      setPreview(lines.map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))));
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData) return;
    importCsv.mutate(
      { data: { csvData } },
      {
        onSuccess: (data) => {
          const res = data as unknown as { imported: number; skipped: number };
          setResult(res);
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey({ employerId }) });
          toast({ title: `Import complete — ${res.imported} added, ${res.skipped} skipped` });
        },
        onError: () => toast({ title: "Import failed", variant: "destructive" }),
      }
    );
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setFileName(null); setCsvData(null); setPreview([]); setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with employee data. Supported columns:{" "}
            <span className="font-mono text-xs">{EXPECTED_HEADERS.join(", ")}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {fileName
              ? <p className="text-sm font-medium text-foreground">{fileName}</p>
              : <>
                  <p className="text-sm font-medium">Click to choose a CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                </>
            }
          </div>
          {preview.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Preview (first {preview.length} rows)</Label>
              <div className="overflow-x-auto rounded border border-border">
                <table className="text-xs w-full">
                  {preview.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "bg-muted font-medium" : "border-t border-border"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </table>
              </div>
            </div>
          )}
          {result && (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>
                <strong>{result.imported}</strong> employees imported,{" "}
                <strong>{result.skipped}</strong> skipped (already exist)
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!csvData || importCsv.isPending}>
            {importCsv.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add employee dialog ───────────────────────────────────────────────────────
function AddEmployeeDialog({ employerId }: { employerId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createEmployee.mutate(
      {
        data: {
          employerId,
          firstName:  fd.get("firstName")  as string,
          lastName:   fd.get("lastName")   as string,
          email:      fd.get("email")      as string,
          department: fd.get("department") as string,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Employee created successfully" });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey({ employerId }) });
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to create employee", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#9E1E34] hover:bg-[#5E0E20] text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createEmployee.isPending} className="bg-[#9E1E34] hover:bg-[#5E0E20] text-white">
              {createEmployee.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
