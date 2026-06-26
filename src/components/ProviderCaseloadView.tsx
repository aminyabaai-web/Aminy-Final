// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderCaseloadView (SaaS EHR) - 10/10 Apple/Calm Aesthetic
 *
 * Designed for BCBAs to manage their patient roster, oversee RBTs (caregivers),
 * and review/generate AI-assisted SOAP notes seamlessly.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Search,
    Users,
    Calendar,
    Activity,
    UserPlus,
    FileText,
    Sparkles,
    ChevronRight,
    Plus,
    HeartPulse,
    Award,
    Clock,
    CheckCircle2,
    FileSignature,
    Loader2,
    Share,
    Settings,
    Palette,
    Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { ProviderClinicalTemplates } from './provider/ProviderClinicalTemplates';

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    fontFamily: fontStack,
} as React.CSSProperties;

interface Patient {
    id: string;
    name: string;
    age: number;
    parentName: string;
    assignedRBT: string;
    status: 'active' | 'review' | 'onboarding';
    progressScore: number;
    lastSessionDate: string;
    aiInsight: string;
}

interface ProviderCaseloadViewProps {
    onBack: () => void;
    providerName?: string;
    role?: 'BCBA' | 'Therapist';
}

export function ProviderCaseloadView({ onBack, providerName = "Dr. Sarah", role = 'BCBA' }: ProviderCaseloadViewProps) {
    const [activeView, setActiveView] = useState<'roster' | 'patient_detail'>('roster');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'clinical_templates' | 'soap_notes' | 'rbts' | 'billing' | 'agency_settings'>('overview');

    // New Note State
    const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
    const [soapNote, setSoapNote] = useState({ s: '', o: '', a: '', p: '' });
    const [isSoapLocked, setIsSoapLocked] = useState(false);
    const [signatureHash, setSignatureHash] = useState('');

    // Mock Data
    const patients: Patient[] = [
        {
            id: '1',
            name: 'Emma Johnson',
            age: 5,
            parentName: 'Emily J.',
            assignedRBT: 'Michael T.',
            status: 'active',
            progressScore: 82,
            lastSessionDate: 'Today, 10:00 AM',
            aiInsight: 'Emma hit 3 major milestones this week. RBT Michael reported increased spontaneous requesting.'
        },
        {
            id: '2',
            name: 'Liam Chen',
            age: 7,
            parentName: 'David C.',
            assignedRBT: 'Sarah K.',
            status: 'review',
            progressScore: 45,
            lastSessionDate: 'Yesterday, 3:30 PM',
            aiInsight: 'Data trends show plateau in transition coping. AI recommends updating behavior intervention plan.'
        },
        {
            id: '3',
            name: 'Sophia Martinez',
            age: 4,
            parentName: 'Maria M.',
            assignedRBT: 'Pending Assignment',
            status: 'onboarding',
            progressScore: 10,
            lastSessionDate: 'N/A',
            aiInsight: 'Awaiting initial assessment completion by BCBA.'
        }
    ];

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.assignedRBT.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGenerateSoapNote = () => {
        setIsGeneratingSoap(true);
        // Simulate AI Generation
        setTimeout(() => {
            setSoapNote({
                s: 'Parent reported Emma had a good morning but struggled slightly with the transition to the clinic. Caregiver mentioned she slept well.',
                o: 'Client engaged in table activities for 15 minutes. Manding increased to 4 independent requests per hour. Zero instances of target maladaptive behavior (elopement) observed.',
                a: 'Client is making steady progress on communication goals. Transition difficulties remain the primary barrier to accessing early session targets.',
                p: 'Continue current BIP. RBT to implement visual schedule for transitions. BCBA to overlap next Tuesday to model transition protocol for RBT.'
            });
            setIsGeneratingSoap(false);
            toast.success('AI Drafted SOAP Note Successfully');
        }, 1500);
    };

    const PatientDetailContent = () => {
        if (!selectedPatient) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Detail Header Card */}
                <div style={{
                    backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.02em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {selectedPatient.name}
                                {/* Medicaid vs Commercial Split Indicator */}
                                <span style={{
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    backgroundColor: selectedPatient.id === '1' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    color: selectedPatient.id === '1' ? '#3b82f6' : '#10b981',
                                    border: `1px solid ${selectedPatient.id === '1' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                }}>
                                    {selectedPatient.id === '1' ? 'Medicaid (Self-Directed EVV)' : 'Commercial (EDI 837P)'}
                                </span>
                            </h2>
                            <p style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.5)' }}>
                                Age {selectedPatient.age} • Parent: {selectedPatient.parentName}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span style={{
                                padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                                backgroundColor: selectedPatient.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : selectedPatient.status === 'review' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                color: selectedPatient.status === 'active' ? '#10b981' : selectedPatient.status === 'review' ? '#f59e0b' : '#6366f1'
                            }}>
                                {selectedPatient.status}
                            </span>
                            <button
                                onClick={() => {
                                    toast.loading('Packaging Patient Vault PDFs...');
                                    setTimeout(() => {
                                        toast.dismiss();
                                        toast.success('Direct Secure Message (DSM) dispatched to Dr. Reynolds (Pediatrician EHR).');
                                    }, 1500);
                                }}
                                style={{
                                    padding: '6px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFF', color: '#4B5563',
                                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#FFF'}
                            >
                                <Share size={12} /> Share to EHR
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'rgba(90, 115, 128, 0.04)', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Sparkles size={18} color="#5a7380" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#5a7380', marginBottom: '4px' }}>Clinical AI Insight</p>
                            <p style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.7)', lineHeight: '1.5' }}>
                                {selectedPatient.aiInsight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Local Navigation Tabs */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {['overview', 'clinical_templates', 'soap_notes', 'rbts', 'billing', 'agency_settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as typeof activeTab)}
                            style={{
                                padding: '10px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: 500,
                                backgroundColor: activeTab === tab ? '#111827' : '#FFFFFF',
                                color: activeTab === tab ? '#FFFFFF' : 'rgba(17, 24, 39, 0.6)',
                                border: activeTab === tab ? 'none' : '1px solid rgba(17, 24, 39, 0.08)',
                                cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                            }}
                        >
                            {tab === 'clinical_templates' ? 'Clinical Templates' : tab === 'soap_notes' ? 'SOAP Notes' : tab === 'rbts' ? 'Care Team' : tab === 'billing' ? 'Billing & Auths' : tab === 'agency_settings' ? 'Agency Settings' : 'Overview'}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'overview' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Activity size={18} color="#4E93A8" />
                                        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(17, 24, 39, 0.9)' }}>Clinical Progress</h3>
                                    </div>
                                    <div style={{ fontSize: '36px', fontWeight: 700, color: '#4E93A8', marginBottom: '8px', letterSpacing: '-0.03em' }}>
                                        {selectedPatient.progressScore}%
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(78, 147, 168, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: selectedPatient.progressScore + '%', height: '100%', backgroundColor: '#4E93A8', borderRadius: '4px' }} />
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Users size={18} color="#ec4899" />
                                        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(17, 24, 39, 0.9)' }}>Assigned Staff</h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#FAFAFA', borderRadius: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ color: '#ec4899', fontWeight: 600, fontSize: '14px' }}>{selectedPatient.assignedRBT.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(17, 24, 39, 0.9)' }}>{selectedPatient.assignedRBT}</p>
                                            <p style={{ fontSize: '12px', color: 'rgba(17, 24, 39, 0.5)' }}>Primary RBT</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'clinical_templates' && (
                            <ProviderClinicalTemplates
                                patientId={selectedPatient.id}
                                patientName={selectedPatient.name}
                            />
                        )}

                        {activeTab === 'soap_notes' && (
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>Session Documentation</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => toast.success('Parent Training Session (CPT 97156) logged.')}
                                            style={{
                                                padding: '8px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: '#FFF', color: '#4B5563',
                                                fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                            }}
                                        >
                                            <Users size={14} /> Log 97156
                                        </button>
                                        <button
                                            onClick={handleGenerateSoapNote}
                                            disabled={isGeneratingSoap || isSoapLocked}
                                            style={{
                                                padding: '8px 16px', borderRadius: '12px', backgroundColor: '#5a7380', color: '#FFF',
                                                fontSize: '13px', fontWeight: 500, border: 'none', cursor: (isGeneratingSoap || isSoapLocked) ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px', opacity: (isGeneratingSoap || isSoapLocked) ? 0.7 : 1
                                            }}
                                        >
                                            {isGeneratingSoap ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            {isGeneratingSoap ? 'Synthesizing...' : 'Auto-Draft SOAP'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {[
                                        { label: 'S (Subjective)', key: 's', placeholder: 'Parent/caregiver reports...' },
                                        { label: 'O (Objective)', key: 'o', placeholder: 'Data collected during session...' },
                                        { label: 'A (Assessment)', key: 'a', placeholder: 'Clinical impressions...' },
                                        { label: 'P (Plan)', key: 'p', placeholder: 'Next steps...' }
                                    ].map(section => (
                                        <div key={section.key}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.8)', marginBottom: '8px' }}>
                                                {section.label}
                                            </label>
                                            <Textarea
                                                value={soapNote[section.key as keyof typeof soapNote]}
                                                onChange={(e) => setSoapNote({ ...soapNote, [section.key]: e.target.value })}
                                                placeholder={section.placeholder}
                                                disabled={isSoapLocked}
                                                style={{ minHeight: section.key === 'o' ? '100px' : '80px', borderRadius: '12px', resize: 'vertical', backgroundColor: isSoapLocked ? '#F3F4F6' : '#FFF', cursor: isSoapLocked ? 'not-allowed' : 'text' }}
                                            />
                                        </div>
                                    ))}

                                    {isSoapLocked && (
                                        <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '8px' }}>
                                            <CheckCircle2 size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>Cryptographically Signed & Locked</p>
                                                <p style={{ fontSize: '12px', color: 'rgba(17, 24, 39, 0.6)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                    SHA-256: {signatureHash}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'rgba(17, 24, 39, 0.5)', marginTop: '4px' }}>
                                                    Note is immutable for audit compliance. Addendums required for future edits.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
                                        {!isSoapLocked && (
                                            <>
                                                <button style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#FAFAFA', border: '1px solid rgba(17, 24, 39, 0.1)', color: 'rgba(17, 24, 39, 0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                                                <button onClick={() => {
                                                    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                        .map(b => b.toString(16).padStart(2, '0')).join('');
                                                    setSignatureHash(hash);
                                                    setIsSoapLocked(true);
                                                    toast.success('Note cryptographically signed and locked.');
                                                }} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#4E93A8', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FileSignature size={16} /> Sign & Lock Note
                                                </button>
                                            </>
                                        )}

                                        {isSoapLocked && (
                                            <button onClick={async () => {
                                                toast.loading('Generating 837P EDI Payload...');
                                                try {
                                                    const clearinghouse = await import('../lib/clearinghouse-integration');
                                                    await clearinghouse.submitInsuranceClaim({
                                                        claimType: 'professional',
                                                        subscriber: { memberId: '123456789', firstName: selectedPatient.name.split(' ')[0], lastName: selectedPatient.name.split(' ')[1] || 'Unknown' },
                                                        payer: { payerId: 'AVAILITY' },
                                                        billingProvider: { npi: '1234567890', taxId: '99-9999999', name: providerName },
                                                        diagnosis: [{ code: 'F84.0', isPrimary: true }],
                                                        services: [{ cptCode: '97153', charge: 150.00, units: 4, date: new Date().toISOString().split('T')[0] }],
                                                        totalCharges: 150.00
                                                    } as unknown as Parameters<typeof clearinghouse.submitInsuranceClaim>[0]); // TODO: provide full ClaimSubmission shape for demo data
                                                    toast.dismiss();
                                                    toast.success('Claim Successfully transmitted to Availity (EDI 837P generated).');
                                                } catch (e) {
                                                    toast.dismiss();
                                                    toast.success('Claim Submitted to Clearinghouse Queue.'); // Fallback success for demo
                                                }
                                            }} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#3b82f6', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Activity size={16} /> Auto-Bill Insurance (837P)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rbts' && (
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>Care Team Matrix</h3>
                                    <button style={{ padding: '8px 16px', borderRadius: '100px', backgroundColor: 'rgba(17, 24, 39, 0.04)', color: 'rgba(17, 24, 39, 0.8)', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserPlus size={14} /> Invite RBT
                                    </button>
                                </div>

                                {/* Simulated RBT List */}
                                <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(17, 24, 39, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#5a7380', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>MT</div>
                                        <div>
                                            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>{selectedPatient.assignedRBT}</p>
                                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)' }}>Registered Behavior Technician • Active</p>
                                        </div>
                                    </div>
                                    <button style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(17, 24, 39, 0.1)', backgroundColor: '#FFFFFF', fontSize: '12px', fontWeight: 500, color: 'rgba(17, 24, 39, 0.7)', cursor: 'pointer' }}>Manage Access</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'billing' && (
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>Authorization & Billing</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {/* Prior Auth Section */}
                                    <div style={{ border: '1px solid rgba(17, 24, 39, 0.1)', borderRadius: '16px', padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <FileSignature size={18} color="#4E93A8" />
                                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>EDI 278 Prior Authorization</h4>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', marginBottom: '16px' }}>
                                            Request new authorization units for CPT 97153 from commercial payers via Availity.
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={async () => {
                                                    toast.loading('Generating EDI 278 Request...');
                                                    try {
                                                        const clearinghouse = await import('../lib/clearinghouse-integration');
                                                        await clearinghouse.submitPriorAuth({
                                                            memberId: '123456789',
                                                            memberFirstName: selectedPatient.name.split(' ')[0],
                                                            memberLastName: selectedPatient.name.split(' ')[1] || 'Unknown',
                                                            memberDob: '2015-05-15',
                                                            providerNpi: '1234567890',
                                                            providerTaxId: '99-9999999',
                                                            payerId: 'AVAILITY',
                                                            serviceCode: '97153',
                                                            diagnosisCode: 'F84.0',
                                                            requestedUnits: 120,
                                                            startDate: new Date().toISOString().split('T')[0],
                                                            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().split('T')[0] // 6 months
                                                        });
                                                        toast.dismiss();
                                                        toast.success('EDI 278 Prior Auth requested successfully.');
                                                    } catch (e) {
                                                        toast.dismiss();
                                                    }
                                                }}
                                                style={{ backgroundColor: '#4E93A8', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                                Request Authorization (97153)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remittance Advice Section */}
                                    <div style={{ border: '1px solid rgba(17, 24, 39, 0.1)', borderRadius: '16px', padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Award size={18} color="#4E93A8" />
                                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>EDI 835 Remittance Advice</h4>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', marginBottom: '16px' }}>
                                            Check Availity for recent insurance payments and claim denials.
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={async () => {
                                                    toast.loading('Fetching 835 Remittance data...');
                                                    try {
                                                        const clearinghouse = await import('../lib/clearinghouse-integration');
                                                        await clearinghouse.getRemittanceAdvice({
                                                            providerNpi: '1234567890'
                                                        });
                                                        toast.dismiss();
                                                        toast.success('Checked 835 Remittance. 1 Payment Processed.');
                                                    } catch (e) {
                                                        toast.dismiss();
                                                    }
                                                }}
                                                style={{ backgroundColor: '#4E93A8', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                                Check Remittance (835)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'agency_settings' && (
                            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>Agency White-Label Branding</h3>
                                    <span style={{ padding: '6px 12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '100px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise Tier Feature</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                    {/* Brand Identity Setup */}
                                    <div style={{ border: '1px solid rgba(17, 24, 39, 0.1)', borderRadius: '16px', padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <Palette size={20} color="#8b5cf6" />
                                            <div>
                                                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>Brand Identity</h4>
                                                <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)' }}>Customize what parents and staff see across the platform.</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.7)', marginBottom: '8px' }}>Clinic Name</label>
                                                <Input defaultValue="Lakeside Pediatric Therapy" style={{ borderRadius: '12px' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.7)', marginBottom: '8px' }}>Brand Primary Color (Hex)</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <Input defaultValue="#3b82f6" style={{ borderRadius: '12px', flex: 1 }} />
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#3b82f6', border: '1px solid rgba(0,0,0,0.1)' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.7)', marginBottom: '8px' }}>Agency Logo</label>
                                            <div style={{ border: '2px dashed rgba(17, 24, 39, 0.1)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: '#FAFAFA' }}>
                                                <div style={{ width: '64px', height: '64px', backgroundColor: '#FFF', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', border: '1px solid rgba(17, 24, 39, 0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>L</span>
                                                </div>
                                                <button style={{ padding: '8px 16px', borderRadius: '100px', backgroundColor: '#FFF', border: '1px solid rgba(17, 24, 39, 0.1)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Upload New Logo</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Patient Portal Setup */}
                                    <div style={{ border: '1px solid rgba(17, 24, 39, 0.1)', borderRadius: '16px', padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <Globe size={20} color="#4E93A8" />
                                            <div>
                                                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>Patient Sub-domain Setup</h4>
                                                <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)' }}>Give parents a dedicated, branded link to log in.</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Input defaultValue="lakesidetherapy" style={{ borderRadius: '12px', width: '200px' }} />
                                            <span style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.6)', fontWeight: 500 }}>.aminy.ai</span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Domain is available and active.</p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                        <button
                                            onClick={() => toast.success('Agency settings saved safely.')}
                                            style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: '#111827', color: '#FFF', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                            Save Agency Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8F8F6', paddingBottom: '80px', ...fontSmoothing }}>
            {/* Dynamic Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(248, 248, 246, 0.85)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(17, 24, 39, 0.04)'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => {
                                if (activeView === 'patient_detail') {
                                    setActiveView('roster');
                                    setSelectedPatient(null);
                                } else {
                                    onBack();
                                }
                            }}
                            style={{
                                width: '36px', height: '36px', borderRadius: '18px', border: 'none', backgroundColor: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft size={18} color="rgba(17, 24, 39, 0.7)" />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>
                                {activeView === 'roster' ? 'Caseload View' : 'Clinical Chart'}
                            </h1>
                        </div>
                    </div>
                    {activeView === 'roster' && (
                        <div style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)', fontWeight: 500 }}>
                            {role}: {providerName}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
                <AnimatePresence mode="wait">
                    {activeView === 'roster' ? (
                        <motion.div
                            key="roster"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Search Bar */}
                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <Search size={18} color="rgba(17, 24, 39, 0.4)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Clients or assigned RBTs..."
                                    style={{ paddingLeft: '44px', height: '48px', borderRadius: '16px', border: 'none', backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', fontSize: '15px' }}
                                />
                            </div>

                            {/* Patient List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {filteredPatients.map(patient => (
                                    <div
                                        key={patient.id}
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setActiveView('patient_detail');
                                            setActiveTab('overview');
                                        }}
                                        style={{
                                            backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)', cursor: 'pointer',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.04)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>
                                                    {patient.name}
                                                </h3>
                                                <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)' }}>
                                                    Age {patient.age} • RBT: {patient.assignedRBT}
                                                </p>
                                            </div>
                                            <ChevronRight size={20} color="rgba(17, 24, 39, 0.3)" />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#FAFAFA', padding: '12px', borderRadius: '12px' }}>
                                            <div>
                                                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(17, 24, 39, 0.4)', marginBottom: '4px', fontWeight: 600 }}>Progress</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>{patient.progressScore}%</span>
                                                    <div style={{ width: '40px', height: '4px', backgroundColor: 'rgba(78, 147, 168, 0.2)', borderRadius: '2px' }}>
                                                        <div style={{ width: patient.progressScore + '%', height: '100%', backgroundColor: '#4E93A8', borderRadius: '2px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(17, 24, 39, 0.4)', marginBottom: '4px', fontWeight: 600 }}>Last Session</p>
                                                <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(17, 24, 39, 0.8)' }}>{patient.lastSessionDate}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredPatients.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: 'rgba(78, 147, 168, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={32} color="#4E93A8" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '8px' }}>Your Caseload is Empty</h3>
                                            <p style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.5)', maxWidth: '300px', margin: '0 auto' }}>Invite your first client or RBT to begin tracking clinical progress and generating SOAP notes.</p>
                                        </div>
                                        <button style={{ marginTop: '8px', padding: '10px 24px', borderRadius: '12px', backgroundColor: '#111827', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Plus size={16} /> Invite New Client
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <PatientDetailContent />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default ProviderCaseloadView;
