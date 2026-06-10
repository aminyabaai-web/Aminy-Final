// Stripe webhook receiver — verify_jwt is DISABLED at the gateway because
// Stripe sends no Authorization header. Security comes from HMAC signature
// verification against STRIPE_WEBHOOK_SECRET (constant-time compare).
//
// Register in Stripe: https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/stripe-webhook
// Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
//
// Deployed 2026-06-09 via MCP (ACTIVE, verify_jwt=false). The /payments/webhook
// route inside make-server-8a022548 is unreachable by Stripe (gateway requires
// an Authorization header that Stripe never sends) — this standalone function
// is the production webhook target.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=") as [string, string]));
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return false;
    // Reject events older than 5 minutes (replay protection)
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return timingSafeEqual(expected, v1);
  } catch {
    return false;
  }
}

// Map a Stripe price/tier metadata value to a canonical app tier
function normalizeTier(raw: string | undefined | null): string {
  const t = (raw ?? "").toLowerCase();
  if (t === "starter" || t === "core") return "core";
  if (t === "pro") return "pro";
  if (t === "proplus" || t === "pro_plus" || t === "family") return "proplus";
  return "core"; // paid-but-unknown → safest paid default
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set — refusing unverified webhook");
    return new Response(JSON.stringify({ error: "not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (!signature || !(await verifySignature(body, signature, WEBHOOK_SECRET))) {
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Record<string, any>;
        const userId: string | null = session.client_reference_id ?? null;
        const customerId: string | null = session.customer ?? null;
        const meta = (session.metadata ?? {}) as Record<string, string>;
        const subMeta = (session.subscription_details?.metadata ?? {}) as Record<string, string>;
        const orgId = meta.org_id || subMeta.org_id || null;

        if (orgId) {
          // B2B org seat subscription activated
          await sb.from("organizations").update({
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription ?? null,
            billing_status: "active",
          }).eq("id", orgId);
          console.log(`org ${orgId} billing active`);
        } else if (userId) {
          const tier = normalizeTier(meta.tier || subMeta.tier);
          await sb.from("profiles").update({
            tier,
            stripe_customer_id: customerId,
            is_trial: false,
          }).eq("id", userId);
          // Mark trial converted (non-fatal if table/row absent)
          await sb.from("trial_tracking").update({ is_converted: true }).eq("user_id", userId);
          console.log(`user ${userId} upgraded to ${tier}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Record<string, any>;
        const meta = (sub.metadata ?? {}) as Record<string, string>;
        const userId = meta.userId || meta.owner_id || null;
        const orgId = meta.org_id || null;
        const active = sub.status === "active" || sub.status === "trialing";

        if (orgId) {
          await sb.from("organizations").update({
            billing_status: active ? "active" : "past_due",
          }).eq("id", orgId);
        } else if (userId) {
          if (active) {
            const tier = normalizeTier(meta.tier);
            await sb.from("profiles").update({ tier }).eq("id", userId);
          } else if (sub.status === "canceled" || sub.status === "unpaid") {
            await sb.from("profiles").update({ tier: "free" }).eq("id", userId);
          }
          console.log(`subscription ${sub.id} → ${sub.status} for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Record<string, any>;
        const meta = (sub.metadata ?? {}) as Record<string, string>;
        const userId = meta.userId || null;
        const orgId = meta.org_id || null;

        if (orgId) {
          await sb.from("organizations").update({ billing_status: "canceled" }).eq("id", orgId);
        } else if (userId) {
          await sb.from("profiles").update({ tier: "free", is_trial: false }).eq("id", userId);
          console.log(`user ${userId} downgraded to free (subscription deleted)`);
        }
        break;
      }

      default:
        // Acknowledge unhandled event types so Stripe doesn't retry
        break;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("webhook handler error:", err);
    // 500 → Stripe retries with backoff, which is what we want for transient DB errors
    return new Response(JSON.stringify({ error: "handler error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
