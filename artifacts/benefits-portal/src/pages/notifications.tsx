import { useState } from "react";
import { 
  useListNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead, 
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, isToday, isThisWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Check, CheckCircle2, ChevronRight, Bell, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all"|"unread"|"high">("all");
  const { data: notifications, isLoading } = useListNotifications(undefined, { query: { queryKey: getListNotificationsQueryKey() } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "All notifications marked as read" });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  let filtered = notifications || [];
  if (filter === "unread") filtered = filtered.filter(n => !n.isRead);
  if (filter === "high") filtered = filtered.filter(n => n.priority === 'high');

  const today = filtered.filter(n => isToday(new Date(n.createdAt)));
  const thisWeek = filtered.filter(n => !isToday(new Date(n.createdAt)) && isThisWeek(new Date(n.createdAt)));
  const earlier = filtered.filter(n => !isToday(new Date(n.createdAt)) && !isThisWeek(new Date(n.createdAt)));

  return (
    <div className="flex-1 space-y-6 p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">Stay updated on system alerts and employee actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending || !notifications?.some(n => !n.isRead)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pb-2">
        <Button variant={filter === 'all' ? "default" : "outline"} size="sm" onClick={() => setFilter('all')} className="rounded-full">All</Button>
        <Button variant={filter === 'unread' ? "default" : "outline"} size="sm" onClick={() => setFilter('unread')} className="rounded-full">Unread</Button>
        <Button variant={filter === 'high' ? "default" : "outline"} size="sm" onClick={() => setFilter('high')} className="rounded-full">High Priority</Button>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">All caught up</p>
            <p className="text-sm">You have no {filter !== 'all' ? filter : ''} notifications at this time.</p>
          </div>
        ) : (
          <>
            {today.length > 0 && <NotificationGroup title="Today" items={today} onMarkRead={handleMarkRead} />}
            {thisWeek.length > 0 && <NotificationGroup title="This Week" items={thisWeek} onMarkRead={handleMarkRead} />}
            {earlier.length > 0 && <NotificationGroup title="Earlier" items={earlier} onMarkRead={handleMarkRead} />}
          </>
        )}
      </div>
    </div>
  );
}

function NotificationGroup({ title, items, onMarkRead }: { title: string, items: any[], onMarkRead: (id: number) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">
        {items.map(notif => (
          <Card key={notif.id} className={cn(
            "transition-colors",
            !notif.isRead ? "bg-accent/50 border-primary/20" : "bg-card"
          )}>
            <CardContent className="p-4 flex gap-4">
              <div className="pt-1">
                {notif.priority === 'high' ? (
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                ) : (
                  <div className={cn("h-3 w-3 rounded-full", !notif.isRead ? "bg-primary" : "bg-muted")} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <p className={cn("font-medium text-sm", !notif.isRead && "text-primary")}>{notif.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(notif.createdAt), 'h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                
                <div className="flex items-center gap-4 mt-2 pt-2">
                  {notif.relatedEmployeeName && (
                    <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">
                      {notif.relatedEmployeeName}
                    </span>
                  )}
                  {notif.actionUrl && (
                    <Link href={notif.actionUrl} className="text-xs font-medium text-primary flex items-center hover:underline">
                      View details <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  )}
                  {!notif.isRead && (
                    <button 
                      onClick={() => onMarkRead(notif.id)}
                      className="text-xs font-medium text-muted-foreground flex items-center hover:text-foreground ml-auto transition-colors"
                    >
                      <Check className="h-3 w-3 mr-1" /> Mark read
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
