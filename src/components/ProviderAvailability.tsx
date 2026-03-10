/**
 * Provider Availability Calendar
 *
 * Weekly calendar grid showing provider time slots.
 * CRUD interface: add, edit, and remove availability slots.
 * Integrates with the telehealth booking system.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAvailability,
  addSlot,
  removeSlot,
  DAY_NAMES,
  type WeeklySchedule,
  type AvailabilitySlot,
  type SlotType,
  type AddSlotParams,
} from '../lib/provider-availability-service';

// ============================================================================
// Types
// ============================================================================

interface AddSlotForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotType: SlotType;
}

// ============================================================================
// Constants
// ============================================================================

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM
const SLOT_TYPE_COLORS: Record<SlotType, { bg: string; border: string; text: string }> = {
  available: { bg: '#e8f5f0', border: '#43AA8B', text: '#2d8a6e' },
  telehealth_only: { bg: '#e8f0fe', border: '#4285f4', text: '#1a56db' },
  in_person_only: { bg: '#fff5e6', border: '#F4A261', text: '#b87a3a' },
  blocked: { bg: '#f5f5f5', border: '#999', text: '#666' },
};

const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  available: 'Available',
  telehealth_only: 'Telehealth Only',
  in_person_only: 'In-Person Only',
  blocked: 'Blocked',
};

// ============================================================================
// Component
// ============================================================================

export default function ProviderAvailability() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [formData, setFormData] = useState<AddSlotForm>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '12:00',
    slotType: 'available',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [providerId] = useState('current'); // Would come from auth context

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const { data } = await getAvailability(providerId);
    setSchedule(data);
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  async function handleAddSlot() {
    setFormError(null);

    if (formData.startTime >= formData.endTime) {
      setFormError('End time must be after start time');
      return;
    }

    const params: AddSlotParams = {
      providerId,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      slotType: formData.slotType,
    };

    const { data, error } = await addSlot(params);
    if (error) {
      setFormError(error);
      return;
    }

    if (data) {
      const newSchedule = { ...schedule };
      if (!newSchedule[data.dayOfWeek]) newSchedule[data.dayOfWeek] = [];
      newSchedule[data.dayOfWeek].push(data);
      newSchedule[data.dayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedule(newSchedule);
    }

    setShowAddForm(false);
    resetForm();
  }

  async function handleRemoveSlot(slot: AvailabilitySlot) {
    const { error } = await removeSlot(slot.id);
    if (!error) {
      const newSchedule = { ...schedule };
      newSchedule[slot.dayOfWeek] = (newSchedule[slot.dayOfWeek] || []).filter((s) => s.id !== slot.id);
      setSchedule(newSchedule);
    }
  }

  function resetForm() {
    setFormData({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotType: 'available' });
    setFormError(null);
    setEditingSlot(null);
  }

  function openAddForDay(dayOfWeek: number) {
    setFormData({ ...formData, dayOfWeek });
    setShowAddForm(true);
    setEditingSlot(null);
  }

  // Count total hours
  const totalHours = Object.values(schedule).flat().reduce((sum, slot) => {
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    return sum + (eh + em / 60) - (sh + sm / 60);
  }, 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 4px 0' }}>
          Availability Calendar
        </h1>
        <p style={{ fontSize: '14px', color: '#577590', margin: 0 }}>
          Manage your weekly schedule and booking availability
        </p>
      </div>

      {/* Summary Bar */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '16px', padding: '12px',
        backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0D1B2A' }}>{totalHours.toFixed(0)}</div>
          <div style={{ fontSize: '10px', color: '#577590', fontWeight: 600 }}>HRS/WEEK</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e9ecef' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#43AA8B' }}>
            {Object.values(schedule).flat().filter((s) => s.slotType !== 'blocked').length}
          </div>
          <div style={{ fontSize: '10px', color: '#577590', fontWeight: 600 }}>SLOTS</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e9ecef' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#577590' }}>
            {Object.keys(schedule).filter((d) => (schedule[Number(d)] || []).length > 0).length}
          </div>
          <div style={{ fontSize: '10px', color: '#577590', fontWeight: 600 }}>DAYS</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {(Object.entries(SLOT_TYPE_COLORS) as [SlotType, typeof SLOT_TYPE_COLORS[SlotType]][]).map(([type, colors]) => (
          type !== 'blocked' && (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors.border }} />
              <span style={{ fontSize: '11px', color: '#577590' }}>{SLOT_TYPE_LABELS[type]}</span>
            </div>
          )
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#577590' }}>Loading schedule...</div>
      ) : (
        /* Weekly Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <DayRow
              key={day}
              dayOfWeek={day}
              slots={schedule[day] || []}
              onAddSlot={() => openAddForDay(day)}
              onRemoveSlot={handleRemoveSlot}
            />
          ))}
        </div>
      )}

      {/* Add Slot Button */}
      <button
        onClick={() => setShowAddForm(true)}
        style={{
          position: 'fixed', bottom: '80px', right: '16px',
          width: '56px', height: '56px', borderRadius: '28px',
          backgroundColor: '#43AA8B', border: 'none', color: '#fff',
          fontSize: '28px', fontWeight: 300, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(67,170,139,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        +
      </button>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <SlotFormModal
          formData={formData}
          setFormData={setFormData}
          onSave={handleAddSlot}
          onCancel={() => { setShowAddForm(false); resetForm(); }}
          error={formError}
          isEditing={!!editingSlot}
        />
      )}
    </div>
  );
}

// ============================================================================
// Day Row
// ============================================================================

function DayRow({
  dayOfWeek,
  slots,
  onAddSlot,
  onRemoveSlot,
}: {
  dayOfWeek: number;
  slots: AvailabilitySlot[];
  onAddSlot: () => void;
  onRemoveSlot: (slot: AvailabilitySlot) => void;
}) {
  const dayName = DAY_NAMES[dayOfWeek];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '10px', padding: '12px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      opacity: isWeekend && slots.length === 0 ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: slots.length > 0 ? '8px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B2A', minWidth: '36px' }}>
            {dayName.slice(0, 3)}
          </span>
          {slots.length === 0 && (
            <span style={{ fontSize: '12px', color: '#999' }}>No availability</span>
          )}
        </div>
        <button
          onClick={onAddSlot}
          style={{
            padding: '4px 10px', fontSize: '11px', fontWeight: 600,
            backgroundColor: 'transparent', border: '1px solid #43AA8B',
            color: '#43AA8B', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {slots.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {slots.map((slot) => {
            const colors = SLOT_TYPE_COLORS[slot.slotType];
            return (
              <div
                key={slot.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', borderRadius: '6px', borderLeft: `3px solid ${colors.border}`,
                  backgroundColor: colors.bg,
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                    {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                  </span>
                  {slot.slotType !== 'available' && (
                    <span style={{ fontSize: '10px', color: colors.text, marginLeft: '6px' }}>
                      {SLOT_TYPE_LABELS[slot.slotType]}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveSlot(slot)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '16px', color: '#ccc', padding: '0 4px',
                  }}
                  title="Remove slot"
                >
                  \u00d7
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add/Edit Form Modal
// ============================================================================

function SlotFormModal({
  formData,
  setFormData,
  onSave,
  onCancel,
  error,
  isEditing,
}: {
  formData: AddSlotForm;
  setFormData: (data: AddSlotForm) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isEditing: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px 16px 0 0', padding: '20px',
        width: '100%', maxWidth: '400px',
      }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 16px 0' }}>
          {isEditing ? 'Edit Time Slot' : 'Add Time Slot'}
        </h3>

        {/* Day */}
        <label style={labelStyle}>Day</label>
        <select
          value={formData.dayOfWeek}
          onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
          style={inputStyle}
        >
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>{DAY_NAMES[d]}</option>
          ))}
        </select>

        {/* Times */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Time</label>
            <select
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              style={inputStyle}
            >
              {generateTimeOptions().map((t) => (
                <option key={t} value={t}>{formatTimeDisplay(t)}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Time</label>
            <select
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              style={inputStyle}
            >
              {generateTimeOptions().map((t) => (
                <option key={t} value={t}>{formatTimeDisplay(t)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Slot Type */}
        <label style={labelStyle}>Availability Type</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {(['available', 'telehealth_only', 'in_person_only'] as SlotType[]).map((type) => {
            const colors = SLOT_TYPE_COLORS[type];
            const isSelected = formData.slotType === type;
            return (
              <button
                key={type}
                onClick={() => setFormData({ ...formData, slotType: type })}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${isSelected ? colors.border : '#e0e0e0'}`,
                  backgroundColor: isSelected ? colors.bg : '#fff',
                  color: isSelected ? colors.text : '#999',
                }}
              >
                {SLOT_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ padding: '8px', backgroundColor: '#fff5f5', color: '#E07A5F', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ ...btnStyle, backgroundColor: '#f0f0f0', color: '#577590', flex: 1 }}>
            Cancel
          </button>
          <button onClick={onSave} style={{ ...btnStyle, backgroundColor: '#43AA8B', color: '#fff', flex: 2 }}>
            {isEditing ? 'Update' : 'Add Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#577590', marginBottom: '4px', marginTop: '12px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px',
  fontSize: '14px', color: '#0D1B2A', backgroundColor: '#fff', outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
};

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 6; h <= 21; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
    times.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return times;
}
