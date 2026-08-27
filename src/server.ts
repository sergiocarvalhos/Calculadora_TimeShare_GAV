import "./lib/error-capture";
import { setWorkerEnv } from "./lib/worker-env";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// ===== KV API ROUTES =====
// Direct API endpoints for reading/writing to Cloudflare KV.
// These run inside the Worker fetch handler where env (and KV bindings) are directly available.
// Much more reliable than createServerFn which has bundling issues with dynamic imports.

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const KV_KEY = "consultants_v1";

function getKVFromEnv(env: unknown): KVNamespace | null {
  if (!env || typeof env !== "object") return null;
  const kv = (env as Record<string, unknown>)["TIMESHARE_DATA"];
  if (kv && typeof (kv as KVNamespace).get === "function") {
    return kv as KVNamespace;
  }
  return null;
}

async function handleKVGet(env: unknown): Promise<Response> {
  const kv = getKVFromEnv(env);
  if (!kv) {
    return Response.json({ ok: false, data: null, debug: "no_kv_binding" });
  }
  try {
    const raw = await kv.get(KV_KEY);
    if (!raw) return Response.json({ ok: true, data: null });
    const parsed = JSON.parse(raw);
    return Response.json({ ok: true, data: parsed });
  } catch (e) {
    return Response.json({ ok: false, data: null, debug: `get_error: ${String(e)}` });
  }
}

async function handleKVPut(request: Request, env: unknown): Promise<Response> {
  const kv = getKVFromEnv(env);
  if (!kv) {
    return Response.json({ ok: false, debug: "no_kv_binding" });
  }
  try {
    const body = await request.json();
    await kv.put(KV_KEY, JSON.stringify(body));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, debug: `put_error: ${String(e)}` });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Inject Cloudflare env globally (still useful for other server functions).
    setWorkerEnv(env);

    // Handle KV API routes directly — bypasses TanStack Start entirely.
    const url = new URL(request.url);
    if (url.pathname === "/api/kv/consultants") {
      if (request.method === "GET") return handleKVGet(env);
      if (request.method === "POST") return handleKVPut(request, env);
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
