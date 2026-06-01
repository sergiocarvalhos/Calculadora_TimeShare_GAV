import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";

/**
 * Server function: validates the submitted password against the
 * ADMIN_PASSWORD secret set in Cloudflare Workers environment.
 *
 * Returns { ok: true } on match, { ok: false } on mismatch/missing secret.
 * The secret never leaves the server — safe.
 */
export const validateAdminPassword = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null || typeof (data as Record<string, unknown>).password !== "string") {
      throw new Error("Invalid payload");
    }
    return { password: (data as { password: string }).password };
  })
  .handler(async ({ data }) => {
    // Access Cloudflare Worker env via the incoming request context
    const request = getWebRequest();
    // @ts-expect-error – Cloudflare Workers attaches env to the request object
    const env = (request as { cloudflare?: { env?: Record<string, string> } }).cloudflare?.env ?? {};

    const expected: string | undefined = env["ADMIN_PASSWORD"];

    if (!expected) {
      // No secret configured → allow access (dev/test mode)
      return { ok: true, devMode: true };
    }

    return { ok: data.password === expected, devMode: false };
  });
