/**
 * Telehealth Preferences Screen
 * Settings for messaging, notifications, and privacy
 *
 * Based on One Medical's settings structure
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Shield,
  FileText,
  ChevronRight,
  ExternalLink,
  Lock
} from 'lucide-react';

interface TelehealthPreferencesProps {
  onBack: () => void;
}

interface PreferenceToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export function TelehealthPreferences({ onBack }: TelehealthPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferenceToggle[]>([
    {
      id: 'secure-messages',
      label: 'Secure Messages',
      description: 'Enable encrypted messaging with your care team',
      enabled: false,
      comingSoon: true
    },
    {
      id: 'care-plan-emails',
      label: 'Care Plan Emails',
      description: 'Receive visit summaries and care plan updates via email',
      enabled: true
    },
    {
      id: 'care-plan-push',
      label: 'Care Plan Notifications',
      description: 'Get push notifications for action item reminders',
      enabled: true
    },
    {
      id: 'appointment-reminders',
      label: 'Appointment Reminders',
      description: 'Receive reminders before scheduled visits',
      enabled: true
    },
    {
      id: 'provider-updates',
      label: 'Provider Availability Alerts',
      description: 'Get notified when your preferred providers have new openings',
      enabled: false
    }
  ]);

  const togglePreference = (id: string) => {
    setPreferences(prev => prev.map(pref =>
      pref.id === id && !pref.comingSoon
        ? { ...pref, enabled: !pref.enabled }
        : pref
    ));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Preferences</h1>
            <p className="text-sm text-gray-500">Manage your care settings</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Communication Preferences */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <h2 className="font-medium text-gray-900">Communication Preferences</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {preferences.map((pref) => (
              <div key={pref.id} className="px-4 py-4">
                <label className="flex items-start justify-between cursor-pointer">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{pref.label}</p>
                      {pref.comingSoon && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{pref.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => togglePreference(pref.id)}
                      disabled={pref.comingSoon}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pref.enabled ? 'bg-[#0891b2]' : 'bg-gray-200'
                      } ${pref.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pref.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Note */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Your Privacy Matters</p>
              <p className="text-sm text-blue-700 mt-1">
                Turn on "Secure Messages" to keep your personal health information private
                and encrypted. Recommended for sensitive communications.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h2 className="font-medium text-gray-900">Legal</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">Privacy Policy</span>
              <div className="flex items-center gap-2 text-gray-400">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>

            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">Telehealth Terms of Service</span>
              <div className="flex items-center gap-2 text-gray-400">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>

            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">Membership Terms</span>
              <div className="flex items-center gap-2 text-gray-400">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>

            <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">Notice of Privacy Practices</span>
              <div className="flex items-center gap-2 text-gray-400">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>
          </div>
        </section>

        {/* Emergency Services Disclaimer */}
        <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-2">Important Notice</p>
          <p>
            Aminy does not provide emergency services. If you are experiencing a medical emergency,
            please call 911 or go to your nearest emergency room. For mental health crises,
            call or text 988 to reach the Suicide and Crisis Lifeline.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TelehealthPreferences;
