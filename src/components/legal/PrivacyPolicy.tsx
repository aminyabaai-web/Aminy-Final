// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

interface SectionProps {
  title: string;
  id: string;
  children: React.ReactNode;
}

function Section({ title, id, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="border-b border-gray-200 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {open ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      {open && <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>}
    </div>
  );
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const effectiveDate = 'April 1, 2026';
  const lastUpdated = 'April 1, 2026';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#F0EDE8]">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <Shield className="h-6 w-6 text-[#6B9080]" />
          <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-2 text-xs text-gray-500">
          Effective Date: {effectiveDate} | Last Updated: {lastUpdated}
        </p>
        <p className="mb-6 text-sm text-gray-700">
          Aminy (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy
          and security of the personal information and protected health information (PHI) of our users.
          This Privacy Policy describes how we collect, use, disclose, and safeguard your information
          when you use the Aminy application, website, and related services (collectively, the &quot;Platform&quot;).
        </p>

        {/* Table of Contents */}
        <nav className="mb-6 rounded-lg bg-[#FAF7F2] p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Contents</p>
          <ol className="space-y-1 text-sm text-[#6B9080]">
            {[
              ['#info-collect', '1. Information We Collect'],
              ['#how-use', '2. How We Use Your Information'],
              ['#hipaa', '3. HIPAA Compliance'],
              ['#coppa', '4. Children\'s Privacy (COPPA)'],
              ['#sharing', '5. Third-Party Sharing & Disclosure'],
              ['#storage', '6. Data Storage & Security'],
              ['#retention', '7. Data Retention'],
              ['#rights', '8. Your Rights'],
              ['#ccpa', '9. California Privacy Rights (CCPA)'],
              ['#breach', '10. Breach Notification'],
              ['#cookies', '11. Cookies & Tracking'],
              ['#international', '12. International Users'],
              ['#ai-data', '13. AI Data Usage Disclosure'],
              ['#telehealth-consent', '14. Telehealth Consent'],
              ['#biometric-data', '15. Biometric Data Notice'],
              ['#changes', '16. Changes to This Policy'],
              ['#contact', '17. Contact Us'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <Section title="1. Information We Collect" id="info-collect">
          <p><strong>a. Information You Provide Directly</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Account registration information (name, email, phone, password)</li>
            <li>Child profile information (name, date of birth, diagnoses, treatment plans)</li>
            <li>Insurance and billing information (plan details, member ID, group number)</li>
            <li>Provider credentials (NPI, licensure, certifications)</li>
            <li>Communications with providers and support staff</li>
            <li>Consent forms and electronic signatures</li>
            <li>Payment information (processed via Stripe; we do not store full card numbers)</li>
          </ul>

          <p><strong>b. Protected Health Information (PHI)</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Clinical session notes and progress data</li>
            <li>Treatment plans and behavioral assessments</li>
            <li>Telehealth session recordings (when consented)</li>
            <li>Electronic Visit Verification (EVV) data including GPS coordinates</li>
            <li>Claims and billing records</li>
          </ul>

          <p><strong>c. Automatically Collected Information</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Device information (type, OS, browser version)</li>
            <li>Usage analytics (screens visited, features used, session duration)</li>
            <li>IP address and approximate geolocation</li>
            <li>Crash reports and performance metrics</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information" id="how-use">
          <ul className="ml-4 list-disc space-y-1">
            <li>Provide, maintain, and improve the Platform and its features</li>
            <li>Facilitate telehealth sessions and care coordination</li>
            <li>Process insurance claims and manage billing</li>
            <li>Generate AI-powered insights for care recommendations (with consent)</li>
            <li>Verify provider credentials and maintain compliance</li>
            <li>Send appointment reminders, treatment updates, and administrative communications</li>
            <li>Detect and prevent fraud, abuse, and security threats</li>
            <li>Comply with legal and regulatory obligations</li>
            <li>Conduct de-identified research to improve autism care outcomes (with consent)</li>
          </ul>
        </Section>

        <Section title="3. HIPAA Compliance" id="hipaa">
          <p>
            Aminy operates as a Business Associate under the Health Insurance Portability and
            Accountability Act (HIPAA). We implement administrative, physical, and technical
            safeguards to protect PHI in accordance with the HIPAA Privacy Rule, Security Rule,
            and Breach Notification Rule.
          </p>
          <p><strong>Our HIPAA obligations include:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Executing Business Associate Agreements (BAAs) with all covered entity partners</li>
            <li>Encrypting PHI in transit (TLS 1.2+) and at rest (AES-256)</li>
            <li>Maintaining audit logs for all PHI access</li>
            <li>Implementing role-based access controls</li>
            <li>Conducting regular security risk assessments</li>
            <li>Training all workforce members on HIPAA requirements</li>
            <li>Limiting PHI use to the minimum necessary for each purpose</li>
            <li>Honoring patient rights to access, amend, and receive an accounting of disclosures</li>
          </ul>
          <p>
            Telehealth sessions are conducted over HIPAA-conscious infrastructure with end-to-end
            encryption. Session recordings are encrypted and stored in HIPAA-conscious cloud storage
            accessible only to authorized parties.
          </p>
        </Section>

        <Section title="4. Children's Privacy (COPPA)" id="coppa">
          <p>
            Aminy complies with the Children&apos;s Online Privacy Protection Act (COPPA). We do not
            knowingly collect personal information from children under 13 without verifiable parental
            consent. When a parent creates a child profile for a child under 13, we obtain explicit
            parental consent — via our in-app COPPA Consent Gate — before collecting any information
            about that child.
          </p>
          <p>
            The Platform includes features designed for use by and on behalf of children under 13.
            Our specific COPPA commitments:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>We require verifiable parental consent before collecting personal information from children under 13</li>
            <li>Parents or legal guardians must create and manage child accounts</li>
            <li>Child-facing features (Junior Mode) are designed to minimize data collection</li>
            <li>We do not serve behavioral advertising to children</li>
            <li>Parents may review, update, or delete their child&apos;s information at any time by contacting{' '}
              <a href="mailto:privacy@aminy.app" className="text-[#6B9080] underline">privacy@aminy.app</a>
            </li>
            <li>We do not condition a child&apos;s participation on providing more information than reasonably necessary</li>
            <li>Parents may withdraw consent at any time from Account Settings &rsaquo; Children&apos;s Data</li>
          </ul>
          <p>
            AI features used in Junior Mode operate locally on-device when possible. When cloud
            processing is required, data is processed ephemerally and not retained beyond the session.
          </p>
          <p>
            If you believe we have inadvertently collected information from a child under 13 without
            proper parental consent, please contact us immediately at{' '}
            <a href="mailto:privacy@aminy.app" className="text-[#6B9080] underline">privacy@aminy.app</a>{' '}
            and we will promptly delete that information.
          </p>
        </Section>

        <Section title="5. Third-Party Sharing & Disclosure" id="sharing">
          <p>We may share information with the following categories of third parties:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Healthcare Providers:</strong> PHI shared for treatment, payment, and healthcare operations as permitted under HIPAA</li>
            <li><strong>Insurance Payers:</strong> Claims data, EVV records, and authorization requests as required for reimbursement</li>
            <li><strong>Practice Management Systems:</strong> Integration with Rethink and similar platforms via secure APIs under BAAs</li>
            <li><strong>Payment Processors:</strong> Stripe processes payments under PCI DSS compliance; we share only necessary transaction data</li>
            <li><strong>Cloud Infrastructure:</strong> Supabase (database), Daily.co (telehealth), Vercel (hosting) — all under BAAs</li>
            <li><strong>Legal & Regulatory:</strong> When required by law, subpoena, court order, or to protect rights and safety</li>
            <li><strong>De-identified Research:</strong> Aggregate, de-identified data may be shared for research with appropriate institutional oversight</li>
          </ul>
          <p>
            <strong>We never sell personal information or PHI.</strong> We do not share data with
            advertising networks or data brokers.
          </p>
        </Section>

        <Section title="6. Data Storage & Security" id="storage">
          <ul className="ml-4 list-disc space-y-1">
            <li>All data is stored in SOC 2 Type II certified data centers within the United States</li>
            <li>PHI is encrypted at rest using AES-256 and in transit using TLS 1.2+</li>
            <li>Database access requires multi-factor authentication and is restricted via Row Level Security (RLS)</li>
            <li>Telehealth recordings are stored in isolated, encrypted storage buckets</li>
            <li>Regular penetration testing and vulnerability assessments</li>
            <li>24/7 monitoring for unauthorized access attempts</li>
            <li>Automated backups with point-in-time recovery</li>
          </ul>
        </Section>

        <Section title="7. Data Retention" id="retention">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Active Accounts:</strong> Data retained for the duration of the account plus applicable retention periods</li>
            <li><strong>Clinical Records:</strong> Retained for a minimum of 7 years after last treatment (or until minor reaches age 25, whichever is longer), per Arizona law</li>
            <li><strong>Billing Records:</strong> Retained for 7 years per IRS and payer requirements</li>
            <li><strong>Telehealth Recordings:</strong> Retained for the period specified in consent form (default: 3 years), then securely deleted</li>
            <li><strong>Session Analytics:</strong> De-identified after 24 months</li>
            <li><strong>Deleted Accounts:</strong> Personal data purged within 30 days; clinical records retained per legal requirements</li>
          </ul>
        </Section>

        <Section title="8. Your Rights" id="rights">
          <p>You have the right to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal information and PHI</li>
            <li><strong>Correction:</strong> Request amendment of inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Restriction:</strong> Request restriction of certain processing activities</li>
            <li><strong>Accounting of Disclosures:</strong> Request a record of who has accessed your PHI</li>
            <li><strong>Revoke Consent:</strong> Withdraw consent for optional data processing at any time</li>
            <li><strong>Complaint:</strong> File a complaint with the HHS Office for Civil Rights</li>
          </ul>
          <p>
            To exercise these rights, contact us at privacy@aminy.app or through the in-app
            Settings &gt; Privacy &gt; Data Rights menu.
          </p>
        </Section>

        <Section title="9. California Privacy Rights (CCPA/CPRA)" id="ccpa">
          <p>If you are a California resident, you have additional rights under the CCPA/CPRA:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Right to Know:</strong> Request disclosure of what personal information we collect, use, and share</li>
            <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
            <li><strong>Right to Opt-Out:</strong> Opt out of the sale or sharing of personal information (note: we do not sell personal information)</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
            <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
            <li><strong>Right to Limit:</strong> Limit our use of sensitive personal information</li>
          </ul>
          <p>
            We respond to verified consumer requests within 45 days. To submit a request,
            email privacy@aminy.app with the subject line &quot;CCPA Request.&quot;
          </p>
        </Section>

        <Section title="10. Breach Notification" id="breach">
          <p>
            In the event of a breach of unsecured PHI, we will notify affected individuals within
            60 days of discovery, as required by the HIPAA Breach Notification Rule. Notification
            will include:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>A description of the breach and the types of information involved</li>
            <li>Steps individuals should take to protect themselves</li>
            <li>What we are doing to investigate, mitigate harm, and prevent future breaches</li>
            <li>Contact information for follow-up questions</li>
          </ul>
          <p>
            Breaches affecting 500 or more individuals will be reported to the HHS Secretary
            and prominent media outlets. All breaches are logged in our annual breach report.
          </p>
        </Section>

        <Section title="11. Cookies & Tracking" id="cookies">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Essential Cookies:</strong> Required for authentication and security (cannot be disabled)</li>
            <li><strong>Analytics:</strong> Privacy-focused analytics to improve user experience (can be opted out)</li>
            <li><strong>No Third-Party Advertising Cookies:</strong> We do not use advertising trackers</li>
            <li><strong>Do Not Track:</strong> We honor browser Do Not Track signals</li>
          </ul>
        </Section>

        <Section title="12. International Users" id="international">
          <p>
            The Platform is operated from the United States. If you access the Platform from
            outside the U.S., your data will be transferred to and processed in the U.S.
            By using the Platform, you consent to this transfer. We process data in compliance
            with applicable data protection laws.
          </p>
        </Section>

        <Section title="13. AI Data Usage Disclosure" id="ai-data">
          <p>
            The Platform includes an AI-powered assistant (&quot;Aminy AI&quot;) that provides
            informational support and guidance. By using this feature, you acknowledge the following:
          </p>
          <p><strong>a. Data Processing</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Conversations with Aminy AI are processed via the Claude API, provided by Anthropic</li>
            <li>Conversation data is transmitted securely over encrypted connections (TLS 1.2+) to Anthropic&apos;s servers for processing</li>
            <li>Anthropic processes data in accordance with its own privacy policy and our Business Associate Agreement</li>
          </ul>
          <p><strong>b. Data Storage & Continuity</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Conversation history is stored in our database to provide continuity across sessions</li>
            <li>You may delete individual conversations or your entire conversation history at any time from Settings &gt; AI Assistant &gt; Conversation History</li>
            <li>The AI may store &quot;memory facts&quot; — key details you share (e.g., your child&apos;s name, diagnoses, preferences) to personalize future interactions</li>
            <li>Memory facts can be reviewed, edited, or deleted at any time from Settings &gt; AI Assistant &gt; Memory</li>
          </ul>
          <p><strong>c. AI Limitations & Clinical Disclaimer</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>AI-generated responses are informational only and do not constitute medical advice, diagnosis, or treatment recommendations</li>
            <li>The AI does not make clinical decisions and cannot replace the judgment of a licensed healthcare professional</li>
            <li>Always consult your child&apos;s BCBA, pediatrician, or other qualified provider for clinical concerns</li>
          </ul>
          <p><strong>d. Training & Model Improvement</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Your conversation data is <strong>not</strong> used to train, fine-tune, or improve AI models</li>
            <li>Aminy has a zero-data-retention agreement with Anthropic; your conversations are not retained by the AI provider after processing</li>
            <li>De-identified, aggregate usage metrics (e.g., feature usage frequency) may be used to improve the Platform experience, but never the content of your conversations</li>
          </ul>
        </Section>

        <Section title="14. Telehealth Consent" id="telehealth-consent">
          <p>
            By using the telehealth features of the Platform, you provide informed consent to receive
            healthcare services via audio and/or video technology. The following disclosures apply:
          </p>
          <p><strong>a. State-Specific Consent (Arizona)</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>In accordance with Arizona Revised Statutes &sect; 36-3602, telehealth services are provided by licensed healthcare professionals authorized to practice in the State of Arizona</li>
            <li>You have the right to receive telehealth services and may withdraw consent at any time</li>
            <li>Telehealth services are subject to the same standard of care as in-person services</li>
            <li>Your provider will verify your physical location at the start of each session to ensure compliance with state licensing requirements</li>
            <li>You may request an in-person visit in lieu of a telehealth session at any time</li>
          </ul>
          <p><strong>b. Recording Consent</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Telehealth sessions may be recorded for clinical documentation purposes only with your explicit, prior consent</li>
            <li>You will be prompted to provide or decline recording consent before each session</li>
            <li>Recordings are encrypted, stored in HIPAA-conscious infrastructure, and accessible only to authorized clinical staff</li>
            <li>You may request deletion of any recording by contacting privacy@aminy.app</li>
            <li>If you decline recording, the session will proceed without recording and no penalty will apply</li>
          </ul>
          <p><strong>c. Limitations of Telehealth</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Telehealth may not be suitable for all clinical situations, including emergencies or conditions requiring physical examination</li>
            <li>Technical issues (internet connectivity, device compatibility, audio/video quality) may affect session quality or require rescheduling</li>
            <li>There is a risk that information transmitted during a telehealth session could be intercepted, despite encryption safeguards</li>
            <li>Your provider will advise you if your clinical needs require in-person evaluation</li>
          </ul>
          <p><strong>d. Emergency Procedures During Telehealth</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Telehealth is <strong>not</strong> a substitute for emergency medical services</li>
            <li>If you or your child experience a medical or behavioral emergency during a session, call 911 immediately</li>
            <li>At the start of each session, you will be asked to confirm your physical address so emergency services can be dispatched if needed</li>
            <li>Your provider may discontinue the telehealth session and direct you to emergency services if they determine an emergency exists</li>
            <li>Emergency contact information should be kept current in your account settings</li>
          </ul>
        </Section>

        <Section title="15. Biometric Data Notice" id="biometric-data">
          <p>
            The Platform may interact with biometric-adjacent data during certain features.
            We are committed to transparency about how this data is handled:
          </p>
          <p><strong>a. Voice Data During Telehealth</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Audio from telehealth sessions is transmitted in real-time for the purpose of conducting the clinical session</li>
            <li>Voice data is <strong>not stored</strong> unless you have explicitly consented to session recording</li>
            <li>We do not perform voice recognition, voiceprint analysis, or speaker identification</li>
            <li>Audio streams are encrypted end-to-end during transmission</li>
          </ul>
          <p><strong>b. Camera Data During Video Calls</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Video from telehealth sessions is transmitted in real-time only for the purpose of the clinical session</li>
            <li>Video data is <strong>not stored</strong> unless you have explicitly consented to session recording</li>
            <li>Video streams are processed in real-time and discarded after transmission</li>
          </ul>
          <p><strong>c. No Facial Recognition</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Aminy does <strong>not</strong> use facial recognition technology</li>
            <li>We do not create, store, or analyze facial geometry, faceprints, or any biometric identifiers derived from video</li>
            <li>No computer vision or image analysis is performed on video streams for identification purposes</li>
          </ul>
          <p>
            If you have questions about how biometric-adjacent data is handled, contact our
            Privacy Officer at privacy-officer@aminy.app.
          </p>
        </Section>

        <Section title="16. Changes to This Policy" id="changes">
          <p>
            We may update this Privacy Policy periodically. Material changes will be communicated
            via in-app notification and email at least 30 days before taking effect. Continued
            use of the Platform after changes become effective constitutes acceptance of the
            revised policy.
          </p>
        </Section>

        <Section title="17. Contact Us" id="contact">
          <p>For privacy-related inquiries or to exercise your rights:</p>
          <div className="mt-2 rounded-lg bg-[#FAF7F2] p-4 text-sm">
            <p><strong>Aminy Privacy Team</strong></p>
            <p>Email: privacy@aminy.app</p>
            <p>Phone: 1-800-AMINY-HELP</p>
            <p>Mail: Aminy Inc., 5070 N. 40th Street, Suite 105, Phoenix, AZ 85018</p>
            <p className="mt-2">
              <strong>HIPAA Privacy Officer:</strong> privacy-officer@aminy.app
            </p>
            <p>
              <strong>HHS Office for Civil Rights:</strong>{' '}
              <a
                href="https://www.hhs.gov/hipaa/filing-a-complaint"
                className="text-[#6B9080] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                File a complaint
              </a>
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
