import { Link } from "wouter";
import { useListAuditSessions, useGetAuditDashboard, useGetAuditRegulatoryFeed } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Newspaper,
  Bell,
  TimerOff,
} from "lucide-react";
import { format, parseISO } from "date-fns";

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

export default function Dashboard() {
  const { data: dashboard, isLoading: dashLoading } = useGetAuditDashboard();
  const { data: sessionData } = useListAuditSessions();
  const { data: feed, isLoading: feedLoading } = useGetAuditRegulatoryFeed();

  const recentSessions = (sessionData?.sessions ?? []).slice(-5).reverse();

  const dueSoonSessions = dashboard?.dueSoonSessions ?? [];
  const overdueSessions = dashboard?.overdueSessions ?? [];
  const hasAlerts = dueSoonSessions.length > 0 || overdueSessions.length > 0;

  const kpis = [
    {
      label: "Total Audits Run",
      value: dashboard?.totalAudits ?? 0,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Passing All Pillars",
      value: dashboard?.passingAudits ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Open / Scheduled",
      value: dashboard?.openAudits ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Last Audit",
      value: dashboard?.lastAuditDate
        ? format(parseISO(dashboard.lastAuditDate), "MMM d, yyyy")
        : "—",
      icon: Calendar,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  const allFeedItems = [
    ...(feed?.eeoc?.slice(0, 5).map((item) => ({ ...item, source: "EEOC" })) ?? []),
    ...(feed?.caCrd?.slice(0, 5).map((item) => ({ ...item, source: "CA CRD" })) ?? []),
  ].sort((a, b) => {
    try {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    } catch {
      return 0;
    }
  }).slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[Outfit] text-2xl font-bold text-foreground">
            Compliance Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HR Title VII AI Audit — ERT Framework Overview
          </p>
        </div>
        <Link href="/audits/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Start New Audit
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-5">
              {dashLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {kpi.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground font-[Outfit]">
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Due Soon / Overdue Alerts */}
      {dashLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : hasAlerts ? (
        <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Upcoming &amp; Overdue Audits
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {overdueSessions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <TimerOff className="h-3.5 w-3.5" />
                  Overdue ({overdueSessions.length})
                </p>
                <div className="space-y-1.5">
                  {overdueSessions.map((session) => (
                    <Link key={session.id} href={`/audits/${session.id}`}>
                      <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-100 px-3 py-2 hover:bg-red-100/70 transition-colors cursor-pointer">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-red-800 truncate">{session.name}</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Was due {session.nextDueDate ? format(parseISO(session.nextDueDate), "MMM d, yyyy") : "—"} · {session.cadence}
                          </p>
                        </div>
                        <ScheduleBadge scheduleStatus="overdue" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {dueSoonSessions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Due Soon ({dueSoonSessions.length})
                </p>
                <div className="space-y-1.5">
                  {dueSoonSessions.map((session) => (
                    <Link key={session.id} href={`/audits/${session.id}`}>
                      <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-100 px-3 py-2 hover:bg-amber-100/70 transition-colors cursor-pointer">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-800 truncate">{session.name}</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Due {session.nextDueDate ? format(parseISO(session.nextDueDate), "MMM d, yyyy") : "—"} · {session.cadence}
                          </p>
                        </div>
                        <ScheduleBadge scheduleStatus="due_soon" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Audits */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Audits
            </h2>
            <Link href="/audits">
              <Button variant="ghost" size="sm" className="text-xs">
                View all →
              </Button>
            </Link>
          </div>
          <Card className="border shadow-sm">
            {recentSessions.length === 0 ? (
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No audits yet.</p>
                <Link href="/audits/new">
                  <Button size="sm" className="mt-3 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Start your first audit
                  </Button>
                </Link>
              </CardContent>
            ) : (
              <div className="divide-y">
                {recentSessions.map((session) => (
                  <Link key={session.id} href={`/audits/${session.id}`}>
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.vendorSystem ?? "No vendor specified"} · {session.cadence}
                          {session.nextDueDate && (
                            <span className="ml-1">· Next due {format(parseISO(session.nextDueDate), "MMM d, yyyy")}</span>
                          )}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                        {session.scheduleStatus && (
                          <ScheduleBadge scheduleStatus={session.scheduleStatus} />
                        )}
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Regulatory Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              Regulatory Updates
            </h2>
            <Link href="/regulatory">
              <Button variant="ghost" size="sm" className="text-xs">
                View all →
              </Button>
            </Link>
          </div>
          <Card className="border shadow-sm">
            {feedLoading ? (
              <CardContent className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            ) : allFeedItems.length === 0 ? (
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Could not load feed.</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later.</p>
              </CardContent>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {allFeedItems.map((item, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.source === "EEOC"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.source}
                      </span>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{item.pubDate ? format(new Date(item.pubDate), "MMM d, yyyy") : ""}</span>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Legal Basis Footer */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Sources &amp; Legal Basis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
            <span>• Title VII of the Civil Rights Act of 1964 (42 U.S.C. §2000e)</span>
            <span>• EEOC Uniform Guidelines on Employee Selection Procedures, 29 CFR Part 1607</span>
            <span>• AIAJ Academy — ERT Framework for AI in HR (aiajacademy.io/hr)</span>
            <span>• California Civil Rights Department — Employment Discrimination</span>
            <span>• Griggs v. Duke Power Co., 401 U.S. 424 (1971) — disparate impact doctrine</span>
            <span>• Watson v. Fort Worth Bank &amp; Trust, 487 U.S. 977 (1988) — subjective criteria</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
