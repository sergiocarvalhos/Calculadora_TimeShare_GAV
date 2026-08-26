// ===== KV STORE - SERVER FUNCTIONS =====
// These functions run on the Cloudflare Worker server side and read/write
// to the TIMESHARE_DATA KV namespace. They are called from the client via
// TanStack Start's server function HTTP bridge.
//
// Env access: uses getWorkerEnv() which is populated by server.ts on each request.
// In local dev (vite dev), getWorkerEnv() returns null and operations are silently skipped.

import { createServerFn } from "@tanstack/react-start";
import type { Consultant } from "./consultant-store";
import { getWorkerEnv } from "./worker-env";

// Minimal KV interface (avoids need for @cloudflare/workers-types)
type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const KV_KEY = "consultants_v1";

/**
 * Get the TIMESHARE_DATA KV binding from the injected Worker env.
 * Returns null in local dev (env not injected).
 */
function getKV(): KVNamespace | null {
  const env = getWorkerEnv();
  if (!env) return null;
  const kv = env["TIMESHARE_DATA"];
  if (kv && typeof (kv as KVNamespace).get === "function") {
    return kv as KVNamespace;
  }
  return null;
}

// ===== READ =====
export const getConsultantsFromKV = createServerFn({ method: "GET" }).handler(
  async (): Promise<Consultant[] | null> => {
    const kv = getKV();
    if (!kv) return null;
    try {
      const raw = await kv.get(KV_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;
      return parsed as Consultant[];
    } catch {
      return null;
    }
  }
);

// ===== WRITE =====
export const saveConsultantsToKV = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as Consultant[])
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const kv = getKV();
    if (!kv) return { ok: false };
    try {
      await kv.put(KV_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      console.error("[KV] Failed to save consultants:", e);
      return { ok: false };
    }
  });
