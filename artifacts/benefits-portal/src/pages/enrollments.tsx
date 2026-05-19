import { useState } from "react";
import { useListEnrollments, getListEnrollmentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Send, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function Enrollments() {
  const [search, setSearch] = useState("");
  const { data: enrollments, isLoading } = useListEnrollments({}, { query: { queryKey: getListEnrollmentsQueryKey({}) } });

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Enrollments</h2>
          <p className="text-muted-foreground">Track and transmit employee benefit elections.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Transmit Selected
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enrollments..."
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
                <TableHead>Employee</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transmission</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : enrollments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No enrollments found.
                  </TableCell>
                </TableRow>
              ) : (
                enrollments?.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.employeeName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{enrollment.planName}</span>
                        <span className="text-xs text-muted-foreground">{enrollment.carrierName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{enrollment.coverageLevel?.replace('-', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={enrollment.transmissionStatus === 'transmitted' ? 'outline' : 'destructive'} className="capitalize">
                        {enrollment.transmissionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{enrollment.effectiveDate ? format(new Date(enrollment.effectiveDate), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
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