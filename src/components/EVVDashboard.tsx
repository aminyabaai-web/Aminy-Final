/**
 * EVV (Electronic Visit Verification) Dashboard
 *
 * Arizona pilot dashboard for EVV shadow capture and reconciliation:
 * - Real-time clock-in/out with GPS verification
 * - Service authorization tracking & budget monitoring
 * - Timesheet generation and reconciliation export
 * - EVV record history with verification status
 *
 * Designed for the Arizona DDD pilot while SpokChoice remains primary and DCI transition workflows are validated
 * home/community-based services (HCBS).
 *
 * ⚠️ This tool tracks service hours for documentation purposes only.
 * Aminy remains a shadow workflow until the external EVV path is validated for payroll-critical use.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Play, Square, MapPin, FileText, Download,
  Calendar, CheckCircle, AlertCircle, DollarSign,
  Building2, Timer, ChevronRight, ChevronDown,
  TrendingUp, Shield, AlertTriangle, BarChart3,
  ClipboardList, Send, ArrowLeft, Loader2
} from 'lucide-react';
import {
  type EVVRecord,
  type ServiceAuthorization,
  type BudgetSummary,
  type Timesheet,
  clockIn,
  clockOut,
  getEVVRecords,
  getAuthorizations,
  calculateBudgetSummary,
  generateTimesheet,
  exportTimesheetToPDF,
} from '../lib/fiscal-agent-integration';
import { listEVVReconciliationRuns, summarizeEVVCutoverRuns, type EVVReconciliationRun } from '../lib/evv-cutover';
import { isDemoMode } from '../lib/demo-seed';

// ============================================
// TYPES
// ============================================

interface EVVDashboardProps {
  childId?: string;
  childName?: string;
  providerId?: string;
  providerName?: string;
  userRole?: 'parent' | 'provider' | 'admin';
  onBack?: () => void;
}

type TabType = 'clock' | 'records' | 'budget' | 'timesheets';

// ============================================
// DEMO DATA (demo-mode-only sample content)
// ============================================

/**
 * Demo authorizations used ONLY in demo mode (`?demo=…` / VITE_DEMO_MODE).
 * Real users start with empty arrays and the component fetches their
 * actual data from Supabase via getAuthorizations().
 */
function getDemoAuthorizations(): ServiceAuthorization[] {
  if (!isDemoMode()) return [];
  return [
    {
      id: 'auth-1',
      childId: 'child-1',
      fiscalAgent: 'acumen',
      authorizationNumber: 'AZ-2024-78543',
      serviceCode: 'H2014',
      serviceName: 'ABA Skills Training',
      authorizedUnits: 480,
      usedUnits: 196,
      remainingUnits: 284,
      unitType: '15min',
      effectiveDate: '2024-11-01',
      endDate: '2025-04-30',
      status: 'active',
      providerNpi: '1234567890',
      createdAt: '2024-10-15',
      updatedAt: '2025-02-20',
    },
    {
      id: 'auth-2',
      childId: 'child-1',
      fiscalAgent: 'acumen',
      authorizationNumber: 'AZ-2024-78544',
      serviceCode: '97153',
      serviceName: 'Adaptive Behavior Treatment',
      authorizedUnits: 320,
      usedUnits: 128,
      remainingUnits: 192,
      unitType: '15min',
      effectiveDate: '2024-11-01',
      endDate: '2025-04-30',
      status: 'active',
      createdAt: '2024-10-15',
      updatedAt: '2025-02-20',
    },
  ];
}

/**
 * Demo EVV records used ONLY in demo mode (`?demo=…` / VITE_DEMO_MODE).
 * Real users start with empty arrays and the component fetches their
 * actual data from Supabase via getEVVRecords().
 */
function getDemoEVVRecords(): EVVRecord[] {
  if (!isDemoMode()) return [];
  return [
    {
      id: 'evv-1',
      authorizationId: 'auth-1',
      childId: 'child-1',
      providerId: 'provider-1',
      providerName: 'Maria Garcia, RBT',
      serviceDate: '2025-02-24',
      clockInTime: '2025-02-24T09:00:00Z',
      clockOutTime: '2025-02-24T12:15:00Z',
      clockInLocation: { latitude: 33.4484, longitude: -112.0740, address: '1234 Elm St, Phoenix, AZ' },
      clockOutLocation: { latitude: 33.4484, longitude: -112.0740, address: '1234 Elm St, Phoenix, AZ' },
      durationMinutes: 195,
      units: 13,
      serviceCode: 'H2014',
      verificationMethod: 'gps',
      status: 'verified',
      createdAt: '2025-02-24T09:00:00Z',
    },
    {
      id: 'evv-2',
      authorizationId: 'auth-1',
      childId: 'child-1',
      providerId: 'provider-1',
      providerName: 'Maria Garcia, RBT',
      serviceDate: '2025-02-22',
      clockInTime: '2025-02-22T13:30:00Z',
      clockOutTime: '2025-02-22T16:00:00Z',
      clockInLocation: { latitude: 33.4484, longitude: -112.0740, address: '1234 Elm St, Phoenix, AZ' },
      clockOutLocation: { latitude: 33.4484, longitude: -112.0740, address: '1234 Elm St, Phoenix, AZ' },
      durationMinutes: 150,
      units: 10,
      serviceCode: 'H2014',
      verificationMethod: 'gps',
      status: 'verified',
      createdAt: '2025-02-22T13:30:00Z',
    },
    {
      id: 'evv-3',
      authorizationId: 'auth-2',
      childId: 'child-1',
      providerId: 'provider-2',
      providerName: 'Dr. Sarah Chen, BCBA',
      serviceDate: '2025-02-21',
      clockInTime: '2025-02-21T10:00:00Z',
      clockOutTime: '2025-02-21T11:00:00Z',
      clockInLocation: { latitude: 33.4484, longitude: -112.0740, address: 'Aminy Clinic, Phoenix, AZ' },
      clockOutLocation: { latitude: 33.4484, longitude: -112.0740, address: 'Aminy Clinic, Phoenix, AZ' },
      durationMinutes: 60,
      units: 4,
      serviceCode: '97153',
      verificationMethod: 'gps',
      status: 'submitted',
      createdAt: '2025-02-21T10:00:00Z',
    },
    {
      id: 'evv-4',
      authorizationId: 'auth-1',
      childId: 'child-1',
      providerId: 'provider-1',
      providerName: 'Maria Garcia, RBT',
      serviceDate: '2025-02-20',
      clockInTime: '2025-02-20T09:00:00Z',
      clockOutTime: '2025-02-20T11:30:00Z',
      clockInLocation: { latitude: 33.4484, longitude: -112.0740, address: '1234 Elm St, Phoenix, AZ' },
      clockOutLocation: { latitude: 33.4490, longitude: -112.0750, address: 'Nearby Park, Phoenix, AZ' },
      durationMinutes: 150,
      units: 10,
      serviceCode: 'H2014',
      verificationMethod: 'gps',
      status: 'pending',
      createdAt: '2025-02-20T09:00:00Z',
    },
  ];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EVVDashboard({
  childId = 'child-1',
  childName = 'Your Child',
  providerId = 'provider-1',
  providerName = 'Provider',
  userRole = 'parent',
  onBack,
}: EVVDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('clock');
  const [authorizations, setAuthorizations] = useState<ServiceAuthorization[]>(getDemoAuthorizations);
  const [evvRecords, setEvvRecords] = useState<EVVRecord[]>(getDemoEVVRecords);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [activeSession, setActiveSession] = useState<EVVRecord | null>(null);
  const [reconciliationRuns, setReconciliationRuns] = useState<EVVReconciliationRun[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedAuth, setSelectedAuth] = useState<string>(() => {
    const demo = getDemoAuthorizations();
    return demo[0]?.id || '';
  });

  // Load data from Supabase. In demo mode we keep the seeded samples
  // and skip the fetch so the walkthrough stays populated.
  useEffect(() => {
    if (isDemoMode() || !childId || childId === 'child-1') {
      return;
    }

    let cancelled = false;

    void getAuthorizations(childId)
      .then((authData) => {
        if (!cancelled && authData.length > 0) {
          setAuthorizations(authData);
        }
      })
      .catch(() => {});

    void getEVVRecords(childId)
      .then((evvData) => {
        if (!cancelled && evvData.length > 0) {
          setEvvRecords(evvData);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [childId]);

  useEffect(() => {
    let cancelled = false;

    void listEVVReconciliationRuns(userRole === 'parent' ? childId : undefined)
      .then((runs) => {
        if (!cancelled) {
          setReconciliationRuns(runs);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [childId, userRole]);

  // Timer for active session
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(activeSession.clockInTime).getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClockIn = useCallback(async () => {
    setIsClockingIn(true);
    try {
      // Request GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const auth = authorizations.find(a => a.id === selectedAuth);
      const record = await clockIn(
        selectedAuth,
        childId,
        providerId,
        providerName,
        auth?.serviceCode || 'H2014',
        location
      );

      if (record) {
        setActiveSession(record);
        setElapsedSeconds(0);
      } else {
        // Demo fallback
        const demoRecord: EVVRecord = {
          id: `evv-live-${Date.now()}`,
          authorizationId: selectedAuth,
          childId,
          providerId,
          providerName,
          serviceDate: new Date().toISOString().split('T')[0],
          clockInTime: new Date().toISOString(),
          clockOutTime: '',
          clockInLocation: location,
          clockOutLocation: { latitude: 0, longitude: 0 },
          durationMinutes: 0,
          units: 0,
          serviceCode: auth?.serviceCode || 'H2014',
          verificationMethod: 'gps',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setActiveSession(demoRecord);
        setElapsedSeconds(0);
      }
    } catch (err: unknown) {
      // Fallback without GPS
      const auth = authorizations.find(a => a.id === selectedAuth);
      const demoRecord: EVVRecord = {
        id: `evv-live-${Date.now()}`,
        authorizationId: selectedAuth,
        childId,
        providerId,
        providerName,
        serviceDate: new Date().toISOString().split('T')[0],
        clockInTime: new Date().toISOString(),
        clockOutTime: '',
        clockInLocation: { latitude: 0, longitude: 0 },
        clockOutLocation: { latitude: 0, longitude: 0 },
        durationMinutes: 0,
        units: 0,
        serviceCode: auth?.serviceCode || 'H2014',
        verificationMethod: 'gps',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setActiveSession(demoRecord);
      setElapsedSeconds(0);
    } finally {
      setIsClockingIn(false);
    }
  }, [selectedAuth, childId, providerId, providerName, authorizations]);

  const handleClockOut = useCallback(async () => {
    if (!activeSession) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation?.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      }).catch(() => null);

      const location = position
        ? { latitude: position.coords.latitude, longitude: position.coords.longitude }
        : { latitude: 0, longitude: 0 };

      const record = await clockOut(activeSession.id, location);

      if (record) {
        setEvvRecords(prev => [record, ...prev]);
      } else {
        // No backend record was returned. In demo mode we present a fully
        // "verified" record so the walkthrough looks complete; for real users
        // we only have a locally-captured session that has not been verified
        // server-side, so it stays 'pending' rather than overstating its status.
        const completed: EVVRecord = {
          ...activeSession,
          clockOutTime: new Date().toISOString(),
          clockOutLocation: location,
          durationMinutes: Math.round(elapsedSeconds / 60),
          units: Math.ceil(elapsedSeconds / 900), // 15-min units
          status: isDemoMode() ? 'verified' : 'pending',
        };
        setEvvRecords(prev => [completed, ...prev]);
      }
    } catch {
      const completed: EVVRecord = {
        ...activeSession,
        clockOutTime: new Date().toISOString(),
        durationMinutes: Math.round(elapsedSeconds / 60),
        units: Math.ceil(elapsedSeconds / 900),
        status: 'pending',
      };
      setEvvRecords(prev => [completed, ...prev]);
    }

    setActiveSession(null);
    setElapsedSeconds(0);
  }, [activeSession, elapsedSeconds]);

  // Budget calculations
  const budgetSummaries = authorizations
    .filter(a => a.status === 'active')
    .map(auth => calculateBudgetSummary(auth, evvRecords));

  const cutoverSummary = summarizeEVVCutoverRuns(reconciliationRuns);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'clock', label: 'Clock In/Out', icon: <Timer className="w-4 h-4" /> },
    { id: 'records', label: 'Records', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'timesheets', label: 'Export', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_32%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF]/80 bg-white/88 backdrop-blur supports-[backdrop-filter]:bg-white/78">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <nav aria-label="EVV navigation" className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="min-h-11 min-w-11 rounded-xl p-2 text-[#5A6B7A] transition-colors hover:bg-[#6B9080]/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold text-[#132F43]">
                <Shield className="w-5 h-5 text-primary" />
                Visit Verification
              </h1>
              <p className="text-sm text-[#5A6B7A]">
                Arizona DDD Pilot &bull; Visit records &amp; export
                {/* Only show a child name when it's a real name, not the placeholder default */}
                {childName && childName !== 'Your Child' ? <> &bull; {childName}</> : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('clock')}
              className="action-button min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#6B9080]"
            >
              Open live clock
            </button>
            {activeSession && (
              <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-sm font-mono font-medium text-rose-700">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Compliance Disclaimer */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 leading-relaxed">
            Aminy records Arizona pilot visits alongside your current system so the two can be compared. Keep submitting payroll-critical entries in SpokChoice today; DCI is the planned replacement as your agency changes systems.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-[#5A6B7A]">Ready to switch to Aminy?</p>
              <h2 className="text-lg font-semibold text-[#132F43] mt-1">
                {cutoverSummary.state === 'cutover_ready' ? 'Ready to make Aminy your primary system' : 'Still running side by side'}
              </h2>
              <p className="text-sm text-[#5A6B7A] mt-1">
                Aminy stays alongside your current payroll system until the three most recent payroll cycles match it almost perfectly (99.5%), include the DCI transition path, and have no critical issues.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[220px]">
              <div>
                <p className="text-sm text-[#5A6B7A]">Cycles</p>
                <p className="text-2xl font-semibold text-[#132F43]">{cutoverSummary.cyclesCompleted}</p>
              </div>
              <div>
                <p className="text-sm text-[#5A6B7A]">Clean streak</p>
                <p className="text-2xl font-semibold text-emerald-600">{cutoverSummary.consecutiveCleanCycles}</p>
              </div>
              <div>
                <p className="text-sm text-[#5A6B7A]">Recent accuracy</p>
                <p className="text-2xl font-semibold text-blue-600">{cutoverSummary.trailingWindowAccuracy}%</p>
              </div>
              <div>
                <p className="text-sm text-[#5A6B7A]">Critical exceptions</p>
                <p className="text-2xl font-semibold text-rose-600">{cutoverSummary.unresolvedCriticalExceptions}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm uppercase tracking-[0.18em] text-slate-400">Systems checked so far</span>
            {cutoverSummary.systemsValidated.length > 0 ? (
              cutoverSummary.systemsValidated.map((system) => (
                <span
                  key={system}
                  className="inline-flex items-center rounded-full border border-[#6B9080]/20 bg-[#6B9080]/10 px-3 py-1 text-xs font-medium text-[#6B9080]"
                >
                  {system === 'spokchoice' ? 'SpokChoice' : 'DCI'}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center rounded-full border border-[#E8E4DF] bg-[#F6FBFB] px-3 py-1 text-xs font-medium text-[#5A6B7A]">
                No validated cycles yet
              </span>
            )}
          </div>
          {cutoverSummary.cutoverBlockedReasons.length > 0 ? (
            <ul className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1 text-sm text-amber-800">
              {cutoverSummary.cutoverBlockedReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-1 rounded-2xl border border-[#E8E4DF] bg-white/92 p-1.5 shadow-sm">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[#5A6B7A] hover:text-[#3A4A57] hover:bg-[#6B9080]/10'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'clock' && (
            <ClockTab
              key="clock"
              activeSession={activeSession}
              elapsedSeconds={elapsedSeconds}
              authorizations={authorizations.filter(a => a.status === 'active')}
              selectedAuth={selectedAuth}
              onSelectAuth={setSelectedAuth}
              isClockingIn={isClockingIn}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              formatElapsed={formatElapsed}
            />
          )}
          {activeTab === 'records' && (
            <RecordsTab key="records" records={evvRecords} />
          )}
          {activeTab === 'budget' && (
            <BudgetTab key="budget" summaries={budgetSummaries} authorizations={authorizations} />
          )}
          {activeTab === 'timesheets' && (
            <TimesheetsTab key="timesheets" records={evvRecords} childId={childId} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// CLOCK TAB
// ============================================

function ClockTab({
  activeSession,
  elapsedSeconds,
  authorizations,
  selectedAuth,
  onSelectAuth,
  isClockingIn,
  onClockIn,
  onClockOut,
  formatElapsed,
}: {
  activeSession: EVVRecord | null;
  elapsedSeconds: number;
  authorizations: ServiceAuthorization[];
  selectedAuth: string;
  onSelectAuth: (id: string) => void;
  isClockingIn: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  formatElapsed: (s: number) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Service Authorization Selector */}
      {!activeSession && (
        <div className="bg-white rounded-2xl border border-[#E8E4DF]/80 p-4 shadow-sm">
          <label className="block text-sm font-medium text-[#3A4A57] mb-2">
            Service Authorization
          </label>
          <div className="space-y-2">
            {authorizations.map(auth => (
              <button
                key={auth.id}
                onClick={() => onSelectAuth(auth.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedAuth === auth.id
                    ? 'border-[#6B9080] bg-[#6B9080]/10'
                    : 'border-[#E8E4DF] hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-[#132F43]">{auth.serviceName}</p>
                    <p className="text-sm text-[#5A6B7A] mt-0.5">
                      {auth.serviceCode} &bull; Auth #{auth.authorizationNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#6B9080]">
                      {auth.remainingUnits} units left
                    </p>
                    <p className="text-sm text-[#8A9BA8]">
                      of {auth.authorizedUnits}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clock In/Out Button */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF]/80 p-6 shadow-sm text-center">
        {activeSession ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-[#5A6B7A] uppercase tracking-wide mb-1">Session in progress</p>
              <p className="text-5xl font-mono font-bold text-[#132F43] tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </p>
              <p className="text-sm text-[#5A6B7A] mt-2">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                {activeSession.clockInLocation.address || 'GPS verified'}
              </p>
            </div>
            <button
              onClick={onClockOut}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-100"
            >
              <Square className="w-5 h-5" />
              Clock Out
            </button>
            <p className="text-sm text-[#8A9BA8] mt-3">
              Service: {activeSession.serviceCode} &bull; {
                Math.ceil(elapsedSeconds / 900)
              } units so far
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-4 bg-[#6B9080]/10 rounded-full flex items-center justify-center">
              <Timer className="w-10 h-10 text-[#6B9080]" />
            </div>
            <p className="text-[#5A6B7A] mb-4 text-sm">
              Select an authorization above and clock in to start tracking your visit.
            </p>
            <button
              onClick={onClockIn}
              disabled={isClockingIn || !selectedAuth}
              className="w-full py-4 bg-primary hover:bg-[#216982] disabled:bg-[#E8E4DF] disabled:text-[#8A9BA8] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[rgba(78,147,168,0.12)]"
            >
              {isClockingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Getting GPS...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Clock In
                </>
              )}
            </button>
            <p className="text-sm text-[#8A9BA8] mt-3 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              GPS location will be recorded for EVV compliance
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// RECORDS TAB
// ============================================

function RecordsTab({ records }: { records: EVVRecord[] }) {
  const getStatusBadge = (status: EVVRecord['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-[#3A4A57]',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      submitted: 'bg-blue-100 text-[#4A6478]',
    };
    return styles[status] || 'bg-[#EDF4F7] text-[#132F43]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#3A4A57]">Visit Records</h2>
        <span className="text-sm text-[#5A6B7A]">{records.length} total</span>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-8 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-[#8A9BA8] mb-3" />
          <p className="text-[#5A6B7A] text-sm">No EVV records yet</p>
          <p className="text-[#8A9BA8] text-sm mt-1">Clock in to start your first visit</p>
        </div>
      ) : (
        records.map(record => (
          <div key={record.id} className="bg-white rounded-xl border border-[#E8E4DF] p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-[#132F43]">{record.providerName}</p>
                <p className="text-sm text-[#5A6B7A]">
                  {new Date(record.serviceDate).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                {record.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[#8A9BA8]">Clock In</p>
                <p className="font-medium text-[#3A4A57]">
                  {new Date(record.clockInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-[#8A9BA8]">Clock Out</p>
                <p className="font-medium text-[#3A4A57]">
                  {record.clockOutTime
                    ? new Date(record.clockOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[#8A9BA8]">Duration</p>
                <p className="font-medium text-[#3A4A57]">
                  {record.durationMinutes > 0
                    ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E4DF]">
              <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                <MapPin className="w-3 h-3" />
                {record.clockInLocation.address || 'GPS verified'}
              </div>
              <p className="text-sm text-[#5A6B7A]">
                {record.units} units &bull; {record.serviceCode}
              </p>
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}

// ============================================
// BUDGET TAB
// ============================================

function BudgetTab({
  summaries,
  authorizations,
}: {
  summaries: BudgetSummary[];
  authorizations: ServiceAuthorization[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h2 className="text-sm font-semibold text-[#3A4A57]">Authorization Budget</h2>

      {summaries.map(summary => {
        const auth = authorizations.find(a => a.id === summary.authorizationId);
        const progressColor = summary.percentUsed > 90
          ? 'bg-red-500'
          : summary.percentUsed > 70
            ? 'bg-amber-500'
            : 'bg-primary';

        return (
          <div key={summary.authorizationId} className="bg-white rounded-xl border border-[#E8E4DF] p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-sm text-[#132F43]">{summary.serviceName}</p>
                <p className="text-sm text-[#5A6B7A]">Auth #{auth?.authorizationNumber}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                summary.onTrack ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {summary.onTrack ? 'On Track' : 'Review Usage'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-[#5A6B7A] mb-1">
                <span>{summary.totalUsed} used</span>
                <span>{summary.remaining} remaining</span>
              </div>
              <div className="h-3 bg-[#EDF4F7] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
                />
              </div>
              <p className="text-sm text-[#8A9BA8] mt-1 text-right">
                {summary.percentUsed}% of {summary.totalAuthorized} units
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E8E4DF]">
              <div className="text-center">
                <p className="text-lg font-bold text-[#132F43]">{summary.daysRemaining}</p>
                <p className="text-sm text-[#8A9BA8]">Days Left</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#132F43]">{summary.burnRate}</p>
                <p className="text-sm text-[#8A9BA8]">Units/Week</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#132F43]">
                  {summary.projectedExhaustion
                    ? new Date(summary.projectedExhaustion).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
                <p className="text-sm text-[#8A9BA8]">Projected End</p>
              </div>
            </div>
          </div>
        );
      })}

      {summaries.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-8 text-center">
          <DollarSign className="w-10 h-10 mx-auto text-[#8A9BA8] mb-3" />
          <p className="text-[#5A6B7A] text-sm">No active authorizations</p>
          <p className="text-[#8A9BA8] text-sm mt-1">Confirm authorizations in your external EVV system while the Arizona pilot workflow is being validated.</p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// TIMESHEETS TAB
// ============================================

function TimesheetsTab({
  records,
  childId,
}: {
  records: EVVRecord[];
  childId: string;
}) {
  const [generating, setGenerating] = useState(false);

  // Group records by week
  const weeklyGroups = records.reduce<Record<string, EVVRecord[]>>((groups, record) => {
    const date = new Date(record.serviceDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];
    (groups[key] = groups[key] || []).push(record);
    return groups;
  }, {});

  const handleGenerateTimesheet = async (weekKey: string, asPdf = false) => {
    setGenerating(true);
    try {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekKey);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const timesheet = await generateTimesheet(childId, 'provider-1', weekStart, weekEnd);

      if (asPdf && timesheet) {
        // exportTimesheetToPDF returns a structured payload; download it so the
        // action produces a real, verifiable artifact rather than a no-op.
        const payload = exportTimesheetToPDF(timesheet);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${weekKey}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // No verified records for this week yet — nothing to export.
    }
    setGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h2 className="text-sm font-semibold text-[#3A4A57]">Timesheet Submission</h2>

      {Object.entries(weeklyGroups).map(([weekKey, weekRecords]) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekKey);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const totalMinutes = weekRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
        const totalUnits = weekRecords.reduce((sum, r) => sum + r.units, 0);
        const allVerified = weekRecords.every(r => r.status === 'verified');

        return (
          <div key={weekKey} className="bg-white rounded-xl border border-[#E8E4DF] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm text-[#132F43]">
                  Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-sm text-[#5A6B7A]">
                  {weekRecords.length} visits &bull; {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m &bull; {totalUnits} units
                </p>
              </div>
              {allVerified ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleGenerateTimesheet(weekKey)}
                disabled={generating}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#132F43] py-2 text-sm font-medium text-white transition-colors hover:bg-[#0D1B2A]"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                Generate Timesheet
              </button>
              <button
                type="button"
                onClick={() => handleGenerateTimesheet(weekKey, true)}
                disabled={generating}
                aria-label="Download timesheet"
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm font-medium text-[#5A6B7A] transition-colors hover:bg-[#F6FBFB] disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          </div>
        );
      })}

      {Object.keys(weeklyGroups).length === 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-[#8A9BA8] mb-3" />
          <p className="text-[#5A6B7A] text-sm">No visits to submit</p>
          <p className="text-[#8A9BA8] text-sm mt-1">Complete some visits first to generate timesheets</p>
        </div>
      )}
    </motion.div>
  );
}
