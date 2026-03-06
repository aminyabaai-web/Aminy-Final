import React, { useState } from 'react';
import { Camera, CheckCircle2, FileText, ShieldCheck, UploadCloud, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { supabase } from '../../utils/supabase/client';

type Step = 'intro' | 'identity' | 'npi' | 'background' | 'waiver';

export function CaregiverCredentialingWizard() {
    const [currentStep, setCurrentStep] = useState<Step>('intro');
    const [isProcessing, setIsProcessing] = useState(false);
    const [npiNumber, setNpiNumber] = useState('');
    const [npiStatus, setNpiStatus] = useState<'pending' | 'verified' | 'error'>('pending');

    const handleNext = (nextStep: Step) => {
        setIsProcessing(true);
        // Simulate real-world API / Orchestration delays
        setTimeout(() => {
            setIsProcessing(false);
            setCurrentStep(nextStep);
        }, 1500);
    };

    const verifyNPI = () => {
        if (npiNumber.length !== 10) return;
        setIsProcessing(true);
        // Simulate pinging Federal NPPES registry
        setTimeout(() => {
            setIsProcessing(false);
            setNpiStatus('verified');
            setTimeout(() => handleNext('background'), 1000);
        }, 2000);
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'intro':
                return (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Fast-Track Credentialing</h2>
                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                            Aminy automates the painful paperwork required by state Medicaid and insurance networks. We'll guide you through identity verification, NPI validation, and automatic waiver assembly.
                        </p>
                        <div className="pt-8">
                            <Button
                                onClick={() => handleNext('identity')}
                                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105"
                            >
                                Let's Get Started
                            </Button>
                        </div>
                    </div>
                );

            case 'identity':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-indigo-100 text-indigo-700">Step 1 of 4</Badge>
                                <h2 className="text-2xl font-bold text-slate-900">Identity Verification</h2>
                            </div>
                            <p className="text-slate-500 text-lg">
                                Please upload a photo of your valid Government ID. We use bank-grade security to verify your identity.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-100 transition-colors">
                                    <Camera className="w-8 h-8 text-slate-500 group-hover:text-indigo-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900">Front of ID</h3>
                                <p className="text-sm text-slate-500 mt-1">Tap to capture</p>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-100 transition-colors">
                                    <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900">Back of ID</h3>
                                <p className="text-sm text-slate-500 mt-1">Tap to select file</p>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleNext('npi')}
                            disabled={isProcessing}
                            className="w-full py-6 text-lg font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                        >
                            {isProcessing ? 'Verifying Identity...' : 'Confirm Uploads'}
                        </Button>
                    </div>
                );

            case 'npi':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-indigo-100 text-indigo-700">Step 2 of 4</Badge>
                                <h2 className="text-2xl font-bold text-slate-900">Clinical Credentials</h2>
                            </div>
                            <p className="text-slate-500 text-lg">
                                If you are a BCBA or RBT, enter your 10-digit National Provider Identifier (NPI). We will instantly validate it against the federal registry.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            {npiStatus === 'verified' && (
                                <div className="absolute inset-0 bg-emerald-50/90 z-10 flex items-center justify-center animate-in fade-in">
                                    <div className="text-center">
                                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-emerald-900">NPI Verified</h3>
                                        <p className="text-emerald-700 font-medium tracking-wide">Federal Registry Match</p>
                                    </div>
                                </div>
                            )}
                            <label className="block text-sm font-semibold text-slate-700 mb-2">NPI Number</label>
                            <input
                                type="text"
                                value={npiNumber}
                                onChange={(e) => setNpiNumber(e.target.value)}
                                placeholder="e.g. 1234567890"
                                className="w-full text-2xl tracking-widest p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => handleNext('background')}
                                variant="outline"
                                className="flex-1 py-6 text-lg font-semibold rounded-xl border-slate-300 text-slate-700"
                            >
                                Skip (Parent Caregiver)
                            </Button>
                            <Button
                                onClick={verifyNPI}
                                disabled={isProcessing || npiNumber.length !== 10}
                                className="flex-1 py-6 text-lg font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                {isProcessing ? 'Checking Registry...' : 'Validate NPI'}
                            </Button>
                        </div>
                    </div>
                );

            case 'background':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-indigo-100 text-indigo-700">Step 3 of 4</Badge>
                                <h2 className="text-2xl font-bold text-slate-900">Background Clearances</h2>
                            </div>
                            <p className="text-slate-500 text-lg">
                                State Medicaid programs require Tier 2 background checks. Aminy orchestrates this automatically.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900">National Criminal DB</h3>
                                    <p className="text-sm text-slate-500">Automated check via SSN</p>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">Cleared</Badge>
                            </div>

                            <div className="bg-white border-2 border-indigo-600 ring-2 ring-indigo-600/20 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900">State Fingerprinting (Livescan)</h3>
                                        <p className="text-sm text-slate-500">Requires physical visit</p>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 px-3 py-1">Action Required</Badge>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-4 flex gap-3 text-sm text-amber-900">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>
                                        We found 3 verified Livescan locations near your ZIP code. We will email you the exact barcode and authorization form required.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleNext('waiver')}
                            disabled={isProcessing}
                            className="w-full py-6 text-lg font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                        >
                            Continue to Final Step
                        </Button>
                    </div>
                );

            case 'waiver':
                return (
                    <div className="text-center space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Assembly Complete.</h2>
                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                            Aminy's AI has securely mapped your data into the official state Medicaid waiver packets and CAQH provider roster forms.
                        </p>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto text-left shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 border-b pb-2">Ready for Submission</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> CAQH ProView Initial Roster
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> DCI/Acumen Timesheet Enrollment
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Medicaid 837P Billing Authority
                                </li>
                            </ul>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={() => {
                                    alert("Executing simulated secure API transmission to state agencies / Acumen FMS.");
                                    // Reset for demo loop
                                    setCurrentStep('intro');
                                }}
                                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
                            >
                                1-Click Submit to State
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
            <div className="max-w-2xl w-full mx-auto">
                <div className="mb-8 flex justify-center">
                    {/* Simple step indicator dots */}
                    {(['intro', 'identity', 'npi', 'background', 'waiver'] as Step[]).map((step, idx) => {
                        const stepArray: Step[] = ['intro', 'identity', 'npi', 'background', 'waiver'];
                        const currentIndex = stepArray.indexOf(currentStep);
                        const isActive = currentIndex === idx;
                        const isPast = currentIndex > idx;
                        return (
                            <div key={step} className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-colors ${isActive ? 'bg-indigo-600 scale-125' : isPast ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                                {idx < 4 && <div className={`w-8 h-1 ${isPast ? 'bg-indigo-300' : 'bg-slate-200'} mx-1 rounded`} />}
                            </div>
                        );
                    })}
                </div>

                {renderCurrentStep()}
            </div>
        </div>
    );
}
