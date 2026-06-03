import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";

/**
 * Server function: validates the submitted password against the
 * ADMIN_PASSWORD secret set in Cloudflare Workers environment.
 *
 * Uses vinxi/http getEvent() to access the h3 event context,
 * where @cloudflare/vite-plugin injects the Cloudflare env bindings
 * via event.context.cloudflare.env
 *
 * Returns { ok: true } on match, { ok: false } on mismatch.
 * The secret never leaves the server — safe.
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
    try {
      const event = getEvent();
      // @cloudflare/vite-plugin injects Cloudflare bindings into event.context.cloudflare
      const cf = (event.context as Record<string, unknown>)?.cloudflare as
        | { env?: Record<string, string> }
        | undefined;
      const expected: string | undefined = cf?.env?.["ADMIN_PASSWORD"];

      if (!expected) {
        // No secret configured → allow access (dev / test mode)
        return { ok: true, devMode: true };
      }

      return { ok: data.password === expected, devMode: false };
    } catch {
      // If Cloudflare context is unavailable (local dev), allow access
      return { ok: true, devMode: true };
    }
  });


