import { useState } from "react";
import { ThumbsUp, Mail, MessageSquare, Edit2, Check, X, User } from "lucide-react";

interface Template {
  id: string;
  name: string;
  body: string;
}

interface Patient {
  id: string;
  parentFirstName: string;
  childName: string;
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

const SAMPLE_PATIENTS: Patient[] = [
  { id: "1", parentFirstName: "Sarah", childName: "Liam" },
  { id: "2", parentFirstName: "Marcus", childName: "Ava" },
  { id: "3", parentFirstName: "Priya", childName: "Noah" },
];

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

function applySubstitutions(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (_match, key) => values[key] ?? _match);
}

interface TemplateCardProps {
  template: Template;
  tokenValues: Record<string, string>;
  hasPatient: boolean;
}

function TemplateCard({ template, tokenValues, hasPatient }: TemplateCardProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(template.body);
  const [draftBody, setDraftBody] = useState(template.body);
  const [sentState, setSentState] = useState<null | "sms" | "email">(null);

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

  function handleSend(channel: "sms" | "email") {
    setSentState(channel);
    setTimeout(() => setSentState(null), 2500);
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
          {hasPatient
            ? highlightTokens(applySubstitutions(body, tokenValues), true, tokenValues)
            : highlightTokens(body, false, tokenValues)}
        </p>
      )}

      {!editing && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => handleSend("sms")}
            disabled={sentState !== null}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-all disabled:opacity-70"
            style={{ backgroundColor: sentState === "sms" ? "#2e8b6e" : "#43AA8B" }}
          >
            {sentState === "sms" ? (
              <>
                <ThumbsUp size={14} />
                Sent!
              </>
            ) : (
              <>
                <MessageSquare size={14} />
                Send SMS
              </>
            )}
          </button>
          <button
            onClick={() => handleSend("email")}
            disabled={sentState !== null}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-all disabled:opacity-70"
            style={{ backgroundColor: sentState === "email" ? "#2e8b6e" : "#43AA8B" }}
          >
            {sentState === "email" ? (
              <>
                <ThumbsUp size={14} />
                Sent!
              </>
            ) : (
              <>
                <Mail size={14} />
                Send Email
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function CommunicationTemplates() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const providerName = "Dr. Rivera";
  const sessionTime = "2:00 PM";
  const sessionDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const selectedPatient = SAMPLE_PATIENTS.find((p) => p.id === selectedPatientId) ?? null;

  const tokenValues: Record<string, string> = {
    parentFirstName: selectedPatient?.parentFirstName ?? "",
    childName: selectedPatient?.childName ?? "",
    providerName,
    time: sessionTime,
    date: sessionDate,
  };

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
              Select Patient (optional — populates tokens)
            </span>
          </label>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none"
            style={{ borderColor: "rgba(70,99,121,0.3)", color: "#0D1B2A" }}
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">— No patient selected —</option>
            {SAMPLE_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.childName} (parent: {p.parentFirstName})
              </option>
            ))}
          </select>
          {selectedPatient && (
            <p className="text-xs" style={{ color: "#43AA8B" }}>
              Tokens will be filled for {selectedPatient.childName} / {selectedPatient.parentFirstName}.
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
              hasPatient={!!selectedPatient}
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
          <p className="text-xs" style={{ color: "#466379" }}>
            Teal tokens are auto-replaced when a patient is selected. You can also edit any template body inline.
          </p>
        </div>
      </div>
    </div>
  );
}
