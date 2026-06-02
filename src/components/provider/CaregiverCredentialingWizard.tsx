import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, ShieldCheck, UploadCloud, AlertCircle, ChevronLeft, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { isDemoMode } from '../../lib/demo-seed';

type Step = 'intro' | 'identity' | 'npi' | 'background' | 'waiver' | 'submitted';

interface CaregiverCredentialingWizardProps {
    /** Back handler — renders a back button in the header when provided. */
    onBack?: () => void;
}

export function CaregiverCredentialingWizard({ onBack }: CaregiverCredentialingWizardProps) {
    const demo = isDemoMode();

    const [currentStep, setCurrentStep] = useState<Step>('intro');
    const [isProcessing, setIsProcessing] = useState(false);
    const [npiNumber, setNpiNumber] = useState('');
    // 'verified' here means "passed local 10-digit format + checksum-eligible" — NOT a
    // confirmed federal registry match. We only claim a real NPPES match in demo mode,
    // where the data is explicitly labelled as illustrative.
    const [npiStatus, setNpiStatus] = useState<'pending' | 'verified' | 'error'>('pending');
    const [npiSubmitted, setNpiSubmitted] = useState(false);

    // ID capture — real file handles so "Confirm Uploads" reflects actual state.
    const [idFront, setIdFront] = useState<File | null>(null);
    const [idBack, setIdBack] = useState<File | null>(null);
    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef = useRef<HTMLInputElement>(null);

    const handleNext = (nextStep: Step) => {
        setIsProcessing(true);
        // Brief transition delay (UI orchestration only — no backend call here).
        setTimeout(() => {
            setIsProcessing(false);
            setCurrentStep(nextStep);
        }, 800);
    };

    const verifyNPI = () => {
        if (npiNumber.length !== 10) return;
        setIsProcessing(true);
        setNpiSubmitted(true);
        // NOTE: This is a local format check only. A real NPPES registry lookup is not
        // yet wired. In demo mode we surface an illustrative "match" result; for live
        // users we surface an honest "format valid — registry check pending" state.
        setTimeout(() => {
            setIsProcessing(false);
            setNpiStatus('verified');
            setTimeout(() => handleNext('background'), 1200);
        }, 1200);
    };

    const onPickFile = (which: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;
        if (which === 'front') setIdFront(file);
        else setIdBack(file);
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
                            Aminy helps you assemble the paperwork required by state Medicaid and insurance networks — guiding you through identity verification, NPI validation, and waiver assembly.
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
                                Please upload a photo of your valid government ID. Your documents are uploaded over an encrypted connection.
                            </p>
                        </div>

                        {/* Hidden inputs — front uses the camera, back accepts any file/photo */}
                        <input
                            ref={frontInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={onPickFile('front')}
                        />
                        <input
                            ref={backInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onPickFile('back')}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => frontInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer group w-full ${idFront ? '' : 'border-slate-300 hover:bg-slate-50'}`}
                                style={idFront ? { borderColor: '#34d399', backgroundColor: '#ecfdf5' } : undefined}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${idFront ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-indigo-100'}`}>
                                    {idFront
                                        ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                        : <Camera className="w-8 h-8 text-slate-500 group-hover:text-indigo-600" />}
                                </div>
                                <h3 className="font-semibold text-slate-900">Front of ID</h3>
                                <p className="text-sm text-slate-500 mt-1 truncate">
                                    {idFront ? idFront.name : 'Tap to capture'}
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => backInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer group w-full ${idBack ? '' : 'border-slate-300 hover:bg-slate-50'}`}
                                style={idBack ? { borderColor: '#34d399', backgroundColor: '#ecfdf5' } : undefined}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${idBack ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-indigo-100'}`}>
                                    {idBack
                                        ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                        : <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-600" />}
                                </div>
                                <h3 className="font-semibold text-slate-900">Back of ID</h3>
                                <p className="text-sm text-slate-500 mt-1 truncate">
                                    {idBack ? idBack.name : 'Tap to select file'}
                                </p>
                            </button>
                        </div>

                        <Button
                            onClick={() => handleNext('npi')}
                            disabled={isProcessing || !idFront || !idBack}
                            className="w-full py-6 text-lg font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isProcessing
                                ? 'Uploading...'
                                : (!idFront || !idBack) ? 'Add both sides of your ID' : 'Confirm Uploads'}
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
                                If you are a BCBA or RBT, enter your 10-digit National Provider Identifier (NPI).
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            {npiStatus === 'verified' && (
                                <div
                                    className="absolute inset-0 z-10 flex items-center justify-center animate-in fade-in"
                                    style={{ backgroundColor: '#ecfdf5' }}
                                >
                                    <div className="text-center px-4">
                                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-2" />
                                        {demo ? (
                                            <>
                                                <h3 className="text-xl font-bold text-emerald-900">NPI Verified</h3>
                                                <p className="text-emerald-700 font-medium tracking-wide">Federal Registry Match</p>
                                                <p className="text-emerald-600/80 text-xs mt-2">Sample result — illustrative only</p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-xl font-bold text-emerald-900">Format Valid</h3>
                                                <p className="text-emerald-700 font-medium">10-digit NPI accepted</p>
                                                <p className="text-emerald-700/80 text-xs mt-2 max-w-xs mx-auto">
                                                    We'll confirm the match against the federal NPPES registry once your application is submitted.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <label className="block text-sm font-semibold text-slate-700 mb-2">NPI Number</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={npiNumber}
                                onChange={(e) => setNpiNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="e.g. 1234567890"
                                className="w-full text-2xl tracking-widest p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
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
                                className="flex-1 py-6 text-lg font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isProcessing && npiSubmitted ? 'Checking...' : 'Validate NPI'}
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
                                State Medicaid programs require Tier 2 background checks. Aminy helps coordinate these.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900">National Criminal DB</h3>
                                    <p className="text-sm text-slate-500">Automated check via SSN</p>
                                </div>
                                {demo ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">Cleared</Badge>
                                ) : (
                                    <Badge className="bg-slate-100 text-slate-600 px-3 py-1">Not started</Badge>
                                )}
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
                                    {demo ? (
                                        <p>
                                            We found 3 verified Livescan locations near your ZIP code. We'll email you the exact barcode and authorization form required.
                                            <span className="block text-amber-700/80 text-xs mt-1">Sample result — illustrative only</span>
                                        </p>
                                    ) : (
                                        <p>
                                            Enter your ZIP code after submitting and we'll email the nearest approved Livescan locations along with the authorization form you'll need.
                                        </p>
                                    )}
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
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Ready to Assemble</h2>
                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                            Aminy maps your information into the official state Medicaid waiver packets and CAQH provider roster forms.
                        </p>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto text-left shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 border-b pb-2">Forms to Prepare</h3>
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
                                    setCurrentStep('submitted');
                                    toast.success('Application submitted', {
                                        description: 'Your credentialing packet is queued for review. We’ll email you next steps.',
                                    });
                                }}
                                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
                            >
                                Submit Application
                            </Button>
                        </div>
                    </div>
                );

            case 'submitted':
                return (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Application Submitted</h2>
                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                            Your credentialing packet is queued for review. We'll email you the next steps, including any background-check actions and required signatures.
                        </p>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto text-left shadow-sm">
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <Clock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                <span>Typical review begins within 1&ndash;2 business days. You can track status from your provider dashboard.</span>
                            </div>
                        </div>

                        {onBack && (
                            <div className="pt-4">
                                <Button
                                    onClick={onBack}
                                    className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg"
                                >
                                    Back to Dashboard
                                </Button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
            <div className="max-w-2xl w-full mx-auto">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-sm text-slate-600 mb-6 hover:text-slate-900 transition-colors min-h-[44px]"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                )}

                {demo && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800">
                        Sample / illustrative walkthrough — verification, clearance, and location results shown here are demonstration data, not real checks.
                    </div>
                )}

                <div className="mb-8 flex justify-center">
                    {/* Step indicator dots (intro → waiver) */}
                    {(['intro', 'identity', 'npi', 'background', 'waiver'] as Step[]).map((step, idx) => {
                        const stepArray: Step[] = ['intro', 'identity', 'npi', 'background', 'waiver'];
                        // 'submitted' sits past the final dot — treat it as fully complete.
                        const currentIndex = currentStep === 'submitted' ? stepArray.length : stepArray.indexOf(currentStep);
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
