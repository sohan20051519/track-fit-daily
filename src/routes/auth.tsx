import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, ArrowRight, Dumbbell, Flame, LineChart } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Pulse" }, { name: "description", content: "Sign in to Pulse." }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const submit = async () => {
    setBusy(true);
    const res = mode === "in"
      ? await signIn(email, password)
      : await signUp(email, password, name || email.split("@")[0]);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(mode === "in" ? "Welcome back" : "Account created");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      {/* Ambient blobs behind the glass */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-20 -top-20 h-[60vmax] w-[60vmax] rounded-full opacity-60 blur-3xl animate-drift" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute -bottom-20 -left-20 h-[55vmax] w-[55vmax] rounded-full opacity-50 blur-3xl animate-drift" style={{ background: "var(--gradient-vital)", animationDelay: "-6s" }} />
        <div className="absolute right-1/4 bottom-1/4 h-[40vmax] w-[40vmax] rounded-full opacity-30 blur-3xl animate-drift" style={{ background: "var(--gradient-focus)", animationDelay: "-12s" }} />
      </div>

      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Brand panel — glass */}
        <aside className="relative hidden overflow-hidden rounded-[32px] glass-strong specular p-8 lg:block">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Activity className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-semibold tracking-tight">Pulse</span>
            </div>

            <div className="space-y-6 animate-fade-in-up">
              <span className="inline-block rounded-full bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background">
                Daily fitness OS
              </span>
              <h1 className="font-serif-display text-6xl leading-[1.02] xl:text-7xl">
                Lift heavy.<br />Eat smart.<br />
                <span className="italic opacity-90">See progress.</span>
              </h1>
              <p className="max-w-md text-base text-muted-foreground">
                One calm space for workouts, meals, and weight. Targets that adapt as you change.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Feature icon={<Dumbbell className="h-4 w-4" />} label="Workouts" />
                <Feature icon={<Flame className="h-4 w-4" />} label="Nutrition" />
                <Feature icon={<LineChart className="h-4 w-4" />} label="Progress" />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">© Pulse · Built for consistency</div>
          </div>
        </aside>

        {/* Form */}
        <main className="rounded-[32px] glass-strong specular p-6 sm:p-8">
          <div className="mx-auto w-full max-w-md animate-fade-in-up">
            <div className="mb-6 flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow lg:hidden">
                <Activity className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {mode === "in" ? "Welcome back" : "Get started"}
              </p>
              <h2 className="font-serif-display text-3xl sm:text-4xl">
                {mode === "in" ? "Sign in to Pulse" : "Create your account"}
              </h2>
            </div>

            {/* Toggle */}
            <div className="mb-5 inline-flex w-full rounded-full bg-white/50 p-1 text-sm font-medium backdrop-blur">
              {(["in", "up"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full px-4 py-2 transition-all ${
                    mode === m ? "bg-foreground text-background shadow-soft" : "text-muted-foreground"
                  }`}
                >
                  {m === "in" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1.5 animate-fade-in-up">
                  <Label htmlFor="name" className="text-[10px] uppercase tracking-wider text-muted-foreground">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw" className="text-[10px] uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur" required />
              </div>
              <Button type="submit" disabled={busy} className="group mt-2 h-12 w-full rounded-2xl bg-foreground text-background shadow-card transition-all hover:bg-foreground/90 hover:shadow-glow">
                {mode === "in" ? "Sign in" : "Create account"}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>

            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              By continuing you agree to our terms & privacy.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl glass-tint specular p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
