import { supabase } from "@/integrations/supabase/client";

export type UserLimits = {
  max_clubs: number | null; // null = sin límite
  max_teams: number | null;
};

export async function getMyLimits(): Promise<UserLimits> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { max_clubs: null, max_teams: null };
  const { data } = await supabase
    .from("user_limits")
    .select("max_clubs,max_teams")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return {
    max_clubs: (data?.max_clubs as number | null) ?? null,
    max_teams: (data?.max_teams as number | null) ?? null,
  };
}
