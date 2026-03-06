/**
 * Calendar Sync Edge Function
 *
 * Handles bi-directional Google Calendar sync via server-side API calls.
 * Keeps GOOGLE_CLIENT_SECRET safe on the server (never exposed to the client).
 *
 * Actions:
 * - create_event: Push an Aminy appointment to Google Calendar
 * - update_event: Update an existing Google Calendar event
 * - delete_event: Remove a Google Calendar event
 * - list_events:  Pull upcoming events from Google Calendar
 * - sync_all:     Full bi-directional sync
 *
 * Required Supabase Secrets:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 *
 * Deploy: supabase functions deploy calendar-sync
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

// Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============================================================================
// Token Management
// ============================================================================

interface TokenData {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
}

/**
 * Refresh the Google OAuth access token using the stored refresh_token.
 * Updates the calendar_integrations row with the new token.
 */
async function refreshAccessToken(
  integrationId: string,
  refreshToken: string
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Token refresh failed:", errorBody);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Persist the new access token
  await supabaseAdmin
    .from("calendar_integrations")
    .update({
      access_token: newAccessToken,
      token_expires_at: expiresAt,
    })
    .eq("id", integrationId);

  return newAccessToken;
}

/**
 * Get a valid access token for the user's calendar integration.
 * Automatically refreshes if expired.
 */
async function getValidAccessToken(userId: string): Promise<{
  accessToken: string;
  integrationId: string;
  calendarId: string;
}> {
  const { data: integration, error } = await supabaseAdmin
    .from("calendar_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (error || !integration) {
    throw new Error("No active Google Calendar integration found");
  }

  let accessToken = integration.access_token;

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(integration.token_expires_at || 0);
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() > expiresAt.getTime() - bufferMs) {
    if (!integration.refresh_token) {
      throw new Error(
        "Access token expired and no refresh token available. Please reconnect Google Calendar."
      );
    }
    accessToken = await refreshAccessToken(
      integration.id,
      integration.refresh_token
    );
  }

  return {
    accessToken,
    integrationId: integration.id,
    calendarId: integration.calendar_id || "primary",
  };
}

// ============================================================================
// Google Calendar API Helpers
// ============================================================================

async function googleCalendarRequest(
  accessToken: string,
  path: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<any> {
  const response = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Calendar API error [${method} ${path}]:`, errorText);
    throw new Error(
      `Google Calendar API returned ${response.status}: ${errorText}`
    );
  }

  // DELETE returns 204 with no body
  if (response.status === 204) return null;

  return response.json();
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Create a Google Calendar event for an Aminy appointment
 */
async function handleCreateEvent(
  userId: string,
  appointmentId: string
): Promise<{ eventId: string }> {
  const { accessToken, integrationId, calendarId } =
    await getValidAccessToken(userId);

  // Fetch the appointment from Supabase
  const { data: appointment, error: apptError } = await supabaseAdmin
    .from("appointments")
    .select(
      "*, provider:providers(first_name, last_name, credentials, role_display_name)"
    )
    .eq("id", appointmentId)
    .single();

  if (apptError || !appointment) {
    throw new Error(`Appointment not found: ${appointmentId}`);
  }

  // Build the Google Calendar event
  const providerName = appointment.provider
    ? `${appointment.provider.first_name} ${appointment.provider.last_name}`
    : "Your Provider";

  const eventBody = {
    summary: `Aminy: Appointment with ${providerName}`,
    description: [
      `Appointment with ${providerName}`,
      appointment.visit_type
        ? `Visit type: ${appointment.visit_type}`
        : "",
      appointment.reason_for_visit
        ? `Reason: ${appointment.reason_for_visit}`
        : "",
      "",
      appointment.video_room_url
        ? `Join Video Call: ${appointment.video_room_url}`
        : "",
      "",
      "Managed by Aminy - Your neurodivergent care companion",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: appointment.start_time || appointment.scheduled_at,
      timeZone: appointment.timezone || "America/New_York",
    },
    end: {
      dateTime:
        appointment.end_time ||
        new Date(
          new Date(
            appointment.start_time || appointment.scheduled_at
          ).getTime() +
            30 * 60 * 1000
        ).toISOString(),
      timeZone: appointment.timezone || "America/New_York",
    },
    location: appointment.video_room_url
      ? "Video Call (link in description)"
      : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 15 },
        { method: "popup", minutes: 60 },
        { method: "email", minutes: 1440 }, // 24 hours
      ],
    },
    source: {
      title: "Aminy",
      url: "https://aminy.ai",
    },
  };

  // Create the event in Google Calendar
  const event = await googleCalendarRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    "POST",
    eventBody
  );

  // Record the mapping
  await supabaseAdmin.from("calendar_event_mappings").upsert(
    {
      appointment_id: appointmentId,
      calendar_integration_id: integrationId,
      external_event_id: event.id,
      last_synced_at: new Date().toISOString(),
      sync_status: "synced",
    },
    { onConflict: "appointment_id,calendar_integration_id" }
  );

  // Update last sync time
  await supabaseAdmin
    .from("calendar_integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", integrationId);

  return { eventId: event.id };
}

/**
 * Update an existing Google Calendar event
 */
async function handleUpdateEvent(
  userId: string,
  appointmentId: string
): Promise<{ eventId: string }> {
  const { accessToken, integrationId, calendarId } =
    await getValidAccessToken(userId);

  // Find existing mapping
  const { data: mapping } = await supabaseAdmin
    .from("calendar_event_mappings")
    .select("external_event_id")
    .eq("appointment_id", appointmentId)
    .eq("calendar_integration_id", integrationId)
    .single();

  if (!mapping) {
    // No existing mapping, create a new event instead
    return handleCreateEvent(userId, appointmentId);
  }

  // Fetch the appointment
  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select(
      "*, provider:providers(first_name, last_name, credentials)"
    )
    .eq("id", appointmentId)
    .single();

  if (!appointment) {
    throw new Error(`Appointment not found: ${appointmentId}`);
  }

  const providerName = appointment.provider
    ? `${appointment.provider.first_name} ${appointment.provider.last_name}`
    : "Your Provider";

  const eventBody = {
    summary: `Aminy: Appointment with ${providerName}`,
    description: [
      `Appointment with ${providerName}`,
      appointment.visit_type
        ? `Visit type: ${appointment.visit_type}`
        : "",
      appointment.reason_for_visit
        ? `Reason: ${appointment.reason_for_visit}`
        : "",
      "",
      appointment.video_room_url
        ? `Join Video Call: ${appointment.video_room_url}`
        : "",
      "",
      "Managed by Aminy - Your neurodivergent care companion",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: appointment.start_time || appointment.scheduled_at,
      timeZone: appointment.timezone || "America/New_York",
    },
    end: {
      dateTime:
        appointment.end_time ||
        new Date(
          new Date(
            appointment.start_time || appointment.scheduled_at
          ).getTime() +
            30 * 60 * 1000
        ).toISOString(),
      timeZone: appointment.timezone || "America/New_York",
    },
  };

  const event = await googleCalendarRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${mapping.external_event_id}`,
    "PUT",
    eventBody
  );

  // Update mapping
  await supabaseAdmin
    .from("calendar_event_mappings")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: "synced",
    })
    .eq("appointment_id", appointmentId)
    .eq("calendar_integration_id", integrationId);

  return { eventId: event.id };
}

/**
 * Delete a Google Calendar event
 */
async function handleDeleteEvent(
  userId: string,
  appointmentId: string
): Promise<void> {
  const { accessToken, integrationId, calendarId } =
    await getValidAccessToken(userId);

  // Find existing mapping
  const { data: mapping } = await supabaseAdmin
    .from("calendar_event_mappings")
    .select("external_event_id")
    .eq("appointment_id", appointmentId)
    .eq("calendar_integration_id", integrationId)
    .single();

  if (!mapping) {
    console.log("No calendar mapping found for appointment:", appointmentId);
    return;
  }

  try {
    await googleCalendarRequest(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${mapping.external_event_id}`,
      "DELETE"
    );
  } catch (err) {
    // Event may already be deleted on Google's side
    console.warn("Failed to delete Google Calendar event:", err);
  }

  // Mark mapping as deleted
  await supabaseAdmin
    .from("calendar_event_mappings")
    .update({
      sync_status: "deleted",
      last_synced_at: new Date().toISOString(),
    })
    .eq("appointment_id", appointmentId)
    .eq("calendar_integration_id", integrationId);
}

/**
 * List upcoming events from Google Calendar (pull direction)
 */
async function handleListEvents(
  userId: string,
  since?: string
): Promise<{ events: any[] }> {
  const { accessToken, calendarId } = await getValidAccessToken(userId);

  const timeMin = since || new Date().toISOString();
  // Look 30 days ahead by default
  const timeMax = new Date(
    new Date(timeMin).getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const result = await googleCalendarRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );

  return { events: result.items || [] };
}

/**
 * Full bi-directional sync
 */
async function handleSyncAll(
  userId: string
): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const { integrationId } = await getValidAccessToken(userId);

    // 1. Push: Find Aminy appointments not yet synced to Google
    const { data: appointments } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["confirmed", "scheduled"])
      .gte(
        "scheduled_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ); // Include recent past

    if (appointments) {
      for (const appt of appointments) {
        // Check if already mapped
        const { data: existing } = await supabaseAdmin
          .from("calendar_event_mappings")
          .select("id")
          .eq("appointment_id", appt.id)
          .eq("calendar_integration_id", integrationId)
          .neq("sync_status", "deleted")
          .single();

        if (!existing) {
          try {
            await handleCreateEvent(userId, appt.id);
            pushed++;
          } catch (err: any) {
            errors.push(
              `Failed to sync appointment ${appt.id}: ${err.message}`
            );
          }
        }
      }
    }

    // 2. Pull: Get upcoming Google Calendar events
    const pullResult = await handleListEvents(userId);
    pulled = pullResult.events.length;

    // Update last sync time
    await supabaseAdmin
      .from("calendar_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integrationId);
  } catch (err: any) {
    errors.push(err.message);
  }

  return { pushed, pulled, errors };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT and get the user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the action
    const body = await req.json();
    const { action, appointmentId, since } = body;

    let result: any;

    switch (action) {
      case "create_event":
        if (!appointmentId)
          throw new Error("appointmentId is required");
        result = await handleCreateEvent(user.id, appointmentId);
        break;

      case "update_event":
        if (!appointmentId)
          throw new Error("appointmentId is required");
        result = await handleUpdateEvent(user.id, appointmentId);
        break;

      case "delete_event":
        if (!appointmentId)
          throw new Error("appointmentId is required");
        await handleDeleteEvent(user.id, appointmentId);
        result = { success: true };
        break;

      case "list_events":
        result = await handleListEvents(user.id, since);
        break;

      case "sync_all":
        result = await handleSyncAll(user.id);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Calendar sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
