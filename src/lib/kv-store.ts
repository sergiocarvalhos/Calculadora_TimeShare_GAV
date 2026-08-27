// ===== KV STORE - SERVER FUNCTIONS =====
import { createServerFn } from "@tanstack/react-start";
import type { Consultant } from "./consultant-store";
import { getWorkerEnv } from "./worker-env";

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const KV_KEY = "consultants_v1";

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

// ===== WRITE (with debug) =====
export const saveConsultantsToKV = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as Consultant[])
  .handler(async ({ data }): Promise<{ ok: boolean; debug?: string }> => {
    const env = getWorkerEnv();
    if (!env) {
      return { ok: false, debug: "env_is_null" };
    }

    const envKeys = Object.keys(env);
    const hasBinding = "TIMESHARE_DATA" in env;

    if (!hasBinding) {
      return { ok: false, debug: `env_keys: [${envKeys.join(",")}] | no TIMESHARE_DATA` };
    }

    const kv = env["TIMESHARE_DATA"];
    if (!kv || typeof (kv as KVNamespace).get !== "function") {
      return { ok: false, debug: `TIMESHARE_DATA exists but is type: ${typeof kv}` };
    }

    try {
      await (kv as KVNamespace).put(KV_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      return { ok: false, debug: `kv.put threw: ${String(e)}` };
    }
  });
