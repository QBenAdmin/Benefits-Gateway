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
  Clock,
  TimerOff,
  CheckCircle2,
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

type ScheduleFilter = "all" | "on_track" | "due_soon" | "overdue";

const SCHEDULE_FILTERS: { value: ScheduleFilter; label: string; icon: React.ElementType; activeClass: string }[] = [
  { value: "all", label: "All", icon: ClipboardList, activeClass: "bg-primary text-primary-foreground" },
  { value: "on_track", label: "On Track", icon: CheckCircle2, activeClass: "bg-emerald-600 text-white" },
  { value: "due_soon", label: "Due Soon", icon: Clock, activeClass: "bg-amber-500 text-white" },
  { value: "overdue", label: "Overdue", icon: TimerOff, activeClass: "bg-red-600 text-white" },
];

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

function ScheduleBadge({ scheduleStatus }: { scheduleStatus?: string | null }) {
  if (!scheduleStatus) return null;
  const config: Record<string, { label: string; className: string }> = {
    on_track: { label: "On Track", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    due_soon: { label: "Due Soon", className: "bg-amber-100 text-amber-700 border-amber-200" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
  };
  const c = config[scheduleStatus] ?? { label: scheduleStatus, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function AuditList() {
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const { data: sessionData, isLoading } = useListAuditSessions(
    scheduleFilter !== "all" ? { scheduleStatus: scheduleFilter } : {},
  );
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

      {/* Schedule Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Filter:</span>
        {SCHEDULE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = scheduleFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => setScheduleFilter(filter.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                isActive
                  ? filter.activeClass + " border-transparent shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border">
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            {scheduleFilter !== "all" ? (
              <>
                <h3 className="font-semibold text-foreground mb-1">No audits match this filter</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No audit sessions with status "{SCHEDULE_FILTERS.find((f) => f.value === scheduleFilter)?.label}".
                </p>
                <Button variant="outline" size="sm" onClick={() => setScheduleFilter("all")}>
                  Show all audits
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
                        {session.scheduleStatus && (
                          <ScheduleBadge scheduleStatus={session.scheduleStatus} />
                        )}
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
                        {session.nextDueDate && (
                          <span className={`flex items-center gap-1 font-medium ${
                            session.scheduleStatus === "overdue"
                              ? "text-red-600"
                              : session.scheduleStatus === "due_soon"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }`}>
                            <Clock className="h-3.5 w-3.5" />
                            Next due: {format(parseISO(session.nextDueDate), "MMM d, yyyy")}
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
