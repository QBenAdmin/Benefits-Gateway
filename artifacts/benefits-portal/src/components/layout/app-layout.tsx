import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Heart, Building2, Blocks, Users2, UserCheck, Calendar, ClipboardCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUnreadNotificationCount, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { ChatbotWidget } from "@/components/chatbot-widget";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Employers", href: "/employers", icon: Building2 },
  { name: "Users", href: "/users", icon: Users2 },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Enrollment Periods", href: "/enrollment-periods", icon: Calendar },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { name: "Enrollments", href: "/enrollments", icon: FileText },
  { name: "Dependents", href: "/dependents", icon: UserCheck },
  { name: "Benefits Plans", href: "/benefits", icon: Heart },
  { name: "Carriers", href: "/carriers", icon: Building2 },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Integrations", href: "/integrations", icon: Blocks },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: unreadCountObj } = useGetUnreadNotificationCount(undefined, { 
    query: { 
      queryKey: getGetUnreadNotificationCountQueryKey(),
      refetchInterval: 30000 
    } 
  });
  
  const unreadCount = unreadCountObj?.count || 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden border-r bg-sidebar md:flex md:w-64 md:flex-col">
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-6">
          <div className="font-[Outfit] text-lg font-semibold tracking-tight text-sidebar-foreground">
            BenePortal
          </div>
          <button 
            onClick={() => setLocation('/notifications')}
            className="relative p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors rounded-full hover:bg-sidebar-accent/50"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
            )}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? location === "/"
                  : location.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium text-sidebar-accent-foreground">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">Jane Doe</span>
              <span className="text-xs text-sidebar-foreground/60">HR Admin</span>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  );
}
