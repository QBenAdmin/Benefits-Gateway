import { useListIntegrations, useSyncIntegration, getListIntegrationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Plug, PiggyBank, Building2, Users, Zap } from "lucide-react";
import { format } from "date-fns";

type Integration = {
  id: number;
  name: string;
  provider: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
  syncedEmployees: number;
  apiEndpoint: string | null;
  notes: string | null;
  createdAt: string;
};

const INTEGRATION_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  payroll:    { label: "Payroll",          icon: Building2, color: "text-blue-600"  },
  hris:       { label: "HRIS",             icon: Users,     color: "text-violet-600" },
  retirement: { label: "Retirement Plans", icon: PiggyBank, color: "text-emerald-600" },
  carrier:    { label: "Carrier",          icon: Zap,       color: "text-amber-600"  },
};

const PROVIDER_LOGOS: Record<string, { bg: string; text: string; abbr: string }> = {
  "human-interest": { bg: "bg-emerald-600", text: "text-white", abbr: "HI" },
  "adp":            { bg: "bg-red-600",     text: "text-white", abbr: "ADP" },
  "gusto":          { bg: "bg-green-500",   text: "text-white", abbr: "G" },
  "rippling":       { bg: "bg-yellow-500",  text: "text-black", abbr: "R" },
  "bamboohr":       { bg: "bg-green-700",   text: "text-white", abbr: "B" },
  "workday":        { bg: "bg-blue-700",    text: "text-white", abbr: "WD" },
};

function ProviderLogo({ provider, name }: { provider: string; name: string }) {
  const meta = PROVIDER_LOGOS[provider];
  const bg   = meta?.bg   ?? "bg-[var(--color-primary)]";
  const text = meta?.text ?? "text-white";
  const abbr = meta?.abbr ?? name.slice(0, 2).toUpperCase();
  return (
    <div className={`h-11 w-11 rounded-lg ${bg} ${text} flex items-center justify-center font-bold text-sm shrink-0`}>
      {abbr}
    </div>
  );
}

function IntegrationCard({ integration, onSync, syncing }: {
  integration: Integration;
  onSync: (id: number) => void;
  syncing: boolean;
}) {
  const typeMeta = INTEGRATION_TYPE_META[integration.type] ?? { label: integration.type, icon: Plug, color: "text-muted-foreground" };
  const TypeIcon = typeMeta.icon;
  const isConnected = integration.status === "connected";
  const isError     = integration.status === "error";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProviderLogo provider={integration.provider} name={integration.name} />
            <div>
              <CardTitle className="text-base leading-tight">{integration.name}</CardTitle>
              <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${typeMeta.color}`}>
                <TypeIcon className="h-3 w-3" />
                {typeMeta.label}
              </div>
            </div>
          </div>
          <Badge
            variant={isConnected ? "default" : isError ? "destructive" : "secondary"}
            className="capitalize shrink-0 mt-0.5"
          >
            {integration.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="text-sm flex-1 pb-4 space-y-3">
        {integration.notes && (
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{integration.notes}</p>
        )}
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {isConnected ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : isError ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {integration.lastSyncAt
              ? `Last synced ${format(new Date(integration.lastSyncAt), "MMM d, h:mm a")}`
              : "Never synced"}
          </span>
        </div>
        {integration.syncedEmployees > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{integration.syncedEmployees}</span> employees synced
          </div>
        )}
        {integration.apiEndpoint && (
          <div className="text-xs text-muted-foreground font-mono truncate" title={integration.apiEndpoint}>
            {integration.apiEndpoint}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex justify-between gap-2">
        <Button variant="outline" size="sm">Configure</Button>
        <Button
          size="sm"
          onClick={() => onSync(integration.id)}
          disabled={syncing || !isConnected}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync Now
        </Button>
      </CardFooter>
    </Card>
  );
}

const TYPE_ORDER = ["retirement", "payroll", "hris", "carrier"];

export default function Integrations() {
  const { data: integrations, isLoading } = useListIntegrations({ query: { queryKey: getListIntegrationsQueryKey() } });
  const syncIntegration = useSyncIntegration();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = (id: number) => {
    syncIntegration.mutate({ id }, {
      onSuccess: (data) => {
        toast({ title: "Sync complete", description: data.message });
        queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Sync failed", variant: "destructive" });
      },
    });
  };

  // Group by type
  const grouped = (integrations ?? []).reduce<Record<string, Integration[]>>((acc, item) => {
    const t = item.type ?? "payroll";
    (acc[t] ??= []).push(item as Integration);
    return acc;
  }, {});

  const orderedTypes = [
    ...TYPE_ORDER.filter((t) => grouped[t]),
    ...Object.keys(grouped).filter((t) => !TYPE_ORDER.includes(t)),
  ];

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground">Manage connections to payroll, HRIS, retirement, and carrier systems.</p>
        </div>
        <Button>
          <Plug className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </div>

      {/* Human Interest highlight banner */}
      {!isLoading && grouped["retirement"]?.some((i) => i.provider === "human-interest") && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
            HI
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-emerald-900">Human Interest — 401(k) Retirement Plans</p>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Connected</Badge>
            </div>
            <p className="text-sm text-emerald-700 mt-0.5">
              Employee eligibility and deferral elections are syncing automatically with Human Interest.
              {grouped["retirement"][0]?.syncedEmployees
                ? ` ${grouped["retirement"][0].syncedEmployees} employees currently enrolled.`
                : ""}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100">
              View Dashboard
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                const hi = grouped["retirement"]?.find((i) => i.provider === "human-interest");
                if (hi) handleSync(hi.id);
              }}
              disabled={syncIntegration.isPending}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncIntegration.isPending ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-11 w-full" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grouped sections */}
      {!isLoading && orderedTypes.map((type) => {
        const meta = INTEGRATION_TYPE_META[type] ?? { label: type, icon: Plug, color: "text-muted-foreground" };
        const SectionIcon = meta.icon;
        return (
          <section key={type}>
            <div className={`flex items-center gap-2 mb-4 ${meta.color}`}>
              <SectionIcon className="h-4 w-4" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">{meta.label}</h3>
              <span className="text-muted-foreground text-xs font-normal normal-case tracking-normal ml-1">
                {grouped[type].length} {grouped[type].length === 1 ? "integration" : "integrations"}
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {grouped[type].map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onSync={handleSync}
                  syncing={syncIntegration.isPending && syncIntegration.variables?.id === integration.id}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state */}
      {!isLoading && orderedTypes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Plug className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">No integrations configured</p>
          <p className="text-sm mt-1">Click "Add Integration" to connect your first system.</p>
        </div>
      )}
    </div>
  );
}
