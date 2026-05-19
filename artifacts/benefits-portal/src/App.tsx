import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";

import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import EmployeeDetail from "@/pages/employee-detail";
import Enrollments from "@/pages/enrollments";
import Benefits from "@/pages/benefits";
import Carriers from "@/pages/carriers";
import Documents from "@/pages/documents";
import Integrations from "@/pages/integrations";
import Employers from "@/pages/employers";
import Users from "@/pages/users";
import DependentsPage from "@/pages/dependents";
import EnrollmentPeriods from "@/pages/enrollment-periods";
import Approvals from "@/pages/approvals";
import NotificationsPage from "@/pages/notifications";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employees" component={Employees} />
        <Route path="/employees/:id" component={EmployeeDetail} />
        <Route path="/enrollments" component={Enrollments} />
        <Route path="/benefits" component={Benefits} />
        <Route path="/carriers" component={Carriers} />
        <Route path="/documents" component={Documents} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/employers" component={Employers} />
        <Route path="/users" component={Users} />
        <Route path="/dependents" component={DependentsPage} />
        <Route path="/enrollment-periods" component={EnrollmentPeriods} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
