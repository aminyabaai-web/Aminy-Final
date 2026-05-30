// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Terms of Service Page
 * Required for App Store compliance
 */

import React from 'react';
import { ArrowLeft, FileText, AlertTriangle, CreditCard, Users, Scale, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';

interface TermsOfServiceProps {
  onBack: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
  const lastUpdated = 'January 21, 2026';
  const effectiveDate = 'January 21, 2026';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Agreement to Terms</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Welcome to Aminy! These Terms of Service ("Terms") govern your use of the Aminy mobile
              application and related services (the "Service") operated by Aminy, LLC ("we," "us," or "our").
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree
              with any part of the Terms, you may not access the Service.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              <strong>Effective Date:</strong> {effectiveDate}
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              Aminy is an AI-powered behavioral wellness companion designed to help parents and caregivers
              support children's development using principles of Applied Behavior Analysis (ABA). The Service provides:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
              <li>Personalized behavioral guidance and recommendations</li>
              <li>Daily routines and activity planning</li>
              <li>Progress tracking and reporting</li>
              <li>Educational resources and tools</li>
              <li>Optional telehealth consultations (where available)</li>
            </ul>
          </section>

          {/* Medical Disclaimer */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Important Medical Disclaimer</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                <strong>Aminy is NOT a substitute for professional medical, psychological, or therapeutic care.</strong>
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-4">
                <li>We do not provide medical diagnoses or treatment</li>
                <li>Our AI recommendations are educational and informational only</li>
                <li>Always consult qualified healthcare professionals for medical concerns</li>
                <li>In case of emergency, call 911 or your local emergency services</li>
                <li>If you or your child are in crisis, contact the 988 Suicide & Crisis Lifeline</li>
              </ul>
            </div>
          </section>

          {/* User Accounts */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">User Accounts</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information as needed</li>
              <li>Keep your password secure and confidential</li>
              <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
              <li>Be responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* Subscriptions and Payments */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Subscriptions and Payments</h2>
            </div>
            <h3 className="font-medium text-gray-900 mt-4 mb-2">Subscription Plans</h3>
            <p className="text-gray-600 leading-relaxed">
              Aminy offers various subscription tiers with different features. Pricing is displayed
              in the app and may change with notice.
            </p>

            <h3 className="font-medium text-gray-900 mt-4 mb-2">Free Trial</h3>
            <p className="text-gray-600 leading-relaxed">
              We may offer free trials. After the trial ends, you will be charged unless you cancel
              before the trial period expires.
            </p>

            <h3 className="font-medium text-gray-900 mt-4 mb-2">Billing</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Subscriptions are billed in advance on a recurring basis</li>
              <li>Payment is processed through Stripe, a secure payment processor</li>
              <li>You authorize us to charge your payment method automatically</li>
            </ul>

            <h3 className="font-medium text-gray-900 mt-4 mb-2">Cancellation</h3>
            <p className="text-gray-600 leading-relaxed">
              You may cancel your subscription at any time through the app settings or by contacting support.
              Cancellation takes effect at the end of the current billing period. We do not provide
              prorated refunds for partial months.
            </p>

            <h3 className="font-medium text-gray-900 mt-4 mb-2">Refunds</h3>
            <p className="text-gray-600 leading-relaxed">
              We offer a 30-day money-back guarantee for new subscribers. Contact support within 30 days
              of your first payment to request a refund.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Impersonate others or provide false information</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code or content</li>
              <li>Harvest or collect user information without consent</li>
              <li>Use the Service to harm children in any way</li>
              <li>Share your account credentials with others</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service and its original content (excluding user-provided content) are and will remain
              the exclusive property of Aminy, LLC and its licensors. The Service is protected by
              copyright, trademark, and other laws.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              You retain ownership of any content you submit to the Service, but grant us a license
              to use it to provide and improve our services.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Limitation of Liability</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
              <li>The Service is provided "as is" without warranties of any kind</li>
              <li>We do not guarantee the accuracy or completeness of AI recommendations</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount you paid in the past 12 months</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Dispute Resolution</h2>
            <p className="text-gray-600 leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through:
            </p>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mt-4">
              <li>Good faith negotiation between the parties</li>
              <li>Mediation by a mutually agreed mediator</li>
              <li>Binding arbitration in accordance with applicable rules</li>
            </ol>
            <p className="text-gray-600 leading-relaxed mt-4">
              These Terms shall be governed by the laws of the State of Arizona, without regard
              to its conflict of law provisions.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of
              material changes through the app or by email. Your continued use of the Service
              after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:legal@aminy.ai" className="text-teal-600 hover:underline">
                  legal@aminy.ai
                </a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Support:</strong>{' '}
                <a href="mailto:support@aminy.ai" className="text-teal-600 hover:underline">
                  support@aminy.ai
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
