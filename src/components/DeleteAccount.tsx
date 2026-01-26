/**
 * Delete Account Page
 *
 * Matches OneMedical IMG_1604 style:
 * - Illustration of person on bike
 * - "We're sorry to see you go" header
 * - Data retention notice
 * - Message Tech Support button
 */

import React from 'react';
import { ArrowLeft, MessageSquare, AlertTriangle, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

interface DeleteAccountProps {
  onBack: () => void;
  onMessageSupport: () => void;
  userEmail?: string;
  className?: string;
}

export function DeleteAccount({
  onBack,
  onMessageSupport,
  userEmail,
  className
}: DeleteAccountProps) {
  return (
    <div className={cn('min-h-screen bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Delete Account
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-md mx-auto">
        {/* Illustration - Person on bike */}
        <div className="flex justify-center mb-6">
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
        <h2 className="text-2xl font-bold text-accent text-center mb-4">
          We're sorry to see you go
        </h2>

        {/* Description */}
        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          <p>
            If you wish to delete your account, please contact our Member Technical Support team
            (select 'Tech Support' in secure messaging recipient list, or email{' '}
            <a
              href="mailto:support@aminy.app"
              className="text-accent hover:underline"
            >
              support@aminy.app
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
            <p className="font-medium text-gray-900 dark:text-white">
              What will be deleted:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Your account login credentials</li>
              <li>Chat conversation history with Aminy AI</li>
              <li>Community posts and comments</li>
              <li>Personal preferences and settings</li>
              <li>Referral history and rewards</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">
              What will be retained (per legal requirements):
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Care plan documentation</li>
              <li>Clinical session notes</li>
              <li>Treatment records</li>
              <li>Billing and payment history</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            onClick={onMessageSupport}
            className="w-full bg-accent hover:bg-accent/90 text-white"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Message Tech Support
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = 'mailto:support@aminy.app?subject=Account%20deletion%20request'}
          >
            <Mail className="w-5 h-5 mr-2" />
            Email Support Instead
          </Button>

          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={onBack}
          >
            Cancel
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">
          Account deletion requests are typically processed within 30 days.
          You will receive an email confirmation once your request has been completed.
        </p>
      </div>
    </div>
  );
}

export default DeleteAccount;
