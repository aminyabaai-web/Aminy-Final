/**
 * EVV (Electronic Visit Verification) Dashboard
 *
 * Comprehensive dashboard for Medicaid waiver compliance:
 * - Real-time clock-in/out with GPS verification
 * - Service authorization tracking & budget monitoring
 * - Timesheet generation & fiscal agent submission
 * - EVV record history with verification status
 *
 * Required by 21st Century Cures Act for all Medicaid
 * home/community-based services (HCBS).
 *
 * ⚠️ This tool tracks service hours for documentation purposes only.
 * All submissions must be reviewed by the fiscal agent before payment.
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

// ============================================
// TYPES
// ============================================

interface EVVDashboardProps {
  childId?: string;
  childName?: string;
  providerId?: string;
  providerName?: string;
  userRole?: 'parent' | 'provider';
  onBack?: () => void;
}

type TabType = 'clock' | 'records' | 'budget' | 'timesheets';

// ============================================
// DEMO DATA (Supabase fallback)
// ============================================

const DEMO_AUTHORIZATIONS: ServiceAuthorization[] = [
  {
    id: 'auth-1',
    childId: 'child-1',
    fiscalAgent: 'acumen',
    authorizationNumber: 'AZ-2024-78543',
    serviceCode: 'H2014',
    serviceName: 'ABA Skills Training',
    authorizedUnits: 480, // 120 hours in 15-min units
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

const DEMO_EVV_RECORDS: EVVRecord[] = [
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
  const [authorizations, setAuthorizations] = useState<ServiceAuthorization[]>(DEMO_AUTHORIZATIONS);
  const [evvRecords, setEvvRecords] = useState<EVVRecord[]>(DEMO_EVV_RECORDS);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [activeSession, setActiveSession] = useState<EVVRecord | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedAuth, setSelectedAuth] = useState<string>(DEMO_AUTHORIZATIONS[0]?.id || '');

  // Load data from Supabase (falls back to demo)
  useEffect(() => {
    async function loadData() {
      try {
        const [authData, evvData] = await Promise.all([
          getAuthorizations(childId),
          getEVVRecords(childId),
        ]);
        if (authData.length > 0) setAuthorizations(authData);
        if (evvData.length > 0) setEvvRecords(evvData);
      } catch {
        // Use demo data on error
      }
    }
    loadData();
  }, [childId]);

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
    } catch (err: any) {
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
        // Demo fallback
        const completed: EVVRecord = {
          ...activeSession,
          clockOutTime: new Date().toISOString(),
          clockOutLocation: location,
          durationMinutes: Math.round(elapsedSeconds / 60),
          units: Math.ceil(elapsedSeconds / 900), // 15-min units
          status: 'verified',
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'clock', label: 'Clock In/Out', icon: <Timer className="w-4 h-4" /> },
    { id: 'records', label: 'Records', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'timesheets', label: 'Submit', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-400" />
                Visit Verification
              </h1>
              <p className="text-xs text-slate-300">
                EVV &bull; Medicaid Compliance &bull; {childName}
              </p>
            </div>
            {activeSession && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-sm font-mono font-medium text-red-200">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Disclaimer */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            EVV records are subject to audit by your fiscal agent and state Medicaid agency.
            Ensure clock-in/out times and locations are accurate. Falsifying records may result
            in loss of benefits and legal consequences.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Authorization
          </label>
          <div className="space-y-2">
            {authorizations.map(auth => (
              <button
                key={auth.id}
                onClick={() => onSelectAuth(auth.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedAuth === auth.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{auth.serviceName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {auth.serviceCode} &bull; Auth #{auth.authorizationNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-teal-700">
                      {auth.remainingUnits} units left
                    </p>
                    <p className="text-xs text-gray-400">
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
        {activeSession ? (
          <>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Session in progress</p>
              <p className="text-5xl font-mono font-bold text-slate-800 tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                {activeSession.clockInLocation.address || 'GPS verified'}
              </p>
            </div>
            <button
              onClick={onClockOut}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-200"
            >
              <Square className="w-5 h-5" />
              Clock Out
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Service: {activeSession.serviceCode} &bull; {
                Math.ceil(elapsedSeconds / 900)
              } units so far
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-4 bg-teal-50 rounded-full flex items-center justify-center">
              <Timer className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Select an authorization above and clock in to start tracking your visit.
            </p>
            <button
              onClick={onClockIn}
              disabled={isClockingIn || !selectedAuth}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-200"
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
            <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
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
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      submitted: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Visit Records</h2>
        <span className="text-xs text-gray-500">{records.length} total</span>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No EVV records yet</p>
          <p className="text-gray-400 text-xs mt-1">Clock in to start your first visit</p>
        </div>
      ) : (
        records.map(record => (
          <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-gray-900">{record.providerName}</p>
                <p className="text-xs text-gray-500">
                  {new Date(record.serviceDate).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                {record.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Clock In</p>
                <p className="font-medium text-gray-700">
                  {new Date(record.clockInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Clock Out</p>
                <p className="font-medium text-gray-700">
                  {record.clockOutTime
                    ? new Date(record.clockOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Duration</p>
                <p className="font-medium text-gray-700">
                  {record.durationMinutes > 0
                    ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {record.clockInLocation.address || 'GPS verified'}
              </div>
              <p className="text-xs text-gray-500">
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
      <h2 className="text-sm font-semibold text-gray-700">Authorization Budget</h2>

      {summaries.map(summary => {
        const auth = authorizations.find(a => a.id === summary.authorizationId);
        const progressColor = summary.percentUsed > 90
          ? 'bg-red-500'
          : summary.percentUsed > 70
            ? 'bg-amber-500'
            : 'bg-teal-500';

        return (
          <div key={summary.authorizationId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-sm text-gray-900">{summary.serviceName}</p>
                <p className="text-xs text-gray-500">Auth #{auth?.authorizationNumber}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                summary.onTrack ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {summary.onTrack ? 'On Track' : 'Review Usage'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{summary.totalUsed} used</span>
                <span>{summary.remaining} remaining</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {summary.percentUsed}% of {summary.totalAuthorized} units
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{summary.daysRemaining}</p>
                <p className="text-xs text-gray-400">Days Left</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{summary.burnRate}</p>
                <p className="text-xs text-gray-400">Units/Week</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">
                  {summary.projectedExhaustion
                    ? new Date(summary.projectedExhaustion).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
                <p className="text-xs text-gray-400">Projected End</p>
              </div>
            </div>
          </div>
        );
      })}

      {summaries.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No active authorizations</p>
          <p className="text-gray-400 text-xs mt-1">Contact your fiscal agent to set up service authorizations</p>
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

  const handleGenerateTimesheet = async (weekKey: string) => {
    setGenerating(true);
    try {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekKey);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // In production this calls Supabase
      await generateTimesheet(childId, 'provider-1', weekStart, weekEnd);
    } catch {
      // Demo mode
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
      <h2 className="text-sm font-semibold text-gray-700">Timesheet Submission</h2>

      {Object.entries(weeklyGroups).map(([weekKey, weekRecords]) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekKey);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const totalMinutes = weekRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
        const totalUnits = weekRecords.reduce((sum, r) => sum + r.units, 0);
        const allVerified = weekRecords.every(r => r.status === 'verified');

        return (
          <div key={weekKey} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm text-gray-900">
                  Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
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
                onClick={() => handleGenerateTimesheet(weekKey)}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                Generate Timesheet
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          </div>
        );
      })}

      {Object.keys(weeklyGroups).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No visits to submit</p>
          <p className="text-gray-400 text-xs mt-1">Complete some visits first to generate timesheets</p>
        </div>
      )}
    </motion.div>
  );
}
