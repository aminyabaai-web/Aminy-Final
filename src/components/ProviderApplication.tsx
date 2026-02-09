/**
 * ProviderApplication.tsx
 *
 * Provider application form with AI-powered credential verification.
 * Allows clinicians to apply to join the Aminy provider marketplace.
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Logo } from './Logo';
import {
  User,
  Mail,
  Phone,
  Award,
  FileText,
  MapPin,
  Calendar,
  Briefcase,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Brain,
  Heart,
  Star,
  Building2,
  X,
  Check,
} from 'lucide-react';
import {
  submitProviderApplication,
  verifyProviderCredentials,
  getMyProviderApplication,
  type ProviderApplication as ProviderAppType,
  type AIVerificationResult,
} from '../lib/auth-roles';

interface ProviderApplicationProps {
  onBack: () => void;
  onSuccess?: () => void;
  userEmail?: string;
  userName?: string;
}

type ProviderType = 'bcba' | 'bcaba' | 'rbt' | 'psychologist' | 'therapist' | 'slp' | 'ot';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  provider_type: ProviderType | '';
  license_number: string;
  license_state: string;
  license_expiry: string;
  npi_number: string;
  specialties: string[];
  years_experience: number;
  bio: string;
  hourly_rate: number;
  accepts_terms: boolean;
  practice_name?: string;
  practice_tax_id?: string;
}

const PROVIDER_TYPES: { value: ProviderType; label: string; description: string }[] = [
  { value: 'bcba', label: 'BCBA', description: 'Board Certified Behavior Analyst' },
  { value: 'bcaba', label: 'BCaBA', description: 'Board Certified Assistant Behavior Analyst' },
  { value: 'rbt', label: 'RBT', description: 'Registered Behavior Technician' },
  { value: 'psychologist', label: 'Psychologist', description: 'Licensed Clinical Psychologist' },
  { value: 'therapist', label: 'Therapist', description: 'LMFT, LCSW, or similar' },
  { value: 'slp', label: 'SLP', description: 'Speech-Language Pathologist' },
  { value: 'ot', label: 'OT', description: 'Occupational Therapist' },
];

const SPECIALTIES = [
  'Autism Spectrum Disorder',
  'ADHD',
  'Anxiety',
  'Depression',
  'Behavioral Issues',
  'Speech & Language',
  'Sensory Processing',
  'Social Skills',
  'Parent Training',
  'Early Intervention',
  'School Consultation',
  'Feeding Therapy',
  'Trauma & PTSD',
  'OCD',
  'Teen Mental Health',
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export function ProviderApplication({ onBack, onSuccess, userEmail, userName }: ProviderApplicationProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AIVerificationResult | null>(null);
  const [existingApplication, setExistingApplication] = useState<ProviderAppType | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    full_name: userName || '',
    email: userEmail || '',
    phone: '',
    provider_type: '',
    license_number: '',
    license_state: '',
    license_expiry: '',
    npi_number: '',
    specialties: [],
    years_experience: 0,
    bio: '',
    hourly_rate: 99,
    accepts_terms: false,
    practice_name: '',
    practice_tax_id: '',
  });

  useEffect(() => {
    // Check if user already has an application
    getMyProviderApplication().then(app => {
      if (app) {
        setExistingApplication(app);
      }
    });
  }, []);

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.full_name || !formData.email || !formData.phone) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!formData.email.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      case 2:
        if (!formData.provider_type || !formData.license_number || !formData.license_state) {
          setError('Please fill in all required credential fields');
          return false;
        }
        if (!formData.license_expiry) {
          setError('Please enter your license expiration date');
          return false;
        }
        return true;
      case 3:
        if (formData.specialties.length === 0) {
          setError('Please select at least one specialty');
          return false;
        }
        if (formData.years_experience < 0) {
          setError('Years of experience must be 0 or more');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleVerifyCredentials = async () => {
    if (!validateStep(2)) return;

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyProviderCredentials({
        full_name: formData.full_name,
        provider_type: formData.provider_type as ProviderType,
        license_number: formData.license_number,
        license_state: formData.license_state,
        license_expiry: formData.license_expiry,
        npi_number: formData.npi_number,
      });

      setVerificationResult(result);

      if (result.license_valid) {
        // Auto-advance to next step on successful verification
        setTimeout(() => setStep(3), 1500);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitProviderApplication({
        user_id: '', // Will be set by the function
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        provider_type: formData.provider_type as ProviderType,
        license_number: formData.license_number,
        license_state: formData.license_state,
        license_expiry: formData.license_expiry,
        npi_number: formData.npi_number,
        specialties: formData.specialties,
        years_experience: formData.years_experience,
        bio: formData.bio,
      });

      if (result.success) {
        setSubmitSuccess(true);
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800">
        <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="sm" showText={false} />
              <span className="text-lg font-semibold text-neutral-900 dark:text-white">Provider Application</span>
            </div>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            {existingApplication.status === 'approved' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Application Approved!
                </h2>
                <p className="text-neutral-600 dark:text-slate-400 mb-6">
                  Welcome to Aminy! Your provider account is active and you're now listed in our marketplace.
                </p>
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={onBack}>
                  Go to Provider Dashboard
                </Button>
              </>
            ) : existingApplication.status === 'rejected' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Application Not Approved
                </h2>
                <p className="text-neutral-600 dark:text-slate-400 mb-4">
                  {existingApplication.rejection_reason || 'Your application could not be approved at this time.'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-slate-500 mb-6">
                  If you believe this is an error, please contact support@aminy.ai
                </p>
                <Button variant="outline" onClick={onBack}>
                  Back to Home
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Application {existingApplication.status === 'under_review' ? 'Under Review' : 'Pending'}
                </h2>
                <p className="text-neutral-600 dark:text-slate-400 mb-6">
                  We're reviewing your credentials. This typically takes 1-2 business days.
                  You'll receive an email once your application has been processed.
                </p>

                {existingApplication.ai_verification_result && (
                  <div className="bg-neutral-50 dark:bg-slate-800 rounded-lg p-4 text-left mb-6">
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      AI Verification Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600 dark:text-slate-400">License Status</span>
                        <Badge className={
                          existingApplication.ai_verification_result.license_status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }>
                          {existingApplication.ai_verification_result.license_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600 dark:text-slate-400">Confidence Score</span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {Math.round(existingApplication.ai_verification_result.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={onBack}>
                  Back to Home
                </Button>
              </>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // Show success screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800">
        <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
            <Logo size="sm" showText={false} />
            <span className="text-lg font-semibold text-neutral-900 dark:text-white ml-3">Provider Application</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Application Submitted!
            </h2>
            <p className="text-neutral-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Thank you for applying to join Aminy's provider network. Our AI has begun verifying your credentials,
              and you'll receive an email update within 1-2 business days.
            </p>

            {verificationResult && verificationResult.license_valid && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">High confidence verification</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  Your credentials passed initial AI verification. Approval is likely within 24 hours.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onBack}>
                Back to Home
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">Provider Application</span>
          </div>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s
                    ? 'bg-teal-600 text-white'
                    : 'bg-neutral-200 dark:bg-slate-700 text-neutral-500 dark:text-slate-400'
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-1 rounded transition-colors ${
                    step > s ? 'bg-teal-600' : 'bg-neutral-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Personal Information</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">Tell us about yourself</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <Input
                      value={formData.full_name}
                      onChange={(e) => updateField('full_name', e.target.value)}
                      placeholder="Dr. Jane Smith"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">As it appears on your license</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="jane@practice.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => { if (validateStep(1)) setStep(2); }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Professional Credentials</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">
                  We'll verify your credentials using AI-powered verification
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Provider Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROVIDER_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateField('provider_type', type.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          formData.provider_type === type.value
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-neutral-200 dark:border-slate-700 hover:border-neutral-300'
                        }`}
                      >
                        <p className="font-medium text-neutral-900 dark:text-white">{type.label}</p>
                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input
                        value={formData.license_number}
                        onChange={(e) => updateField('license_number', e.target.value)}
                        placeholder="ABC123456"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.license_state}
                      onChange={(e) => updateField('license_state', e.target.value)}
                      className="w-full h-10 rounded-md border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                      License Expiry <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input
                        type="date"
                        value={formData.license_expiry}
                        onChange={(e) => updateField('license_expiry', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                      NPI Number <span className="text-neutral-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input
                        value={formData.npi_number}
                        onChange={(e) => updateField('npi_number', e.target.value)}
                        placeholder="1234567890"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`p-4 rounded-lg border ${
                    verificationResult.license_valid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        verificationResult.license_valid
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-amber-100 dark:bg-amber-900/50'
                      }`}>
                        {verificationResult.license_valid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          verificationResult.license_valid
                            ? 'text-green-800 dark:text-green-300'
                            : 'text-amber-800 dark:text-amber-300'
                        }`}>
                          {verificationResult.license_valid
                            ? 'Credentials Verified'
                            : 'Additional Review Needed'}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          verificationResult.license_valid
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          Confidence: {Math.round(verificationResult.confidence_score * 100)}%
                        </p>
                        {verificationResult.flags.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {verificationResult.flags.map((flag, i) => (
                              <li key={i} className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-amber-500" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {verificationResult?.license_valid ? (
                  <Button
                    onClick={() => setStep(3)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleVerifyCredentials}
                    disabled={isVerifying}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Verify Credentials
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Specialties & Experience */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Specialties & Experience</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">
                  Help families find you based on their needs
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Areas of Specialty <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-3">Select all that apply</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <button
                        key={specialty}
                        onClick={() => toggleSpecialty(specialty)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.specialties.includes(specialty)
                            ? 'bg-teal-600 text-white'
                            : 'bg-neutral-100 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Years of Experience
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <Input
                      type="number"
                      min="0"
                      value={formData.years_experience || ''}
                      onChange={(e) => updateField('years_experience', parseInt(e.target.value) || 0)}
                      placeholder="5"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Professional Bio
                  </label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell families about your approach, experience, and what makes you passionate about working with children..."
                    rows={4}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    This will be displayed on your marketplace profile
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => { if (validateStep(3)) setStep(4); }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Review Application
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Review Your Application</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">
                  Please confirm all information is correct
                </p>
              </div>

              <div className="space-y-4">
                {/* Personal Info Summary */}
                <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">Name</p>
                      <p className="text-neutral-900 dark:text-white">{formData.full_name}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">Email</p>
                      <p className="text-neutral-900 dark:text-white">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">Phone</p>
                      <p className="text-neutral-900 dark:text-white">{formData.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Credentials Summary */}
                <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-600" />
                    Credentials
                    {verificationResult?.license_valid && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">Provider Type</p>
                      <p className="text-neutral-900 dark:text-white">
                        {PROVIDER_TYPES.find(t => t.value === formData.provider_type)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">License</p>
                      <p className="text-neutral-900 dark:text-white">
                        {formData.license_number} ({formData.license_state})
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-slate-400">Expires</p>
                      <p className="text-neutral-900 dark:text-white">{formData.license_expiry}</p>
                    </div>
                    {formData.npi_number && (
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">NPI</p>
                        <p className="text-neutral-900 dark:text-white">{formData.npi_number}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialties Summary */}
                <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-teal-600" />
                    Specialties
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((s) => (
                      <Badge key={s} className="bg-teal-100 text-teal-700">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-slate-400 mt-3">
                    {formData.years_experience} years of experience
                  </p>
                </div>

                {/* Rates & Payment Setup */}
                <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-teal-600" />
                    Rates & Payment
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                        Session Rate (per 50-minute session)
                      </label>
                      <div className="relative w-40">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <Input
                          type="number"
                          min="50"
                          max="500"
                          value={formData.hourly_rate}
                          onChange={(e) => updateField('hourly_rate', parseInt(e.target.value) || 99)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Aminy takes 15% platform fee. You'll earn ${Math.round(formData.hourly_rate * 0.85)} per session.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>Payment Setup:</strong> After approval, you'll set up Stripe Connect to receive payments directly to your bank account. Payouts are processed weekly.
                      </p>
                    </div>

                    {/* Optional: Practice/Group Info */}
                    <div className="border-t border-neutral-200 dark:border-slate-700 pt-4 mt-4">
                      <p className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-3">
                        Part of a practice or group? (Optional)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={formData.practice_name || ''}
                          onChange={(e) => updateField('practice_name', e.target.value)}
                          placeholder="Practice name"
                        />
                        <Input
                          value={formData.practice_tax_id || ''}
                          onChange={(e) => updateField('practice_tax_id', e.target.value)}
                          placeholder="Tax ID (optional)"
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Groups can set up centralized billing after individual providers are approved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.accepts_terms}
                      onChange={(e) => updateField('accepts_terms', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-teal-800 dark:text-teal-300">
                      I confirm that all information provided is accurate and I consent to Aminy verifying my credentials.
                      I agree to the{' '}
                      <a href="#" className="underline font-medium">Provider Terms of Service</a>,{' '}
                      <a href="#" className="underline font-medium">Privacy Policy</a>, and{' '}
                      <a href="#" className="underline font-medium">Platform Fee Agreement</a> (15% per session).
                    </span>
                  </label>
                </div>

                {/* Key Terms Summary */}
                <div className="p-4 bg-neutral-100 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-2">Key Terms</h4>
                  <ul className="text-sm text-neutral-600 dark:text-slate-400 space-y-1">
                    <li>• 15% platform fee per completed session</li>
                    <li>• Weekly payouts via Stripe Connect</li>
                    <li>• You set your own availability and rates</li>
                    <li>• Cancel anytime with 30 days notice</li>
                    <li>• HIPAA-compliant telehealth platform included</li>
                    <li>• Access to AI patient summaries and tools</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.accepts_terms}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Benefits Banner */}
        {step === 1 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: 'AI-Powered Tools', desc: 'Access patient insights and AI summaries' },
              { icon: Star, title: 'Build Your Practice', desc: 'Grow your client base on our marketplace' },
              { icon: Shield, title: 'HIPAA Compliant', desc: 'Secure, compliant platform for telehealth' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-4 text-center">
                <Icon className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <h4 className="font-medium text-neutral-900 dark:text-white">{title}</h4>
                <p className="text-sm text-neutral-500 dark:text-slate-400">{desc}</p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ProviderApplication;
