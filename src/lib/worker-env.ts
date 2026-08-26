// ===== WORKER ENV STORE =====
// Stores the Cloudflare Worker env (bindings: KV, D1, secrets, etc.)
// in a module-level variable so it can be accessed from server functions.
//
// setWorkerEnv() is called once per request in server.ts (before TanStack handles it).
// getWorkerEnv() is called from kv-store.ts server functions to access KV bindings.
//
// This pattern is necessary because TanStack Start server functions do not natively
// expose the Cloudflare Worker env — only the main fetch handler receives it.

let _env: unknown = null;

export function setWorkerEnv(env: unknown): void {
  _env = env;
}

export function getWorkerEnv(): Record<string, unknown> | null {
  if (!_env || typeof _env !== "object") return null;
  return _env as Record<string, unknown>;
}
