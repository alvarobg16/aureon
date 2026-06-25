// IndexedDB persistente para el módulo LIVE.
// Stores:
//  - outbox: cola FIFO de operaciones pendientes de sincronizar
//  - matches: último snapshot conocido de cada live_match (para recuperación)
//  - meta: lastSyncAt, lastError
import { openDB, type IDBPDatabase } from "idb";

export type OutboxOp = {
  seq?: number;
  liveMatchId: string;
  table: "live_events" | "live_matches" | "live_player_time" | "goals";
  action: "insert" | "update" | "upsert" | "delete";
  payload: any;
  // Para update/delete: { id: string } o filtro arbitrario
  match?: Record<string, any>;
  // Para upsert
  options?: { onConflict?: string };
  clientId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export type MatchSnapshot = {
  liveMatchId: string;
  data: any;
  updatedAt: number;
};

const DB_NAME = "aureon-live";
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("matches")) {
          db.createObjectStore("matches", { keyPath: "liveMatchId" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbp;
}

export async function enqueue(op: Omit<OutboxOp, "seq" | "createdAt" | "attempts">) {
  const db = await getDB();
  const full: OutboxOp = { ...op, createdAt: Date.now(), attempts: 0 };
  await db.add("outbox", full);
}

export async function listOutbox(): Promise<OutboxOp[]> {
  const db = await getDB();
  return (await db.getAll("outbox")) as OutboxOp[];
}

export async function countOutbox(liveMatchId?: string): Promise<number> {
  const all = await listOutbox();
  return liveMatchId ? all.filter((o) => o.liveMatchId === liveMatchId).length : all.length;
}

export async function removeOutbox(seq: number) {
  const db = await getDB();
  await db.delete("outbox", seq);
}

export async function updateOutbox(op: OutboxOp) {
  const db = await getDB();
  await db.put("outbox", op);
}

export async function saveSnapshot(liveMatchId: string, data: any) {
  const db = await getDB();
  await db.put("matches", { liveMatchId, data, updatedAt: Date.now() });
}

export async function loadSnapshot(liveMatchId: string): Promise<MatchSnapshot | undefined> {
  const db = await getDB();
  return (await db.get("matches", liveMatchId)) as MatchSnapshot | undefined;
}

export async function setMeta(key: string, value: any) {
  const db = await getDB();
  await db.put("meta", value, key);
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("meta", key)) as T | undefined;
}

export function isOfflineSupported() {
  return typeof indexedDB !== "undefined";
}
