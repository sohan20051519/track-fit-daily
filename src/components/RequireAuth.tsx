import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { OnboardingDialog } from "./OnboardingDialog";
import { WeightPromptDialog } from "./WeightPromptDialog";

interface ProfileData {
  onboarded: boolean;
  gender: string | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: string | null;
  goal_type: string | null;
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
      const [{ data: p }, { data: todayWeight }, { data: lastW }] = await Promise.all([
        supabase.from("profiles")
          .select("onboarded, gender, birth_date, height_cm, activity_level, goal_type")
          .eq("id", user.id).maybeSingle(),
        supabase.from("weight_logs").select("weight_kg").eq("date", today).maybeSingle(),
        supabase.from("weight_logs").select("weight_kg").order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setProfile(p ?? { onboarded: false, gender: null, birth_date: null, height_cm: null, activity_level: null, goal_type: null });
      setLastWeight(lastW ? Number(lastW.weight_kg) : undefined);
      if (p?.onboarded && !todayWeight) setNeedsWeight(true);
      setBootstrapped(true);
    })();
  }, [user]);

  if (loading || !user || !bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
        </SidebarInset>
      </div>

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
        />
      )}
    </SidebarProvider>
  );
}
