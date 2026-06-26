// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Delete Account Page
 *
 * Matches OneMedical IMG_1604 style:
 * - Illustration of person on bike
 * - "We're sorry to see you go" header
 * - Data retention notice
 * - Message Tech Support button
 */

import React, { useState, useCallback } from 'react';
import { ArrowLeft, MessageSquare, AlertTriangle, Mail, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { generateFHIRExport, downloadFHIRBundle, type AppChild, type AppAppointment } from '../lib/fhir-resources';
import { logAuditEvent } from '../lib/audit-logger';

interface DeleteAccountProps {
  onBack: () => void;
  onMessageSupport: () => void;
  userEmail?: string;
  userId?: string;
  childName?: string;
  childId?: string;
  className?: string;
}

export function DeleteAccount({
  onBack,
  onMessageSupport,
  userEmail,
  userId,
  childName,
  childId,
  className
}: DeleteAccountProps) {
  const [exporting, setExporting] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Download all user data as FHIR R4 JSON
  const handleExportData = useCallback(async () => {
    if (!userId) {
      toast.error('Unable to export — user ID not found');
      return;
    }
    setExporting(true);
    try {
      const child: AppChild = {
        id: childId || `child-${userId.substring(0, 8)}`,
        name: childName || 'Child',
      };

      // Fetch appointments from Supabase
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${child.id},user_id.eq.${userId}`)
        .limit(500);

      const bundle = await generateFHIRExport(
        child,
        (appointments || []) as AppAppointment[],
        userId,
        undefined,
      );

      downloadFHIRBundle(bundle);
      toast.success('Data exported as FHIR R4 JSON');
    } catch (err) {
      console.error('[DeleteAccount] Export failed:', err);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [userId, childId, childName]);

  // Submit account deletion request
  const handleRequestDeletion = useCallback(async () => {
    if (!userId || confirmText !== 'DELETE') return;

    setRequestingDeletion(true);
    try {
      // 1. Cancel any active subscriptions via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-8a022548/payments/cancel-subscription`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId, reason: 'account_deletion' }),
            }
          );
        }
      } catch {
        // Subscription cancel is best-effort — continue with deletion request
      }

      // 2. Record the deletion request
      await supabase.from('account_deletion_requests').insert({
        user_id: userId,
        email: userEmail,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });

      // 3. Audit log
      const sessionId = sessionStorage.getItem('aminy_session_id') || 'unknown';
      await logAuditEvent({
        action: 'delete',
        resourceType: 'user_account',
        resourceId: userId,
        userId,
        userRole: 'parent',
        sessionId,
        success: true,
        details: { event: 'deletion_requested', email: userEmail },
      });

      setDeletionRequested(true);
      toast.success('Account deletion request submitted');
    } catch (err) {
      console.error('[DeleteAccount] Deletion request failed:', err);
      toast.error('Failed to submit deletion request. Please contact support.');
    } finally {
      setRequestingDeletion(false);
    }
  }, [userId, userEmail, confirmText]);

  return (
    <div className={cn('min-h-screen bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#132F43] dark:text-white">
            Delete Account
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-md mx-auto">
        {/* Illustration - Person on bike */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="w-40 h-40 relative">
            {/* Simple SVG illustration of person on bike */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Sky/Background */}
              <circle cx="100" cy="100" r="90" fill="#E0F2F1" className="dark:fill-slate-800" />

              {/* Sun */}
              <circle cx="150" cy="50" r="15" fill="#FFD54F" />

              {/* Ground */}
              <ellipse cx="100" cy="160" rx="80" ry="15" fill="#81C784" className="dark:fill-green-900" />

              {/* Bike wheels */}
              <circle cx="60" cy="140" r="20" stroke="#00695C" strokeWidth="4" fill="none" className="dark:stroke-teal-400" />
              <circle cx="140" cy="140" r="20" stroke="#00695C" strokeWidth="4" fill="none" className="dark:stroke-teal-400" />

              {/* Bike frame */}
              <path
                d="M60 140 L100 100 L140 140 M100 100 L100 120 M80 120 L120 120"
                stroke="#00695C"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                className="dark:stroke-teal-400"
              />

              {/* Handlebars */}
              <path
                d="M130 110 L140 100 L150 105"
                stroke="#00695C"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="dark:stroke-teal-400"
              />

              {/* Seat */}
              <ellipse cx="70" cy="95" rx="10" ry="5" fill="#00695C" className="dark:fill-teal-400" />

              {/* Person - Body */}
              <circle cx="85" cy="65" r="12" fill="#FFCC80" /> {/* Head */}
              <path
                d="M85 77 L85 105 M85 85 L70 100 M85 85 L105 95"
                stroke="#00695C"
                strokeWidth="4"
                strokeLinecap="round"
                className="dark:stroke-teal-400"
              />

              {/* Hair */}
              <path
                d="M75 60 Q85 50 95 60"
                stroke="#5D4037"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />

              {/* Waving arm */}
              <path
                d="M85 85 L110 70 L115 55"
                stroke="#FFCC80"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Hand */}
              <circle cx="115" cy="55" r="5" fill="#FFCC80" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-bold text-accent text-center mb-4">
          We're sorry to see you go
        </h2>

        {/* Description */}
        <div className="space-y-3 sm:space-y-4 text-[#5A6B7A] dark:text-gray-300 text-sm leading-relaxed">
          <p>
            If you wish to delete your account, please contact our Member Technical Support team
            (select 'Tech Support' in secure messaging recipient list, or email{' '}
            <a
              href="mailto:support@aminy.ai"
              className="text-accent hover:underline"
            >
              support@aminy.ai
            </a>
            ). Indicate "Account deletion" in the subject.
          </p>

          <p>
            We will confirm receipt of your request via email.
          </p>

          {/* Data retention notice */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Important Notice
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-sm">
                  Please note: information that is subject to legal retention requirements,
                  such as your child's care records and clinical data, cannot be deleted and
                  will be retained as required by law.
                </p>
              </div>
            </div>
          </Card>

          {/* What gets deleted */}
          <div className="space-y-2">
            <p className="font-medium text-[#132F43] dark:text-white">
              What will be deleted:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#5A6B7A] dark:text-[#8A9BA8]">
              <li>Your account login credentials</li>
              <li>Chat conversation history with Aminy AI</li>
              <li>Community posts and comments</li>
              <li>Personal preferences and settings</li>
              <li>Referral history and rewards</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-[#132F43] dark:text-white">
              What will be retained (per legal requirements):
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#5A6B7A] dark:text-[#8A9BA8]">
              <li>Care plan documentation</li>
              <li>Clinical session notes</li>
              <li>Treatment records</li>
              <li>Billing and payment history</li>
            </ul>
          </div>
        </div>

        {/* Data Export */}
        <Card className="p-4 bg-[#EEF4F8] dark:bg-blue-900/20 border-[#C8DDE8] dark:border-blue-800">
          <div className="flex gap-3">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#4A6478] dark:text-blue-300 mb-1">
                Download Your Data First
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
                Export your child&apos;s records in FHIR R4 format before deletion.
                This file can be imported into other healthcare apps.
              </p>
              <Button
                onClick={handleExportData}
                disabled={exporting}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300"
              >
                {exporting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Download My Data (FHIR R4)</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Self-service deletion */}
        {!deletionRequested ? (
          <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mt-4">
            <div className="space-y-3">
              <p className="font-medium text-red-800 dark:text-red-300">
                Request Account Deletion
              </p>
              <p className="text-red-700 dark:text-red-400 text-sm">
                Type <strong>DELETE</strong> below to confirm. Your subscription will be cancelled
                and your account will be queued for deletion within 30 days.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-red-400"
              />
              <Button
                onClick={handleRequestDeletion}
                disabled={confirmText !== 'DELETE' || requestingDeletion}
                className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {requestingDeletion ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" />Delete My Account</>
                )}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mt-4">
            <p className="font-medium text-green-800 dark:text-green-300 mb-1">
              ✅ Deletion Request Submitted
            </p>
            <p className="text-green-700 dark:text-green-400 text-sm">
              Your account deletion request has been received. You will receive a confirmation
              email at <strong>{userEmail}</strong> within 30 days.
              Your subscription has been cancelled.
            </p>
          </Card>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={onMessageSupport}
            variant="outline"
            className="w-full"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Message Tech Support Instead
          </Button>

          <Button
            variant="ghost"
            className="w-full text-[#5A6B7A]"
            onClick={onBack}
          >
            Go Back
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-sm text-[#8A9BA8] dark:text-[#5A6B7A] text-center mt-6">
          Account deletion requests are processed within 30 days per our privacy policy.
          Clinical records are retained as required by law.
        </p>
      </div>
    </div>
  );
}

export default DeleteAccount;
