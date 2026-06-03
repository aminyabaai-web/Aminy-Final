// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MultiRoleTelehealthMatrix (SaaS EHR / Telehealth) - 10/10 Apple/Calm Aesthetic
 *
 * This component dynamically adapts the telehealth room UI based on the user's role.
 * - Parent: Education-focused, care plan updates, clean simple view.
 * - RBT: Live protocol steps, fast data collection, chat with supervisor.
 * - BCBA: Overlap/supervision view, discrete RBT messaging, live AI SOAP drafting.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Video,
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    MessageSquare,
    Users,
    Shield,
    FileText,
    Activity,
    CheckCircle2,
    AlertCircle,
    FileSignature,
    Send,
    Sparkles,
    ArrowLeft,
    VideoOff as VideoOffIcon
} from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { isDemoMode } from '../lib/demo-seed';

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    fontFamily: fontStack,
} as React.CSSProperties;

interface MultiRoleTelehealthRoomProps {
    onLeave: () => void;
    role: 'parent' | 'rbt' | 'bcba';
    patientName?: string;
}

export function MultiRoleTelehealthRoom({ onLeave, role, patientName = "Patient" }: MultiRoleTelehealthRoomProps) {
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [activePanel, setActivePanel] = useState<'chat' | 'clinical' | 'none'>('none');
    const [chatMessage, setChatMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<{ id: string; text: string }[]>([]);
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [isSupervising, setIsSupervising] = useState(false);

    // This room shows a guided, illustrative walkthrough of the multi-role
    // telehealth experience (protocol steps, RBT/BCBA telemetry, parent education).
    // Its content is hardcoded sample copy, not a live session — so it is gated to
    // demo mode. Live users are routed to the real Daily.co flow (OnDemandTelehealth)
    // instead of being shown fabricated clinical content / billing capture.
    const demo = isDemoMode();

    // Stack the layout (and render the side panel as a full-width bottom sheet)
    // on narrow viewports so the 340px panel never overflows next to the video.
    const [isNarrow, setIsNarrow] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onResize = () => setIsNarrow(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const sendChatMessage = () => {
        const text = chatMessage.trim();
        if (!text) return;
        setChatMessages(prev => [...prev, { id: `${Date.now()}-${prev.length}`, text }]);
        setChatMessage('');
    };

    // Live session telemetry — accumulated as the provider taps the data buttons
    const [engagementScore, setEngagementScore] = useState(0);
    const [targetBehaviors, setTargetBehaviors] = useState(0);

    // Time tracking
    const [sessionTime, setSessionTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSessionTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const RBTClinicalPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Session Targets & Protocol</h3>

            <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px' }}>Active Protocol</p>
                <div style={{ backgroundColor: '#F3F4F6', padding: '12px', borderRadius: '12px' }}>
                    <p style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>Transition to Table Task</p>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0', fontSize: '13px', color: '#4B5563' }}>
                        <li>Provide 2-minute warning</li>
                        <li>Present preferred item at table</li>
                        <li>Block elopement immediately</li>
                    </ul>
                </div>
            </div>

            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '12px' }}>Live Data Collection</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={() => setEngagementScore(Math.min(100, engagementScore + 5))}
                        style={{ padding: '16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <CheckCircle2 color="#059669" size={24} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Independent (+1)</span>
                    </button>

                    <button
                        onClick={() => setTargetBehaviors(prev => prev + 1)}
                        style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <AlertCircle color="#DC2626" size={24} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>Target Behavior</span>
                    </button>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4B5563', fontWeight: 500 }}>
                    <span>Target Count: {targetBehaviors}</span>
                    <span>Engagement: {engagementScore}%</span>
                </div>
            </div>
        </div>
    );

    const BCBAClinicalPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Supervision & Documentation</h3>

            <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px' }}>RBT Telemetry</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>Engagement</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0D9488' }}>{engagementScore}%</div>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>Target Behaviors</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>{targetBehaviors}</div>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Live Observations</p>
                    <Sparkles size={14} color="#0D9488" />
                </div>
                <Textarea
                    placeholder="Jot down notes to be merged into the AI SOAP draft..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    style={{ flex: 1, minHeight: '120px', borderRadius: '12px', resize: 'none', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '14px', padding: '12px' }}
                />

                {/* CPT 97155 Compliance Toggle */}
                <button
                    onClick={() => {
                        if (isSupervising) {
                            const minutes = Math.max(1, Math.floor(sessionTime / 60));
                            toast.info(`Demo: CPT 97155 supervision timer stopped at ${minutes} min. No billing was captured.`);
                            setIsSupervising(false);
                        } else {
                            toast.info('Demo: CPT 97155 supervision timer started (illustrative — nothing is billed).');
                            setIsSupervising(true);
                        }
                    }}
                    style={{
                        marginTop: '12px', padding: '12px',
                        backgroundColor: isSupervising ? '#FEF2F2' : '#EFF6FF',
                        color: isSupervising ? '#DC2626' : '#2563EB',
                        border: `1px solid ${isSupervising ? '#FECACA' : '#BFDBFE'}`,
                        borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                    }}
                >
                    <Activity size={16} />
                    {isSupervising ? 'End Supervision (Stop Timer)' : 'Start CPT 97155 Supervision'}
                </button>

                <button
                    onClick={() => {
                        toast.success('Observations saved to chart.');
                        setClinicalNotes('');
                    }}
                    style={{ marginTop: '12px', padding: '12px', backgroundColor: '#111827', color: '#FFF', borderRadius: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <FileSignature size={16} /> Save to Chart
                </button>
            </div>
        </div>
    );

    const ParentEducationPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Today's Focus</h3>

            <div style={{ flex: 1 }}>
                <div style={{ backgroundColor: '#F5F3FF', padding: '20px', borderRadius: '16px', border: '1px solid #EDE9FE', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#5B21B6', marginBottom: '8px' }}>Communication Prompts</h4>
                    <p style={{ fontSize: '14px', color: '#4C1D95', lineHeight: '1.5' }}>
                        Today the therapist is focusing on helping {patientName} use a 2-word phrase to ask for what they want (e.g., "Want car").
                    </p>
                </div>

                <div style={{ backgroundColor: '#F0FDF4', padding: '20px', borderRadius: '16px', border: '1px solid #DCFCE7' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>Caregiver Tip</h4>
                    <p style={{ fontSize: '14px', color: '#14532D', lineHeight: '1.5' }}>
                        When you're at home, pause before handing them an item they are pointing at. Wait 3 seconds to give them a chance to use their words.
                    </p>
                </div>
            </div>
        </div>
    );

    // Live (non-demo) users must never be shown the fabricated protocol/telemetry/
    // education content or the simulated CPT billing capture. Until this room is
    // wired to a real Daily.co call + real clinical data, show an honest screen
    // that points them to the working telehealth flow.
    if (!demo) {
        return (
            <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', ...fontSmoothing }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <Video size={28} color="rgba(255,255,255,0.6)" />
                </div>
                <h2 style={{ color: '#FFF', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Multi-role session room is in limited launch</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.5, maxWidth: '420px', marginBottom: '24px' }}>
                    The collaborative RBT / BCBA / parent room isn't live yet. To start a secure video session with a verified provider, use on-demand telehealth.
                </p>
                <button
                    onClick={onLeave}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#43AA8B', color: '#FFF', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                >
                    <ArrowLeft size={18} /> Back to telehealth
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100vh', backgroundColor: '#111827', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...fontSmoothing }}>
            {/* Illustrative-demo banner — this is NOT a live session and no billing is captured */}
            <div style={{ backgroundColor: '#92400E', color: '#FFFBEB', fontSize: '12px', fontWeight: 600, textAlign: 'center', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexShrink: 0 }}>
                <AlertCircle size={13} />
                Illustrative demo — not a live session. No video is connected and no billing is recorded.
            </div>

            {/* Top Header */}
            <div style={{ height: '64px', backgroundColor: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Shield size={20} color="#10B981" />
                    <span style={{ color: '#FFF', fontSize: '15px', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Secure Session • {role}</span>
                </div>

                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '100px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#EF4444', animation: 'pulse 2s infinite' }} />
                    <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTime(sessionTime)}</span>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500 }}>
                    {patientName}
                </div>
            </div>

            {/* Main Video Area & Side Panel Matrix */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: isNarrow ? 'column' : 'row', flex: 1, padding: isNarrow ? '16px' : '24px', gap: isNarrow ? '16px' : '24px', overflow: 'hidden', minHeight: 0 }}>

                {/* Primary Video Feed Container */}
                <div style={{ flex: 1, minHeight: 0, backgroundColor: '#1F2937', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Mock Video Placeholder — labeled illustrative, not a real feed */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(to bottom right, #374151, #111827)' }}>
                        <Users size={64} color="rgba(255,255,255,0.1)" />
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.04em' }}>Sample video — no live feed connected</span>
                    </div>

                    {/* Self View PIP */}
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', width: '160px', height: '220px', maxWidth: '40%', backgroundColor: '#000', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '100%', height: '100%', backgroundImage: 'linear-gradient(to top right, #4B5563, #1F2937)' }} />
                        {/* Camera-off overlay so the video toggle has a visible effect on the self-view */}
                        {isVideoOff && (
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111827', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                <VideoOffIcon size={28} color="rgba(255,255,255,0.5)" />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>Camera off</span>
                            </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', color: '#FFF', fontSize: '11px', fontWeight: 500 }}>
                            You ({role})
                        </div>
                        {isMicMuted && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#EF4444', padding: '4px', borderRadius: '50%' }}>
                                <MicOff size={12} color="#FFF" />
                            </div>
                        )}
                    </div>

                    {/* Action Dock overlays bottom center of video */}
                    <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '8px', borderRadius: '100px', display: 'flex', gap: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setIsMicMuted(!isMicMuted)}
                            style={{ width: '52px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: isMicMuted ? '#EF4444' : 'rgba(255,255,255,0.1)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button
                            onClick={() => setIsVideoOff(!isVideoOff)}
                            style={{ width: '52px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: isVideoOff ? '#EF4444' : 'rgba(255,255,255,0.1)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                        </button>

                        {/* Role-Specific Toggles */}
                        {(role === 'bcba' || role === 'rbt') && (
                            <button
                                onClick={() => setActivePanel(activePanel === 'clinical' ? 'none' : 'clinical')}
                                style={{ width: '52px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: activePanel === 'clinical' ? '#0D9488' : 'rgba(255,255,255,0.1)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <Activity size={24} />
                            </button>
                        )}

                        {role === 'parent' && (
                            <button
                                onClick={() => setActivePanel(activePanel === 'clinical' ? 'none' : 'clinical')}
                                style={{ width: '52px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: activePanel === 'clinical' ? '#7C3AED' : 'rgba(255,255,255,0.1)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <FileText size={20} />
                            </button>
                        )}

                        <button
                            onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
                            style={{ width: '52px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: activePanel === 'chat' ? '#3B82F6' : 'rgba(255,255,255,0.1)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <MessageSquare size={20} />
                        </button>

                        <button
                            onClick={onLeave}
                            style={{ width: '72px', height: '52px', borderRadius: '26px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '16px' }}
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>

                {/* Dynamic Side Panel — full-width bottom sheet on narrow viewports,
                    340px sibling column on wide. The bottom sheet caps its height and
                    scrolls so it never forces horizontal overflow at 375px. */}
                <AnimatePresence>
                    {activePanel !== 'none' && (
                        <motion.div
                            initial={isNarrow ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            animate={isNarrow ? { y: 0, opacity: 1 } : { width: 340, opacity: 1 }}
                            exit={isNarrow ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={isNarrow
                                ? { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '65vh', backgroundColor: '#FFFFFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 20, boxShadow: '0 -10px 30px rgba(0,0,0,0.4)' }
                                : { backgroundColor: '#FFFFFF', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
                            }
                        >
                            {/* Close affordance for the bottom sheet on mobile */}
                            {isNarrow && (
                                <button
                                    onClick={() => setActivePanel('none')}
                                    aria-label="Close panel"
                                    style={{ alignSelf: 'center', marginTop: '8px', width: '40px', height: '5px', borderRadius: '3px', border: 'none', backgroundColor: '#D1D5DB', cursor: 'pointer', flexShrink: 0 }}
                                />
                            )}
                            {activePanel === 'clinical' && role === 'bcba' && <BCBAClinicalPanel />}
                            {activePanel === 'clinical' && role === 'rbt' && <RBTClinicalPanel />}
                            {activePanel === 'clinical' && role === 'parent' && <ParentEducationPanel />}

                            {activePanel === 'chat' && (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>
                                        {role === 'parent' ? 'Session Chat' : 'Secure Clinical Chat'}
                                    </h3>

                                    <div style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: '16px', padding: '16px', overflowY: 'auto' }}>
                                        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginBottom: '16px' }}>Private channel established.</p>
                                        {/* Sample peer message — demo mode only */}
                                        {isDemoMode() && (role === 'rbt' || role === 'bcba') && (
                                            <div style={{ alignSelf: 'flex-start', backgroundColor: '#E0F2FE', padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px', maxWidth: '85%', marginBottom: '12px' }}>
                                                <p style={{ fontSize: '13px', color: '#0369A1' }}>Should we move on to the next target?</p>
                                                <span style={{ fontSize: '10px', color: '#38BDF8', marginTop: '4px', display: 'block' }}>Peer</span>
                                            </div>
                                        )}
                                        {chatMessages.map(msg => (
                                            <div key={msg.id} style={{ alignSelf: 'flex-end', backgroundColor: '#111827', padding: '10px 14px', borderRadius: '16px', borderBottomRightRadius: '4px', maxWidth: '85%', marginBottom: '12px', marginLeft: 'auto' }}>
                                                <p style={{ fontSize: '13px', color: '#FFF' }}>{msg.text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                        <Input
                                            value={chatMessage}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatMessage(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') sendChatMessage(); }}
                                            placeholder="Type a message..."
                                            aria-label="Chat message"
                                            style={{ borderRadius: '100px', backgroundColor: '#F3F4F6', border: 'none' }}
                                        />
                                        <button
                                            onClick={sendChatMessage}
                                            aria-label="Send message"
                                            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#111827', color: '#FFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

export default MultiRoleTelehealthRoom;
