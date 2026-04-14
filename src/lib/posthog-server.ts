// Server-side PostHog helper. Uses posthog-node so API routes can
// fire product events + identify users from the server. Missing key
// is a no-op so local dev without a PostHog project still works.
//
// We lazy-init a single PostHog client per lambda process. flushAsync()
// is fired after every capture so events are delivered before the
// route handler finishes and the process freezes.

import type { PostHog } from "posthog-node";

let client: PostHog | null = null;

async function getClient(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (client) return client;
  const mod = await import("posthog-node");
  client = new mod.PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Drain quickly — serverless will freeze the process as soon as
    // the response returns.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const ph = await getClient();
    if (!ph) return;
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (err) {
    // Never let analytics failures break a product request.
    console.error("[posthog-server capture]", err);
  }
}

export async function identifyServerUser(
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const ph = await getClient();
    if (!ph) return;
    ph.identify({ distinctId, properties });
    await ph.flush();
  } catch (err) {
    console.error("[posthog-server identify]", err);
  }
}
