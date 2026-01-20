/**
 * Telehealth API Edge Function
 * Handles all telehealth-related backend operations
 *
 * Deploy with: supabase functions deploy telehealth
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Environment variables (set in Supabase Dashboard > Edge Functions > Secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@aminy.app";

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/telehealth", "");

  try {
    // Route requests
    if (path.startsWith("/appointments")) {
      return handleAppointments(req, path);
    }
    if (path.startsWith("/payments")) {
      return handlePayments(req, path);
    }
    if (path.startsWith("/video")) {
      return handleVideo(req, path);
    }
    if (path.startsWith("/notifications")) {
      return handleNotifications(req, path);
    }
    if (path.startsWith("/providers")) {
      return handleProviders(req, path);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =============================================================================
// Appointments Handler
// =============================================================================

async function handleAppointments(req: Request, path: string): Promise<Response> {
  const method = req.method;

  // POST /appointments - Create appointment
  if (method === "POST" && path === "/appointments") {
    const body = await req.json();
    const { userId, providerId, slotId, slot, visitType, intake } = body;

    // Create appointment in database
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        user_id: userId,
        provider_id: providerId,
        slot_id: slotId,
        start_time: slot.startTime,
        end_time: slot.endTime,
        visit_type: visitType,
        reason_for_visit: intake.visitReason,
        status: "scheduled",
        video_room_url: `https://aminy.daily.co/apt-${Date.now()}`,
      })
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(appointment);
  }

  // GET /appointments?userId=xxx - Get user appointments
  if (method === "GET" && path === "/appointments") {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return jsonResponse(data);
  }

  // GET /appointments/:id - Get single appointment
  const appointmentIdMatch = path.match(/^\/appointments\/([^/]+)$/);
  if (method === "GET" && appointmentIdMatch) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentIdMatch[1])
      .single();

    if (error) throw error;
    return jsonResponse(data);
  }

  // POST /appointments/:id/cancel - Cancel appointment
  const cancelMatch = path.match(/^\/appointments\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", cancelMatch[1])
      .select()
      .single();

    if (error) throw error;
    return jsonResponse(data);
  }

  return notFound();
}

// =============================================================================
// Payments Handler (Stripe)
// =============================================================================

async function handlePayments(req: Request, path: string): Promise<Response> {
  const method = req.method;

  // POST /payments/create-intent - Create payment intent
  if (method === "POST" && path === "/payments/create-intent") {
    const body = await req.json();
    const { amount, currency = "usd", customerId, metadata, description } = body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
      description,
      automatic_payment_methods: { enabled: true },
    });

    return jsonResponse({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  }

  // POST /payments/customer - Get or create customer
  if (method === "POST" && path === "/payments/customer") {
    const body = await req.json();
    const { email, name, phone } = body;

    // Check for existing customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return jsonResponse({
        id: existing.data[0].id,
        email: existing.data[0].email,
        name: existing.data[0].name,
      });
    }

    // Create new customer
    const customer = await stripe.customers.create({ email, name, phone });
    return jsonResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });
  }

  // POST /payments/create-checkout - Create checkout session
  if (method === "POST" && path === "/payments/create-checkout") {
    const body = await req.json();
    const { amount, description, metadata, successUrl, cancelUrl } = body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  }

  // POST /payments/refund - Process refund
  if (method === "POST" && path === "/payments/refund") {
    const body = await req.json();
    const { paymentIntentId, amount, reason } = body;

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    });

    return jsonResponse({
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
    });
  }

  return notFound();
}

// =============================================================================
// Video Handler (Daily.co)
// =============================================================================

async function handleVideo(req: Request, path: string): Promise<Response> {
  const method = req.method;

  // POST /video/create-room - Create video room
  if (method === "POST" && path === "/video/create-room") {
    const body = await req.json();
    const { sessionId, privacy, expiryMinutes, maxParticipants, enableKnocking } = body;

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `aminy-${sessionId}`,
        privacy: privacy || "private",
        properties: {
          exp: Math.floor(Date.now() / 1000) + (expiryMinutes || 120) * 60,
          max_participants: maxParticipants || 4,
          enable_knocking: enableKnocking ?? true,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    const room = await response.json();
    return jsonResponse({
      id: room.id,
      name: room.name,
      url: room.url,
      privacy: room.privacy,
      config: room.config,
      createdAt: room.created_at,
    });
  }

  // POST /video/get-token - Get meeting token
  if (method === "POST" && path === "/video/get-token") {
    const body = await req.json();
    const { roomName, userId, userName, isProvider } = body;

    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: userId,
          user_name: userName,
          is_owner: isProvider,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours
        },
      }),
    });

    const data = await response.json();
    return jsonResponse({
      token: data.token,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
  }

  // GET /video/room/:sessionId - Get room by session
  const roomMatch = path.match(/^\/video\/room\/([^/]+)$/);
  if (method === "GET" && roomMatch) {
    const response = await fetch(`https://api.daily.co/v1/rooms/aminy-${roomMatch[1]}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const room = await response.json();
    return jsonResponse(room);
  }

  // DELETE /video/room/:roomName - Delete room
  if (method === "DELETE" && roomMatch) {
    await fetch(`https://api.daily.co/v1/rooms/${roomMatch[1]}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    return jsonResponse({ success: true });
  }

  return notFound();
}

// =============================================================================
// Notifications Handler (Email + SMS)
// =============================================================================

async function handleNotifications(req: Request, path: string): Promise<Response> {
  const method = req.method;

  // POST /notifications/email - Send email
  if (method === "POST" && path === "/notifications/email") {
    const body = await req.json();
    const { to, template, data } = body;

    if (!SENDGRID_API_KEY) {
      console.log("SendGrid not configured, skipping email");
      return jsonResponse({ success: true, mock: true });
    }

    const emailContent = generateEmailContent(template, data);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: "Aminy" },
        subject: emailContent.subject,
        content: [
          { type: "text/plain", value: emailContent.text },
          { type: "text/html", value: emailContent.html },
        ],
      }),
    });

    return jsonResponse({ success: response.ok });
  }

  // POST /notifications/sms - Send SMS
  if (method === "POST" && path === "/notifications/sms") {
    const body = await req.json();
    const { phoneNumber, message } = body;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.log("Twilio not configured, skipping SMS");
      return jsonResponse({ success: true, mock: true });
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: TWILIO_PHONE_NUMBER!,
          Body: message,
        }),
      }
    );

    const result = await response.json();
    return jsonResponse({ success: response.ok, messageId: result.sid });
  }

  // POST /notifications/schedule-reminders - Schedule appointment reminders
  if (method === "POST" && path === "/notifications/schedule-reminders") {
    const body = await req.json();
    const { appointmentId, userId, email, phoneNumber, providerName, videoLink, reminders } = body;

    // Store reminders in database for cron job to process
    const { error } = await supabase.from("scheduled_reminders").insert(
      reminders.map((r: any) => ({
        appointment_id: appointmentId,
        user_id: userId,
        email,
        phone_number: phoneNumber,
        provider_name: providerName,
        video_link: videoLink,
        scheduled_for: r.scheduledFor,
        minutes_before: r.minutesBefore,
        sent: false,
      }))
    );

    if (error) throw error;
    return jsonResponse({ success: true });
  }

  // DELETE /notifications/cancel-reminders/:appointmentId
  const cancelMatch = path.match(/^\/notifications\/cancel-reminders\/([^/]+)$/);
  if (method === "DELETE" && cancelMatch) {
    await supabase
      .from("scheduled_reminders")
      .delete()
      .eq("appointment_id", cancelMatch[1]);

    return jsonResponse({ success: true });
  }

  return notFound();
}

// =============================================================================
// Providers Handler
// =============================================================================

async function handleProviders(req: Request, path: string): Promise<Response> {
  const method = req.method;

  // GET /providers - List providers with filters
  if (method === "GET" && path === "/providers") {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    const role = url.searchParams.get("role");

    let query = supabase.from("providers").select("*");

    if (state) {
      query = query.contains("licensed_states", [state]);
    }
    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;
    if (error) throw error;

    return jsonResponse(data);
  }

  // GET /providers/:id - Get single provider
  const providerMatch = path.match(/^\/providers\/([^/]+)$/);
  if (method === "GET" && providerMatch) {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .eq("id", providerMatch[1])
      .single();

    if (error) throw error;
    return jsonResponse(data);
  }

  // GET /providers/:id/slots - Get provider availability slots
  const slotsMatch = path.match(/^\/providers\/([^/]+)\/slots$/);
  if (method === "GET" && slotsMatch) {
    const url = new URL(req.url);
    const visitType = url.searchParams.get("visitType") || "consult";
    const startDate = url.searchParams.get("startDate") || new Date().toISOString();

    // Get provider availability
    const { data: provider } = await supabase
      .from("providers")
      .select("availability_blocks, time_off_blocks")
      .eq("id", slotsMatch[1])
      .single();

    // Get existing appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("provider_id", slotsMatch[1])
      .gte("start_time", startDate)
      .in("status", ["scheduled", "in_progress"]);

    // Generate slots (simplified - in production use availability-engine logic)
    const slots = generateSlots(
      slotsMatch[1],
      provider?.availability_blocks || [],
      provider?.time_off_blocks || [],
      appointments || [],
      visitType,
      new Date(startDate)
    );

    return jsonResponse(slots);
  }

  return notFound();
}

// =============================================================================
// Helper Functions
// =============================================================================

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateEmailContent(template: string, data: any): { subject: string; text: string; html: string } {
  const templates: Record<string, (d: any) => { subject: string; text: string; html: string }> = {
    appointment_confirmed: (d) => ({
      subject: `Appointment Confirmed - ${d.appointmentDate}`,
      text: `Hi ${d.userName},\n\nYour appointment with ${d.providerName} is confirmed for ${d.appointmentDate} at ${d.appointmentTime}.\n\n${d.videoLink ? `Join link: ${d.videoLink}` : ""}\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Confirmed!</h2>
        <p>Hi ${d.userName},</p>
        <p>Your appointment with <strong>${d.providerName}</strong> is confirmed:</p>
        <ul>
          <li><strong>Date:</strong> ${d.appointmentDate}</li>
          <li><strong>Time:</strong> ${d.appointmentTime}</li>
          <li><strong>Type:</strong> ${d.visitType}</li>
        </ul>
        ${d.videoLink ? `<p><a href="${d.videoLink}">Join Video Call</a></p>` : ""}
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
    appointment_reminder_24h: (d) => ({
      subject: `Reminder: Appointment Tomorrow with ${d.providerName}`,
      text: `Hi ${d.userName},\n\nReminder: You have an appointment with ${d.providerName} tomorrow at ${d.appointmentTime}.\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Tomorrow</h2>
        <p>Hi ${d.userName},</p>
        <p>This is a reminder that you have an appointment with <strong>${d.providerName}</strong> tomorrow at <strong>${d.appointmentTime}</strong>.</p>
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
    appointment_reminder_1h: (d) => ({
      subject: `Appointment in 1 Hour - ${d.providerName}`,
      text: `Hi ${d.userName},\n\nYour appointment with ${d.providerName} starts in 1 hour.\n\n${d.videoLink ? `Join link: ${d.videoLink}` : ""}\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Starting Soon</h2>
        <p>Hi ${d.userName},</p>
        <p>Your appointment with <strong>${d.providerName}</strong> starts in 1 hour.</p>
        ${d.videoLink ? `<p><a href="${d.videoLink}" style="background: #577590; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Join Video Call</a></p>` : ""}
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
  };

  const generator = templates[template];
  if (!generator) {
    return {
      subject: "Notification from Aminy",
      text: JSON.stringify(data),
      html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
    };
  }

  return generator(data);
}

function generateSlots(
  providerId: string,
  availabilityBlocks: any[],
  timeOffBlocks: any[],
  existingAppointments: any[],
  visitType: string,
  startDate: Date
): any[] {
  // Simplified slot generation - returns mock slots for demo
  const slots = [];
  const duration = visitType === "consult" ? 30 : 55;

  for (let day = 0; day < 14; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate 9am-5pm slots
    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check for conflicts
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict && slotStart > new Date()) {
        slots.push({
          id: `slot-${providerId}-${slotStart.toISOString()}`,
          providerId,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          visitType,
          status: "available",
        });
      }
    }
  }

  return slots;
}
