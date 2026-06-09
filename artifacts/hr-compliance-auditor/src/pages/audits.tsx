import { Link } from "wouter";
import { useListAuditSessions, useDeleteAuditSession, getListAuditSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ClipboardList,
  Trash2,
  ChevronRight,
  Calendar,
  Building2,
  RefreshCw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const CADENCE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  calendar_year: "Calendar Year",
  rolling_12: "12-Month Rolling",
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    complete: { label: "Complete", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    draft: { label: "Draft", className: "bg-amber-100 text-amber-700 border-amber-200" },
    in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  };
  const c = config[status] ?? { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function AuditList() {
  const { data: sessionData, isLoading } = useListAuditSessions();
  const sessions = sessionData?.sessions ?? [];
  const deleteSession = useDeleteAuditSession();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this audit session? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteSession.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAuditSessionsQueryKey() });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[Outfit] text-2xl font-bold text-foreground">Audit Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All compliance audit runs · {sessionData?.total ?? 0} total
          </p>
        </div>
        <Link href="/audits/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Audit
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border">
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">No audits yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start your first Title VII compliance audit to identify potential disparate impact.
            </p>
            <Link href="/audits/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Start your first audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map((session) => (
            <Link key={session.id} href={`/audits/${session.id}`}>
              <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {session.name}
                        </span>
                        <StatusBadge status={session.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {session.vendorSystem && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {session.vendorSystem}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          {CADENCE_LABELS[session.cadence] ?? session.cadence}
                        </span>
                        {session.windowStart && session.windowEnd && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(session.windowStart), "MMM d, yyyy")} –{" "}
                            {format(parseISO(session.windowEnd), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="text-muted-foreground/70">
                          Created {format(parseISO(session.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(session.id, e)}
                        disabled={deleting === session.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
