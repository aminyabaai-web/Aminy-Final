/**
 * Provider Portal
 * Self-serve portal for providers to manage availability and sessions
 *
 * Features:
 * - Profile management
 * - Licensed states selection
 * - Weekly availability blocks
 * - Time-off management
 * - Upcoming appointments
 * - Visit summary entry
 */

import React, { useState } from 'react';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  LogOut,
  Plus,
  Trash2,
  Save,
  ChevronRight,
  Video,
  Settings,
  Bell,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import {
  Provider,
  AvailabilityBlock,
  TimeOffBlock,
  Appointment,
  US_STATES,
  PROVIDER_ROLE_DISPLAY,
  ProviderRole
} from '../../types/telehealth';

interface ProviderPortalProps {
  providerId: string;
  onLogout?: () => void;
}

type PortalTab = 'profile' | 'availability' | 'appointments' | 'summaries';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

// Mock provider data
const INITIAL_PROVIDER: Provider = {
  id: 'provider-1',
  firstName: 'Sarah',
  lastName: 'Chen',
  credentials: 'BCBA, LBA',
  role: 'bcba',
  roleDisplayName: 'Board Certified Behavior Analyst',
  bio: 'Specializing in early intervention and parent coaching for families navigating autism.',
  licensedStates: ['AZ', 'CA', 'TX'],
  offersConsult: true,
  offersDeepReview: true,
  consultPrice: 85,
  deepReviewPrice: 165,
  organization: 'independent',
  isActive: true,
  acceptingNewPatients: true,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z'
};

// Mock availability
const INITIAL_AVAILABILITY: AvailabilityBlock[] = [
  { id: 'av-1', providerId: 'provider-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', timezone: 'America/Phoenix', isRecurring: true },
  { id: 'av-2', providerId: 'provider-1', dayOfWeek: 1, startTime: '14:00', endTime: '17:00', timezone: 'America/Phoenix', isRecurring: true },
  { id: 'av-3', providerId: 'provider-1', dayOfWeek: 3, startTime: '09:00', endTime: '16:00', timezone: 'America/Phoenix', isRecurring: true },
  { id: 'av-4', providerId: 'provider-1', dayOfWeek: 5, startTime: '10:00', endTime: '14:00', timezone: 'America/Phoenix', isRecurring: true }
];

// Mock upcoming appointments
const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    userId: 'user-1',
    providerId: 'provider-1',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timezone: 'America/Phoenix',
    visitType: 'deep-review',
    visitFormat: 'remote',
    duration: 50,
    visitReason: 'Follow-up on meltdown strategies',
    whoIsThisFor: 'child',
    userState: 'AZ',
    price: 165,
    paymentStatus: 'completed',
    videoJoinUrl: '', // Generated dynamically by Daily.co when appointment is created
    videoProvider: 'daily',
    status: 'confirmed',
    createdAt: '2025-01-14T00:00:00Z',
    updatedAt: '2025-01-14T00:00:00Z'
  },
  {
    id: 'apt-2',
    userId: 'user-2',
    providerId: 'provider-1',
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: 'America/Phoenix',
    visitType: 'consult',
    visitFormat: 'remote',
    duration: 25,
    visitReason: 'Initial consultation - sleep issues',
    whoIsThisFor: 'family',
    userState: 'CA',
    price: 85,
    paymentStatus: 'completed',
    videoJoinUrl: '', // Generated dynamically by Daily.co when appointment is created
    videoProvider: 'daily',
    status: 'confirmed',
    createdAt: '2025-01-13T00:00:00Z',
    updatedAt: '2025-01-13T00:00:00Z'
  }
];

export function ProviderPortalNew({ providerId, onLogout }: ProviderPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('profile');
  const [provider, setProvider] = useState<Provider>(INITIAL_PROVIDER);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>(INITIAL_AVAILABILITY);
  const [appointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#577590] to-[#466379] rounded-full flex items-center justify-center text-white font-semibold">
              {provider.firstName[0]}{provider.lastName[0]}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Provider Portal</h1>
              <p className="text-sm text-gray-500">{provider.firstName} {provider.lastName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Saved
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#577590] text-white font-medium rounded-lg hover:bg-[#466379] disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'availability', label: 'Availability', icon: Calendar },
                { id: 'appointments', label: 'Appointments', icon: Clock },
                { id: 'summaries', label: 'Visit Summaries', icon: FileText }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as PortalTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === id
                      ? 'bg-[#577590]/10 text-[#577590] border-l-4 border-[#577590]'
                      : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                  {id === 'appointments' && appointments.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-[#577590] text-white text-xs rounded-full">
                      {appointments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'profile' && (
              <ProfileTab
                provider={provider}
                onUpdate={setProvider}
              />
            )}
            {activeTab === 'availability' && (
              <AvailabilityTab
                availability={availability}
                onUpdate={setAvailability}
              />
            )}
            {activeTab === 'appointments' && (
              <AppointmentsTab appointments={appointments} />
            )}
            {activeTab === 'summaries' && (
              <SummariesTab appointments={appointments.filter(a => a.status === 'completed')} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Profile Tab
// ============================================================================

function ProfileTab({
  provider,
  onUpdate
}: {
  provider: Provider;
  onUpdate: (p: Provider) => void;
}) {
  const [showStateSelector, setShowStateSelector] = useState(false);

  const toggleState = (stateCode: string) => {
    const newStates = provider.licensedStates.includes(stateCode)
      ? provider.licensedStates.filter(s => s !== stateCode)
      : [...provider.licensedStates, stateCode];
    onUpdate({ ...provider, licensedStates: newStates });
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Profile Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={provider.firstName}
              onChange={(e) => onUpdate({ ...provider, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20 focus:border-[#577590]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={provider.lastName}
              onChange={(e) => onUpdate({ ...provider, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20 focus:border-[#577590]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credentials</label>
            <input
              type="text"
              value={provider.credentials}
              onChange={(e) => onUpdate({ ...provider, credentials: e.target.value })}
              placeholder="e.g., BCBA, LCSW, PhD"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20 focus:border-[#577590]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={provider.role}
              onChange={(e) => onUpdate({
                ...provider,
                role: e.target.value as ProviderRole,
                roleDisplayName: PROVIDER_ROLE_DISPLAY[e.target.value as ProviderRole]
              })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20 focus:border-[#577590]"
            >
              {Object.entries(PROVIDER_ROLE_DISPLAY).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              value={provider.bio}
              onChange={(e) => onUpdate({ ...provider, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20 focus:border-[#577590] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Licensed States */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Licensed States</h2>
            <p className="text-sm text-gray-500">Select states where you are licensed to practice</p>
          </div>
          <button
            onClick={() => setShowStateSelector(!showStateSelector)}
            className="text-sm text-[#577590] font-medium hover:underline"
          >
            {showStateSelector ? 'Done' : 'Edit States'}
          </button>
        </div>

        {showStateSelector ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {US_STATES.map((state) => (
              <label
                key={state.code}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  provider.licensedStates.includes(state.code)
                    ? 'bg-[#577590]/10 text-[#577590]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={provider.licensedStates.includes(state.code)}
                  onChange={() => toggleState(state.code)}
                  className="rounded border-gray-300 text-[#577590] focus:ring-[#577590]"
                />
                <span className="text-sm">{state.code}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {provider.licensedStates.length > 0 ? (
              provider.licensedStates.map((code) => (
                <span
                  key={code}
                  className="px-3 py-1 bg-[#577590]/10 text-[#577590] text-sm font-medium rounded-full"
                >
                  {code}
                </span>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No states selected</p>
            )}
          </div>
        )}
      </div>

      {/* Pricing & Services */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Pricing & Services</h2>

        <div className="space-y-3 sm:space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={provider.offersConsult}
                onChange={(e) => onUpdate({ ...provider, offersConsult: e.target.checked })}
                className="rounded border-gray-300 text-[#577590] focus:ring-[#577590]"
              />
              <div>
                <p className="font-medium text-gray-900">25-min Consult</p>
                <p className="text-sm text-gray-500">Quick guidance session</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={provider.consultPrice}
                onChange={(e) => onUpdate({ ...provider, consultPrice: Number(e.target.value) })}
                className="w-20 px-3 py-1 border border-gray-200 rounded-lg text-right"
              />
            </div>
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={provider.offersDeepReview}
                onChange={(e) => onUpdate({ ...provider, offersDeepReview: e.target.checked })}
                className="rounded border-gray-300 text-[#577590] focus:ring-[#577590]"
              />
              <div>
                <p className="font-medium text-gray-900">50-min Deep Review</p>
                <p className="text-sm text-gray-500">Comprehensive session</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={provider.deepReviewPrice}
                onChange={(e) => onUpdate({ ...provider, deepReviewPrice: Number(e.target.value) })}
                className="w-20 px-3 py-1 border border-gray-200 rounded-lg text-right"
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Availability Tab
// ============================================================================

function AvailabilityTab({
  availability,
  onUpdate
}: {
  availability: AvailabilityBlock[];
  onUpdate: (blocks: AvailabilityBlock[]) => void;
}) {
  const addBlock = () => {
    const newBlock: AvailabilityBlock = {
      id: `av-${Date.now()}`,
      providerId: 'provider-1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'America/Phoenix',
      isRecurring: true
    };
    onUpdate([...availability, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<AvailabilityBlock>) => {
    onUpdate(availability.map(block =>
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const removeBlock = (id: string) => {
    onUpdate(availability.filter(block => block.id !== id));
  };

  // Group by day
  const byDay = availability.reduce((acc, block) => {
    if (!acc[block.dayOfWeek]) acc[block.dayOfWeek] = [];
    acc[block.dayOfWeek].push(block);
    return acc;
  }, {} as Record<number, AvailabilityBlock[]>);

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Weekly Availability</h2>
            <p className="text-sm text-gray-500">Set your recurring weekly schedule</p>
          </div>
          <button
            onClick={addBlock}
            className="flex items-center gap-2 px-4 py-2 bg-[#577590] text-white font-medium rounded-lg hover:bg-[#466379] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Time Block
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {DAYS_OF_WEEK.map(({ value, label }) => {
            const dayBlocks = byDay[value] || [];

            return (
              <div key={value} className="flex items-start gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-28 flex-shrink-0">
                  <p className="font-medium text-gray-900">{label}</p>
                </div>
                <div className="flex-1 space-y-2">
                  {dayBlocks.length > 0 ? (
                    dayBlocks.map((block) => (
                      <div key={block.id} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => updateBlock(block.id, { startTime: e.target.value })}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => updateBlock(block.id, { endTime: e.target.value })}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">Not available</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Off */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Time Off</h2>
            <p className="text-sm text-gray-500">Block dates when you're unavailable</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" />
            Add Time Off
          </button>
        </div>

        <p className="text-gray-500 text-sm">No time off scheduled</p>
      </div>
    </div>
  );
}

// ============================================================================
// Appointments Tab
// ============================================================================

function AppointmentsTab({ appointments }: { appointments: Appointment[] }) {
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Upcoming Appointments</h2>

      {appointments.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-[#577590]/10 rounded-full flex items-center justify-center">
                <Video className="w-6 h-6 text-[#577590]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{apt.visitReason}</p>
                <p className="text-sm text-gray-500">{formatDateTime(apt.scheduledAt)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {apt.visitType === 'consult' ? '25-min Consult' : '50-min Deep Review'} • ${apt.price}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {apt.status}
                </span>
                <button className="p-2 text-[#577590] hover:bg-[#577590]/10 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
      )}
    </div>
  );
}

// ============================================================================
// Summaries Tab
// ============================================================================

function SummariesTab({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Visit Summaries to Complete</h2>

      {appointments.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center gap-3 sm:gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{apt.visitReason}</p>
                <p className="text-sm text-amber-700">Summary pending</p>
              </div>
              <button className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">
                Write Summary
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-500">All visit summaries complete!</p>
        </div>
      )}
    </div>
  );
}

export default ProviderPortalNew;
