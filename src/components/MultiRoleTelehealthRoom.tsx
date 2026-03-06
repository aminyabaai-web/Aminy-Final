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
    ArrowLeft,
    Video,
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    MessageSquare,
    Users,
    Settings,
    Shield,
    FileText,
    Activity,
    Maximize2,
    CheckCircle2,
    AlertCircle,
    FileSignature,
    Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

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

export function MultiRoleTelehealthRoom({ onLeave, role, patientName = "Emma J." }: MultiRoleTelehealthRoomProps) {
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [activePanel, setActivePanel] = useState<'chat' | 'clinical' | 'none'>('none');
    const [chatMessage, setChatMessage] = useState('');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [isSupervising, setIsSupervising] = useState(false);

    // Simulated live data for RBT and BCBA
    const [engagementScore, setEngagementScore] = useState(85);
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
                            toast.success(`Supervision logged: CPT 97155 - ${minutes} minutes recorded for billing.`);
                            setIsSupervising(false);
                        } else {
                            toast.success('CPT 97155 Auditable Supervision Timer Started.');
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

                <button style={{ marginTop: '12px', padding: '12px', backgroundColor: '#111827', color: '#FFF', borderRadius: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#111827', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...fontSmoothing }}>
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
            <div style={{ display: 'flex', flex: 1, padding: '24px', gap: '24px', marginTop: '-64px', paddingTop: '88px', overflow: 'hidden' }}>

                {/* Primary Video Feed Container */}
                <div style={{ flex: 1, backgroundColor: '#1F2937', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Mock Video Placeholder */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(to bottom right, #374151, #111827)' }}>
                        <Users size={64} color="rgba(255,255,255,0.1)" />
                    </div>

                    {/* Self View PIP */}
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', width: '160px', height: '220px', backgroundColor: '#000', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '100%', height: '100%', backgroundImage: 'linear-gradient(to top right, #4B5563, #1F2937)' }} />
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

                {/* Dynamic Side Panel */}
                <AnimatePresence>
                    {activePanel !== 'none' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        >
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
                                        {/* Mock Chat Bubble */}
                                        {(role === 'rbt' || role === 'bcba') && (
                                            <div style={{ alignSelf: 'flex-start', backgroundColor: '#E0F2FE', padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px', maxWidth: '85%', marginBottom: '12px' }}>
                                                <p style={{ fontSize: '13px', color: '#0369A1' }}>Should we move on to the next target?</p>
                                                <span style={{ fontSize: '10px', color: '#38BDF8', marginTop: '4px', display: 'block' }}>10:14 AM • Peer</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                        <Input
                                            value={chatMessage}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            style={{ borderRadius: '100px', backgroundColor: '#F3F4F6', border: 'none' }}
                                        />
                                        <button style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#111827', color: '#FFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                            <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
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
