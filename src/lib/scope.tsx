import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ScopeTeam = { id: string; name: string; category: string; photo_url: string | null };
export type ScopeSeason = { id: string; name: string; is_active: boolean; team_id: string | null };

type ScopeCtx = {
  teams: ScopeTeam[];
  seasons: ScopeSeason[]; // ya filtradas por activeTeamId (incluye las sin team_id como "huérfanas" no)
  allSeasons: ScopeSeason[]; // todas las del usuario
  activeTeamId: string | null;
  activeSeasonId: string | null;
  activeTeam: ScopeTeam | null;
  activeSeason: ScopeSeason | null;
  defaultTeamId: string | null;
  loading: boolean;
  setActiveTeam: (id: string | null) => void;
  setActiveSeason: (id: string | null) => void;
  setDefaultTeam: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<ScopeCtx | null>(null);
const LS_TEAM = "aureon.scope.teamId";
const LS_SEASON = "aureon.scope.seasonId";

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<ScopeTeam[]>([]);
  const [allSeasons, setAllSeasons] = useState<ScopeSeason[]>([]);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_TEAM) : null
  );
  const [activeSeasonId, setActiveSeasonIdState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_SEASON) : null
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTeams([]); setAllSeasons([]); setDefaultTeamId(null); setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: t }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("teams").select("id,name,category,photo_url").order("created_at"),
      supabase.from("seasons").select("id,name,is_active,team_id").order("created_at", { ascending: false }),
      supabase.from("profiles").select("default_team_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const ts = (t as ScopeTeam[]) ?? [];
    const ss = (s as ScopeSeason[]) ?? [];
    const dft = (p as { default_team_id: string | null } | null)?.default_team_id ?? null;
    setTeams(ts);
    setAllSeasons(ss);
    setDefaultTeamId(dft);

    // Resolver equipo activo
    let teamId = activeTeamId;
    if (!teamId || !ts.find((x) => x.id === teamId)) {
      teamId = dft && ts.find((x) => x.id === dft) ? dft : ts[0]?.id ?? null;
    }
    if (teamId !== activeTeamId) {
      setActiveTeamIdState(teamId);
      if (typeof window !== "undefined") {
        if (teamId) localStorage.setItem(LS_TEAM, teamId); else localStorage.removeItem(LS_TEAM);
      }
    }

    // Resolver temporada activa dentro del equipo
    const teamSeasons = ss.filter((x) => x.team_id === teamId);
    let seasonId = activeSeasonId;
    if (!seasonId || !teamSeasons.find((x) => x.id === seasonId)) {
      seasonId = teamSeasons.find((x) => x.is_active)?.id ?? teamSeasons[0]?.id ?? null;
    }
    if (seasonId !== activeSeasonId) {
      setActiveSeasonIdState(seasonId);
      if (typeof window !== "undefined") {
        if (seasonId) localStorage.setItem(LS_SEASON, seasonId); else localStorage.removeItem(LS_SEASON);
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setActiveTeam = (id: string | null) => {
    setActiveTeamIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LS_TEAM, id); else localStorage.removeItem(LS_TEAM);
    }
    // Seleccionar mejor temporada para ese equipo
    const ts = allSeasons.filter((s) => s.team_id === id);
    const next = ts.find((s) => s.is_active)?.id ?? ts[0]?.id ?? null;
    setActiveSeasonIdState(next);
    if (typeof window !== "undefined") {
      if (next) localStorage.setItem(LS_SEASON, next); else localStorage.removeItem(LS_SEASON);
    }
  };

  const setActiveSeason = (id: string | null) => {
    setActiveSeasonIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LS_SEASON, id); else localStorage.removeItem(LS_SEASON);
    }
  };

  const setDefaultTeam = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ default_team_id: id }).eq("user_id", user.id);
    if (!error) setDefaultTeamId(id);
  };

  const seasons = allSeasons.filter((s) => s.team_id === activeTeamId);
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const activeSeason = allSeasons.find((s) => s.id === activeSeasonId) ?? null;

  return (
    <Ctx.Provider
      value={{
        teams,
        seasons,
        allSeasons,
        activeTeamId,
        activeSeasonId,
        activeTeam,
        activeSeason,
        defaultTeamId,
        loading,
        setActiveTeam,
        setActiveSeason,
        setDefaultTeam,
        refresh: load,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useScope() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useScope must be used inside <ScopeProvider>");
  return c;
}
