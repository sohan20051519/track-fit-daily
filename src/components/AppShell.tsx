import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Dumbbell, Utensils, LineChart, LogOut, Activity, Sparkles } from "lucide-react";
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
    <div className="min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-6 pb-4 pt-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-semibold leading-none tracking-tight">Pulse</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Daily fitness</div>
          </div>
        </Link>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
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
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <n.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                <span>{n.label}</span>
                {active && <Sparkles className="ml-auto h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-secondary">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-vital text-sm font-semibold text-accent-foreground">
                  {(user?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user?.email?.split("@")[0]}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl lg:hidden safe-pt">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">Pulse</span>
          </Link>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-vital text-sm font-semibold text-accent-foreground"
          >
            {(user?.email ?? "?").slice(0, 1).toUpperCase()}
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mx-auto max-w-md px-3 pb-3 safe-pb">
          <div className="glass flex items-center justify-around rounded-3xl border border-border/40 p-1.5 shadow-card">
            {NAV.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "pressable relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-2xl bg-foreground/[0.06]" />
                  )}
                  <n.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
