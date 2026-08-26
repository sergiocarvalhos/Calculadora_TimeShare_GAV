// ===== WORKER ENV STORE =====
// Uses globalThis to store the Cloudflare Worker env across all module bundles.
//
// Module-level variables fail because TanStack Start compiles server functions
// into a separate chunk from server.ts — they get different module instances.
// globalThis is the true global of the V8 isolate and is shared by all chunks.

const ENV_KEY = "__TIMESHARE_CF_ENV__";

export function setWorkerEnv(env: unknown): void {
  (globalThis as Record<string, unknown>)[ENV_KEY] = env;
}

export function getWorkerEnv(): Record<string, unknown> | null {
  const env = (globalThis as Record<string, unknown>)[ENV_KEY];
  if (!env || typeof env !== "object") return null;
  return env as Record<string, unknown>;
}
