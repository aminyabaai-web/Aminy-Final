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

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  const effectiveDate = 'April 1, 2026';

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <FileText className="h-6 w-6 text-teal-600" />
          <h1 className="text-xl font-bold text-gray-900">Terms of Service</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-2 text-xs text-gray-500">Effective Date: {effectiveDate}</p>
        <p className="mb-6 text-sm text-gray-700">
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
            <strong>a. Our IP.</strong> The Platform, including all software, designs, text, graphics,
            logos, algorithms, and content created by Aminy, is owned by Aminy Inc. and protected
            by copyright, trademark, and other intellectual property laws. You may not copy, modify,
            distribute, sell, or lease any part of the Platform without written permission.
          </p>
          <p>
            <strong>b. Your Content.</strong> You retain ownership of content you submit to the Platform
            (e.g., community posts, profile information). By posting content, you grant Aminy a
            non-exclusive, worldwide, royalty-free license to use, display, and distribute your
            content in connection with the Platform.
          </p>
          <p>
            <strong>c. Clinical Data.</strong> Clinical records, treatment plans, and session notes
            belong to the treating provider and/or patient as determined by applicable law. Aminy
            does not claim ownership of clinical data.
          </p>
          <p>
            <strong>d. Feedback.</strong> If you provide suggestions or feedback about the Platform,
            we may use it without obligation to you.
          </p>
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

        <Section title="8. Limitation of Liability" id="liability">
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

        <Section title="9. Indemnification" id="indemnification">
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

        <Section title="10. Dispute Resolution & Arbitration" id="arbitration">
          <p>
            <strong>a. Informal Resolution.</strong> Before filing any formal dispute, you agree to
            contact us at legal@aminy.app and attempt to resolve the dispute informally for at
            least 30 days.
          </p>
          <p>
            <strong>b. Binding Arbitration.</strong> Any dispute not resolved informally shall be
            resolved by binding arbitration administered by the American Arbitration Association
            (AAA) under its Consumer Arbitration Rules. Arbitration will take place in Maricopa
            County, Arizona, unless otherwise agreed.
          </p>
          <p>
            <strong>c. Class Action Waiver.</strong> YOU AGREE THAT ANY DISPUTE RESOLUTION WILL
            BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR
            REPRESENTATIVE ACTION. If this waiver is found unenforceable, the entire arbitration
            agreement shall be void.
          </p>
          <p>
            <strong>d. Exceptions.</strong> Either party may bring claims in small claims court.
            Either party may seek injunctive relief in any court of competent jurisdiction for
            intellectual property infringement or unauthorized data access.
          </p>
          <p>
            <strong>e. Opt-Out.</strong> You may opt out of this arbitration agreement by sending
            written notice to legal@aminy.app within 30 days of creating your account.
          </p>
        </Section>

        <Section title="11. Governing Law" id="governing-law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            State of Arizona, without regard to conflict of law principles. For any disputes not
            subject to arbitration, you consent to the exclusive jurisdiction of the state and
            federal courts located in Maricopa County, Arizona.
          </p>
        </Section>

        <Section title="12. Termination" id="termination">
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

        <Section title="13. Modifications" id="modifications">
          <p>
            We may modify these Terms at any time. Material changes will be communicated via email
            and in-app notification at least 30 days before taking effect. Continued use of the
            Platform after changes become effective constitutes acceptance. If you do not agree
            to the modified Terms, you must stop using the Platform and delete your account.
          </p>
        </Section>

        <Section title="14. Miscellaneous" id="miscellaneous">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and any consents you sign, constitute the entire agreement between you and Aminy</li>
            <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in full force</li>
            <li><strong>Waiver:</strong> Our failure to enforce any provision does not constitute a waiver</li>
            <li><strong>Assignment:</strong> You may not assign your rights under these Terms. We may assign our rights in connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Force Majeure:</strong> We are not liable for delays or failures caused by events beyond our reasonable control</li>
          </ul>
        </Section>

        <Section title="15. Contact" id="contact">
          <div className="rounded-lg bg-gray-50 p-4 text-sm">
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
