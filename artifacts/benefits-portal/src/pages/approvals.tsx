import { useState } from "react";
import { 
  useListEnrollmentChanges, 
  useApproveEnrollmentChange, 
  useDenyEnrollmentChange, 
  getListEnrollmentChangesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Approvals() {
  const [tab, setTab] = useState("pending");
  const { data: changes, isLoading } = useListEnrollmentChanges(
    { status: tab !== "all" ? tab : undefined }, 
    { query: { queryKey: getListEnrollmentChangesQueryKey({ status: tab !== "all" ? tab : undefined }) } }
  );

  const pendingCount = changes?.filter(c => c.status === 'pending')?.length || 0;

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Approvals</h2>
            {pendingCount > 0 && tab === 'pending' && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 rounded-full px-2.5">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Review and approve enrollment changes submitted by employees.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="denied">Denied</TabsTrigger>
              <TabsTrigger value="all">All Changes</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Change Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : changes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="text-lg font-medium text-foreground">No {tab === 'all' ? '' : tab} changes</span>
                      <span>You're all caught up.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                changes?.map((change) => {
                  let typeBadge = null;
                  switch(change.changeType) {
                    case 'add_dependent': typeBadge = <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Add Dependent</Badge>; break;
                    case 'plan_change': typeBadge = <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">Plan Change</Badge>; break;
                    case 'coverage_level_change': typeBadge = <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">Coverage Level</Badge>; break;
                    case 'termination': typeBadge = <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Termination</Badge>; break;
                    default: typeBadge = <Badge variant="outline">{change.changeType}</Badge>;
                  }

                  let statusBadge = null;
                  if (change.status === 'pending') statusBadge = <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
                  else if (change.status === 'approved') statusBadge = <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>;
                  else statusBadge = <Badge variant="destructive">Denied</Badge>;

                  return (
                    <TableRow key={change.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{change.employeeName}</span>
                          <span className="text-xs text-muted-foreground">{change.employeeEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>{typeBadge}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate" title={change.description}>{change.description}</div>
                        {(change.previousValue || change.newValue) && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {change.previousValue} &rarr; {change.newValue}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(change.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell className="text-right">
                        {change.status === 'pending' ? (
                          <ApprovalActions change={change} />
                        ) : (
                          <div className="text-xs text-muted-foreground flex flex-col items-end">
                            <span>By {change.reviewedBy}</span>
                            <span>{change.reviewedAt ? format(new Date(change.reviewedAt), 'MMM d') : ''}</span>
                          </div>
                        )}
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

function ApprovalActions({ change }: { change: any }) {
  const [action, setAction] = useState<'approve'|'deny'|null>(null);
  const [notes, setNotes] = useState("");
  const [reviewer, setReviewer] = useState("Jane Doe"); // hardcoded for demo
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const approveMutation = useApproveEnrollmentChange();
  const denyMutation = useDenyEnrollmentChange();

  const isPending = approveMutation.isPending || denyMutation.isPending;

  const handleSubmit = () => {
    if (!reviewer.trim()) return;

    if (action === 'approve') {
      approveMutation.mutate({ params: { id: change.id }, data: { reviewedBy: reviewer, notes } }, {
        onSuccess: () => {
          toast({ title: "Change approved" });
          queryClient.invalidateQueries({ queryKey: getListEnrollmentChangesQueryKey() });
          setAction(null);
        },
        onError: () => toast({ title: "Failed to approve change", variant: "destructive" })
      });
    } else if (action === 'deny') {
      denyMutation.mutate({ params: { id: change.id }, data: { reviewedBy: reviewer, notes } }, {
        onSuccess: () => {
          toast({ title: "Change denied" });
          queryClient.invalidateQueries({ queryKey: getListEnrollmentChangesQueryKey() });
          setAction(null);
        },
        onError: () => toast({ title: "Failed to deny change", variant: "destructive" })
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => setAction('approve')}>Approve</Button>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setAction('deny')}>Deny</Button>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={action === 'approve' ? "text-emerald-700" : "text-red-700"}>
              {action === 'approve' ? "Approve Change" : "Deny Change"}
            </DialogTitle>
            <DialogDescription>
              {change.description}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Reviewed By</Label>
              <Input value={reviewer} onChange={(e) => setReviewer(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder={action === 'deny' ? "Please provide a reason for denial..." : "Add any approval notes..."} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                required={action === 'deny'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button 
              variant={action === 'approve' ? "default" : "destructive"} 
              onClick={handleSubmit} 
              disabled={isPending || (action === 'deny' && !notes.trim())}
            >
              {isPending ? "Processing..." : action === 'approve' ? "Confirm Approval" : "Confirm Denial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
