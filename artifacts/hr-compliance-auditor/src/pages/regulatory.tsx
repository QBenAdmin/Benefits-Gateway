import { useState } from "react";
import { useGetAuditRegulatoryFeed } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, AlertTriangle, Info, Newspaper } from "lucide-react";
import { format } from "date-fns";

export default function Regulatory() {
  const [refetchCount, setRefetchCount] = useState(0);
  const { data: feed, isLoading, isFetching, refetch } = useGetAuditRegulatoryFeed({
    query: { queryKey: ["audit-regulatory-feed", refetchCount] },
  });

  const handleRefresh = () => {
    setRefetchCount((c) => c + 1);
    refetch();
  };

  const renderFeedItems = (
    items: Array<{ title: string; link: string; pubDate: string; excerpt?: string | null; source: string }>,
    source: string,
    colorClass: string,
    tagClass: string
  ) => {
    if (!items || items.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          Could not load {source} feed. Check your connection.
        </div>
      );
    }
    return (
      <div className="divide-y">
        {items.map((item, idx) => (
          <div key={idx} className="px-5 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex flex-shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagClass}`}>
                {source}
              </span>
            </div>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {item.title}
            </a>
            {item.excerpt && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
                {item.excerpt}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {item.pubDate && (
                <span>
                  {(() => {
                    try {
                      return format(new Date(item.pubDate), "MMMM d, yyyy");
                    } catch {
                      return item.pubDate;
                    }
                  })()}
                </span>
              )}
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 font-medium ${colorClass} hover:underline`}
              >
                Read more <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[Outfit] text-2xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Regulatory Updates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest guidance from EEOC and California Civil Rights Department
          </p>
        </div>
        <div className="flex items-center gap-3">
          {feed?.lastRefreshed && (
            <span className="text-xs text-muted-foreground">
              Last refreshed:{" "}
              {(() => {
                try {
                  return format(new Date(feed.lastRefreshed), "MMM d, h:mm a");
                } catch {
                  return "";
                }
              })()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Why this matters */}
      <Card className="border bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Why this matters —</strong> EEOC and California Civil Rights Department guidance directly shapes how Title VII
            disparate impact liability is interpreted. Staying current ensures your audit criteria reflect the latest regulatory
            expectations, enforcement priorities, and emerging legal standards for AI in hiring.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EEOC Feed */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-blue-50/50">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                EEOC
              </span>
              U.S. Equal Employment Opportunity Commission
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Federal Title VII enforcement, AI guidance, litigation updates
            </p>
          </CardHeader>
          {isLoading ? (
            <CardContent className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </CardContent>
          ) : (
            renderFeedItems(
              (feed?.eeoc ?? []).map((i) => ({ ...i, source: "EEOC" })),
              "EEOC",
              "text-blue-600",
              "bg-blue-100 text-blue-700"
            )
          )}
        </Card>

        {/* CA CRD Feed */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-amber-50/50">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                CA CRD
              </span>
              California Civil Rights Department
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              California employment discrimination, FEHA enforcement, state AI rules
            </p>
          </CardHeader>
          {isLoading ? (
            <CardContent className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </CardContent>
          ) : (
            renderFeedItems(
              (feed?.caCrd ?? []).map((i) => ({ ...i, source: "CA CRD" })),
              "CA CRD",
              "text-amber-600",
              "bg-amber-100 text-amber-700"
            )
          )}
        </Card>
      </div>

      {/* Sources */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Official Sources
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <a href="https://www.eeoc.gov/rss/newsroom" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="h-3 w-3" />
              EEOC Newsroom RSS
            </a>
            <a href="https://calcivilrights.ca.gov/employment/" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="h-3 w-3" />
              CA CRD Employment Discrimination
            </a>
            <a href="https://aiajacademy.io/hr" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="h-3 w-3" />
              AIAJ Academy ERT Framework
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
