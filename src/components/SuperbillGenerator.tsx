/**
 * Superbill Generator Component
 * Generates HSA/FSA-compliant superbills for reimbursement
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  FileText,
  Download,
  Wallet,
  Calendar,
  User,
  Stethoscope,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Printer,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  COMMON_CPT_CODES,
  CPT_CATEGORIES,
  getCPTCodesByCategory,
  type Superbill,
  type SuperbillLineItem
} from '../types/telehealth';
import jsPDF from 'jspdf';
import {
  submitInsuranceClaim,
  isClearinghouseConfigured,
  type ClaimSubmission,
  type ClaimResponse,
} from '../lib/clearinghouse-integration';

interface SuperbillGeneratorProps {
  userId: string;
  childName: string;
  childDOB: string;
  appointmentId?: string;
  appointmentDate?: string;
  providerName?: string;
  providerCredentials?: string;
  providerNPI?: string;
  onClose?: () => void;
}

interface SuperbillFormData {
  // Patient info
  patientName: string;
  patientDOB: string;
  patientAddress: string;
  patientCity: string;
  patientState: string;
  patientZip: string;
  // Provider info (if not passed in)
  providerName: string;
  providerCredentials: string;
  providerNPI: string;
  providerTaxId: string;
  providerAddress: string;
  // Service info
  dateOfService: string;
  diagnosisCodes: string[];
  selectedCPTCodes: string[];
  // Payment
  amountPaid: number;
  paymentMethod: 'credit_card' | 'hsa' | 'fsa' | 'cash' | 'check';
}

// Common ICD-10 diagnosis codes for developmental/behavioral conditions
const COMMON_DIAGNOSIS_CODES = [
  { code: 'F84.0', description: 'Autistic disorder' },
  { code: 'F84.5', description: "Asperger's syndrome" },
  { code: 'F84.8', description: 'Other pervasive developmental disorders' },
  { code: 'F84.9', description: 'Pervasive developmental disorder, unspecified' },
  { code: 'F90.0', description: 'ADHD, predominantly inattentive type' },
  { code: 'F90.1', description: 'ADHD, predominantly hyperactive type' },
  { code: 'F90.2', description: 'ADHD, combined type' },
  { code: 'F80.1', description: 'Expressive language disorder' },
  { code: 'F80.2', description: 'Mixed receptive-expressive language disorder' },
  { code: 'F80.9', description: 'Developmental disorder of speech and language, unspecified' },
  { code: 'F82', description: 'Specific developmental disorder of motor function' },
  { code: 'F88', description: 'Other disorders of psychological development' },
  { code: 'F89', description: 'Unspecified disorder of psychological development' },
  { code: 'R62.50', description: 'Unspecified lack of expected normal physiological development' },
  { code: 'Z13.4', description: 'Encounter for screening for developmental disorders' },
];

export function SuperbillGenerator({
  userId,
  childName,
  childDOB,
  appointmentId,
  appointmentDate,
  providerName = '',
  providerCredentials = '',
  providerNPI = '',
  onClose
}: SuperbillGeneratorProps) {
  const [step, setStep] = useState<'form' | 'preview' | 'download' | 'submitting' | 'submitted'>('form');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('ABA');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimResponse, setClaimResponse] = useState<ClaimResponse | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SuperbillFormData>({
    patientName: childName,
    patientDOB: childDOB,
    patientAddress: '',
    patientCity: '',
    patientState: '',
    patientZip: '',
    providerName: providerName,
    providerCredentials: providerCredentials,
    providerNPI: providerNPI,
    providerTaxId: '',
    providerAddress: '',
    dateOfService: appointmentDate || new Date().toISOString().split('T')[0],
    diagnosisCodes: [],
    selectedCPTCodes: [],
    amountPaid: 0,
    paymentMethod: 'credit_card'
  });

  const calculateTotal = (): number => {
    return formData.selectedCPTCodes.reduce((sum, code) => {
      const cptInfo = COMMON_CPT_CODES[code as keyof typeof COMMON_CPT_CODES];
      return sum + (cptInfo?.defaultPrice || 0);
    }, 0);
  };

  const generateLineItems = (): SuperbillLineItem[] => {
    return formData.selectedCPTCodes.map(code => {
      const cptInfo = COMMON_CPT_CODES[code as keyof typeof COMMON_CPT_CODES];
      return {
        cptCode: code,
        description: cptInfo?.description || 'Unknown service',
        units: 1,
        unitCharge: cptInfo?.defaultPrice || 0,
        totalCharge: cptInfo?.defaultPrice || 0
      };
    });
  };

  const generatePDF = () => {
    const pdf = new jsPDF();
    const lineItems = generateLineItems();
    const total = calculateTotal();

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUPERBILL', 105, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('For HSA/FSA Reimbursement', 105, 27, { align: 'center' });

    // Provider Info (Left side)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROVIDER INFORMATION', 20, 45);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Name: ${formData.providerName}, ${formData.providerCredentials}`, 20, 53);
    if (formData.providerNPI) {
      pdf.text(`NPI: ${formData.providerNPI}`, 20, 59);
    }
    if (formData.providerTaxId) {
      pdf.text(`Tax ID: ${formData.providerTaxId}`, 20, 65);
    }
    if (formData.providerAddress) {
      pdf.text(`Address: ${formData.providerAddress}`, 20, 71);
    }

    // Patient Info (Right side)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PATIENT INFORMATION', 110, 45);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Name: ${formData.patientName}`, 110, 53);
    pdf.text(`DOB: ${formData.patientDOB}`, 110, 59);
    if (formData.patientAddress) {
      pdf.text(`Address: ${formData.patientAddress}`, 110, 65);
      pdf.text(`${formData.patientCity}, ${formData.patientState} ${formData.patientZip}`, 110, 71);
    }

    // Date of Service
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVICE INFORMATION', 20, 90);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Date of Service: ${formData.dateOfService}`, 20, 98);
    pdf.text('Place of Service: 02 (Telehealth)', 20, 104);

    // Diagnosis Codes
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DIAGNOSIS CODES (ICD-10)', 20, 118);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    formData.diagnosisCodes.forEach((code, idx) => {
      const diagnosis = COMMON_DIAGNOSIS_CODES.find(d => d.code === code);
      pdf.text(`${code} - ${diagnosis?.description || 'Unknown'}`, 20, 126 + (idx * 6));
    });

    // Services Table
    const tableStartY = 126 + (formData.diagnosisCodes.length * 6) + 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVICES RENDERED', 20, tableStartY);

    // Table Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, tableStartY + 5, 170, 8, 'F');
    pdf.setFontSize(9);
    pdf.text('CPT Code', 25, tableStartY + 11);
    pdf.text('Description', 55, tableStartY + 11);
    pdf.text('Units', 130, tableStartY + 11);
    pdf.text('Charge', 150, tableStartY + 11);
    pdf.text('Total', 175, tableStartY + 11);

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    lineItems.forEach((item, idx) => {
      const rowY = tableStartY + 18 + (idx * 7);
      pdf.text(item.cptCode, 25, rowY);
      // Truncate long descriptions
      const desc = item.description.length > 40 ? item.description.substring(0, 37) + '...' : item.description;
      pdf.text(desc, 55, rowY);
      pdf.text(item.units.toString(), 130, rowY);
      pdf.text(`$${item.unitCharge.toFixed(2)}`, 150, rowY);
      pdf.text(`$${item.totalCharge.toFixed(2)}`, 175, rowY);
    });

    // Totals
    const totalsY = tableStartY + 25 + (lineItems.length * 7);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, totalsY, 190, totalsY);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Billed:', 130, totalsY + 8);
    pdf.text(`$${total.toFixed(2)}`, 175, totalsY + 8);
    pdf.text('Amount Paid:', 130, totalsY + 15);
    pdf.text(`$${formData.amountPaid.toFixed(2)}`, 175, totalsY + 15);
    pdf.text('Balance Due:', 130, totalsY + 22);
    pdf.text(`$${(total - formData.amountPaid).toFixed(2)}`, 175, totalsY + 22);

    // Payment Method
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Payment Method: ${formData.paymentMethod.toUpperCase()}`, 20, totalsY + 15);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This superbill is provided for insurance reimbursement purposes.', 105, 275, { align: 'center' });
    pdf.text('Please submit to your insurance provider or HSA/FSA administrator.', 105, 280, { align: 'center' });
    pdf.text(`Generated: ${new Date().toLocaleDateString()} | Document ID: ${appointmentId || crypto.randomUUID().substring(0, 8)}`, 105, 285, { align: 'center' });

    return pdf;
  };

  const handleDownload = () => {
    const pdf = generatePDF();
    pdf.save(`superbill-${formData.dateOfService}-${formData.patientName.replace(/\s+/g, '-')}.pdf`);
    setStep('download');
  };

  const handlePrint = () => {
    const pdf = generatePDF();
    window.open(pdf.output('bloburl'), '_blank');
  };

  const handleSubmitToInsurance = async () => {
    setIsSubmittingClaim(true);
    setClaimError(null);
    setClaimResponse(null);
    setStep('submitting');

    try {
      // Map superbill form data to ClaimSubmission interface
      const lineItems = generateLineItems();
      const primaryDiagnosis = formData.diagnosisCodes[0];
      const additionalDiagnoses = formData.diagnosisCodes.slice(1);

      const claim: ClaimSubmission = {
        claimType: 'professional',
        billingProvider: {
          npi: formData.providerNPI || '0000000000',
          taxId: formData.providerTaxId || '',
          name: formData.providerName || 'Provider',
          address: {
            line1: formData.providerAddress || '',
            city: '',
            state: '',
            zip: '',
          },
          phone: '',
        },
        subscriber: {
          memberId: userId || '',
          firstName: formData.patientName.split(' ')[0] || '',
          lastName: formData.patientName.split(' ').slice(1).join(' ') || '',
          dob: formData.patientDOB || '',
          gender: 'U',
          address: {
            line1: formData.patientAddress || '',
            city: formData.patientCity || '',
            state: formData.patientState || '',
            zip: formData.patientZip || '',
          },
        },
        payer: {
          payerId: '',
          payerName: '',
        },
        diagnosis: [
          ...(primaryDiagnosis ? [{ code: primaryDiagnosis, isPrimary: true }] : []),
          ...additionalDiagnoses.map(code => ({ code, isPrimary: false })),
        ],
        services: lineItems.map((item, idx) => ({
          serviceDate: formData.dateOfService,
          procedureCode: item.cptCode,
          units: item.units,
          chargeAmount: item.totalCharge,
          placeOfService: '02', // Telehealth
          diagnosisPointers: [1], // Point to primary diagnosis
        })),
        totalCharges: calculateTotal(),
      };

      const response = await submitInsuranceClaim(claim);
      setClaimResponse(response);
      setStep('submitted');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Submission failed. Your claim has been queued for retry.';
      setClaimError(msg);
      setStep('submitted');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const toggleCPTCode = (code: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCPTCodes: prev.selectedCPTCodes.includes(code)
        ? prev.selectedCPTCodes.filter(c => c !== code)
        : [...prev.selectedCPTCodes, code]
    }));
  };

  const toggleDiagnosisCode = (code: string) => {
    setFormData(prev => ({
      ...prev,
      diagnosisCodes: prev.diagnosisCodes.includes(code)
        ? prev.diagnosisCodes.filter(c => c !== code)
        : [...prev.diagnosisCodes, code]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Generate Superbill
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create an HSA/FSA-eligible receipt for reimbursement
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          HSA/FSA Eligible
        </Badge>
      </div>

      {/* HSA/FSA Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200 mb-4 sm:mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium">About Superbills</p>
            <p className="text-blue-800 mt-1">
              A superbill is an itemized receipt that includes the diagnosis codes, CPT codes,
              and provider information needed for HSA/FSA reimbursement or out-of-network insurance claims.
            </p>
          </div>
        </div>
      </Card>

      {step === 'form' && (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Patient Information */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.patientDOB}
                  onChange={e => setFormData(prev => ({ ...prev, patientDOB: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Address (optional)</label>
                <input
                  type="text"
                  value={formData.patientAddress}
                  onChange={e => setFormData(prev => ({ ...prev, patientAddress: e.target.value }))}
                  placeholder="Street address"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={formData.patientCity}
                  onChange={e => setFormData(prev => ({ ...prev, patientCity: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.patientState}
                    onChange={e => setFormData(prev => ({ ...prev, patientState: e.target.value }))}
                    maxLength={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={formData.patientZip}
                    onChange={e => setFormData(prev => ({ ...prev, patientZip: e.target.value }))}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Provider Information */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-accent" />
              Provider Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Provider Name</label>
                <input
                  type="text"
                  value={formData.providerName}
                  onChange={e => setFormData(prev => ({ ...prev, providerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Credentials</label>
                <input
                  type="text"
                  value={formData.providerCredentials}
                  onChange={e => setFormData(prev => ({ ...prev, providerCredentials: e.target.value }))}
                  placeholder="e.g., BCBA, LCSW, SLP"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">NPI Number (optional)</label>
                <input
                  type="text"
                  value={formData.providerNPI}
                  onChange={e => setFormData(prev => ({ ...prev, providerNPI: e.target.value }))}
                  placeholder="10-digit NPI"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tax ID (optional)</label>
                <input
                  type="text"
                  value={formData.providerTaxId}
                  onChange={e => setFormData(prev => ({ ...prev, providerTaxId: e.target.value }))}
                  placeholder="XX-XXXXXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Service Date & Payment */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Service & Payment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date of Service</label>
                <input
                  type="date"
                  value={formData.dateOfService}
                  onChange={e => setFormData(prev => ({ ...prev, dateOfService: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Amount Paid</label>
                <input
                  type="number"
                  value={formData.amountPaid}
                  onChange={e => setFormData(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'credit_card' | 'hsa' | 'fsa' | 'cash' | 'check' }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="hsa">HSA Card</option>
                  <option value="fsa">FSA Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Diagnosis Codes */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4">Diagnosis Codes (ICD-10)</h3>
            <p className="text-xs text-slate-500 mb-3">Select all that apply to this visit</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {COMMON_DIAGNOSIS_CODES.map(diagnosis => (
                <label
                  key={diagnosis.code}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.diagnosisCodes.includes(diagnosis.code)
                      ? 'bg-accent/10 border-accent'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.diagnosisCodes.includes(diagnosis.code)}
                    onChange={() => toggleDiagnosisCode(diagnosis.code)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    formData.diagnosisCodes.includes(diagnosis.code)
                      ? 'bg-accent border-accent'
                      : 'border-slate-300'
                  }`}>
                    {formData.diagnosisCodes.includes(diagnosis.code) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-slate-600">{diagnosis.code}</span>
                    <p className="text-xs text-slate-700 truncate">{diagnosis.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* CPT Codes by Category */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4">Service Codes (CPT)</h3>
            <p className="text-xs text-slate-500 mb-3">Select the services rendered</p>
            <div className="space-y-2">
              {CPT_CATEGORIES.filter(cat => cat !== 'Modifier').map(category => {
                const codes = getCPTCodesByCategory(category);
                const isExpanded = expandedCategory === category;
                const selectedCount = codes.filter(c =>
                  formData.selectedCPTCodes.includes(c.code)
                ).length;

                return (
                  <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{category}</span>
                        {selectedCount > 0 && (
                          <Badge className="bg-accent text-white text-xs">
                            {selectedCount} selected
                          </Badge>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {codes.map(cpt => (
                          <label
                            key={cpt.code}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              formData.selectedCPTCodes.includes(cpt.code)
                                ? 'bg-accent/10 border-accent'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedCPTCodes.includes(cpt.code)}
                              onChange={() => toggleCPTCode(cpt.code)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              formData.selectedCPTCodes.includes(cpt.code)
                                ? 'bg-accent border-accent'
                                : 'border-slate-300'
                            }`}>
                              {formData.selectedCPTCodes.includes(cpt.code) && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-slate-600">{cpt.code}</span>
                                <span className="text-sm font-medium text-slate-900">
                                  ${cpt.defaultPrice}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">{cpt.description}</p>
                              <p className="text-xs text-slate-400">Requires: {cpt.requiresLicense}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Summary & Actions */}
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-slate-900">Summary</h3>
                <p className="text-sm text-slate-500">
                  {formData.selectedCPTCodes.length} service(s), {formData.diagnosisCodes.length} diagnosis code(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total Billed</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">${calculateTotal().toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {onClose && (
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => setStep('preview')}
                disabled={formData.selectedCPTCodes.length === 0 || formData.diagnosisCodes.length === 0}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                Preview Superbill
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl font-bold">SUPERBILL</h3>
              <p className="text-sm text-slate-500">For HSA/FSA Reimbursement</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Provider</h4>
                <p className="text-sm">{formData.providerName}, {formData.providerCredentials}</p>
                {formData.providerNPI && <p className="text-xs text-slate-500">NPI: {formData.providerNPI}</p>}
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Patient</h4>
                <p className="text-sm">{formData.patientName}</p>
                <p className="text-xs text-slate-500">DOB: {formData.patientDOB}</p>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h4 className="font-medium text-slate-700 mb-2">Date of Service</h4>
              <p className="text-sm">{formData.dateOfService}</p>
              <p className="text-xs text-slate-500">Place of Service: 02 (Telehealth)</p>
            </div>

            <div className="mb-4 sm:mb-6">
              <h4 className="font-medium text-slate-700 mb-2">Diagnosis Codes</h4>
              <div className="flex flex-wrap gap-2">
                {formData.diagnosisCodes.map(code => {
                  const diagnosis = COMMON_DIAGNOSIS_CODES.find(d => d.code === code);
                  return (
                    <Badge key={code} variant="outline" className="text-xs">
                      {code} - {diagnosis?.description}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h4 className="font-medium text-slate-700 mb-2">Services</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">CPT</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {generateLineItems().map(item => (
                    <tr key={item.cptCode} className="border-b">
                      <td className="py-2 font-mono">{item.cptCode}</td>
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">${item.totalCharge.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-2 font-medium text-right">Total Billed:</td>
                    <td className="py-2 text-right font-bold">${calculateTotal().toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="py-2 text-right">Amount Paid:</td>
                    <td className="py-2 text-right">${formData.amountPaid.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
              Edit
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button onClick={handleDownload} className="flex-1 bg-accent hover:bg-accent/90 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
          {/* Submit to Insurance */}
          <Card className="p-4 bg-blue-50 border-blue-200 mt-4">
            <div className="flex items-start gap-3 mb-3">
              <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Submit to Insurance</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Electronically submit this claim to your insurance via our clearinghouse.
                  {!isClearinghouseConfigured() && ' (Demo mode - no live submission)'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmitToInsurance}
              disabled={isSubmittingClaim || formData.selectedCPTCodes.length === 0 || formData.diagnosisCodes.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Claim Electronically
            </Button>
          </Card>
        </div>
      )}

      {step === 'download' && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Superbill Downloaded!</h3>
          <p className="text-slate-600 mb-4 sm:mb-6">
            Your superbill has been saved. You can submit it to your HSA/FSA administrator
            or insurance provider for reimbursement.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={() => setStep('form')}>
              Generate Another
            </Button>
            <Button
              onClick={handleSubmitToInsurance}
              disabled={isSubmittingClaim}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit to Insurance
            </Button>
            {onClose && (
              <Button onClick={onClose} className="bg-accent hover:bg-accent/90">
                Done
              </Button>
            )}
          </div>
        </Card>
      )}

      {step === 'submitting' && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Submitting Claim...</h3>
          <p className="text-slate-600 mb-2">
            Generating EDI 837P and transmitting to clearinghouse.
          </p>
          <p className="text-xs text-slate-400">This may take a moment.</p>
        </Card>
      )}

      {step === 'submitted' && (
        <Card className="p-8 text-center">
          {claimResponse && claimResponse.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Claim Submitted!</h3>
              <p className="text-slate-600 mb-2">
                Your claim has been accepted by the clearinghouse.
              </p>
              <div className="bg-slate-50 rounded-lg p-3 text-left text-sm mb-4 space-y-1">
                <p><span className="text-slate-500">Control #:</span> <span className="font-mono">{claimResponse.claimControlNumber}</span></p>
                <p><span className="text-slate-500">Transaction ID:</span> <span className="font-mono">{claimResponse.transactionId}</span></p>
                <p><span className="text-slate-500">Status:</span> <Badge className="bg-green-100 text-green-800 ml-1">{claimResponse.status}</Badge></p>
              </div>
              {claimResponse.warnings && claimResponse.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left text-xs mb-4">
                  {claimResponse.warnings.map((w, i) => (
                    <p key={i} className="text-amber-700"><span className="font-medium">{w.code}:</span> {w.message}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {claimError ? (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <Clock className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                {claimError ? 'Submission Issue' : 'Claim Queued'}
              </h3>
              <p className="text-slate-600 mb-2">
                {claimError || 'Your claim has been queued and will be retried automatically.'}
              </p>
              {claimResponse && claimResponse.errors && claimResponse.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left text-xs mb-4">
                  {claimResponse.errors.map((e, i) => (
                    <p key={i} className="text-red-700"><span className="font-medium">{e.code}:</span> {e.message}</p>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={() => setStep('form')}>
              Generate Another
            </Button>
            {onClose && (
              <Button onClick={onClose} className="bg-accent hover:bg-accent/90">
                Done
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default SuperbillGenerator;
