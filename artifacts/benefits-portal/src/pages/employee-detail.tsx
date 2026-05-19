import { useGetEmployee, useUpdateEmployee, getGetEmployeeQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Briefcase, Calendar, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmployeeDetail() {
  const { id } = useParams();
  const empId = parseInt(id || "0", 10);
  
  const { data: employee, isLoading } = useGetEmployee(empId, {
    query: {
      enabled: !!empId,
      queryKey: getGetEmployeeQueryKey(empId)
    }
  });

  if (isLoading) {
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
          <Button variant="outline">Edit Profile</Button>
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
              <span>Hired: {employee.hireDate ? employee.hireDate : "Unknown"}</span>
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            Enrollment data would be displayed here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}