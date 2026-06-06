// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Privacy Policy Page
 * Required for App Store compliance and GDPR/CCPA
 */

import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Globe } from 'lucide-react';
import { Button } from './ui/button';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const lastUpdated = 'January 21, 2026';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Privacy Policy</h1>
            <p className="text-sm text-[#5A6B7A]">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#6B9080]/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#6B9080]" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Introduction</h2>
            </div>
            <p className="text-[#5A6B7A] leading-relaxed">
              Aminy ("we," "our," or "us") is committed to protecting your privacy and the privacy of your family.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our mobile application and related services (collectively, the "Service").
            </p>
            <p className="text-[#5A6B7A] leading-relaxed mt-4">
              We understand that you are trusting us with sensitive information about your child and family.
              We take this responsibility seriously and have implemented strong safeguards to protect your data.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-700" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Information We Collect</h2>
            </div>

            <h3 className="font-medium text-[#1B2733] mt-4 mb-2">Information You Provide</h3>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2">
              <li>Account information (name, email, password)</li>
              <li>Child profile information (name, age, developmental concerns)</li>
              <li>Health and behavioral information you choose to share</li>
              <li>Communications with our AI assistant and support team</li>
              <li>Payment information (processed securely by Stripe)</li>
            </ul>

            <h3 className="font-medium text-[#1B2733] mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2">
              <li>Device information (device type, operating system)</li>
              <li>Usage data (features used, time spent in app)</li>
              <li>Log data (IP address, browser type, access times)</li>
              <li>Analytics data to improve our services</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">How We Use Your Information</h2>
            </div>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2">
              <li>Provide personalized behavioral wellness guidance</li>
              <li>Generate AI-powered recommendations for your child</li>
              <li>Improve and personalize your experience</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important updates about our Service</li>
              <li>Respond to your inquiries and provide support</li>
              <li>Analyze usage to improve our features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Data Security</h2>
            </div>
            <p className="text-[#5A6B7A] leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2 mt-4">
              <li>All data is encrypted in transit (TLS/SSL) and at rest</li>
              <li>We use secure authentication through Supabase</li>
              <li>Payment processing is handled by PCI-compliant Stripe</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Employee access is strictly limited and logged</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Data Sharing</h2>
            </div>
            <p className="text-[#5A6B7A] leading-relaxed">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2 mt-4">
              <li><strong>Service Providers:</strong> Third parties that help us operate (hosting, analytics, payments)</li>
              <li><strong>Healthcare Providers:</strong> Only with your explicit consent for care coordination</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">Your Rights</h2>
            <p className="text-[#5A6B7A] leading-relaxed">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-[#5A6B7A] space-y-2 mt-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data ("right to be forgotten")</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-[#5A6B7A] leading-relaxed mt-4">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:privacy@aminy.ai" className="text-[#6B9080] hover:underline">
                privacy@aminy.ai
              </a>
            </p>
          </section>

          {/* Children's Privacy (COPPA) */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">Children's Privacy</h2>
            <p className="text-[#5A6B7A] leading-relaxed">
              Aminy is designed for parents and caregivers to use on behalf of their children.
              We do not knowingly collect information directly from children under 13.
              All child-related data is collected from and controlled by the parent or guardian account holder.
            </p>
            <p className="text-[#5A6B7A] leading-relaxed mt-4">
              Parents have full control over their child's data and can request deletion at any time.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">Data Retention</h2>
            <p className="text-[#5A6B7A] leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services.
              If you delete your account, we will delete your personal data within 30 days, except where
              we are required to retain it for legal or legitimate business purposes.
            </p>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-pink-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Contact Us</h2>
            </div>
            <p className="text-[#5A6B7A] leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 p-4 bg-[#FAF7F2] rounded-lg">
              <p className="text-[#3A4A57]">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@aminy.ai" className="text-[#6B9080] hover:underline">
                  privacy@aminy.ai
                </a>
              </p>
              <p className="text-[#5A6B7A] text-sm mt-2">
                Aminy, LLC
              </p>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">Changes to This Policy</h2>
            <p className="text-[#5A6B7A] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the "Last updated" date.
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
