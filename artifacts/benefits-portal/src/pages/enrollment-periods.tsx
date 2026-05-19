import { useState } from "react";
import { 
  useListEnrollmentPeriods, 
  useCreateEnrollmentPeriod, 
  useUpdateEnrollmentPeriod, 
  useDeleteEnrollmentPeriod, 
  useGetActiveEnrollmentPeriod,
  getListEnrollmentPeriodsQueryKey,
  getGetActiveEnrollmentPeriodQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, MoreHorizontal, CheckCircle2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function EnrollmentPeriods() {
  const { data: periods, isLoading } = useListEnrollmentPeriods(undefined, { query: { queryKey: getListEnrollmentPeriodsQueryKey() } });
  const { data: activeStatus } = useGetActiveEnrollmentPeriod(undefined, { query: { queryKey: getGetActiveEnrollmentPeriodQueryKey() } });
  const activePeriod = activeStatus?.activePeriod;
  
  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Enrollment Windows</h2>
          <p className="text-muted-foreground">Manage open enrollment and special enrollment periods.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddPeriodDialog />
        </div>
      </div>

      {activePeriod ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 stroke-emerald-600 dark:stroke-emerald-500" />
          <AlertTitle>Enrollment is OPEN</AlertTitle>
          <AlertDescription>
            The "{activePeriod.name}" window is currently active until {format(new Date(activePeriod.endDate), 'MMMM d, yyyy')}.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 stroke-amber-600 dark:stroke-amber-500" />
          <AlertTitle>Enrollment is CLOSED</AlertTitle>
          <AlertDescription>
            There are no active open enrollment windows. Employees can only make changes via Life Events.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Periods</CardTitle>
          <CardDescription>Scheduled and historical enrollment windows</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Changes Allowed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : periods?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No enrollment periods configured.
                  </TableCell>
                </TableRow>
              ) : (
                periods?.map((period) => {
                  const now = new Date();
                  const start = new Date(period.startDate);
                  const end = new Date(period.endDate);
                  
                  let statusBadge = null;
                  if (!period.isActive) {
                    statusBadge = <Badge variant="secondary">Inactive</Badge>;
                  } else if (now >= start && now <= end) {
                    statusBadge = <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Open Now</Badge>;
                  } else if (now < start) {
                    statusBadge = <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Upcoming</Badge>;
                  } else {
                    statusBadge = <Badge variant="outline" className="text-muted-foreground">Past</Badge>;
                  }

                  return (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell>
                        <span className="capitalize">{period.type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(start, 'MMM d, yyyy')} - {format(end, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell>
                        {period.allowEmployeeChanges ? (
                          <span className="text-sm text-muted-foreground">Yes</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PeriodActions period={period} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodActions({ period }: { period: any }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateEnrollmentPeriod();
  const deleteMutation = useDeleteEnrollmentPeriod();

  const handleToggleActive = () => {
    updateMutation.mutate({ params: { id: period.id }, data: { isActive: !period.isActive } }, {
      onSuccess: () => {
        toast({ title: `Period ${period.isActive ? 'deactivated' : 'activated'}` });
        queryClient.invalidateQueries({ queryKey: getListEnrollmentPeriodsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActiveEnrollmentPeriodQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update period", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ params: { id: period.id } }, {
      onSuccess: () => {
        toast({ title: "Period deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListEnrollmentPeriodsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActiveEnrollmentPeriodQueryKey() });
        setDeleteOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to delete period", variant: "destructive" });
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
          <DropdownMenuItem onClick={handleToggleActive}>
            {period.isActive ? "Deactivate Period" : "Activate Period"}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            Delete Period
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Enrollment Period</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the "{period.name}" period? This action cannot be undone.
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

function AddPeriodDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("open");
  const [allowChanges, setAllowChanges] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPeriod = useCreateEnrollmentPeriod();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Convert local dates to ISO strings (appending time)
    const startDateRaw = formData.get("startDate") as string;
    const endDateRaw = formData.get("endDate") as string;
    const startIso = new Date(`${startDateRaw}T00:00:00`).toISOString();
    const endIso = new Date(`${endDateRaw}T23:59:59`).toISOString();

    const data = {
      name: formData.get("name") as string,
      type: type,
      startDate: startIso,
      endDate: endIso,
      isActive: true,
      allowEmployeeChanges: allowChanges,
      requireApprovalOutsidePeriod: requireApproval,
      notes: formData.get("notes") as string || undefined,
    };
    
    createPeriod.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Enrollment period created" });
        queryClient.invalidateQueries({ queryKey: getListEnrollmentPeriodsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActiveEnrollmentPeriodQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to create period", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Period
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Enrollment Period</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Period Name *</Label>
              <Input id="name" name="name" placeholder="e.g., 2025 Annual Open Enrollment" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Enrollment Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Enrollment</SelectItem>
                    <SelectItem value="new_hire">New Hire</SelectItem>
                    <SelectItem value="qualifying_event">Qualifying Life Event</SelectItem>
                    <SelectItem value="special">Special Enrollment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Employee Changes</Label>
                  <p className="text-xs text-muted-foreground">Employees can self-service enrollment changes</p>
                </div>
                <Switch checked={allowChanges} onCheckedChange={setAllowChanges} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require HR Approval</Label>
                  <p className="text-xs text-muted-foreground">Changes must be approved before taking effect</p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending ? "Creating..." : "Create Period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
