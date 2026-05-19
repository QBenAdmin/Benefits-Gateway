import { useState } from "react";
import { 
  useGetEmployee, 
  useUpdateEmployee, 
  getGetEmployeeQueryKey,
  useListDependents,
  useCreateDependent,
  useDeleteDependent,
  getListDependentsQueryKey,
  useListEnrollments,
  getListEnrollmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Briefcase, Calendar, MapPin, Phone, Plus, AlertCircle, Trash, Heart, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function EmployeeDetail() {
  const { id } = useParams();
  const empId = parseInt(id || "0", 10);
  
  const { data: employee, isLoading: empLoading } = useGetEmployee(empId, {
    query: {
      enabled: !!empId,
      queryKey: getGetEmployeeQueryKey(empId)
    }
  });

  const { data: dependents, isLoading: depLoading } = useListDependents(empId, {
    query: {
      enabled: !!empId,
      queryKey: getListDependentsQueryKey(empId)
    }
  });

  const { data: enrollments, isLoading: enrLoading } = useListEnrollments(
    { employeeId: empId },
    { query: { enabled: !!empId, queryKey: getListEnrollmentsQueryKey({ employeeId: empId }) } }
  );

  const [editOpen, setEditOpen] = useState(false);

  if (empLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!employee) return <div className="p-8">Employee not found</div>;

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">{employee.firstName} {employee.lastName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>{employee.status}</Badge>
              <Badge variant="outline" className="capitalize">{employee.invitationStatus} Invite</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditEmployeeDialog open={editOpen} setOpen={setEditOpen} employee={employee} />
          <Button>Resend Invite</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{employee.phone || "Not provided"}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>
                {employee.address ? (
                  <>{employee.address}<br/>{employee.city}, {employee.state} {employee.zip}</>
                ) : "Not provided"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{employee.jobTitle || "No title"} &middot; {employee.department || "No department"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Hired: {employee.hireDate ? format(new Date(employee.hireDate), 'MMM d, yyyy') : "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>ID: {employee.employeeId || "N/A"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Status</CardTitle>
        </CardHeader>
        <CardContent>
          {enrLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !enrollments || enrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active enrollments found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {enrollments.map((enr) => (
                <div key={enr.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                      {enr.planType === 'medical' ? (
                        <Heart className="h-4 w-4 text-accent-foreground" />
                      ) : enr.planType === 'dental' || enr.planType === 'vision' ? (
                        <Shield className="h-4 w-4 text-accent-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-accent-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{enr.planName}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {enr.planType} · {enr.carrierName} · {(enr.coverageLevel ?? '').replace(/_/g, ' ')}
                      </p>
                      {enr.effectiveDate && (
                        <p className="text-xs text-muted-foreground">
                          Effective {format(new Date(enr.effectiveDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={enr.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {enr.status}
                    </Badge>
                    {enr.transmissionStatus && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {enr.transmissionStatus === 'transmitted' ? '✓ Transmitted' : enr.transmissionStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dependents</CardTitle>
          <AddDependentDialog empId={empId} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>DOB / Age</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : !dependents || dependents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No dependents registered.
                  </TableCell>
                </TableRow>
              ) : (
                dependents.map(dep => (
                  <TableRow key={dep.id}>
                    <TableCell className="font-medium">{dep.firstName} {dep.lastName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{dep.relationship.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(dep.dateOfBirth), 'MMM d, yyyy')}</span>
                        <span className="text-xs text-muted-foreground">{dep.dateOfBirth ? new Date().getFullYear() - new Date(dep.dateOfBirth).getFullYear() : "?"} years old</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dep.daysUntilAgeOut != null && dep.daysUntilAgeOut <= 60 && dep.daysUntilAgeOut >= 0 ? (
                        <div className="flex items-center text-amber-600 text-xs font-semibold">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Ages out in {dep.daysUntilAgeOut} days
                        </div>
                      ) : dep.daysUntilAgeOut != null && dep.daysUntilAgeOut < 0 ? (
                        <div className="flex items-center text-red-600 text-xs font-semibold">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Aged out
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <RemoveDependentAction depId={dep.id} empId={empId} />
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

function RemoveDependentAction({ depId, empId }: { depId: number, empId: number }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteDep = useDeleteDependent();

  const handleRemove = () => {
    deleteDep.mutate({ id: depId }, {
      onSuccess: () => {
        toast({ title: "Dependent removed" });
        queryClient.invalidateQueries({ queryKey: getListDependentsQueryKey(empId) });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to remove dependent", variant: "destructive" })
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Dependent</DialogTitle>
        </DialogHeader>
        <p className="py-4 text-sm">Are you sure you want to remove this dependent? This may affect enrollment eligibility.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleRemove} disabled={deleteDep.isPending}>
            {deleteDep.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDependentDialog({ empId }: { empId: number }) {
  const [open, setOpen] = useState(false);
  const [rel, setRel] = useState("child");
  const [gender, setGender] = useState("M");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createDep = useCreateDependent();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      relationship: rel,
      dateOfBirth: formData.get("dateOfBirth") as string,
      gender: gender,
      ssn: formData.get("ssn") as string || undefined
    };

    createDep.mutate({ employeeId: empId, data }, {
      onSuccess: () => {
        toast({ title: "Dependent added" });
        queryClient.invalidateQueries({ queryKey: getListDependentsQueryKey(empId) });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to add dependent", variant: "destructive" })
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Dependent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Dependent</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="space-y-2">
              <Label>Relationship *</Label>
              <Select value={rel} onValueChange={setRel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="domestic_partner">Domestic Partner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <Input name="dateOfBirth" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SSN (Optional)</Label>
              <Input name="ssn" placeholder="XXX-XX-XXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createDep.isPending}>
              {createDep.isPending ? "Adding..." : "Add Dependent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ open, setOpen, employee }: { open: boolean, setOpen: (v: boolean) => void, employee: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateEmp = useUpdateEmployee();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, any>;
    
    updateEmp.mutate({ id: employee.id, data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      department: data.department || null,
      jobTitle: data.jobTitle || null,
    } }, {
      onSuccess: () => {
        toast({ title: "Employee profile updated" });
        queryClient.invalidateQueries({ queryKey: getGetEmployeeQueryKey(employee.id) });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to update profile", variant: "destructive" })
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" defaultValue={employee.firstName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" defaultValue={employee.lastName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={employee.email} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={employee.phone || ""} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={employee.address || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={employee.city || ""} />
            </div>
            <div className="space-y-2 flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={employee.state || ""} />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" name="zip" defaultValue={employee.zip || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" defaultValue={employee.department || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" name="jobTitle" defaultValue={employee.jobTitle || ""} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updateEmp.isPending}>
              {updateEmp.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}