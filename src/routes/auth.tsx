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
    <div className="relative grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
      {/* Left – brand panel */}
      <aside className="relative hidden overflow-hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-80" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">Pulse</span>
        </div>

        <div className="relative space-y-8 animate-fade-in-up">
          <div>
            <p className="mb-3 inline-block rounded-full border border-white/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]">
              Daily fitness OS
            </p>
            <h1 className="font-serif-display text-6xl leading-[1.05] xl:text-7xl">
              Lift heavy.<br />Eat smart.<br />
              <span className="italic opacity-90">See progress.</span>
            </h1>
          </div>
          <p className="max-w-md text-base text-white/80">
            One calm space for your workouts, meals, and weight. Personalized targets that adapt as you change.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            <Feature icon={<Dumbbell className="h-4 w-4" />} label="Workouts" />
            <Feature icon={<Flame className="h-4 w-4" />} label="Nutrition" />
            <Feature icon={<LineChart className="h-4 w-4" />} label="Progress" />
          </div>
        </div>

        <div className="relative text-xs text-white/60">© Pulse · Built for consistency</div>
      </aside>

      {/* Right – form */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <h1 className="font-serif-display text-4xl">Pulse</h1>
            <p className="text-sm text-muted-foreground">Daily fitness OS</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {mode === "in" ? "Welcome back" : "Get started"}
            </p>
            <h2 className="mt-2 font-serif-display text-4xl">
              {mode === "in" ? "Sign in to your space" : "Create your account"}
            </h2>
          </div>

          {/* Toggle */}
          <div className="mb-6 inline-flex w-full rounded-full bg-secondary p-1 text-sm font-medium">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-4 py-2 transition-all ${
                  mode === m ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                {m === "in" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            {mode === "up" && (
              <div className="space-y-2 animate-fade-in-up">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  className="h-12 rounded-2xl bg-card"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 rounded-2xl bg-card"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-2xl bg-card"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="group h-12 w-full rounded-2xl bg-foreground text-background shadow-card transition-all hover:bg-foreground/90 hover:shadow-glow"
            >
              {mode === "in" ? "Sign in" : "Create account"}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms & privacy.
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
