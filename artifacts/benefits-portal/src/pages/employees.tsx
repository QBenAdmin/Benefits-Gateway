import { useRef, useState } from "react";
import { Link } from "wouter";
import { useListEmployees, useCreateEmployee, useImportEmployeesCsv, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Upload, MoreHorizontal, User, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Employees() {
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useListEmployees(
    { search: search || undefined },
    { query: { queryKey: getListEmployeesQueryKey({ search: search || undefined }) } }
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage your organization's personnel and invitations.</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvDialog />
          <AddEmployeeDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
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
                    No employees found.
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
                      <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.invitationStatus === 'accepted' ? 'default' : emp.invitationStatus === 'pending' ? 'secondary' : 'outline'}
                        className="capitalize"
                      >
                        {emp.invitationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{emp.department || '-'}</TableCell>
                    <TableCell>{emp.hireDate ? format(new Date(emp.hireDate), 'MMM d, yyyy') : '-'}</TableCell>
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

function ImportCsvDialog() {
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
      const parsed = lines.map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      setPreview(parsed);
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
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast({ title: `Import complete — ${res.imported} added, ${res.skipped} skipped` });
        },
        onError: () => {
          toast({ title: "Import failed", variant: "destructive" });
        },
      }
    );
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setFileName(null);
      setCsvData(null);
      setPreview([]);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {fileName ? (
              <p className="text-sm font-medium text-foreground">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Click to choose a CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              </>
            )}
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
          <Button
            onClick={handleImport}
            disabled={!csvData || importCsv.isPending}
          >
            {importCsv.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createEmployee.mutate(
      {
        data: {
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          email: formData.get("email") as string,
          department: formData.get("department") as string,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Employee created successfully" });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          setOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to create employee", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
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
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
