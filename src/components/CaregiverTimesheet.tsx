/**
 * CaregiverTimesheet (Medicaid EVV) - 10/10 Apple/Calm Aesthetic
 *
 * This component fulfills Phase 3 of the MVP:
 * - 1-Click EVV (Electronic Visit Verification) with GPS & Timestamps
 * - Digital Timesheet submission
 * - Structured export for Fiscal Intermediaries (Acumen / DCI)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Clock,
    MapPin,
    CheckCircle2,
    AlertCircle,
    FileCheck,
    Download,
    Calendar,
    ChevronRight,
    Loader2,
    FileDigit,
    ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { NotificationService } from '../lib/notification-service';

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    fontFamily: fontStack,
} as React.CSSProperties;

interface TimesheetRecord {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    totalTime: string;
    status: 'approved' | 'pending' | 'draft';
    locationStart: string;
    locationEnd: string;
}

interface CaregiverTimesheetProps {
    onBack: () => void;
    caregiverName?: string;
}

export function CaregiverTimesheet({ onBack, caregiverName = "Michael T." }: CaregiverTimesheetProps): React.ReactNode {
    const [activeTab, setActiveTab] = useState<'clock' | 'history'>('clock');
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'denied'>('checking');
    const [remainingHours, setRemainingHours] = useState<number | null>(null);

    // Live session state
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'failed'>('acquiring');

    // Mock History
    const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([
        {
            id: 'ts_001',
            date: 'Oct 23, 2025',
            startTime: '3:00 PM',
            endTime: '5:30 PM',
            totalTime: '2.5 hrs',
            status: 'approved',
            locationStart: 'Verified (GPS Block 4A)',
            locationEnd: 'Verified (GPS Block 4A)'
        },
        {
            id: 'ts_002',
            date: 'Oct 21, 2025',
            startTime: '4:00 PM',
            endTime: '6:00 PM',
            totalTime: '2.0 hrs',
            status: 'approved',
            locationStart: 'Verified (GPS Block 4A)',
            locationEnd: 'Verified (GPS Block 4A)'
        },
        {
            id: 'ts_003',
            date: 'Oct 24, 2025',
            startTime: '2:00 PM',
            endTime: '5:00 PM',
            totalTime: '3.0 hrs',
            status: 'pending',
            locationStart: 'Verified (GPS Block 4A)',
            locationEnd: 'Pending Review'
        }
    ]);

    // Simulate Real-time Medicaid Authorization Check
    useEffect(() => {
        if (activeTab === 'clock' && !isClockedIn) {
            setAuthStatus('checking');
            const authTimer = setTimeout(() => {
                setAuthStatus('authorized');
                setRemainingHours(32.5); // Mock remaining hours on active waiver
            }, 1500);
            return () => clearTimeout(authTimer);
        }
    }, [activeTab, isClockedIn]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isClockedIn && sessionStartTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isClockedIn, sessionStartTime]);

    useEffect(() => {
        // Simulate GPS locking
        if (activeTab === 'clock' && !isClockedIn) {
            setGpsStatus('acquiring');
            const timer = setTimeout(() => setGpsStatus('locked'), 2000);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isClockedIn]);

    const formatElapsedTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleClockToggle = () => {
        setIsProcessing(true);

        // Simulate API delay for EVV stamping
        setTimeout(() => {
            if (isClockedIn) {
                // Clock Out
                setIsClockedIn(false);
                setSessionStartTime(null);
                setElapsedTime(0);

                // Add to history
                const newRecord: TimesheetRecord = {
                    id: 'ts_' + Date.now(),
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    startTime: sessionStartTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A',
                    endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    totalTime: (elapsedTime / 3600).toFixed(1) + ' hrs',
                    status: 'pending',
                    locationStart: 'Verified (GPS Block 4A)',
                    locationEnd: 'Verified (GPS Block 4A)'
                };
                setTimesheets([newRecord, ...timesheets]);
                toast.success('Successfully clocked out. EVV Data Captured.');
            } else {
                // Clock In
                setIsClockedIn(true);
                setSessionStartTime(new Date());
                toast.success('Successfully clocked in. EVV Data Captured.');
            }
            setIsProcessing(false);
        }, 1500);
    };

    const handleExportData = () => {
        toast.info('Generating Acumen DCI export snippet...');
        setTimeout(() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(timesheets, null, 2));
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = 'evv_export_' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            NotificationService.sendEVVTimesheetSubmitted('payroll@acumen.com', caregiverName);
            toast.success('Timesheet export complete.');
        }, 1000);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8F8F6', paddingBottom: '80px', ...fontSmoothing }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(248, 248, 246, 0.85)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(17, 24, 39, 0.04)'
            }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={onBack}
                            style={{
                                width: '36px', height: '36px', borderRadius: '18px', border: 'none', backgroundColor: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft size={18} color="rgba(17, 24, 39, 0.7)" />
                        </button>
                        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>
                            EVV Timesheet
                        </h1>
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)', fontWeight: 500 }}>
                        {caregiverName}
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>

                {/* Navigation Tabs */}
                <div style={{ display: 'flex', backgroundColor: '#E5E7EB', borderRadius: '16px', padding: '4px', marginBottom: '32px' }}>
                    <button
                        onClick={() => setActiveTab('clock')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'clock' ? '#FFFFFF' : 'transparent',
                            color: activeTab === 'clock' ? '#111827' : '#6B7280',
                            boxShadow: activeTab === 'clock' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Live Session
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'history' ? '#FFFFFF' : 'transparent',
                            color: activeTab === 'history' ? '#111827' : '#6B7280',
                            boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Timesheet History
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'clock' && (
                        <motion.div
                            key="clock"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                        >
                            {/* Giant Clock In/Out Button UI */}
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', padding: '40px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                {/* Medicaid Authorization Engine Banner */}
                                {!isClockedIn && (
                                    <div style={{
                                        width: '100%', marginBottom: '24px', padding: '16px', borderRadius: '16px',
                                        backgroundColor: authStatus === 'checking' ? '#F3F4F6' : authStatus === 'authorized' ? '#ECFDF5' : '#FEF2F2',
                                        border: `1px solid ${authStatus === 'checking' ? '#E5E7EB' : authStatus === 'authorized' ? '#A7F3D0' : '#FECACA'}`,
                                        display: 'flex', alignItems: 'flex-start', gap: '12px'
                                    }}>
                                        {authStatus === 'checking' && <Loader2 size={20} color="#6B7280" className="animate-spin" style={{ flexShrink: 0, marginTop: '2px' }} />}
                                        {authStatus === 'authorized' && <ShieldCheck size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />}
                                        {authStatus === 'denied' && <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />}

                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: authStatus === 'checking' ? '#374151' : authStatus === 'authorized' ? '#065F46' : '#991B1B', marginBottom: '4px' }}>
                                                {authStatus === 'checking' ? 'Verifying Medicaid Eligibility...' : authStatus === 'authorized' ? 'Cleared for Shift' : 'Authorization Denied'}
                                            </p>
                                            <p style={{ fontSize: '13px', color: authStatus === 'checking' ? '#6B7280' : authStatus === 'authorized' ? '#059669' : '#DC2626', lineHeight: 1.4 }}>
                                                {authStatus === 'checking' ? 'Querying State FMS database for active waiver...' : authStatus === 'authorized' ? `Client has an active Medicaid Waiver. ${remainingHours} hours remaining this week.` : 'Client does not have an active authorization code for this service.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <p style={{ fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '24px' }}>
                                    {isClockedIn ? 'Session In Progress' : 'Ready to Start'}
                                </p>

                                <div
                                    style={{
                                        width: '240px', height: '240px', borderRadius: '120px',
                                        backgroundColor: isClockedIn ? '#FEF2F2' : '#F0FDF4',
                                        border: '4px solid ' + (isClockedIn ? '#FCA5A5' : '#86EFAC'),
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 40px ' + (isClockedIn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'),
                                        cursor: (isProcessing || authStatus !== 'authorized' || gpsStatus !== 'locked') && !isClockedIn ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        opacity: (!isClockedIn && (authStatus !== 'authorized' || gpsStatus !== 'locked')) ? 0.5 : 1
                                    }}
                                    onClick={() => !isProcessing && authStatus === 'authorized' && gpsStatus === 'locked' && handleClockToggle()}
                                >
                                    {isProcessing ? (
                                        <Loader2 size={48} color={isClockedIn ? '#EF4444' : '#22C55E'} className="animate-spin" />
                                    ) : (
                                        <>
                                            {isClockedIn ? (
                                                <>
                                                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#DC2626', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                                        {formatElapsedTime(elapsedTime)}
                                                    </div>
                                                    <span style={{ fontSize: '15px', color: '#991B1B', fontWeight: 600, marginTop: '8px' }}>Tap to End Session</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={48} color="#16A34A" style={{ marginBottom: '12px' }} />
                                                    <span style={{ fontSize: '24px', color: '#16A34A', fontWeight: 700 }}>Start Session</span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#F9FAFB', borderRadius: '100px', border: '1px solid #E5E7EB' }}>
                                    <MapPin size={16} color={gpsStatus === 'locked' ? '#10B981' : '#F59E0B'} />
                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                        {gpsStatus === 'acquiring' ? 'Acquiring GPS Signal...' : 'EVV Location Verified'}
                                    </span>
                                    {gpsStatus === 'acquiring' && <Loader2 size={14} className="animate-spin" color="#6B7280" />}
                                </div>
                            </div>

                            {/* Patient Info Card */}
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Session Details</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>Client</span>
                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Emma Johnson</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px' }}>
                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>Service Code</span>
                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>H2014 (Skills Training)</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                        >
                            {/* Export Toolkit Container */}
                            <div style={{ backgroundColor: '#111827', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' }}>
                                <ShieldCheck size={120} color="rgba(255,255,255,0.03)" style={{ position: 'absolute', right: '-20px', top: '-20px' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>Fiscal Intermediary Ready</h3>
                                <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '20px', maxWidth: '80%', lineHeight: '1.5' }}>
                                    Your timesheets are fully EVV compliant. Export them in the DCI / Acumen format for direct submission.
                                </p>
                                <button
                                    onClick={handleExportData}
                                    style={{ backgroundColor: '#FFFFFF', color: '#111827', border: 'none', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Download size={18} /> Export DCI JSON
                                </button>
                            </div>

                            {/* Timesheets List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {timesheets.map(ts => (
                                    <div key={ts.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #F3F4F6' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Calendar size={18} color="#4B5563" />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{ts.date}</p>
                                                    <p style={{ fontSize: '13px', color: '#6B7280' }}>{ts.totalTime} Total</p>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                backgroundColor: ts.status === 'approved' ? '#ECFDF5' : '#FEF3C7',
                                                color: ts.status === 'approved' ? '#059669' : '#D97706'
                                            }}>
                                                {ts.status}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#6B7280' }}>Clock In: {ts.startTime}</span>
                                                <span style={{ color: '#111827', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={12} color="#10B981" /> {ts.locationStart}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E7EB' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#6B7280' }}>Clock Out: {ts.endTime}</span>
                                                <span style={{ color: '#111827', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={12} color="#10B981" /> {ts.locationEnd}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

export default CaregiverTimesheet;
