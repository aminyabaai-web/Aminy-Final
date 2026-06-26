// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
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
    <div id={id} className="border-b border-[#E8E4DF] py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-[#132F43]">{title}</h2>
        {open ? <ChevronUp className="h-5 w-5 text-[#5A6B7A]" /> : <ChevronDown className="h-5 w-5 text-[#5A6B7A]" />}
      </button>
      {open && <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#3A4A57]">{children}</div>}
    </div>
  );
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  const effectiveDate = 'April 1, 2026';

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#F0EDE8]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          <FileText className="h-6 w-6 text-[#6B9080]" />
          <h1 className="text-xl font-bold text-[#132F43]">Terms of Service</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-2 text-sm text-[#5A6B7A]">Effective Date: {effectiveDate}</p>
        <p className="mb-6 text-sm text-[#3A4A57]">
          Welcome to Aminy. These Terms of Service (&quot;Terms&quot;) govern your access to and use
          of the Aminy platform, including our website, mobile application, telehealth services,
          and related features (collectively, the &quot;Platform&quot;). By creating an account or
          using the Platform, you agree to be bound by these Terms.
        </p>

        <Section title="1. Eligibility" id="eligibility">
          <p>To use the Platform, you must:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Be at least 18 years of age (or the age of majority in your jurisdiction)</li>
            <li>Have the legal authority to enter into a binding agreement</li>
            <li>If creating a child account, be the parent or legal guardian of the child</li>
            <li>If registering as a provider, hold valid, unrestricted licensure in your state(s) of practice</li>
            <li>Provide accurate, current, and complete registration information</li>
            <li>Not have been previously suspended or removed from the Platform</li>
          </ul>
          <p>
            Provider accounts are subject to credentialing verification. We reserve the right to
            deny or revoke access if credentials cannot be verified or are found to be invalid.
          </p>
        </Section>

        <Section title="2. Account Responsibilities" id="accounts">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Use a strong, unique password and enable multi-factor authentication when available</li>
            <li>Immediately notify us of any unauthorized access to your account</li>
            <li>Not share your account with others or allow others to access protected health information through your account</li>
            <li>Keep your contact information current</li>
          </ul>
          <p>
            You are liable for all activity conducted through your account, whether or not you
            authorized that activity, except to the extent caused by our breach of these Terms.
          </p>
        </Section>

        <Section title="3. Subscription Plans & Billing" id="subscriptions">
          <p><strong>a. Plans.</strong> The Platform offers multiple subscription tiers:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Free Tier:</strong> Basic access to community features, limited provider search, and educational resources</li>
            <li><strong>Family Plan:</strong> Full access to child tracking, AI insights, Junior Mode, provider matching, and telehealth</li>
            <li><strong>Provider Plan:</strong> Practice management tools, credentialing, claims, EVV, and analytics</li>
            <li><strong>Enterprise:</strong> Custom pricing for organizations with multiple providers</li>
          </ul>

          <p><strong>b. Billing.</strong> Subscriptions are billed monthly or annually through Stripe.
            By subscribing, you authorize recurring charges to your payment method. Prices are subject
            to change with 30 days&apos; notice.</p>

          <p><strong>c. Free Trials.</strong> Trial periods, if offered, automatically convert to paid
            subscriptions unless cancelled before the trial ends.</p>

          <p><strong>d. Refunds.</strong> We offer a 14-day satisfaction guarantee for new subscriptions.
            Beyond this period, subscriptions are non-refundable for partially used billing periods.
            You may cancel at any time to prevent future charges.</p>

          <p><strong>e. Taxes.</strong> You are responsible for any applicable taxes. We will collect and
            remit sales tax where legally required.</p>
        </Section>

        <Section title="4. Telehealth Services" id="telehealth">
          <p><strong>IMPORTANT: Telehealth is not a substitute for emergency medical services.</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Telehealth services are provided by independently licensed healthcare professionals, not by Aminy</li>
            <li>Aminy provides the technology platform; providers are solely responsible for clinical decisions</li>
            <li>Telehealth may not be appropriate for all conditions or situations</li>
            <li>Technical issues (internet connectivity, device compatibility) may affect session quality</li>
            <li>Telehealth sessions are subject to the laws of the state where the patient is physically located</li>
            <li>Providers must hold valid licensure in the state where the patient is located at the time of the session</li>
            <li>In case of emergency, call 911 or go to the nearest emergency room</li>
          </ul>
          <p>
            By using telehealth features, you acknowledge that you have read, understood, and
            signed the separate Telehealth Informed Consent.
          </p>
        </Section>

        <Section title="5. AI Features Disclaimer" id="ai-disclaimer">
          <p>
            The Platform uses artificial intelligence and machine learning to provide insights,
            recommendations, and decision support. You understand and agree that:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>AI features are informational tools, not medical advice or clinical recommendations</li>
            <li>AI-generated content should be reviewed by qualified professionals before clinical use</li>
            <li>AI models may produce inaccurate or incomplete output</li>
            <li>AI features do not replace professional clinical judgment</li>
            <li>Data used for AI processing is handled in accordance with our Privacy Policy and HIPAA requirements</li>
            <li>You should not rely solely on AI-generated recommendations for treatment decisions</li>
          </ul>
          <p>
            Providers using AI-assisted features retain full clinical responsibility for treatment
            decisions made using AI-generated insights.
          </p>
        </Section>

        <Section title="6. Intellectual Property" id="ip">
          <p>
            <strong>a. Aminy Platform IP.</strong> The Platform, including all software, source code,
            designs, text, graphics, logos, trademarks, service marks, algorithms, AI models,
            data structures, APIs, and all content created by Aminy, is owned exclusively by
            Aminy Inc. and is protected by United States and international copyright, trademark,
            patent, trade secret, and other intellectual property laws. All rights not expressly
            granted herein are reserved by Aminy.
          </p>
          <p>
            <strong>b. Your Content.</strong> You retain full ownership of content you upload or submit
            to the Platform (e.g., community posts, profile information, photos, documents). By
            submitting content, you grant Aminy a non-exclusive, worldwide, royalty-free, sublicensable
            license to use, reproduce, display, distribute, and create derivative works of your content
            solely in connection with operating, improving, and promoting the Platform. This license
            terminates when you delete your content or account, except for content that has been shared
            with other users or incorporated into anonymized, aggregate data.
          </p>
          <p>
            <strong>c. Clinical Data.</strong> Clinical records, treatment plans, and session notes
            belong to the treating provider and/or patient as determined by applicable law. Aminy
            does not claim ownership of clinical data.
          </p>
          <p>
            <strong>d. Feedback.</strong> If you provide suggestions, feature requests, or feedback
            about the Platform, you grant Aminy an irrevocable, perpetual, worldwide, royalty-free
            license to use, modify, and incorporate such feedback without obligation or compensation
            to you.
          </p>
          <p>
            <strong>e. Prohibited Activities.</strong> You may not, and you agree not to:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Platform</li>
            <li>Scrape, crawl, spider, or use automated tools to extract data or content from the Platform</li>
            <li>Copy, reproduce, or redistribute any portion of the Platform&apos;s code, design, or content</li>
            <li>Remove, alter, or obscure any copyright, trademark, or proprietary notices</li>
            <li>Use Aminy&apos;s name, logo, or trademarks without prior written authorization</li>
            <li>Create derivative works based on the Platform without written permission</li>
          </ul>
        </Section>

        <Section title="7. Acceptable Use" id="acceptable-use">
          <p>You agree not to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Impersonate another person or entity</li>
            <li>Share false credentials or misrepresent qualifications</li>
            <li>Access or attempt to access another user&apos;s account or data</li>
            <li>Transmit malware, viruses, or other harmful code</li>
            <li>Attempt to reverse-engineer, decompile, or extract the Platform&apos;s source code</li>
            <li>Scrape, crawl, or data-mine the Platform</li>
            <li>Use the Platform to harass, bully, or threaten other users</li>
            <li>Post content that is defamatory, obscene, or violates others&apos; rights</li>
            <li>Use AI features to generate fraudulent clinical documentation</li>
            <li>Circumvent security measures or access restrictions</li>
          </ul>
          <p>Violation of these rules may result in immediate account termination.</p>
        </Section>

        <Section title="8. Provider Independent Contractor Disclaimer" id="provider-disclaimer">
          <p>
            <strong>IMPORTANT: PLEASE READ THIS SECTION CAREFULLY.</strong>
          </p>
          <p>
            <strong>a. Independent Contractor Status.</strong> All healthcare providers, including
            Board Certified Behavior Analysts (BCBAs), Registered Behavior Technicians (RBTs),
            speech-language pathologists, occupational therapists, and other licensed professionals
            who offer services through the Platform, are <strong>independent contractors</strong> and
            are <strong>not employees, agents, or representatives of Aminy</strong>. Aminy does not
            employ, supervise, direct, or control the clinical activities of any provider.
          </p>
          <p>
            <strong>b. Aminy Does Not Practice Medicine.</strong> Aminy is a technology platform that
            facilitates connections between families and healthcare providers. Aminy does not:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Practice medicine, psychology, behavior analysis, or any other healthcare profession</li>
            <li>Provide medical advice, diagnosis, or treatment</li>
            <li>Make clinical decisions or treatment recommendations</li>
            <li>Supervise or direct the clinical judgment of providers</li>
            <li>Guarantee the qualifications, competence, or quality of any provider</li>
          </ul>
          <p>
            <strong>c. Technology Platform Only.</strong> Aminy provides technology tools including
            scheduling, telehealth infrastructure, data collection, billing support, and communication
            features. The availability of these tools does not create a provider-patient relationship
            between Aminy and any user. All clinical decisions are made solely by the treating provider
            in consultation with the patient or their authorized representative.
          </p>
          <p>
            <strong>d. Provider Responsibility.</strong> Each provider using the Platform is solely
            responsible for:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Maintaining valid, unrestricted licensure and credentials</li>
            <li>All clinical decisions, treatment plans, and therapeutic interventions</li>
            <li>Compliance with applicable laws, regulations, and professional ethics codes</li>
            <li>Maintaining appropriate professional liability insurance</li>
            <li>Accurate documentation and billing practices</li>
          </ul>
        </Section>

        <Section title="9. Limitation of Liability" id="liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AMINY AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
            AND AGENTS SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Clinical outcomes or treatment results</li>
            <li>Acts or omissions of healthcare providers using the Platform</li>
            <li>Service interruptions, data loss, or security breaches beyond our reasonable control</li>
            <li>Errors or inaccuracies in AI-generated content</li>
          </ul>
          <p>
            OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM YOUR USE OF THE PLATFORM
            SHALL NOT EXCEED THE AMOUNT YOU PAID TO AMINY IN THE TWELVE (12) MONTHS PRECEDING
            THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
          </p>
          <p>
            THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
            OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
        </Section>

        <Section title="10. Platform Liability Limitations" id="platform-liability">
          <p>
            In addition to the general limitation of liability above, you specifically acknowledge
            and agree to the following:
          </p>
          <p><strong>a. Not a Substitute for Professional Medical Advice.</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>The Platform, including all content, features, and AI-generated outputs, is not a substitute for professional medical advice, diagnosis, or treatment</li>
            <li>Never disregard professional medical advice or delay seeking it because of information obtained through the Platform</li>
            <li>If you believe your child is experiencing a medical or behavioral emergency, call 911 or go to the nearest emergency room immediately</li>
          </ul>
          <p><strong>b. AI Responses Are Informational Only.</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>The Aminy AI assistant and all AI-powered features provide general informational guidance only</li>
            <li>AI-generated content may contain inaccuracies, omissions, or outdated information</li>
            <li>AI responses are not reviewed by a licensed professional before delivery and should not be relied upon for clinical decisions</li>
            <li>You use AI features at your own risk and should verify any information with a qualified professional</li>
          </ul>
          <p><strong>c. No Guarantee of Clinical Outcomes.</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Aminy does not guarantee any specific clinical, therapeutic, or behavioral outcomes from use of the Platform or services obtained through it</li>
            <li>Treatment results vary by individual, and past results do not guarantee future outcomes</li>
            <li>Progress data, trend reports, and analytics presented on the Platform are for informational purposes and may not reflect actual clinical progress</li>
          </ul>
          <p><strong>d. Provider Credentialing Disclaimers.</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>While Aminy verifies provider credentials at the time of onboarding, we do not guarantee the ongoing validity, accuracy, or completeness of any provider&apos;s credentials, licensure, or certifications</li>
            <li>Credential verification is based on information available at the time of review and may not reflect subsequent disciplinary actions, license suspensions, or credential changes</li>
            <li>You are encouraged to independently verify your provider&apos;s credentials through your state licensing board</li>
            <li>Aminy is not liable for any harm resulting from a provider&apos;s failure to maintain valid credentials</li>
          </ul>
        </Section>

        <Section title="11. Indemnification" id="indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless Aminy and its affiliates, officers,
            directors, employees, and agents from and against any claims, damages, losses,
            liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising
            from or related to:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you submit to the Platform</li>
            <li>For providers: your clinical practice and treatment decisions</li>
          </ul>
        </Section>

        <Section title="12. Dispute Resolution & Arbitration" id="arbitration">
          <p>
            <strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING
            YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY TRIAL.</strong>
          </p>
          <p>
            <strong>a. Informal Resolution.</strong> Before filing any formal dispute, you agree to
            contact us at legal@aminy.app and attempt to resolve the dispute informally for at
            least 30 days. During this period, both parties agree to negotiate in good faith.
          </p>
          <p>
            <strong>b. Binding Arbitration.</strong> Any dispute, claim, or controversy arising out
            of or relating to these Terms, your use of the Platform, or any services obtained through
            the Platform that cannot be resolved informally shall be resolved by <strong>binding
            individual arbitration</strong> administered by the American Arbitration Association (AAA)
            under its Consumer Arbitration Rules. The arbitrator shall have exclusive authority to
            resolve all disputes, including the scope and enforceability of this arbitration clause.
            Arbitration will take place in Maricopa County, Arizona, unless otherwise agreed. The
            arbitrator&apos;s decision shall be final and binding and may be entered as a judgment
            in any court of competent jurisdiction.
          </p>
          <p>
            <strong>c. Class Action Waiver.</strong> YOU AND AMINY AGREE THAT EACH MAY BRING CLAIMS
            AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR
            CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. Unless both
            you and Aminy agree otherwise, the arbitrator may not consolidate more than one person&apos;s
            claims and may not preside over any form of a class, consolidated, or representative
            proceeding. If this class action waiver is found to be unenforceable, then the entirety
            of this arbitration provision shall be null and void.
          </p>
          <p>
            <strong>d. Small Claims Exception.</strong> Notwithstanding the foregoing, either party
            may bring an individual action in small claims court for disputes within the jurisdictional
            limits of such court. Either party may also seek injunctive or other equitable relief in
            any court of competent jurisdiction to prevent the actual or threatened infringement,
            misappropriation, or violation of intellectual property rights or unauthorized data access.
          </p>
          <p>
            <strong>e. 30-Day Opt-Out Period.</strong> You have the right to opt out of this
            arbitration agreement. To opt out, you must send written notice to legal@aminy.app
            within <strong>30 days of creating your account</strong>. Your notice must include your
            name, email address associated with your account, and a clear statement that you wish
            to opt out of the arbitration agreement. If you opt out, neither you nor Aminy will be
            required to arbitrate disputes, and both parties retain the right to pursue claims in
            court. Opting out of arbitration will not affect any other provision of these Terms.
          </p>
          <p>
            <strong>f. Arbitration Fees.</strong> Payment of all filing, administration, and
            arbitrator fees will be governed by the AAA&apos;s Consumer Arbitration Rules. If the
            arbitrator finds that either the substance of your claim or the relief sought is
            frivolous or brought for an improper purpose, then the payment of fees will be
            governed by the AAA Rules.
          </p>
        </Section>

        <Section title="13. Governing Law" id="governing-law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            State of Arizona, without regard to conflict of law principles. For any disputes not
            subject to arbitration, you consent to the exclusive jurisdiction of the state and
            federal courts located in Maricopa County, Arizona.
          </p>
        </Section>

        <Section title="14. Termination" id="termination">
          <p><strong>a. By You.</strong> You may terminate your account at any time through
            Settings &gt; Account &gt; Delete Account. Active subscriptions will continue through
            the end of the current billing period.</p>
          <p><strong>b. By Us.</strong> We may suspend or terminate your account at any time for:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Violation of these Terms or applicable law</li>
            <li>Fraudulent or illegal activity</li>
            <li>Extended inactivity (12+ months with notice)</li>
            <li>Non-payment of fees</li>
            <li>Provider credential revocation or disciplinary action</li>
          </ul>
          <p><strong>c. Effect of Termination.</strong> Upon termination:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Your access to the Platform will cease</li>
            <li>You may request export of your data within 30 days</li>
            <li>Clinical records will be retained per legal requirements</li>
            <li>Provisions that by their nature should survive will survive (including liability limits, indemnification, and arbitration)</li>
          </ul>
        </Section>

        <Section title="15. Modifications" id="modifications">
          <p>
            We may modify these Terms at any time. Material changes will be communicated via email
            and in-app notification at least 30 days before taking effect. Continued use of the
            Platform after changes become effective constitutes acceptance. If you do not agree
            to the modified Terms, you must stop using the Platform and delete your account.
          </p>
        </Section>

        <Section title="16. Miscellaneous" id="miscellaneous">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and any consents you sign, constitute the entire agreement between you and Aminy</li>
            <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in full force</li>
            <li><strong>Waiver:</strong> Our failure to enforce any provision does not constitute a waiver</li>
            <li><strong>Assignment:</strong> You may not assign your rights under these Terms. We may assign our rights in connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Force Majeure:</strong> We are not liable for delays or failures caused by events beyond our reasonable control</li>
          </ul>
        </Section>

        <Section title="17. Contact" id="contact">
          <div className="rounded-lg bg-[#FAF7F2] p-4 text-sm">
            <p><strong>Aminy Inc.</strong></p>
            <p>5070 N. 40th Street, Suite 105</p>
            <p>Phoenix, AZ 85018</p>
            <p>Email: legal@aminy.app</p>
            <p>Phone: 1-800-AMINY-HELP</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
