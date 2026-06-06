// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Save, CheckCircle2, ChevronRight, ArrowLeft, AlertCircle, TrendingUp, Target, BrainCircuit, Users, Activity, MessageSquare, Heart, Stethoscope } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { isDemoMode } from '../../lib/demo-seed';
import { syncEncryptedStorage } from '../../lib/security/encrypted-storage';
import { toast } from 'sonner';

interface TemplateProps {
    patientId: string;
    patientName: string;
    // Optional exit handler — when this component is mounted as the full
    // 'clinical-templates' screen, App.tsx passes this so the provider has an
    // in-app route back to the dashboard. Safe-defaulted, so embedded uses
    // (inside a tabbed portal that already has its own chrome) can omit it.
    onBack?: () => void;
}

// No server-side clinical-template store exists yet, so saves are persisted
// locally (encrypted-at-rest) on this device only. Returns whether the draft
// actually persisted, so the UI never claims a save it didn't make.
function saveTemplateDraft(patientId: string, template: string, data: unknown): boolean {
    try {
        syncEncryptedStorage.setItem(
            `aminy_clinical_template_${patientId}_${template}`,
            JSON.stringify({ data, savedAt: new Date().toISOString() }),
        );
        return true;
    } catch {
        return false;
    }
}

// Sample clinical content for investor/AACT demos only. Real providers start
// with blank templates so no fabricated diagnoses/findings reach a chart.
const DEMO = isDemoMode();

export function ProviderClinicalTemplates({ patientId, patientName, onBack }: TemplateProps) {
    const [activeTemplate, setActiveTemplate] = useState<'bip' | 'milestones' | 'slp' | 'mh_treatment' | 'psych_eval' | null>(null);

    // Focus: Behavior Intervention Plan (BIP)
    const [bipForm, setBipForm] = useState(DEMO ? {
        targetBehaviors: '1. Elopement (leaving assigned area without permission)\n2. Non-compliance (refusal to follow instructions)',
        antecedentStrategies: '1. Visual schedules\n2. First-Then language\n3. High-probability request sequence',
        replacementBehaviors: '1. Functional Communication Training (FCT): Requesting a break\n2. Asking for help verbally or using AAC',
        consequenceStrategies: '1. Differential Reinforcement of Alternative behavior (DRA)\n2. Extinction for escape-maintained behavior',
    } : {
        targetBehaviors: '',
        antecedentStrategies: '',
        replacementBehaviors: '',
        consequenceStrategies: '',
    });

    // Focus: Pediatric Milestones Tracker
    const [milestones, setMilestones] = useState({
        communication: [
            { id: 'c1', label: 'Uses 2-word phrases', met: DEMO },
            { id: 'c2', label: 'Answers simple Wh- questions', met: false },
            { id: 'c3', label: 'Follows 2-step directions', met: DEMO },
        ],
        social: [
            { id: 's1', label: 'Initiates play with peers', met: false },
            { id: 's2', label: 'Maintains eye contact during conversation', met: false },
            { id: 's3', label: 'Shares toys willingly', met: DEMO },
        ],
        motor: [
            { id: 'm1', label: 'Jumps with both feet', met: DEMO },
            { id: 'm2', label: 'Holds crayon with pincer grasp', met: false },
        ]
    });

    // Focus: SLP Evaluation
    const [slpForm, setSlpForm] = useState(DEMO ? {
        expressiveLanguage: 'Patient currently uses 1-2 word utterances to request basic needs. Vocabulary estimated at 40 words.',
        receptiveLanguage: 'Follows routine 1-step directions (e.g., "Give me the ball"). Struggles with 2-step novel directions.',
        articulation: 'Substitutes /w/ for /r/ and /l/ (gliding). Intelligibility is approximately 60% to unfamiliar listeners.',
        speechGoals: '1. Increase expressive vocabulary to 100 words.\n2. Follow 2-step related directions with 80% accuracy.'
    } : {
        expressiveLanguage: '',
        receptiveLanguage: '',
        articulation: '',
        speechGoals: '',
    });

    // Focus: Mental Health Treatment Plan
    const [mhForm, setMhForm] = useState(DEMO ? {
        presentingProblem: 'Patient presents with severe anxiety related to school transitions and social interactions.',
        evidenceBasedIntervention: 'Cognitive Behavioral Therapy (CBT) focusing on emotion regulation and cognitive restructuring.',
        shortTermGoals: '1. Patient will identify 3 physical signs of anxiety.\n2. Patient will use deep breathing when feeling overwhelmed.',
        longTermGoals: '1. Reduce school refusal behaviors to <1 occurrence per month.\n2. Increase participation in peer group activities.'
    } : {
        presentingProblem: '',
        evidenceBasedIntervention: '',
        shortTermGoals: '',
        longTermGoals: '',
    });

    // Focus: Diagnostic Psychological Evaluation
    const [psychForm, setPsychForm] = useState(DEMO ? {
        referralReason: 'Evaluation for Autism Spectrum Disorder (ASD) and ADHD due to social deficits and hyperactivity.',
        assessmentTools: 'Autism Diagnostic Observation Schedule, Second Edition (ADOS-2), Vineland-3, Conners 4.',
        clinicalImpressions: 'Patient meets DSM-5 diagnostic criteria for ASD, Level 1, without accompanying intellectual impairment.',
        recommendations: '1. Initiate comprehensive ABA therapy (20 hrs/week).\n2. Speech therapy for pragmatic language.\n3. Implement visual schedules at home and school.'
    } : {
        referralReason: '',
        assessmentTools: '',
        clinicalImpressions: '',
        recommendations: '',
    });

    const handleSaveBip = () => {
        if (saveTemplateDraft(patientId, 'bip', bipForm)) {
            toast.success('Behavior Intervention Plan draft saved on this device');
        } else {
            toast.error("Couldn't save — please try again");
        }
    };

    const handleToggleMilestone = (category: keyof typeof milestones, id: string) => {
        setMilestones(prev => ({
            ...prev,
            [category]: prev[category].map(m => m.id === id ? { ...m, met: !m.met } : m)
        }));
    };

    const calculateProgress = (category: keyof typeof milestones) => {
        const total = milestones[category].length;
        const met = milestones[category].filter(m => m.met).length;
        return Math.round((met / total) * 100);
    };

    if (!activeTemplate) {
        return (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            aria-label="Back to dashboard"
                            style={{ padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: '40px', minHeight: '40px' }}
                        >
                            <ArrowLeft size={18} color="rgba(17, 24, 39, 0.6)" />
                        </button>
                    )}
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>Clinical Templates</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.6)', marginBottom: '24px' }}>
                    Select a template to generate structured clinical documentation for {patientName}.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* BIP Template Card */}
                    <div
                        onClick={() => setActiveTemplate('bip')}
                        style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', cursor: 'pointer',
                            transition: 'all 0.2s', backgroundColor: '#FAFAFA'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#6B9080'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BrainCircuit size={24} color="#6B9080" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>Behavior Intervention Plan</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', lineHeight: 1.4 }}>
                                Structured ABA template for target behaviors, antecedent strategies, and replacement skills.
                            </p>
                        </div>
                    </div>

                    {/* Milestones Template Card */}
                    <div
                        onClick={() => setActiveTemplate('milestones')}
                        style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', cursor: 'pointer',
                            transition: 'all 0.2s', backgroundColor: '#FAFAFA'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#ec4899'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Target size={24} color="#ec4899" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>Pediatric Milestones</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', lineHeight: 1.4 }}>
                                Track developmental progress across communication, social, and motor domains.
                            </p>
                        </div>
                    </div>

                    {/* SLP Evaluation Card */}
                    <div
                        onClick={() => setActiveTemplate('slp')}
                        style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', cursor: 'pointer',
                            transition: 'all 0.2s', backgroundColor: '#FAFAFA'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MessageSquare size={24} color="#3b82f6" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>Speech-Language Evaluation</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', lineHeight: 1.4 }}>
                                Comprehensive SLP assessment for expressive/receptive language and articulation.
                            </p>
                        </div>
                    </div>

                    {/* Mental Health Treatment Plan Card */}
                    <div
                        onClick={() => setActiveTemplate('mh_treatment')}
                        style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', cursor: 'pointer',
                            transition: 'all 0.2s', backgroundColor: '#FAFAFA'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#8b5cf6'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Heart size={24} color="#8b5cf6" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>Mental Health Treatment Plan</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', lineHeight: 1.4 }}>
                                Structured therapeutic goals, CBT interventions, and progress monitoring.
                            </p>
                        </div>
                    </div>

                    {/* Diagnostic Evaluation Card */}
                    <div
                        onClick={() => setActiveTemplate('psych_eval')}
                        style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', cursor: 'pointer',
                            transition: 'all 0.2s', backgroundColor: '#FAFAFA'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#f59e0b'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Stethoscope size={24} color="#f59e0b" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', marginBottom: '4px' }}>Diagnostic Psychological Eval.</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.6)', lineHeight: 1.4 }}>
                                Formal assessments (ADOS-2, Vineland), diagnostic impressions, and recommendations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTemplate(null)}
                    style={{ padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronRight size={18} color="rgba(17, 24, 39, 0.5)" style={{ transform: 'rotate(180deg)' }} />
                </button>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>
                        {activeTemplate === 'bip' ? 'Behavior Intervention Plan (BIP)' :
                            activeTemplate === 'milestones' ? 'Pediatric Milestones Tracker' :
                                activeTemplate === 'slp' ? 'Speech-Language Evaluation' :
                                    activeTemplate === 'mh_treatment' ? 'Mental Health Treatment Plan' :
                                        'Diagnostic Psychological Evaluation'}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.5)' }}>Patient: {patientName}</p>
                </div>
            </div>

            {/* BIP Content */}
            {activeTemplate === 'bip' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '16px', backgroundColor: 'rgba(13, 148, 136, 0.05)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <AlertCircle size={18} color="#6B9080" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.8)', lineHeight: 1.5 }}>
                                <strong>Note:</strong> Saving stores a draft on this device. Drafts are not yet synced to a shared chart — export or copy the finalized plan into the patient record.
                            </p>
                        </div>
                    </div>

                    {[
                        { label: 'Target Behaviors for Reduction', key: 'targetBehaviors', placeholder: 'List specific, observable behaviors...' },
                        { label: 'Antecedent Strategies (Prevention)', key: 'antecedentStrategies', placeholder: 'What modifications to the environment...' },
                        { label: 'Replacement Skills (Teaching)', key: 'replacementBehaviors', placeholder: 'What functional skills will replace the target behavior...' },
                        { label: 'Consequence Strategies (Response)', key: 'consequenceStrategies', placeholder: 'How should staff respond when the behavior occurs...' }
                    ].map((section) => (
                        <div key={section.key}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.8)', marginBottom: '8px' }}>
                                {section.label}
                            </label>
                            <Textarea
                                value={bipForm[section.key as keyof typeof bipForm]}
                                onChange={(e) => setBipForm({ ...bipForm, [section.key]: e.target.value })}
                                placeholder={section.placeholder}
                                style={{ minHeight: '100px', borderRadius: '12px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                            />
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                            onClick={handleSaveBip}
                            style={{
                                padding: '10px 24px', borderRadius: '12px', backgroundColor: '#6B9080', border: 'none', color: '#FFF',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                            }}
                        >
                            <Save size={16} /> Save BIP
                        </button>
                    </div>
                </div>
            )}

            {/* Milestones Content */}
            {activeTemplate === 'milestones' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {[
                        { key: 'communication', title: 'Communication & Speech', color: '#3b82f6', icon: <FileText size={18} color="#3b82f6" /> },
                        { key: 'social', title: 'Social & Emotional', color: '#ec4899', icon: <Users size={18} color="#ec4899" /> },
                        { key: 'motor', title: 'Motor Skills', color: '#f59e0b', icon: <Activity size={18} color="#f59e0b" /> }
                    ].map((domain) => (
                        <div key={domain.key} style={{ border: '1px solid #E5E7EB', borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '16px', backgroundColor: '#FAFAFA', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {domain.icon}
                                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)' }}>{domain.title}</h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={14} color={domain.color} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: domain.color }}>
                                        {calculateProgress(domain.key as keyof typeof milestones)}% Mastered
                                    </span>
                                </div>
                            </div>
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {milestones[domain.key as keyof typeof milestones].map((milestone) => (
                                    <label
                                        key={milestone.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px',
                                            backgroundColor: milestone.met ? 'rgba(16, 185, 129, 0.05)' : '#FFF',
                                            border: `1px solid ${milestone.met ? 'rgba(16, 185, 129, 0.2)' : '#E5E7EB'}`,
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={milestone.met}
                                            onChange={() => handleToggleMilestone(domain.key as keyof typeof milestones, milestone.id)}
                                            style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '14px', color: 'rgba(17, 24, 39, 0.8)', flex: 1, textDecoration: milestone.met ? 'line-through' : 'none', opacity: milestone.met ? 0.6 : 1 }}>
                                            {milestone.label}
                                        </span>
                                        {milestone.met && <CheckCircle2 size={18} color="#10b981" />}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px', backgroundColor: '#FAFAFA', borderRadius: '16px', marginTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (saveTemplateDraft(patientId, 'milestones', milestones)) {
                                    toast.success('Milestone progress saved on this device');
                                } else {
                                    toast.error("Couldn't save — please try again");
                                }
                            }}
                            style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#111827', color: '#FFF', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                        >
                            Update Tracker
                        </button>
                    </div>
                </div>
            )}

            {/* SLP Content */}
            {activeTemplate === 'slp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                        { label: 'Expressive Language', key: 'expressiveLanguage', placeholder: 'Describe child\'s ability to express themselves...' },
                        { label: 'Receptive Language', key: 'receptiveLanguage', placeholder: 'Describe child\'s ability to understand spoken language...' },
                        { label: 'Articulation / Phonology', key: 'articulation', placeholder: 'Note any speech sound errors or phonological processes...' },
                        { label: 'Speech Therapy Goals', key: 'speechGoals', placeholder: 'List specific, measurable SLP goals...' }
                    ].map((section) => (
                        <div key={section.key}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.8)', marginBottom: '8px' }}>
                                {section.label}
                            </label>
                            <Textarea
                                value={slpForm[section.key as keyof typeof slpForm]}
                                onChange={(e) => setSlpForm({ ...slpForm, [section.key]: e.target.value })}
                                placeholder={section.placeholder}
                                style={{ minHeight: '100px', borderRadius: '12px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (saveTemplateDraft(patientId, 'slp', slpForm)) {
                                    toast.success('Speech-language evaluation draft saved on this device');
                                } else {
                                    toast.error("Couldn't save — please try again");
                                }
                            }}
                            style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: '#3b82f6', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}
                        >
                            <Save size={16} /> Save Evaluation
                        </button>
                    </div>
                </div>
            )}

            {/* Mental Health Content */}
            {activeTemplate === 'mh_treatment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                        { label: 'Presenting Problem(s)', key: 'presentingProblem', placeholder: 'Primary psychological concerns...' },
                        { label: 'Evidence-Based Interventions', key: 'evidenceBasedIntervention', placeholder: 'Modality (e.g., CBT, Play Therapy) and rationale...' },
                        { label: 'Short-Term Clinical Goals', key: 'shortTermGoals', placeholder: 'Measurable objectives for next 30-90 days...' },
                        { label: 'Long-Term Clinical Goals', key: 'longTermGoals', placeholder: 'Overarching treatment objectives...' }
                    ].map((section) => (
                        <div key={section.key}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.8)', marginBottom: '8px' }}>
                                {section.label}
                            </label>
                            <Textarea
                                value={mhForm[section.key as keyof typeof mhForm]}
                                onChange={(e) => setMhForm({ ...mhForm, [section.key]: e.target.value })}
                                placeholder={section.placeholder}
                                style={{ minHeight: '100px', borderRadius: '12px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (saveTemplateDraft(patientId, 'mh_treatment', mhForm)) {
                                    toast.success('Mental health treatment plan draft saved on this device');
                                } else {
                                    toast.error("Couldn't save — please try again");
                                }
                            }}
                            style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: '#8b5cf6', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)' }}
                        >
                            <Save size={16} /> Save Plan
                        </button>
                    </div>
                </div>
            )}

            {/* Diagnostic Psych Content */}
            {activeTemplate === 'psych_eval' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Stethoscope size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '13px', color: 'rgba(17, 24, 39, 0.8)', lineHeight: 1.5 }}>
                                <strong>Note:</strong> Formal psychological evaluations are often requested by insurance payers prior to authorizing ABA or SLP therapy.
                            </p>
                        </div>
                    </div>

                    {[
                        { label: 'Reason for Referral', key: 'referralReason', placeholder: 'Why was the patient referred for evaluation?' },
                        { label: 'Assessment Tools Administered', key: 'assessmentTools', placeholder: 'E.g., ADOS-2, WISC-V, Vineland-3...' },
                        { label: 'Clinical Diagnostic Impressions', key: 'clinicalImpressions', placeholder: 'Include DSM-5/ICD-10 codes and rationales...' },
                        { label: 'Medical & Therapy Recommendations', key: 'recommendations', placeholder: 'Prescribed therapy hours, school accommodations...' }
                    ].map((section) => (
                        <div key={section.key}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.8)', marginBottom: '8px' }}>
                                {section.label}
                            </label>
                            <Textarea
                                value={psychForm[section.key as keyof typeof psychForm]}
                                onChange={(e) => setPsychForm({ ...psychForm, [section.key]: e.target.value })}
                                placeholder={section.placeholder}
                                style={{ minHeight: '100px', borderRadius: '12px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (saveTemplateDraft(patientId, 'psych_eval', psychForm)) {
                                    toast.success('Diagnostic evaluation draft saved on this device');
                                } else {
                                    toast.error("Couldn't save — please try again");
                                }
                            }}
                            style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: '#f59e0b', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' }}
                        >
                            <Save size={16} /> Save Diagnostic Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
