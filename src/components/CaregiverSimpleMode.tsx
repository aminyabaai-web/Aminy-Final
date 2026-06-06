// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CaregiverSimpleMode — Simplified dashboard for secondary caregivers
 *
 * Big tap targets, warm language, zero provider/analytics clutter.
 * Screen: 'caregiver-simple-mode'
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Heart,
  FileText,
  Phone,
  ArrowLeft,
  Clock,
  User,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { isDemoMode } from '../lib/demo-seed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Appointment {
  time: string;
  providerName: string;
  serviceType: string;
}

interface Document {
  name: string;
  date: string;
  type: string;
}

interface CaregiverSimpleModeProps {
  caregiverName?: string;
  childName?: string;
  onBack?: () => void;
  onNavigateToJunior?: () => void;
  onNavigateToVault?: () => void;
}

// ---------------------------------------------------------------------------
// Demo data — shown ONLY in demo mode so investor/AACT walkthroughs look
// complete. Real caregivers see live data (props/Supabase) or a friendly
// empty state — never these placeholder names/records.
// ---------------------------------------------------------------------------

const DEMO_APPOINTMENTS: Appointment[] = [
  { time: 'Today, 2:00 PM', providerName: 'Dr. Sarah Chen', serviceType: 'ABA Therapy' },
  { time: 'Thu, Apr 10 at 10:00 AM', providerName: 'Ms. Lopez', serviceType: 'Speech Therapy' },
];

const DEMO_DOCS: Document[] = [
  { name: 'Treatment Plan', date: 'Apr 1, 2026', type: 'PDF' },
  { name: 'Insurance Card', date: 'Mar 15, 2026', type: 'Image' },
  { name: 'Evaluation Report', date: 'Feb 28, 2026', type: 'PDF' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BigCard({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 ${color} overflow-hidden`}
    >
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  return (
    <div className="flex items-start gap-3 py-3 border-t border-gray-100 first:border-0">
      <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-[#6B9080]/10 flex items-center justify-center">
        <Clock className="w-5 h-5 text-[#6B9080]" />
      </div>
      <div>
        <p className="text-xl font-semibold text-gray-900 leading-tight">{appt.time}</p>
        <p className="text-lg text-gray-700 mt-0.5">{appt.serviceType}</p>
        <p className="text-base text-gray-500 mt-0.5 flex items-center gap-1">
          <User className="w-4 h-4" /> {appt.providerName}
        </p>
      </div>
    </div>
  );
}

function DocRow({ doc }: { doc: Document }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-gray-100 first:border-0">
      <div>
        <p className="text-xl font-semibold text-gray-900">{doc.name}</p>
        <p className="text-base text-gray-500 mt-0.5">{doc.date}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CaregiverSimpleMode({
  caregiverName = 'there',
  childName = 'your child',
  onBack,
  onNavigateToJunior,
  onNavigateToVault,
}: CaregiverSimpleModeProps) {
  const [showHelpExpanded, setShowHelpExpanded] = useState(false);

  // Real caregivers see live data (none wired yet → empty); demo walkthroughs
  // get the rich sample content so the screen looks complete.
  const appointments: Appointment[] = isDemoMode() ? DEMO_APPOINTMENTS : [];
  const docs: Document[] = isDemoMode() ? DEMO_DOCS : [];

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-teal-700 text-white px-5 pt-safe-top pb-5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-teal-200 mb-3 text-base min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
        <div>
          <p className="text-teal-200 text-base font-medium">Welcome</p>
          <h1 className="text-3xl font-bold leading-tight">
            Hi, {caregiverName}!
          </h1>
          <p className="text-teal-100 text-xl mt-1">
            You&apos;re helping{' '}
            <span className="font-semibold text-white">{childName}</span> today.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Today's Schedule */}
        <BigCard
          icon={<Calendar className="w-8 h-8 text-[#6B9080]" />}
          title="Today's Schedule"
          color="border-[#6B9080]/20 bg-white"
        >
          {appointments.length === 0 ? (
            <p className="text-xl text-gray-500 py-2">No upcoming appointments.</p>
          ) : (
            appointments.map((appt, i) => (
              <AppointmentRow key={i} appt={appt} />
            ))
          )}
        </BigCard>

        {/* Ease Activities */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={onNavigateToJunior}
          className="w-full rounded-2xl border-2 border-pink-200 bg-white px-5 py-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
          style={{ minHeight: 80 }}
        >
          <Heart className="w-9 h-9 text-pink-500 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Ease Activities</h2>
            <p className="text-base text-gray-600 mt-0.5">
              Fun therapeutic activities for {childName}
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
        </motion.button>

        {/* Documents */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <BigCard
            icon={<FileText className="w-8 h-8 text-blue-600" />}
            title="Documents"
            color="border-blue-200 bg-white"
          >
            {docs.length === 0 ? (
              <div className="py-6 text-center">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-lg text-gray-500">No documents yet.</p>
                <p className="text-base text-gray-400 mt-0.5">
                  Reports and records will show up here.
                </p>
              </div>
            ) : (
              docs.map((doc, i) => (
                <button
                  key={i}
                  onClick={onNavigateToVault}
                  className="w-full text-left"
                >
                  <DocRow doc={doc} />
                </button>
              ))
            )}
            <button
              onClick={onNavigateToVault}
              className="mt-3 w-full rounded-xl bg-blue-50 py-3 text-base font-semibold text-blue-700 text-center"
              style={{ minHeight: 48 }}
            >
              View All Documents
            </button>
          </BigCard>
        </motion.div>

        {/* Get Help */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <BigCard
            icon={<Phone className="w-8 h-8 text-red-600" />}
            title="Get Help"
            color="border-red-200 bg-white"
          >
            <div className="space-y-3">
              {/* Crisis line */}
              <a
                href="tel:988"
                className="flex items-center gap-4 rounded-xl bg-red-50 px-4 py-4 border border-red-200 active:scale-[0.98] transition-transform"
                style={{ minHeight: 80 }}
              >
                <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-700">988 Crisis Lifeline</p>
                  <p className="text-base text-red-600">Call or text 988 — 24/7 support</p>
                </div>
              </a>

              {/* Aminy support */}
              <a
                href="tel:18005551234"
                className="flex items-center gap-4 rounded-xl bg-[#6B9080]/10 px-4 py-4 border border-[#6B9080]/20 active:scale-[0.98] transition-transform"
                style={{ minHeight: 80 }}
              >
                <Phone className="w-8 h-8 text-[#6B9080] flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-[#6B9080]">Aminy Support</p>
                  <p className="text-base text-[#6B9080]">1-800-555-1234 — Mon–Fri 8am–6pm</p>
                </div>
              </a>

              {/* Expand for more */}
              <button
                onClick={() => setShowHelpExpanded(v => !v)}
                className="w-full text-base text-gray-500 underline py-2 text-center"
              >
                {showHelpExpanded ? 'Show less' : 'More help options'}
              </button>

              {showHelpExpanded && (
                <div className="space-y-2 pt-1">
                  <a
                    href="tel:18008294357"
                    className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] px-4 py-3 border border-gray-200"
                  >
                    <Phone className="w-6 h-6 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold text-gray-800">SAMHSA Helpline</p>
                      <p className="text-sm text-gray-500">1-800-662-4357 — Mental health & substance use</p>
                    </div>
                  </a>
                  <a
                    href="tel:18004224453"
                    className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] px-4 py-3 border border-gray-200"
                  >
                    <Phone className="w-6 h-6 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold text-gray-800">Autism Society Helpline</p>
                      <p className="text-sm text-gray-500">1-800-328-8476</p>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </BigCard>
        </motion.div>

        <p className="text-center text-sm text-gray-400 pb-6">
          Simple Mode is on — for the full app, go to Settings.
        </p>
      </div>
    </div>
  );
}
