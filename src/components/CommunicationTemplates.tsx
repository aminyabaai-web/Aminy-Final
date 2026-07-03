import { useCallback, useEffect, useState } from "react";
import { ThumbsUp, Mail, MessageSquare, Edit2, Check, X, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../utils/supabase/client";
import { projectId } from "../utils/supabase/info";
import { isDemoMode } from "../lib/demo-seed";

interface Template {
  id: string;
  name: string;
  body: string;
}

interface Patient {
  id: string;
  parentFirstName: string;
  childName: string;
  /** Parent's auth user id — required for the email route (server resolves the address). */
  parentUserId: string | null;
  /** Parent's phone from profiles.phone_number — required for SMS. */
  parentPhone: string | null;
  /** Parent's contact email from profiles.email (informational; server uses auth email). */
  parentEmail: string | null;
}

const TEMPLATES: Template[] = [
  {
    id: "session-reminder",
    name: "Session Reminder",
    body: "Hi {parentFirstName}, just a reminder that {childName} has a session tomorrow at {time} with {providerName}. See you then! — Aminy",
  },
  {
    id: "homework-instructions",
    name: "Homework Instructions",
    body: "Hi {parentFirstName}, here are {childName}'s practice activities this week: [editable block]. Try these for 5–10 min daily. — {providerName}",
  },
  {
    id: "progress-update",
    name: "Progress Update",
    body: "Hi {parentFirstName}, quick update on {childName}: [editable block]. Goals for next session: [editable]. — {providerName}",
  },
  {
    id: "session-notes-ready",
    name: "Session Notes Ready",
    body: "Hi {parentFirstName}, session notes for {childName}'s visit on {date} are ready in Aminy. — {providerName}",
  },
];

/** Demo-mode-only fallback roster (never shown to real providers). */
const SAMPLE_PATIENTS: Patient[] = [
  { id: "1", parentFirstName: "Sarah", childName: "Liam", parentUserId: "demo-parent-1", parentPhone: "+15550100", parentEmail: "sarah@example.com" },
  { id: "2", parentFirstName: "Marcus", childName: "Ava", parentUserId: "demo-parent-2", parentPhone: "+15550101", parentEmail: "marcus@example.com" },
  { id: "3", parentFirstName: "Priya", childName: "Noah", parentUserId: "demo-parent-3", parentPhone: null, parentEmail: "priya@example.com" },
];

const MAKE_SERVER_BASE = () =>
  `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

function highlightTokens(
  text: string,
  substituted: boolean,
  values: Record<string, string>
) {
  const parts = text.split(/(\{[a-zA-Z]+\})/g);
  return parts.map((part, i) => {
    if (/^\{[a-zA-Z]+\}$/.test(part)) {
      const key = part.slice(1, -1);
      const value = values[key];
      if (substituted && value) {
        return (
          <span key={i} className="font-semibold" style={{ color: "#43AA8B" }}>
            {value}
          </span>
        );
      }
      return (
        <span
          key={i}
          className="rounded px-0.5 font-mono text-sm font-semibold"
          style={{ color: "#43AA8B", backgroundColor: "rgba(67,170,139,0.12)" }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function applySubstitutions(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (_match, key) => values[key] || _match);
}

type SendChannel = "sms" | "email";
type SendStatus = { channel: SendChannel; phase: "sending" | "sent" } | null;

interface TemplateCardProps {
  template: Template;
  tokenValues: Record<string, string>;
  patient: Patient | null;
  onSend: (channel: SendChannel, message: string, template: Template) => Promise<void>;
}

function TemplateCard({ template, tokenValues, patient, onSend }: TemplateCardProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(template.body);
  const [draftBody, setDraftBody] = useState(template.body);
  const [sendStatus, setSendStatus] = useState<SendStatus>(null);

  function handleEdit() {
    setDraftBody(body);
    setEditing(true);
  }

  function handleSave() {
    setBody(draftBody);
    setEditing(false);
  }

  function handleCancel() {
    setDraftBody(body);
    setEditing(false);
  }

  async function handleSend(channel: SendChannel) {
    const message = applySubstitutions(body, tokenValues);
    setSendStatus({ channel, phase: "sending" });
    try {
      await onSend(channel, message, template);
      setSendStatus({ channel, phase: "sent" });
      setTimeout(() => setSendStatus(null), 2500);
    } catch (err) {
      setSendStatus(null); // re-enable buttons for retry
      const detail = err instanceof Error ? err.message : "Something went wrong";
      toast.error(`Could not send ${channel === "sms" ? "SMS" : "email"}: ${detail}`, {
        action: { label: "Retry", onClick: () => handleSend(channel) },
      });
    }
  }

  const smsDisabledHint = !patient
    ? "Select a patient to send"
    : !patient.parentPhone
      ? "No phone number on file"
      : null;
  const emailDisabledHint = !patient
    ? "Select a patient to send"
    : !patient.parentUserId
      ? "No email on file"
      : null;

  const smsDisabled = sendStatus !== null || smsDisabledHint !== null;
  const emailDisabled = sendStatus !== null || emailDisabledHint !== null;

  function buttonContent(channel: SendChannel) {
    if (sendStatus?.channel === channel && sendStatus.phase === "sending") {
      return (
        <>
          <Loader2 size={14} className="animate-spin" />
          Sending…
        </>
      );
    }
    if (sendStatus?.channel === channel && sendStatus.phase === "sent") {
      return (
        <>
          <ThumbsUp size={14} />
          Sent ✓
        </>
      );
    }
    return channel === "sms" ? (
      <>
        <MessageSquare size={14} />
        Send SMS
      </>
    ) : (
      <>
        <Mail size={14} />
        Send Email
      </>
    );
  }

  return (
    <div
      className="rounded-2xl border flex flex-col gap-3 p-4"
      style={{ borderColor: "rgba(70,99,121,0.3)", backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#0D1B2A" }}>
          {template.name}
        </span>
        {!editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-100"
            style={{ color: "#466379" }}
          >
            <Edit2 size={12} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none"
            style={{
              borderColor: "rgba(70,99,121,0.4)",
              color: "#0D1B2A",
              minHeight: 96,
            }}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors hover:bg-gray-50"
              style={{ color: "#466379", borderColor: "rgba(70,99,121,0.3)" }}
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: "#43AA8B" }}
            >
              <Check size={12} />
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "#466379" }}>
          {patient
            ? highlightTokens(applySubstitutions(body, tokenValues), true, tokenValues)
            : highlightTokens(body, false, tokenValues)}
        </p>
      )}

      {!editing && (
        <>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleSend("sms")}
              disabled={smsDisabled}
              title={smsDisabledHint ?? undefined}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                backgroundColor:
                  sendStatus?.channel === "sms" && sendStatus.phase === "sent"
                    ? "#2e8b6e"
                    : "#43AA8B",
              }}
            >
              {buttonContent("sms")}
            </button>
            <button
              onClick={() => handleSend("email")}
              disabled={emailDisabled}
              title={emailDisabledHint ?? undefined}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                backgroundColor:
                  sendStatus?.channel === "email" && sendStatus.phase === "sent"
                    ? "#2e8b6e"
                    : "#43AA8B",
              }}
            >
              {buttonContent("email")}
            </button>
          </div>
          {patient && smsDisabledHint === "No phone number on file" && (
            <p className="text-xs" style={{ color: "#E07A5F" }}>
              No phone number on file
            </p>
          )}
          {patient && emailDisabledHint === "No email on file" && (
            <p className="text-xs" style={{ color: "#E07A5F" }}>
              No email on file
            </p>
          )}
          <p className="text-xs" style={{ color: "#8A9BB0" }}>
            Messages are logged to the client record.
          </p>
        </>
      )}
    </div>
  );
}

interface CommunicationTemplatesProps {
  patientName?: string;
  providerName?: string;
  patientId?: string;
}

export function CommunicationTemplates({
  providerName: providerNameProp,
  patientName,
  patientId: patientIdProp,
}: CommunicationTemplatesProps = {}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const providerName = providerNameProp || "your provider";
  const sessionTime = "2:00 PM";
  const sessionDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Load the signed-in provider's real caseload (same shapes ProviderPortal uses):
  // provider_patients → children.name (child) + profiles.name/email/phone_number (parent).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isDemoMode()) {
        if (!cancelled) {
          setPatients(SAMPLE_PATIENTS);
          setLoadingPatients(false);
        }
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const providerId = session?.user?.id;
        if (!providerId) {
          if (!cancelled) setPatients([]);
          return;
        }
        const { data: rows, error } = await supabase
          .from("provider_patients")
          .select("id, child_id, parent_user_id")
          .eq("provider_id", providerId);
        if (error) throw error;

        const loaded: Patient[] = [];
        for (const pp of rows ?? []) {
          const { data: child } = await supabase
            .from("children")
            .select("name")
            .eq("id", pp.child_id)
            .single();
          const { data: parent } = await supabase
            .from("profiles")
            .select("name, email, phone_number")
            .eq("id", pp.parent_user_id)
            .single();
          if (child?.name) {
            loaded.push({
              id: pp.id,
              childName: child.name,
              parentFirstName: (parent?.name || "Parent").split(" ")[0],
              parentUserId: pp.parent_user_id || null,
              parentPhone: parent?.phone_number || null,
              parentEmail: parent?.email || null,
            });
          }
        }
        if (!cancelled) setPatients(loaded);
      } catch (err) {
        if (import.meta.env.DEV) console.error("[CommunicationTemplates] Failed to load patients:", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Preselect the patient ProviderPortal already had selected, when present.
  useEffect(() => {
    if (patientIdProp && patients.some((p) => p.id === patientIdProp)) {
      setSelectedPatientId(patientIdProp);
    }
  }, [patientIdProp, patients]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  const tokenValues: Record<string, string> = {
    parentFirstName: selectedPatient?.parentFirstName ?? "",
    childName: selectedPatient?.childName ?? patientName ?? "",
    providerName,
    time: sessionTime,
    date: sessionDate,
  };

  const sendMessage = useCallback(
    async (channel: SendChannel, message: string, template: Template) => {
      if (!selectedPatient) throw new Error("Select a patient first");

      // Demo mode: never hits the network (matches demo-seed contract).
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 400));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in to send messages");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      if (channel === "sms") {
        if (!selectedPatient.parentPhone) throw new Error("No phone number on file");
        const res = await fetch(`${MAKE_SERVER_BASE()}/notifications/sms`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            phoneNumber: selectedPatient.parentPhone,
            message,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(data?.error || `SMS send failed (${res.status})`);
        }
      } else {
        if (!selectedPatient.parentUserId) throw new Error("No email on file");
        const res = await fetch(`${MAKE_SERVER_BASE()}/email/provider-message`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            parentUserId: selectedPatient.parentUserId,
            subject: `${template.name} — from ${providerName}`,
            body: message,
            templateName: template.name,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || `Email send failed (${res.status})`);
        }
      }
    },
    [selectedPatient, providerName]
  );

  return (
    <div className="flex flex-col gap-0 min-h-full">
      {/* Header */}
      <div className="px-4 py-5" style={{ backgroundColor: "#0D1B2A" }}>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={20} color="#43AA8B" />
          <h2 className="text-lg font-bold text-white">Communication Templates</h2>
        </div>
        <p className="text-sm" style={{ color: "rgba(248,248,246,0.6)" }}>
          Send SMS or email messages to families using pre-built templates.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Patient selector */}
        <div
          className="rounded-2xl border p-4 flex flex-col gap-2"
          style={{ borderColor: "rgba(70,99,121,0.3)", backgroundColor: "#f8f8f6" }}
        >
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "#466379" }}
          >
            <span className="flex items-center gap-1.5">
              <User size={13} />
              Select Patient
            </span>
          </label>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none"
            style={{ borderColor: "rgba(70,99,121,0.3)", color: "#0D1B2A" }}
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={loadingPatients}
          >
            <option value="">
              {loadingPatients ? "Loading patients…" : "— No patient selected —"}
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.childName} (parent: {p.parentFirstName})
              </option>
            ))}
          </select>
          {!loadingPatients && patients.length === 0 && (
            <p className="text-sm" style={{ color: "#466379" }}>
              No patients on your caseload yet. Families appear here once they grant
              you access.
            </p>
          )}
          {selectedPatient && (
            <p className="text-sm" style={{ color: "#43AA8B" }}>
              Tokens will be filled for {selectedPatient.childName} /{" "}
              {selectedPatient.parentFirstName}.
            </p>
          )}
        </div>

        {/* Template cards */}
        <div className="flex flex-col gap-3">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              tokenValues={tokenValues}
              patient={selectedPatient}
              onSend={sendMessage}
            />
          ))}
        </div>

        {/* Legend */}
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2"
          style={{
            backgroundColor: "rgba(67,170,139,0.08)",
            border: "1px solid rgba(67,170,139,0.2)",
          }}
        >
          <span
            className="mt-0.5 text-xs font-mono font-semibold px-1 rounded shrink-0"
            style={{ color: "#43AA8B", backgroundColor: "rgba(67,170,139,0.12)" }}
          >
            {"{token}"}
          </span>
          <p className="text-sm" style={{ color: "#466379" }}>
            Teal tokens are auto-replaced when a patient is selected. You can also edit
            any template body inline.
          </p>
        </div>
      </div>
    </div>
  );
}
