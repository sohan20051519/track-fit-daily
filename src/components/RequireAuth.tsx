import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { AppShell } from "./AppShell";
import { OnboardingDialog } from "./OnboardingDialog";
import { WeightPromptDialog } from "./WeightPromptDialog";
import { Activity } from "lucide-react";

interface ProfileData {
  onboarded: boolean;
  gender: string | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: string | null;
  goal_type: string | null;
  weight_track_frequency: "daily" | "weekly";
  preferred_weigh_day: number;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [needsWeight, setNeedsWeight] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | undefined>(undefined);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const sevenAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const [{ data: p }, { data: todayWeight }, { data: lastW }, { data: weekW }] = await Promise.all([
        supabase.from("profiles")
          .select("onboarded, gender, birth_date, height_cm, activity_level, goal_type, weight_track_frequency, preferred_weigh_day")
          .eq("id", user.id).maybeSingle(),
        supabase.from("weight_logs").select("weight_kg").eq("date", today).maybeSingle(),
        supabase.from("weight_logs").select("weight_kg").order("date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("weight_logs").select("date").gte("date", sevenAgo).order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const prof: ProfileData = {
        onboarded: p?.onboarded ?? false,
        gender: p?.gender ?? null,
        birth_date: p?.birth_date ?? null,
        height_cm: p?.height_cm ?? null,
        activity_level: p?.activity_level ?? null,
        goal_type: p?.goal_type ?? null,
        weight_track_frequency: ((p?.weight_track_frequency as "daily" | "weekly") ?? "daily"),
        preferred_weigh_day: p?.preferred_weigh_day ?? 1,
      };
      setProfile(prof);
      setLastWeight(lastW ? Number(lastW.weight_kg) : undefined);

      if (prof.onboarded) {
        if (prof.weight_track_frequency === "daily") {
          if (!todayWeight) setNeedsWeight(true);
        } else {
          // Weekly: prompt on preferred day if not logged in last 7 days
          const todayDow = new Date().getDay();
          if (todayDow === prof.preferred_weigh_day && !weekW) setNeedsWeight(true);
        }
      }
      setBootstrapped(true);
    })();
  }, [user]);

  if (loading || !user || !bootstrapped) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow animate-float">
          <Activity className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Loading</div>
      </div>
    );
  }

  return (
    <>
      <AppShell>{children}</AppShell>

      {profile && !profile.onboarded && (
        <OnboardingDialog
          open={true}
          onDone={() => {
            setProfile({ ...profile, onboarded: true });
            setNeedsWeight(false);
          }}
        />
      )}
      {profile?.onboarded && needsWeight && (
        <WeightPromptDialog
          open={true}
          onClose={() => setNeedsWeight(false)}
          defaultWeight={lastWeight}
          profile={profile}
          frequency={profile.weight_track_frequency}
        />
      )}
    </>
  );
}
