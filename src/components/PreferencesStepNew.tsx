import React from "react";
import { Label } from "./ui/label";

interface FormData {
  tonePreference: string;
  timeSlots: string[];
  [key: string]: unknown;
}

interface PreferencesStepProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

function PreferencesStep({ formData, setFormData }: PreferencesStepProps) {
  const toneOptions = [
    { 
      id: "supportive", 
      label: "Supportive",
      description: "Encouraging and gentle guidance"
    },
    { 
      id: "direct", 
      label: "Direct",
      description: "Clear and straightforward approach"
    },
    { 
      id: "playful", 
      label: "Playful",
      description: "Fun and engaging style"
    },
  ];

  const timeSlots = [
    { id: "morning", label: "Morning" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" },
    { id: "bedtime", label: "Bedtime" }
  ];

  const selectTone = (toneId: string) => {
    setFormData({
      ...formData,
      tonePreference: toneId,
    });
  };

  const toggleTimeSlot = (slotId: string) => {
    const current = formData.timeSlots || [];
    if (current.includes(slotId)) {
      setFormData({
        ...formData,
        timeSlots: current.filter((id: string) => id !== slotId),
      });
    } else {
      setFormData({
        ...formData,
        timeSlots: [...current, slotId],
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Tone Selection */}
      <div>
        <Label className="mb-3 block">
          Communication style (select 1)
        </Label>
        <div className="space-y-3">
          {toneOptions.map((tone) => {
            const isSelected = formData.tonePreference === tone.id;
            return (
              <button
                key={tone.id}
                onClick={() => selectTone(tone.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 aminy-tone-badge ${
                  isSelected
                    ? "aminy-goal-selected text-primary"
                    : "aminy-goal-unselected text-primary"
                }`}
              >
                <div className="font-semibold text-sm mb-1">{tone.label}</div>
                <div className="text-xs text-muted-foreground">{tone.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time of Day Toggles */}
      <div>
        <Label className="mb-3 block">
          When would you like support? (select all that apply)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {timeSlots.map((slot) => {
            const isSelected = (formData.timeSlots || []).includes(slot.id);
            return (
              <button
                key={slot.id}
                onClick={() => toggleTimeSlot(slot.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 aminy-focus-area-pill ${
                  isSelected
                    ? "aminy-focus-area-selected text-primary"
                    : "aminy-focus-area-unselected text-primary"
                }`}
              >
                <div className="font-semibold text-sm">{slot.label}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          We'll suggest the right steps at the right times.
        </p>
      </div>

      {/* Supportive microcopy at bottom */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          These preferences help Aminy personalize your experience and suggest activities when they'll be most helpful.
        </p>
      </div>
    </div>
  );
}

export { PreferencesStep };