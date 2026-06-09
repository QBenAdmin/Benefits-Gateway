import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  Newspaper,
  Shield,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Audit Sessions", href: "/audits", icon: ClipboardList },
  { name: "New Audit", href: "/audits/new", icon: Plus },
  { name: "Regulatory Updates", href: "/regulatory", icon: Newspaper },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background sidebar-layout">
      <div className="sidebar-layout-sidebar hidden border-r bg-sidebar md:flex md:w-64 md:flex-col no-print">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30">
            <Scale className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div>
            <div className="font-[Outfit] text-sm font-bold tracking-tight text-sidebar-foreground leading-tight">
              ERT Compliance
            </div>
            <div className="text-xs text-sidebar-foreground/60 leading-tight">
              Auditor
            </div>
          </div>
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
                      "mr-3 h-4 w-4 flex-shrink-0",
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
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <Shield className="h-3.5 w-3.5" />
            <span>ERT Framework v1.0</span>
          </div>
          <div className="mt-1.5 text-xs text-sidebar-foreground/40">
            Title VII · 29 CFR Part 1607
          </div>
        </div>
      </div>
      <main className="sidebar-layout-main flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
