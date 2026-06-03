import { createServerFn } from "@tanstack/react-start";

/**
 * Server function: validates the submitted password against the
 * ADMIN_PASSWORD secret set in the Cloudflare Workers environment.
 *
 * With the nodejs_compat compatibility flag (set in wrangler.jsonc),
 * Cloudflare Workers exposes all environment variables and secrets
 * via process.env — no platform-specific imports needed.
 *
 * Returns { ok: true } on match, { ok: false } on mismatch.
 * The secret never leaves the server.
 */
export const validateAdminPassword = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as Record<string, unknown>).password !== "string"
    ) {
      throw new Error("Invalid payload");
    }
    return { password: (data as { password: string }).password };
  })
  .handler(async ({ data }) => {
    // process.env is available in Cloudflare Workers with nodejs_compat flag
    const expected = process.env["ADMIN_PASSWORD"];

    if (!expected) {
      // No secret configured → allow access (dev / local mode)
      return { ok: true, devMode: true };
    }

    return { ok: data.password === expected, devMode: false };
  });

