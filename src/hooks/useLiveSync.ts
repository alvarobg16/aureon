import { useEffect, useState } from "react";
import { subscribe, getSnapshot, flush, type SyncSnapshot } from "@/lib/liveSync";

export function useLiveSync() {
  const [snap, setSnap] = useState<SyncSnapshot>(() => getSnapshot());
  useEffect(() => subscribe(setSnap), []);
  return { ...snap, retry: () => flush() };
}
