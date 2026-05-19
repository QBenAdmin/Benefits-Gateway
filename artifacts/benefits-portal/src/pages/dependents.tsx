import { Link } from "wouter";
import { 
  useListAgingOutDependents, 
  getListAgingOutDependentsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronRight, Send, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DependentsPage() {
  const { data: agingDependents, isLoading } = useListAgingOutDependents(undefined, { query: { queryKey: getListAgingOutDependentsQueryKey() } });
  const { toast } = useToast();

  const handleSendNotice = (email: string) => {
    toast({ title: `COBRA notice sent to ${email}` });
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Dependents</h2>
        <p className="text-muted-foreground">Overview of employee dependents and compliance alerts.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <CardTitle className="text-amber-800 dark:text-amber-400">Age-Out Alerts</CardTitle>
            </div>
            <CardDescription className="text-amber-700/80 dark:text-amber-500/80">
              Dependents turning 26 within the next 60 days who require COBRA notification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-amber-200/50 hover:bg-transparent dark:border-amber-900/50">
                  <TableHead className="text-amber-900 dark:text-amber-400">Dependent</TableHead>
                  <TableHead className="text-amber-900 dark:text-amber-400">Employee</TableHead>
                  <TableHead className="text-amber-900 dark:text-amber-400">Relationship</TableHead>
                  <TableHead className="text-amber-900 dark:text-amber-400">Turns 26 On</TableHead>
                  <TableHead className="text-amber-900 dark:text-amber-400">Status</TableHead>
                  <TableHead className="text-right text-amber-900 dark:text-amber-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-amber-200/50 hover:bg-transparent dark:border-amber-900/50">
                      <TableCell><Skeleton className="h-4 w-24 bg-amber-200/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-amber-200/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-amber-200/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-amber-200/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 bg-amber-200/50" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto bg-amber-200/50" /></TableCell>
                    </TableRow>
                  ))
                ) : agingDependents?.length === 0 ? (
                  <TableRow className="border-amber-200/50 hover:bg-transparent dark:border-amber-900/50">
                    <TableCell colSpan={6} className="text-center h-24 text-amber-700 dark:text-amber-500">
                      No dependents aging out in the next 60 days.
                    </TableCell>
                  </TableRow>
                ) : (
                  agingDependents?.map((dep) => (
                    <TableRow key={dep.id} className="border-amber-200/50 hover:bg-transparent dark:border-amber-900/50">
                      <TableCell className="font-medium text-amber-900 dark:text-amber-300">
                        {dep.firstName} {dep.lastName}
                      </TableCell>
                      <TableCell>
                        <Link href={`/employees/${dep.employeeId}`} className="text-amber-700 hover:text-amber-900 hover:underline dark:text-amber-400 dark:hover:text-amber-300">
                          {dep.employeeName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-400 capitalize">
                          {dep.relationship.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-amber-800 dark:text-amber-400">
                        {format(new Date(dep.turnsAge26On), 'MMM d, yyyy')}
                        <span className="ml-2 text-xs font-semibold text-red-600 dark:text-red-400">
                          ({dep.daysUntilAgeOut} days)
                        </span>
                      </TableCell>
                      <TableCell>
                        {dep.cobraNoticeSentAt ? (
                          <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                            <Clock className="mr-1 h-3 w-3" /> Notice Sent
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-amber-600 dark:text-amber-500 font-semibold">
                            Action Required
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!dep.cobraNoticeSentAt ? (
                          <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-700 dark:hover:bg-amber-800" onClick={() => handleSendNotice(dep.employeeEmail)}>
                            <Send className="mr-2 h-3 w-3" /> Send COBRA Notice
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled>
                            Sent
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Looking for general dependent management?</AlertTitle>
          <AlertDescription className="mt-2">
            Dependents are managed within individual employee profiles. 
            Navigate to the <Link href="/employees" className="font-medium underline underline-offset-4">Employees</Link> page 
            and select an employee to view, add, or update their dependents.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
