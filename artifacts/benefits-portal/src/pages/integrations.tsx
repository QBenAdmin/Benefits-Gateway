import { useListIntegrations, useSyncIntegration, getListIntegrationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Server } from "lucide-react";
import { format } from "date-fns";

export default function Integrations() {
  const { data: integrations, isLoading } = useListIntegrations({}, { query: { queryKey: getListIntegrationsQueryKey() } });
  const syncIntegration = useSyncIntegration();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = (id: number) => {
    syncIntegration.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Sync triggered successfully" });
        queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Sync failed", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground">Manage connections to payroll and HRIS systems.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))
        ) : (
          integrations?.map((integration) => (
            <Card key={integration.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-primary/5 flex items-center justify-center">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="capitalize">{integration.provider.replace('-', ' ')}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={integration.status === 'connected' ? 'default' : integration.status === 'error' ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {integration.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm pb-4">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  {integration.status === 'connected' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : integration.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>
                    {integration.lastSyncAt 
                      ? `Last synced: ${format(new Date(integration.lastSyncAt), 'MMM d, h:mm a')}`
                      : 'Never synced'}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {integration.syncedEmployees} employees synced
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t flex justify-between">
                <Button variant="outline" size="sm">Configure</Button>
                <Button 
                  size="sm" 
                  onClick={() => handleSync(integration.id)}
                  disabled={syncIntegration.isPending && syncIntegration.variables?.id === integration.id || integration.status === 'disconnected'}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncIntegration.isPending && syncIntegration.variables?.id === integration.id ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}