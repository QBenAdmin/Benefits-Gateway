import { useState } from "react";
import { 
  useListEmployers, 
  useCreateEmployer, 
  useUpdateEmployer, 
  useDeleteEmployer, 
  useUploadEmployerCensus, 
  getListEmployersQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MoreHorizontal, Upload, Building, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Employers() {
  const [search, setSearch] = useState("");
  const { data: employers, isLoading } = useListEmployers(undefined, { query: { queryKey: getListEmployersQueryKey() } });
  
  const filteredEmployers = employers?.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.ein.includes(search)
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Employers</h2>
          <p className="text-muted-foreground">Manage participating companies and upload census data.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddEmployerDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employers..."
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
                <TableHead>Employer Name</TableHead>
                <TableHead>EIN</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Employees</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEmployers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No employers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployers?.map((employer) => (
                  <TableRow key={employer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <Building className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{employer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employer.ein}</TableCell>
                    <TableCell>{employer.industry}</TableCell>
                    <TableCell>{employer.city}, {employer.state}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{employer.contactName}</span>
                        <span className="text-xs text-muted-foreground">{employer.contactEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employer.employeeCount}</TableCell>
                    <TableCell className="text-right">
                      <EmployerActions employer={employer} />
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

function EmployerActions({ employer }: { employer: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteEmployer();

  const handleDelete = () => {
    deleteMutation.mutate({ params: { id: employer.id } }, {
      onSuccess: () => {
        toast({ title: "Employer deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListEmployersQueryKey() });
        setDeleteOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to delete employer", variant: "destructive" });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Details</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUploadOpen(true)}>Upload Census Data</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            Delete Employer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditEmployerDialog open={editOpen} setOpen={setEditOpen} employer={employer} />
      <UploadCensusDialog open={uploadOpen} setOpen={setUploadOpen} employer={employer} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {employer.name}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddEmployerDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEmployer = useCreateEmployer();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, any>;
    
    createEmployer.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Employer created successfully" });
        queryClient.invalidateQueries({ queryKey: getListEmployersQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to create employer", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Employer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ein">EIN *</Label>
              <Input id="ein" name="ein" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createEmployer.isPending}>
              {createEmployer.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployerDialog({ open, setOpen, employer }: { open: boolean, setOpen: (v: boolean) => void, employer: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateEmployer = useUpdateEmployer();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, any>;
    
    updateEmployer.mutate({ params: { id: employer.id }, data }, {
      onSuccess: () => {
        toast({ title: "Employer updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListEmployersQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to update employer", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Employer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" defaultValue={employer.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ein">EIN *</Label>
              <Input id="ein" name="ein" defaultValue={employer.ein} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={employer.industry || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" defaultValue={employer.contactName || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={employer.contactEmail || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={employer.phone || ''} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={employer.address || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={employer.city || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={employer.state || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" defaultValue={employer.zip || ''} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={employer.notes || ''} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updateEmployer.isPending}>
              {updateEmployer.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadCensusDialog({ open, setOpen, employer }: { open: boolean, setOpen: (v: boolean) => void, employer: any }) {
  const [csvData, setCsvData] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const uploadCensus = useUploadEmployerCensus();

  const handleUpload = () => {
    if (!csvData.trim()) return;
    uploadCensus.mutate({ params: { id: employer.id }, data: { csvData } }, {
      onSuccess: (res) => {
        toast({ 
          title: "Census data processed",
          description: `Imported: ${res.importedCount}, Skipped: ${res.skippedCount}, Errors: ${res.errorCount}`
        });
        queryClient.invalidateQueries({ queryKey: getListEmployersQueryKey() });
        setCsvData("");
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to upload census data", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Census Data - {employer.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste CSV data below. Expected columns: firstName, lastName, email, dateOfBirth, gender, ssn (optional), hireDate, status.
          </p>
          <Textarea 
            placeholder="firstName,lastName,email..." 
            className="h-64 font-mono text-sm"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploadCensus.isPending || !csvData.trim()}>
            {uploadCensus.isPending ? "Uploading..." : "Upload Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
