// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  createAuthRequest,
  generateAuthPDF,
  COMMON_DIAGNOSIS_CODES,
  SERVICE_TYPES,
  type PriorAuthRequest,
} from '../lib/prior-auth-service';
import { supabase } from '../utils/supabase/client';

interface PriorAuthFlowProps {
  onBack: () => void;
  onComplete?: () => void;
  childName?: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS = [
  'Service Type',
  'Diagnosis',
  'Provider',
  'Documents',
  'Review',
  'Complete',
];

export default function PriorAuthFlow({ onBack, onComplete, childName: initialChildName }: PriorAuthFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [userId, setUserId] = useState('');
  const [childName, setChildName] = useState(initialChildName || '');

  // Step 1: Service
  const [serviceType, setServiceType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  // Step 2: Diagnosis
  const [selectedCodes, setSelectedCodes] = useState<string[]>(['F84.0']);

  // Step 3: Provider
  const [providerName, setProviderName] = useState('');
  const [providerNPI, setProviderNPI] = useState('');
  const [providerCredentials, setProviderCredentials] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [memberId, setMemberId] = useState('');

  // Step 4: Documents
  const [attachedDocs, setAttachedDocs] = useState<string[]>([]);
  const [vaultDocs, setVaultDocs] = useState<{ name: string; id: string }[]>([]);

  // Step 5: Notes
  const [notes, setNotes] = useState('');

  // Step 6: Complete
  const [savedRequest, setSavedRequest] = useState<PriorAuthRequest | null>(null);

  // Load user info + vault documents
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          if (!childName) {
            const { data: children } = await supabase
              .from('children')
              .select('name')
              .eq('user_id', user.id)
              .limit(1);
            if (children?.[0]?.name) setChildName(children[0].name);
          }

          // Load vault documents
          const { data: docs } = await supabase.storage
            .from('vault-documents')
            .list(user.id, { limit: 20 });
          if (docs) {
            setVaultDocs(docs.map(d => ({ name: d.name, id: d.id || d.name })));
          }
        }
      } catch { /* fallback */ }
    }
    load();
  }, [childName]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!serviceType && !!frequency;
      case 2: return selectedCodes.length > 0;
      case 3: return !!providerName && !!insuranceCompany;
      case 4: return true; // documents optional
      case 5: return true; // review
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep((step + 1) as Step);
    } else if (step === 5) {
      // Save the request (Supabase-first, localStorage fallback)
      const request = await createAuthRequest({
        userId,
        childName: childName || 'Child',
        serviceType,
        frequency,
        duration: duration || '6 months',
        diagnosisCodes: selectedCodes,
        providerName,
        providerNPI: providerNPI || undefined,
        providerCredentials: providerCredentials || undefined,
        insuranceCompany,
        memberId: memberId || undefined,
        attachedDocuments: attachedDocs,
        status: 'ready',
        notes,
      });
      setSavedRequest(request);
      setStep(6);
      toast.success('Prior authorization request created');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      onBack();
    }
  };

  const handleDownloadPDF = () => {
    if (savedRequest) {
      generateAuthPDF(savedRequest);
      toast.success('PDF downloaded');
    }
  };

  const toggleCode = (code: string) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleDoc = (docName: string) => {
    setAttachedDocs(prev =>
      prev.includes(docName) ? prev.filter(d => d !== docName) : [...prev, docName]
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Prior Authorization</h1>
              <p className="text-sm text-muted-foreground">
                {step < 6 ? `Step ${step} of 5 — ${STEP_LABELS[step - 1]}` : 'Complete'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#2A7D99]' : 'bg-[#E8E4DF]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* STEP 1: Service Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">What service do you need authorized?</h2>

            <div>
              <Label>Service Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SERVICE_TYPES.map(svc => (
                  <Button
                    key={svc}
                    variant={serviceType === svc ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-3 text-left justify-start whitespace-normal text-sm leading-tight"
                    onClick={() => setServiceType(svc)}
                  >
                    {svc}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Requested Frequency</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['2x/week', '3x/week', '5x/week', 'Weekly', 'Bi-weekly', 'Monthly'].map(f => (
                  <Button
                    key={f}
                    variant={frequency === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFrequency(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Requested Duration</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['3 months', '6 months', '12 months'].map(d => (
                  <Button
                    key={d}
                    variant={duration === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDuration(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Diagnosis Codes */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select diagnosis codes</h2>
            <p className="text-sm text-muted-foreground">
              These will be included in the authorization request. Select all that apply.
            </p>

            <div className="space-y-2">
              {COMMON_DIAGNOSIS_CODES.map(({ code, label }) => (
                <label
                  key={code}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCodes.includes(code)
                      ? 'border-[#2A7D99] bg-[#EEF4F8]'
                      : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(code)}
                    onChange={() => toggleCode(code)}
                    className="rounded"
                  />
                  <div>
                    <span className="font-mono text-sm font-medium">{code}</span>
                    <span className="text-sm text-[#5A6B7A] ml-2">— {label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Provider + Insurance */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Provider & Insurance Info</h2>

            <div>
              <Label>Provider Name *</Label>
              <Input
                placeholder="e.g., Dr. Sarah Johnson, BCBA"
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
              />
            </div>

            <div>
              <Label>Provider NPI (optional)</Label>
              <Input
                placeholder="10-digit NPI number"
                value={providerNPI}
                onChange={e => setProviderNPI(e.target.value)}
              />
            </div>

            <div>
              <Label>Credentials</Label>
              <Input
                placeholder="e.g., BCBA, LBA, SLP-CCC"
                value={providerCredentials}
                onChange={e => setProviderCredentials(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <Label>Insurance Company *</Label>
              <select
                value={insuranceCompany}
                onChange={e => setInsuranceCompany(e.target.value)}
                aria-label="Insurance Company"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select insurer...</option>
                <option value="Aetna">Aetna</option>
                <option value="Blue Cross Blue Shield">Blue Cross Blue Shield</option>
                <option value="Cigna">Cigna</option>
                <option value="UnitedHealthcare">UnitedHealthcare</option>
                <option value="Humana">Humana</option>
                <option value="Kaiser Permanente">Kaiser Permanente</option>
                <option value="Medicaid">Medicaid</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Label>Member/Policy ID (optional)</Label>
              <Input
                placeholder="e.g., ABC123456789"
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Attach Documents */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Attach Supporting Documents</h2>
            <p className="text-sm text-muted-foreground">
              Select documents from your vault to include with the request. These strengthen your authorization.
            </p>

            {vaultDocs.length > 0 ? (
              <div className="space-y-2">
                {vaultDocs.map(doc => (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      attachedDocs.includes(doc.name)
                        ? 'border-[#2A7D99] bg-[#EEF4F8]'
                        : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={attachedDocs.includes(doc.name)}
                      onChange={() => toggleDoc(doc.name)}
                      className="rounded"
                    />
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{doc.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <FileText className="w-8 h-8 text-[#8A9BA8] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No documents in your vault yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can still proceed — documents can be added later
                </p>
              </Card>
            )}

            <div>
              <Label>Additional Notes</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                style={{ minHeight: 80 }}
                placeholder="Any additional context for the authorization request..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Your Request</h2>

            <Card className="p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">{childName || 'Child'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{serviceType}</p>
                <p className="text-sm text-[#5A6B7A]">{frequency} for {duration || '6 months'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnosis Codes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCodes.map(code => (
                    <Badge key={code} variant="outline" className="font-mono">{code}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provider</p>
                <p className="font-medium">{providerName}</p>
                {providerCredentials && <p className="text-sm text-[#5A6B7A]">{providerCredentials}</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Insurance</p>
                <p className="font-medium">{insuranceCompany}</p>
                {memberId && <p className="text-sm text-[#5A6B7A]">Member ID: {memberId}</p>}
              </div>
              {attachedDocs.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Attached Documents ({attachedDocs.length})</p>
                  {attachedDocs.map(d => (
                    <p key={d} className="text-sm text-[#5A6B7A]">• {d}</p>
                  ))}
                </div>
              )}
              {notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm text-[#5A6B7A]">{notes}</p>
                </div>
              )}
            </Card>

            <div className="p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
              <p className="text-sm text-[#4A6478]">
                <strong>Next:</strong> We'll generate a PDF you can submit to {insuranceCompany}. You can also fax it directly from the next screen.
              </p>
            </div>
          </div>
        )}

        {/* STEP 6: Complete */}
        {step === 6 && (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Authorization Request Ready</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your prior authorization for {serviceType} has been saved. Download the PDF to submit to {insuranceCompany}.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button size="lg" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={onComplete || onBack}>
                Back to Benefits
              </Button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-sm mx-auto mt-4">
              <p className="text-sm text-amber-800">
                <strong>Tip:</strong> Have your provider sign the form before submitting. Keep a copy for your records and note the submission date.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        {step < 6 && (
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {step === 5 ? 'Create Request' : 'Next'}
              {step < 5 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
