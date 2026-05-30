// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Fiscal Agent Submission Flow
 * Guides users through submitting their caregiver hours to fiscal management services
 *
 * Supports:
 * - PDF download for manual upload
 * - Clearinghouse submission via Availity (EDI 837P)
 * - Direct API submission for supported fiscal agents
 * - Superbill generation for HSA/FSA
 *
 * Industry Standard:
 * Most fiscal agents don't have public APIs - they accept EDI 837P files
 * through clearinghouses like Availity or Waystar. We support both approaches.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Building2,
  Printer,
  Upload,
  ExternalLink,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Signature,
  ClipboardCheck,
  Loader2,
  Zap,
} from 'lucide-react';
import {
  TimeEntry,
  ServiceNote,
  FiscalAgentSubmission,
  WeeklySummary,
  getWeeklySummary,
  getTimeEntries,
  getServiceNotes,
  createSubmission,
  generateServiceNote,
  signServiceNote,
  formatDuration,
  getFiscalAgentInfo,
} from '../lib/caregiver-db';
import { WAIVER_SERVICE_CODES, FISCAL_AGENTS } from '../lib/tier-utils';
import {
  ClaimResponse,
} from '../lib/clearinghouse-integration';

interface FiscalAgentSubmissionFlowProps {
  userId: string;
  waiverProfileId: string;
  fiscalAgentId: string;
  participantId: string;
  onComplete: (submission: FiscalAgentSubmission) => void;
  onCancel: () => void;
}

export function FiscalAgentSubmissionFlow({
  userId,
  waiverProfileId,
  fiscalAgentId,
  participantId,
  onComplete,
  onCancel,
}: FiscalAgentSubmissionFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [serviceNotes, setServiceNotes] = useState<ServiceNote[]>([]);
  const [submissionMethod, setSubmissionMethod] = useState<'pdf_download' | 'portal_upload' | 'clearinghouse'>('pdf_download');
  const [clearinghouseResponse, setClearinghouseResponse] = useState<ClaimResponse | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<FiscalAgentSubmission | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const fiscalAgent = getFiscalAgentInfo(fiscalAgentId);

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Get this week's summary
        const weeklySummary = await getWeeklySummary(userId);
        setSummary(weeklySummary);

        // Get completed entries that haven't been submitted
        const allEntries = await getTimeEntries(userId, {
          start: new Date(weeklySummary.weekStart),
          end: new Date(weeklySummary.weekEnd),
        });

        const completedEntries = allEntries.filter(
          (e) => e.status === 'completed' && e.clockOut
        );
        setEntries(completedEntries);

        // Pre-select all completed entries
        setSelectedEntries(new Set(completedEntries.map((e) => e.id)));

        // Load existing service notes
        const notes = await getServiceNotes(userId, {
          start: new Date(weeklySummary.weekStart),
          end: new Date(weeklySummary.weekEnd),
        });
        setServiceNotes(notes);
      } catch (error) {
        console.error('Error loading submission data:', error);
      }
      setLoading(false);
    }

    loadData();
  }, [userId]);

  // Calculate selected totals
  const selectedEntryList = entries.filter((e) => selectedEntries.has(e.id));
  const totalSelectedHours = selectedEntryList.reduce((sum, e) => {
    if (!e.clockOut) return sum;
    return sum + (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / (1000 * 60 * 60);
  }, 0);

  // Generate service notes for selected entries
  const handleGenerateNotes = async () => {
    setIsSigning(true);
    try {
      const newNotes: ServiceNote[] = [];
      for (const entry of selectedEntryList) {
        // Check if note already exists
        const existingNote = serviceNotes.find((n) => n.timeEntryId === entry.id);
        if (!existingNote) {
          const note = await generateServiceNote(entry);
          newNotes.push(note);
        }
      }

      if (newNotes.length > 0) {
        setServiceNotes([...serviceNotes, ...newNotes]);
      }

      // Auto-sign caregiver signature
      for (const note of [...serviceNotes, ...newNotes]) {
        if (!note.caregiverSignature) {
          await signServiceNote(note.id, false);
        }
      }

      setStep(3);
    } catch (error) {
      console.error('Error generating notes:', error);
    }
    setIsSigning(false);
  };

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // If using clearinghouse submission, send via Availity
      if (submissionMethod === 'clearinghouse') {
        const claimResponse = await handleClearinghouseSubmission();
        if (claimResponse && !claimResponse.success) {
          console.error('Clearinghouse submission failed:', claimResponse.errors);
          // Fall back to creating local submission record
        }
        setClearinghouseResponse(claimResponse);
      }

      const newSubmission = await createSubmission(
        userId,
        waiverProfileId,
        fiscalAgentId,
        Array.from(selectedEntries),
        submissionMethod
      );

      setSubmission(newSubmission);
      setStep(4);
    } catch (error) {
      console.error('Error creating submission:', error);
    }
    setIsSubmitting(false);
  };

  // Handle electronic submission via clearinghouse.
  //
  // A valid EDI 837P claim requires the billing provider's real NPI / Tax ID and
  // the participant's real identity. This flow only receives a participant ID — it
  // has no verified NPI or subscriber record — so we must NOT fabricate those
  // identifiers and transmit them to a live clearinghouse. Until that real data is
  // wired in, route users to the PDF / portal-upload paths instead of submitting
  // placeholder identity data on their behalf.
  const handleClearinghouseSubmission = async (): Promise<ClaimResponse | null> => {
    toast.info('Direct electronic submission isn’t available yet', {
      description: 'Use Download PDF or open your fiscal agent portal to submit this week’s hours. Direct EDI submission is coming soon.',
    });
    return null;
  };

  // Generate PDF
  const handleDownloadPdf = () => {
    toast.info('PDF export is coming soon', {
      description: 'For now, use your fiscal agent portal to upload this week’s hours.',
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600" />
        <p className="text-gray-600">Loading your hours...</p>
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white p-4 border-b z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit Hours</h2>
            <p className="text-sm text-gray-600">
              to {fiscalAgent?.name || 'Fiscal Agent'}
            </p>
          </div>
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Select Hours</span>
          <span>Review</span>
          <span>Submit</span>
          <span>Done</span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Entries */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Summary Card */}
              <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-teal-800">
                    Week of {summary ? new Date(summary.weekStart).toLocaleDateString() : '...'}
                  </span>
                  <Badge className="bg-teal-100 text-teal-800">
                    {formatDuration(totalSelectedHours)} selected
                  </Badge>
                </div>
                <p className="text-sm text-teal-700">
                  {entries.length} completed entries ready for submission
                </p>
              </Card>

              {/* Entries List */}
              {entries.length === 0 ? (
                <Card className="p-6 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <h3 className="font-medium text-gray-900 mb-1">No Hours to Submit</h3>
                  <p className="text-sm text-gray-600">
                    Complete your shifts by clocking out to see them here.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Select entries to submit:
                    </span>
                    <button
                      onClick={() => {
                        if (selectedEntries.size === entries.length) {
                          setSelectedEntries(new Set());
                        } else {
                          setSelectedEntries(new Set(entries.map((e) => e.id)));
                        }
                      }}
                      className="text-sm text-teal-600 hover:underline"
                    >
                      {selectedEntries.size === entries.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {entries.map((entry) => {
                    const service = WAIVER_SERVICE_CODES[entry.serviceCode] || {
                      description: 'Unknown',
                      code: '???',
                    };
                    const hours = entry.clockOut
                      ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
                      : 0;
                    const isExpanded = expandedEntry === entry.id;

                    return (
                      <Card
                        key={entry.id}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedEntries.has(entry.id)
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div
                          className="flex items-center gap-3"
                          onClick={() => {
                            const newSelected = new Set(selectedEntries);
                            if (newSelected.has(entry.id)) {
                              newSelected.delete(entry.id);
                            } else {
                              newSelected.add(entry.id);
                            }
                            setSelectedEntries(newSelected);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => {}}
                            aria-label={`Select ${service.description} entry`}
                            className="w-4 h-4 text-teal-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {service.description}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {formatDuration(hours)}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.clockIn).toLocaleDateString()} •{' '}
                              {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                              {entry.clockOut
                                ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'In Progress'}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Collapse entry details' : 'Expand entry details'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEntry(isExpanded ? null : entry.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t"
                          >
                            <div className="text-sm space-y-2">
                              <div>
                                <span className="text-gray-500">Service Code: </span>
                                <span className="font-mono">{service.code}</span>
                              </div>
                              {entry.activitiesCompleted.length > 0 && (
                                <div>
                                  <span className="text-gray-500">Activities: </span>
                                  <span>{entry.activitiesCompleted.join(', ')}</span>
                                </div>
                              )}
                              {entry.notes && (
                                <div>
                                  <span className="text-gray-500">Notes: </span>
                                  <span>{entry.notes}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedEntries.size === 0}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Review & Generate Notes */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 sm:space-y-4"
            >
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  Hours Summary
                </h3>

                <div className="space-y-3">
                  {/* Group by service type */}
                  {Array.from(
                    selectedEntryList.reduce((map, entry) => {
                      const current = map.get(entry.serviceCode) || { hours: 0, count: 0 };
                      const hours = entry.clockOut
                        ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
                        : 0;
                      map.set(entry.serviceCode, {
                        hours: current.hours + hours,
                        count: current.count + 1,
                      });
                      return map;
                    }, new Map<string, { hours: number; count: number }>())
                  ).map(([code, data]) => {
                    const service = WAIVER_SERVICE_CODES[code] || { code: '—', description: 'Unknown', hourlyRange: [0, 0] as [number, number] };
                    const minPay = data.hours * service.hourlyRange[0];
                    const maxPay = data.hours * service.hourlyRange[1];

                    return (
                      <div key={code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{service.description}</div>
                          <div className="text-xs text-gray-500">
                            Code: {service.code} • {data.count} entries
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatDuration(data.hours)}</div>
                          <div className="text-xs text-green-600">
                            ${minPay.toFixed(0)} - ${maxPay.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="font-semibold text-teal-900">Total</div>
                    <div className="text-right">
                      <div className="font-bold text-teal-900">{formatDuration(totalSelectedHours)}</div>
                      <div className="text-xs text-teal-700">
                        {selectedEntries.size} entries
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Submission Method */}
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-3">How do you want to submit?</h3>
                <div className="space-y-2">
                  {/* Clearinghouse submission - not yet available (no live billing/subscriber data wired) */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full p-3 text-left border rounded-lg border-gray-200 opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2 text-gray-500">
                          Direct Electronic Submission
                          <Badge className="bg-gray-100 text-gray-600 text-xs">Coming soon</Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Submit via Availity clearinghouse (EDI 837P). In the meantime, use a PDF or your fiscal agent portal.
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSubmissionMethod('pdf_download')}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      submissionMethod === 'pdf_download'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-teal-600" />
                      <div>
                        <div className="font-medium">Download PDF</div>
                        <div className="text-sm text-gray-500">
                          Generate documents to upload to your fiscal agent portal
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSubmissionMethod('portal_upload')}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      submissionMethod === 'portal_upload'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Open {fiscalAgent?.name.split(' ')[0] || 'FMS'} Portal</div>
                        <div className="text-sm text-gray-500">
                          We'll generate documents and open your portal
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </Card>

              {/* Signature */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <Signature className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">Electronic Signature</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      By continuing, you certify that the hours and services documented are accurate
                      and were provided as described.
                    </p>
                    <p className="text-xs text-amber-600 font-mono">
                      Participant ID: {participantId}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={isSigning}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Notes...
                    </>
                  ) : (
                    <>
                      Sign & Generate Documents
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Submit */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 sm:space-y-4"
            >
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">Documents Ready</h3>
                    <p className="text-sm text-green-700">
                      Service notes have been generated and signed
                    </p>
                  </div>
                </div>
              </Card>

              {/* Generated Documents */}
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Generated Documents</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="w-full p-3 flex items-center justify-between border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-red-500" />
                      <div className="text-left">
                        <div className="font-medium">Weekly Summary</div>
                        <div className="text-xs text-gray-500">
                          {formatDuration(totalSelectedHours)} • {selectedEntries.size} entries
                        </div>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="w-full p-3 flex items-center justify-between border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Service Notes</div>
                        <div className="text-xs text-gray-500">
                          {serviceNotes.length} notes with caregiver signature
                        </div>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="w-full p-3 flex items-center justify-between border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <div className="text-left">
                        <div className="font-medium">Superbill (HSA/FSA)</div>
                        <div className="text-xs text-gray-500">
                          For reimbursement submissions
                        </div>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </Card>

              {/* Portal Link */}
              {submissionMethod === 'portal_upload' && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">
                          {fiscalAgent?.name || 'Fiscal Agent'} Portal
                        </div>
                        <div className="text-sm text-blue-700">
                          Upload your documents to complete submission
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info('Open your fiscal agent portal', {
                          description: `Log in to your ${fiscalAgent?.name || 'fiscal agent'} portal and upload the documents above to complete your submission.`,
                        })
                      }
                    >
                      Open Portal
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Submitted
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && submission && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Hours Submitted!
              </h3>
              <p className="text-gray-600 mb-4 sm:mb-6">
                Your {formatDuration(submission.totalHours)} have been marked as submitted
                to {fiscalAgent?.name || 'your fiscal agent'}.
              </p>

              <Card className="p-4 bg-gray-50 text-left mb-4 sm:mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Submission ID:</span>
                    <span className="font-mono">{submission.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Period:</span>
                    <span>
                      {new Date(submission.periodStart).toLocaleDateString()} -{' '}
                      {new Date(submission.periodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Hours:</span>
                    <span className="font-medium">{formatDuration(submission.totalHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entries:</span>
                    <span>{submission.totalEntries}</span>
                  </div>
                  {clearinghouseResponse && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Clearinghouse:</span>
                          <span className="font-medium text-green-600">Availity</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Claim Control #:</span>
                          <span className="font-mono text-xs">{clearinghouseResponse.claimControlNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status:</span>
                          <Badge className={
                            clearinghouseResponse.status === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : clearinghouseResponse.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }>
                            {clearinghouseResponse.status}
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button onClick={() => onComplete(submission)} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default FiscalAgentSubmissionFlow;
