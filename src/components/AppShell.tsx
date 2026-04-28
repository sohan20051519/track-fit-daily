import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Dumbbell, Utensils, LineChart, LogOut, Activity, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/nutrition", label: "Nutrition", icon: Utensils },
  { to: "/progress", label: "Progress", icon: LineChart },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full">

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-3 left-3 z-40 hidden w-60 flex-col rounded-3xl glass specular lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 pb-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-base font-semibold leading-none tracking-tight">Pulse</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Daily fitness</div>
          </div>
        </Link>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-2.5">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-foreground text-background shadow-soft"
                    : "text-muted-foreground hover:bg-white/40 hover:text-foreground",
                )}
              >
                <n.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/40 p-2.5">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-vital text-sm font-semibold text-accent-foreground">
                  {(user?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user?.email?.split("@")[0]}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1 glass-strong border-border">
              <Button asChild variant="ghost" className="w-full justify-start gap-2">
                <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Mobile floating top bar */}
        <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden safe-pt">
          <div className="glass specular flex h-12 items-center justify-between rounded-full px-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Activity className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight">Pulse</span>
            </Link>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-vital text-xs font-semibold text-accent-foreground shadow-soft"
            >
              {(user?.email ?? "?").slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-3 pb-32 pt-4 sm:px-5 sm:pt-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — Apple-style liquid glass */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mx-auto max-w-md px-3 pb-3 safe-pb">
          <div className="glass-strong flex items-center justify-around rounded-[28px] p-1.5">
            {NAV.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "pressable relative flex flex-1 flex-col items-center gap-0.5 overflow-hidden rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors",
                    active ? "bg-foreground text-background shadow-soft" : "text-muted-foreground",
                  )}
                >
                  <n.icon className="relative h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
