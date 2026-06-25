import { supabase } from "@/integrations/supabase/client";

export type AnalysisVideo = {
  id: string;
  user_id: string;
  title: string;
  match_date: string | null;
  team_id: string | null;
  season_team_id: string | null;
  opponent: string;
  competition: string;
  video_url: string | null;
  source: "upload" | "external";
  duration_seconds: number | null;
  notes: string;
  created_at: string;
};

export type AnalysisCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  hotkey: string;
  pre_seconds: number;
  post_seconds: number;
  order_index: number;
};

export type AnalysisEvent = {
  id: string;
  user_id: string;
  video_id: string;
  category_id: string | null;
  category_name: string;
  category_color: string;
  timestamp_seconds: number;
  pre_seconds: number;
  post_seconds: number;
  label: string;
  notes: string;
  source: string;
  created_at: string;
};

const STORAGE_PREFIX = "storage://analysis-videos/";

export function isStorageUrl(url: string | null): url is string {
  return !!url && url.startsWith(STORAGE_PREFIX);
}

export function storagePathFromUrl(url: string): string {
  return url.replace(STORAGE_PREFIX, "");
}

export async function getPlayableUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (!isStorageUrl(url)) return url;
  const path = storagePathFromUrl(url);
  const { data, error } = await supabase.storage
    .from("analysis-videos")
    .createSignedUrl(path, 60 * 60 * 4);
  if (error || !data) return null;
  return data.signedUrl;
}

export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 10);
  const base = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${ms}`;
  return h > 0 ? `${h}:${base}` : base;
}
