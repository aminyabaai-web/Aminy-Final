// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Insurance Card Scanner — OCR-Powered Insurance Card Capture
 *
 * Allows parents to photograph their insurance card and automatically
 * extract key fields (member ID, group number, payer name, etc.)
 * via a Supabase edge function that calls an OCR service.
 *
 * Architecture:
 * - Camera capture uses native <input type="file" capture> for maximum
 *   mobile compatibility (iOS Safari + Android Chrome)
 * - Image is base64-encoded and sent to `supabase.co/functions/v1/ocr-insurance-card`
 * - Edge function handles the actual OCR provider (Google Vision, AWS Textract, etc.)
 * - Extracted fields are returned and displayed for user confirmation
 * - Confirmed data can be saved to the patient's insurance profile
 *
 * Production wiring checklist:
 * 1. Deploy edge function `ocr-insurance-card` to Supabase
 * 2. Add OCR provider API key to Supabase secrets
 * 3. Wire onSave callback to update patient insurance record
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  X,
  Upload,
  Eye,
  Edit3,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { secureFetch } from '../lib/security/secure-fetch';

// ============================================================================
// Types
// ============================================================================

/** Fields extracted from an insurance card via OCR */
export interface InsuranceCardData {
  payerName: string;
  planName: string;
  memberId: string;
  groupNumber: string;
  subscriberName: string;
  effectiveDate: string;
  copay: string;
  rxBin: string;
  rxPcn: string;
  rxGroup: string;
  providerPhone: string;
  claimsAddress: string;
  cardSide: 'front' | 'back';
  confidence: number; // 0-1 overall OCR confidence score
  rawText: string;    // Full extracted text for debugging
}

export interface InsuranceCardScannerProps {
  /** Called when user confirms extracted data and taps Save */
  onSave?: (front: Partial<InsuranceCardData>, back: Partial<InsuranceCardData> | null) => void;
  /** Called when user taps the back/close button */
  onClose?: () => void;
  /** Pre-populated patient name for the subscriber field */
  patientName?: string;
}

type ScanStep = 'capture-front' | 'review-front' | 'capture-back' | 'review-back' | 'confirm';

// ============================================================================
// Edge Function URL
// ============================================================================

const OCR_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/ocr-insurance-card`;

// ============================================================================
// Mock OCR (development only)
// ============================================================================

function getMockOCRResult(side: 'front' | 'back'): InsuranceCardData {
  if (side === 'front') {
    return {
      payerName: 'Blue Cross Blue Shield of Arizona',
      planName: 'PPO Select',
      memberId: 'XYZ123456789',
      groupNumber: 'GRP-98765',
      subscriberName: 'Jane Doe',
      effectiveDate: '01/01/2026',
      copay: '$25 PCP / $50 Specialist',
      rxBin: '',
      rxPcn: '',
      rxGroup: '',
      providerPhone: '',
      claimsAddress: '',
      cardSide: 'front',
      confidence: 0.92,
      rawText: '[Mock] BCBS Arizona PPO Select\nMember: XYZ123456789\nGroup: GRP-98765',
    };
  }
  return {
    payerName: '',
    planName: '',
    memberId: '',
    groupNumber: '',
    subscriberName: '',
    effectiveDate: '',
    copay: '',
    rxBin: '610014',
    rxPcn: 'OHBC',
    rxGroup: 'RX9876',
    providerPhone: '1-800-555-0199',
    claimsAddress: 'P.O. Box 29084, Phoenix, AZ 85038',
    cardSide: 'back',
    confidence: 0.88,
    rawText: '[Mock] Rx BIN: 610014 PCN: OHBC\nClaims: P.O. Box 29084',
  };
}

// ============================================================================
// OCR Service Call
// ============================================================================

async function extractInsuranceCardFields(
  imageBase64: string,
  side: 'front' | 'back'
): Promise<InsuranceCardData> {
  // In development without a deployed edge function, return mock data
  if (import.meta.env.DEV) {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return getMockOCRResult(side);
  }

  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

  const { data, error, ok } = await secureFetch<InsuranceCardData>(OCR_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      image: imageBase64,
      side,
    }),
    timeout: 30000,
    retries: 1,
  });

  if (!ok || !data) {
    throw new Error(error || 'OCR processing failed. Please try again or enter details manually.');
  }

  return data;
}

// ============================================================================
// Helper: convert File to base64
// ============================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Component
// ============================================================================

export default function InsuranceCardScanner({
  onSave,
  onClose,
  patientName,
}: InsuranceCardScannerProps) {
  // Step tracking
  const [step, setStep] = useState<ScanStep>('capture-front');

  // Image state
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  // OCR results
  const [frontData, setFrontData] = useState<Partial<InsuranceCardData>>({});
  const [backData, setBackData] = useState<Partial<InsuranceCardData>>({});

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------
  // Image capture
  // ------------------------------------------

  const handleCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setIsProcessing(true);

      try {
        const base64 = await fileToBase64(file);
        const imageUrl = URL.createObjectURL(file);
        const side: 'front' | 'back' =
          step === 'capture-front' ? 'front' : 'back';

        if (side === 'front') {
          setFrontImage(imageUrl);
        } else {
          setBackImage(imageUrl);
        }

        // Run OCR
        const result = await extractInsuranceCardFields(base64, side);

        if (side === 'front') {
          setFrontData(result);
          setStep('review-front');
        } else {
          setBackData(result);
          setStep('review-back');
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to process image. Please try again.'
        );
      } finally {
        setIsProcessing(false);
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [step]
  );

  const triggerCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ------------------------------------------
  // Field editing
  // ------------------------------------------

  const updateField = useCallback(
    (side: 'front' | 'back', field: string, value: string) => {
      if (side === 'front') {
        setFrontData((prev) => ({ ...prev, [field]: value }));
      } else {
        setBackData((prev) => ({ ...prev, [field]: value }));
      }
    },
    []
  );

  // ------------------------------------------
  // Save
  // ------------------------------------------

  const handleSave = useCallback(() => {
    onSave?.(frontData, Object.keys(backData).length > 0 ? backData : null);
  }, [frontData, backData, onSave]);

  // ------------------------------------------
  // Render helpers
  // ------------------------------------------

  const renderCaptureScreen = (side: 'front' | 'back') => (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#EEF4F8] flex items-center justify-center">
        <CreditCard className="w-10 h-10 text-blue-600" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-[#1B2733]">
          Scan {side === 'front' ? 'Front' : 'Back'} of Card
        </h3>
        <p className="text-sm text-[#5A6B7A] max-w-xs">
          {side === 'front'
            ? 'Position the front of your insurance card within the frame. We\'ll extract member ID, group number, and plan details.'
            : 'Now scan the back for pharmacy (Rx) info, claims address, and provider phone numbers.'}
        </p>
      </div>

      {/* Camera capture area */}
      <button
        onClick={triggerCapture}
        disabled={isProcessing}
        className="w-72 h-44 rounded-2xl border-2 border-dashed border-blue-300 bg-[#EEF4F8]/50 flex flex-col items-center justify-center space-y-3 transition-all active:scale-95 disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-600">
              Processing...
            </span>
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              Tap to Take Photo
            </span>
            <span className="text-xs text-[#8A9BA8]">or upload from gallery</span>
          </>
        )}
      </button>

      {/* Hidden file input — capture="environment" opens rear camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        aria-label={`Capture ${side} of insurance card`}
      />

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {side === 'back' && (
        <button
          onClick={() => setStep('confirm')}
          className="text-sm text-[#5A6B7A] underline"
        >
          Skip — I don't have the back
        </button>
      )}
    </div>
  );

  const renderFieldRow = (
    label: string,
    field: string,
    value: string | undefined,
    side: 'front' | 'back'
  ) => {
    const isEditing = editingField === `${side}-${field}`;

    return (
      <div
        key={`${side}-${field}`}
        className="flex items-center justify-between py-2 border-b border-[#E8E4DF] last:border-0"
      >
        <span className="text-xs text-[#5A6B7A] w-28 flex-shrink-0">{label}</span>
        {isEditing ? (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateField(side, field, e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
            autoFocus
            className="flex-1 text-sm text-[#1B2733] border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div className="flex items-center space-x-2 flex-1 justify-end">
            <span className="text-sm text-[#1B2733] text-right">
              {value || '—'}
            </span>
            <button
              onClick={() => setEditingField(`${side}-${field}`)}
              className="text-[#8A9BA8] hover:text-blue-600 p-1"
              aria-label={`Edit ${label}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderReviewScreen = (side: 'front' | 'back') => {
    const image = side === 'front' ? frontImage : backImage;
    const data = side === 'front' ? frontData : backData;
    const confidence = (data as InsuranceCardData)?.confidence;

    const frontFields = [
      ['Payer', 'payerName'],
      ['Plan', 'planName'],
      ['Member ID', 'memberId'],
      ['Group #', 'groupNumber'],
      ['Subscriber', 'subscriberName'],
      ['Effective', 'effectiveDate'],
      ['Copay', 'copay'],
    ] as const;

    const backFields = [
      ['Rx BIN', 'rxBin'],
      ['Rx PCN', 'rxPcn'],
      ['Rx Group', 'rxGroup'],
      ['Provider Phone', 'providerPhone'],
      ['Claims Address', 'claimsAddress'],
    ] as const;

    const fields = side === 'front' ? frontFields : backFields;

    return (
      <div className="flex flex-col p-4 space-y-4">
        {/* Card image preview */}
        {image && (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-[#E8E4DF]">
            <img
              src={image}
              alt={`Insurance card ${side}`}
              className="w-full h-auto object-contain max-h-48"
            />
            {confidence != null && (
              <div
                className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                  confidence >= 0.85
                    ? 'bg-green-100 text-green-700'
                    : confidence >= 0.6
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {Math.round(confidence * 100)}% confidence
              </div>
            )}
          </div>
        )}

        {/* Extracted fields */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#1B2733]">
              {side === 'front' ? 'Card Front Details' : 'Card Back Details'}
            </h4>
            <Eye className="w-4 h-4 text-[#8A9BA8]" />
          </div>
          <div className="space-y-0">
            {fields.map(([label, field]) =>
              renderFieldRow(
                label,
                field,
                (data as Record<string, string | undefined>)[field],
                side
              )
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setStep(side === 'front' ? 'capture-front' : 'capture-back');
              if (side === 'front') {
                setFrontImage(null);
                setFrontData({});
              } else {
                setBackImage(null);
                setBackData({});
              }
            }}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border border-[#E8E4DF] text-[#3A4A57] text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake</span>
          </button>
          <button
            onClick={() => {
              if (side === 'front') {
                setStep('capture-back');
              } else {
                setStep('confirm');
              }
            }}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{side === 'front' ? 'Next: Back' : 'Review All'}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmScreen = () => (
    <div className="flex flex-col p-4 space-y-4">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#1B2733]">
            Review Insurance Details
          </h3>
          <p className="text-xs text-[#5A6B7A]">
            Confirm the information below is correct before saving.
          </p>
        </div>
      </div>

      {/* Combined summary */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
        <h4 className="text-sm font-semibold text-[#3A4A57] mb-2">
          {frontData.payerName || 'Insurance Plan'}
        </h4>
        {[
          ['Member ID', frontData.memberId],
          ['Group #', frontData.groupNumber],
          ['Plan', frontData.planName],
          ['Subscriber', frontData.subscriberName || patientName],
          ['Effective', frontData.effectiveDate],
          ['Copay', frontData.copay],
          ['Rx BIN', backData.rxBin],
          ['Rx PCN', backData.rxPcn],
          ['Provider Phone', backData.providerPhone],
          ['Claims Address', backData.claimsAddress],
        ]
          .filter(([, val]) => val)
          .map(([label, val]) => (
            <div
              key={label}
              className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"
            >
              <span className="text-[#5A6B7A]">{label}</span>
              <span className="text-[#1B2733] font-medium text-right max-w-[55%]">
                {val}
              </span>
            </div>
          ))}
      </div>

      {/* Save / Edit buttons */}
      <div className="flex space-x-3">
        <button
          onClick={() => setStep('review-front')}
          className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border border-[#E8E4DF] text-[#3A4A57] text-sm font-medium"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit</span>
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-green-600 text-white text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          <span>Save to Profile</span>
        </button>
      </div>
    </div>
  );

  // ------------------------------------------
  // Main render
  // ------------------------------------------

  return (
    <div className="flex flex-col min-h-0 bg-[#FAF7F2]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E8E4DF]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg text-[#5A6B7A] hover:bg-[#F0EDE8]"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-[#1B2733]">
          Scan Insurance Card
        </h2>
        {/* Step indicator */}
        <div className="flex space-x-1">
          {(['front', 'back', 'done'] as const).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${
                (step === 'capture-front' && i === 0) ||
                (step === 'review-front' && i === 0) ||
                (step === 'capture-back' && i === 1) ||
                (step === 'review-back' && i === 1) ||
                (step === 'confirm' && i === 2)
                  ? 'bg-blue-600'
                  : i <
                    (['capture-front', 'review-front'].includes(step)
                      ? 0
                      : ['capture-back', 'review-back'].includes(step)
                      ? 1
                      : 2)
                  ? 'bg-blue-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'capture-front' && renderCaptureScreen('front')}
        {step === 'review-front' && renderReviewScreen('front')}
        {step === 'capture-back' && renderCaptureScreen('back')}
        {step === 'review-back' && renderReviewScreen('back')}
        {step === 'confirm' && renderConfirmScreen()}
      </div>

      {/* Dev mode banner */}
      {import.meta.env.DEV && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-center">
          <span className="text-xs text-amber-700">
            DEV MODE — OCR returns mock data. Deploy edge function for real extraction.
          </span>
        </div>
      )}
    </div>
  );
}
