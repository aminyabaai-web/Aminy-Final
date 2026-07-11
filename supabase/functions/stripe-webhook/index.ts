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

// Human-readable gift code: AMINY-XXXX-XXXX. Uppercase A–Z / 2–9 with the
// ambiguous glyphs (0/O, 1/I) removed so codes are easy to read aloud / retype.
// The redeem_gift_code RPC fuzzy-matches ignoring case/hyphens/spaces, so the
// display format here is purely for legibility.
function generateGiftCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0 O 1 I
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `AMINY-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

// Email the gift code to the purchaser via Resend (same transport the rest of
// the app uses). Best-effort: returns false on any failure so the webhook can
// log-and-continue instead of failing the whole event over email delivery.
async function sendGiftEmail(to: string | null, code: string, tier: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY || !to) return false;
  const verifiedDomain = Deno.env.get("RESEND_VERIFIED_DOMAIN") === "true";
  const from = verifiedDomain ? "Aminy <noreply@aminy.ai>" : "Aminy <onboarding@resend.dev>";
  const tierLabel = normalizeTier(tier) === "pro" ? "Pro" : "Core";
  const redeemLink = `https://aminy.ai/?screen=redeem-gift&code=${encodeURIComponent(code)}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0D1B2A;line-height:1.6;">
      <p style="font-size:20px;font-weight:600;margin:0 0 12px;">Your Aminy gift is ready 🎁</p>
      <p style="margin:0 0 16px;">Thank you for gifting Aminy ${tierLabel}. Share this code with the family you're gifting — it unlocks 3 months of Aminy ${tierLabel}, on you.</p>
      <div style="background:#F8F8F6;border:1px solid #E4EFF5;border-radius:14px;padding:18px;text-align:center;margin:0 0 20px;">
        <div style="font-size:13px;color:#577590;margin-bottom:6px;">Gift code</div>
        <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#0D1B2A;">${code}</div>
      </div>
      <p style="margin:0 0 20px;text-align:center;">
        <a href="${redeemLink}" style="display:inline-block;background:#43AA8B;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;">Redeem this gift</a>
      </p>
      <p style="font-size:13px;color:#577590;margin:0;">Or redeem it manually at aminy.ai with the code above.</p>
      <p style="font-size:13px;color:#577590;margin:16px 0 0;">Gentle guidance. Meaningful progress.<br/>— The Aminy team</p>
    </div>`;
  const text =
    `Your Aminy gift is ready.\n\nGift code: ${code}\n\nRedeem it at: ${redeemLink}\n\nThis unlocks 3 months of Aminy ${tierLabel}.\n\nGentle guidance. Meaningful progress.\n— The Aminy team`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject: "Your Aminy gift code 🎁", html, text, reply_to: "support@aminy.ai" }),
    });
    return resp.ok;
  } catch (err) {
    console.error("gift email send failed:", err);
    return false;
  }
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

        if (meta.kind === "gift") {
          // Gift purchase (Stripe Payment Link, metadata kind=gift). Issue a
          // redeemable code and email it to the purchaser so they can pass it on.
          const code = generateGiftCode();
          const purchaserEmail: string | null = session.customer_details?.email ?? null;
          const { error: insErr } = await sb.from("gift_codes").insert({
            code,
            tier: (meta.tier ?? "core").toLowerCase(),
            duration_months: parseInt(meta.duration_months) || 3,
            purchaser_email: purchaserEmail,
            stripe_session_id: session.id ?? null,
            status: "unredeemed",
          });
          if (insErr) {
            // stripe_session_id is UNIQUE — 23505 means we already issued a code
            // for this session (webhook retry / duplicate delivery). Idempotent:
            // acknowledge without double-issuing or re-emailing.
            if ((insErr as { code?: string }).code === "23505") {
              console.log(`gift code already issued for session ${session.id} — skipping`);
              break;
            }
            throw insErr; // transient DB error → 500 so Stripe retries
          }
          console.log(`gift code ${code} issued for session ${session.id} (tier=${meta.tier})`);
          const emailed = await sendGiftEmail(purchaserEmail, code, meta.tier ?? "core");
          if (!emailed) {
            // Non-fatal: the code is persisted and logged above. Email delivery
            // needs wiring (RESEND_API_KEY unset, no purchaser email, or a send
            // failure) — recover the code from the log / gift_codes table.
            console.warn(`gift code ${code} issued but email NOT delivered (purchaser=${purchaserEmail ?? "unknown"})`);
          }
        } else if (meta.type === "marketplace_booking") {
          // One-time marketplace session payment (ConversationalBooking) — not a subscription.
          const bookingId = meta.booking_id || null;
          if (!bookingId) {
            console.log("marketplace_booking checkout completed without booking_id — acknowledging");
            break;
          }
          const { data: updated, error } = await sb.from("marketplace_bookings").update({
            payment_status: "paid",
            stripe_session_id: session.id ?? null,
            paid_at: new Date().toISOString(),
          }).eq("id", bookingId).select("id").maybeSingle();
          if (error) throw error; // 500 → Stripe retries (transient DB errors)
          if (!updated) {
            console.log(`marketplace booking ${bookingId} not found — acknowledging so Stripe doesn't retry`);
          } else {
            console.log(`marketplace booking ${bookingId} marked paid`);
          }
        } else if (orgId) {
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
          await sb.from("profiles").update({ tier: "free" }).eq("id", userId);
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
