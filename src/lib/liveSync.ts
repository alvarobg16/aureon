// Capa de sincronización offline-first para el módulo LIVE.
// Expone `liveSb` con la misma forma que `supabase.from(tabla)` para writes
// (insert/update/upsert/delete). Cuando hay red, ejecuta directamente.
// Cuando no la hay, encola en IndexedDB y devuelve éxito optimista.
// Drena la cola automáticamente al recuperar la red.

import { supabase } from "@/integrations/supabase/client";
import {
  enqueue,
  listOutbox,
  removeOutbox,
  updateOutbox,
  setMeta,
  getMeta,
  saveSnapshot,
  loadSnapshot,
  isOfflineSupported,
  type OutboxOp,
} from "./liveOffline";

export type SyncStatus = "online" | "offline" | "syncing" | "error";
type Listener = (s: SyncSnapshot) => void;
export type SyncSnapshot = {
  status: SyncStatus;
  pending: number;
  lastSyncAt: number | null;
  lastError: string | null;
};

let pending = 0;
let lastSyncAt: number | null = null;
let lastError: string | null = null;
let status: SyncStatus = "online";
const listeners = new Set<Listener>();

function emit() {
  const snap: SyncSnapshot = { status, pending, lastSyncAt, lastError };
  listeners.forEach((cb) => {
    try { cb(snap); } catch {}
  });
}

export function subscribe(cb: Listener) {
  listeners.add(cb);
  cb({ status, pending, lastSyncAt, lastError });
  return () => { listeners.delete(cb); };
}

export function getSnapshot(): SyncSnapshot {
  return { status, pending, lastSyncAt, lastError };
}

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function refreshPending() {
  if (!isOfflineSupported()) return;
  try { pending = (await listOutbox()).length; } catch { pending = 0; }
}

let flushing = false;
let backoffUntil = 0;

async function executeOp(op: OutboxOp): Promise<{ ok: boolean; error?: string }> {
  try {
    const q: any = supabase.from(op.table as any);
    let r: any;
    if (op.action === "insert") {
      r = await q.insert(op.payload);
    } else if (op.action === "update") {
      let chain = q.update(op.payload);
      for (const [k, v] of Object.entries(op.match || {})) chain = chain.eq(k, v);
      r = await chain;
    } else if (op.action === "upsert") {
      r = await q.upsert(op.payload, op.options || {});
    } else if (op.action === "delete") {
      let chain = q.delete();
      for (const [k, v] of Object.entries(op.match || {})) chain = chain.eq(k, v);
      r = await chain;
    }
    if (r?.error) {
      // Conflicto de unicidad por client_id ⇒ ya estaba sincronizado, lo damos por bueno.
      const msg = String(r.error.message || "");
      if (/duplicate key|unique constraint/i.test(msg) && op.clientId) {
        return { ok: true };
      }
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function flush(): Promise<void> {
  if (!isOfflineSupported()) return;
  if (flushing) return;
  if (Date.now() < backoffUntil) return;
  if (!isOnline()) {
    status = "offline";
    await refreshPending();
    emit();
    return;
  }
  flushing = true;
  try {
    const items = (await listOutbox()).sort((a, b) => (a.seq! - b.seq!));
    if (items.length === 0) {
      status = "online";
      await refreshPending();
      emit();
      return;
    }
    status = "syncing";
    pending = items.length;
    emit();
    for (const op of items) {
      const res = await executeOp(op);
      if (res.ok) {
        await removeOutbox(op.seq!);
        pending = Math.max(0, pending - 1);
        emit();
      } else {
        op.attempts += 1;
        op.lastError = res.error;
        await updateOutbox(op);
        lastError = res.error || "Sync error";
        status = "error";
        // backoff exponencial: 1s · 2^attempts, capado a 5min
        const wait = Math.min(1000 * Math.pow(2, op.attempts), 5 * 60 * 1000);
        backoffUntil = Date.now() + wait;
        setTimeout(() => { void flush(); }, wait);
        emit();
        return; // detener para mantener orden
      }
    }
    status = "online";
    lastError = null;
    lastSyncAt = Date.now();
    await setMeta("lastSyncAt", lastSyncAt);
    emit();
  } finally {
    flushing = false;
  }
}

// Inicialización: listeners de red + meta cargada
if (typeof window !== "undefined") {
  void (async () => {
    lastSyncAt = (await getMeta<number>("lastSyncAt")) || null;
    await refreshPending();
    status = isOnline() ? (pending > 0 ? "syncing" : "online") : "offline";
    emit();
    if (isOnline()) void flush();
  })();
  window.addEventListener("online", () => {
    status = "syncing";
    backoffUntil = 0;
    emit();
    void flush();
  });
  window.addEventListener("offline", () => {
    status = "offline";
    emit();
  });
  // Reintento periódico ligero (cada 30s) por si los eventos online/offline fallan en algún navegador
  setInterval(() => { if (isOnline()) void flush(); }, 30_000);
}

// --- Proxy con la misma forma que supabase.from(tabla) ---
// Sólo soporta writes (insert/update/upsert/delete) sobre las 4 tablas LIVE.
// Cuando online: ejecuta directamente y emite éxito.
// Cuando offline: encola y devuelve {data:null,error:null} optimista.

type Table = "live_events" | "live_matches" | "live_player_time" | "goals";

function genClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return "c-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function attachClientId(table: Table, payload: any): { payload: any; clientId?: string } {
  if (table !== "live_events" && table !== "goals") return { payload };
  if (Array.isArray(payload)) {
    const arr = payload.map((p) => ({ ...p, client_id: p?.client_id || genClientId() }));
    return { payload: arr, clientId: arr[0]?.client_id };
  }
  const clientId = payload?.client_id || genClientId();
  return { payload: { ...payload, client_id: clientId }, clientId };
}

function liveMatchIdFromPayload(table: Table, payload: any, match?: Record<string, any>): string {
  if (table === "live_matches" && match?.id) return match.id as string;
  if (payload?.live_match_id) return payload.live_match_id as string;
  if (Array.isArray(payload) && payload[0]?.live_match_id) return payload[0].live_match_id as string;
  if (match?.live_match_id) return match.live_match_id as string;
  return "unknown";
}

class WriteBuilder implements PromiseLike<any> {
  private filters: Record<string, any> = {};
  constructor(private table: Table, private action: "update" | "delete", private payload: any) {}
  eq(col: string, val: any) {
    this.filters[col] = val;
    return this;
  }
  then<TR1 = any, TR2 = never>(
    onfulfilled?: ((value: any) => TR1 | PromiseLike<TR1>) | undefined | null,
    onrejected?: ((reason: any) => TR2 | PromiseLike<TR2>) | undefined | null,
  ): Promise<TR1 | TR2> {
    return this._run().then(onfulfilled, onrejected);
  }
  private async _run() {
    const liveMatchId = liveMatchIdFromPayload(this.table, this.payload, this.filters);
    if (isOnline() && isOfflineSupported() === false) {
      // Sin IndexedDB: ejecuta directo y punto.
      return runDirect(this.table, this.action, this.payload, this.filters);
    }
    if (isOnline()) {
      const r = await runDirect(this.table, this.action, this.payload, this.filters);
      if (!r.error) {
        lastSyncAt = Date.now();
        void setMeta("lastSyncAt", lastSyncAt);
        return r;
      }
      // Si falla por red, encolamos.
      const netErr = /network|fetch|failed to fetch|load failed/i.test(String(r.error?.message || ""));
      if (!netErr) return r;
    }
    await enqueue({
      table: this.table, action: this.action, payload: this.payload,
      match: this.filters, liveMatchId,
    });
    await refreshPending();
    status = isOnline() ? "syncing" : "offline";
    emit();
    if (isOnline()) void flush();
    return { data: null, error: null };
  }
}

async function runDirect(table: Table, action: string, payload: any, filters?: Record<string, any>, options?: any) {
  const q: any = supabase.from(table as any);
  if (action === "insert") return await q.insert(payload);
  if (action === "upsert") return await q.upsert(payload, options || {});
  if (action === "update") {
    let chain = q.update(payload);
    for (const [k, v] of Object.entries(filters || {})) chain = chain.eq(k, v);
    return await chain;
  }
  if (action === "delete") {
    let chain = q.delete();
    for (const [k, v] of Object.entries(filters || {})) chain = chain.eq(k, v);
    return await chain;
  }
  return { data: null, error: new Error("Unknown action") };
}

class LiveTable {
  constructor(private table: Table) {}
  insert(payload: any) {
    const { payload: withId, clientId } = attachClientId(this.table, payload);
    const action = "insert" as const;
    const liveMatchId = liveMatchIdFromPayload(this.table, withId);
    const exec = async () => {
      if (isOnline()) {
        const r = await runDirect(this.table, action, withId);
        if (!r.error) {
          lastSyncAt = Date.now(); void setMeta("lastSyncAt", lastSyncAt);
          return r;
        }
        const netErr = /network|fetch|failed to fetch|load failed/i.test(String(r.error?.message || ""));
        if (!netErr) return r;
      }
      if (isOfflineSupported()) {
        await enqueue({ table: this.table, action, payload: withId, liveMatchId, clientId });
        await refreshPending();
        status = isOnline() ? "syncing" : "offline";
        emit();
        if (isOnline()) void flush();
        return { data: null, error: null };
      }
      return { data: null, error: new Error("Sin conexión y sin almacenamiento local") };
    };
    return exec();
  }
  upsert(payload: any, options?: any) {
    const liveMatchId = liveMatchIdFromPayload(this.table, payload);
    const action = "upsert" as const;
    const exec = async () => {
      if (isOnline()) {
        const r = await runDirect(this.table, action, payload, undefined, options);
        if (!r.error) {
          lastSyncAt = Date.now(); void setMeta("lastSyncAt", lastSyncAt);
          return r;
        }
        const netErr = /network|fetch|failed to fetch|load failed/i.test(String(r.error?.message || ""));
        if (!netErr) return r;
      }
      if (isOfflineSupported()) {
        await enqueue({ table: this.table, action, payload, liveMatchId, options });
        await refreshPending();
        status = isOnline() ? "syncing" : "offline";
        emit();
        if (isOnline()) void flush();
        return { data: null, error: null };
      }
      return { data: null, error: new Error("Sin conexión y sin almacenamiento local") };
    };
    return exec();
  }
  update(payload: any) {
    return new WriteBuilder(this.table, "update", payload);
  }
  delete() {
    return new WriteBuilder(this.table, "delete", undefined);
  }
  // Passthrough para selects (se usan en el código de carga y conteos).
  select(...args: any[]) {
    return (supabase.from(this.table as any) as any).select(...args);
  }
}

export const liveSb = {
  from(table: Table) {
    return new LiveTable(table);
  },
};

// Snapshot helpers reexportados para recuperación
export { saveSnapshot, loadSnapshot };

// --- Active match tracking (recuperación tras cierre del navegador) ---
const ACTIVE_KEY = "activeMatchId";
export async function setActiveMatchId(liveMatchId: string) {
  if (!isOfflineSupported()) return;
  await setMeta(ACTIVE_KEY, liveMatchId);
}
export async function getActiveMatchId(): Promise<string | null> {
  if (!isOfflineSupported()) return null;
  return (await getMeta<string>(ACTIVE_KEY)) ?? null;
}
export async function clearActiveMatchId() {
  if (!isOfflineSupported()) return;
  await setMeta(ACTIVE_KEY, null);
}
export async function getPendingCount(liveMatchId?: string): Promise<number> {
  if (!isOfflineSupported()) return 0;
  const all = await listOutbox();
  return liveMatchId ? all.filter((o) => o.liveMatchId === liveMatchId).length : all.length;
}
