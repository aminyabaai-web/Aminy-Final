/**
 * AI Letter Drafting Service
 * Generates insurance-related letters using AI assistance
 *
 * Types of letters:
 * - Prior authorization request
 * - Medical necessity letters
 * - Insurance appeal letters
 * - Waiver enrollment letters
 * - Single-case agreement requests
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

export type LetterType =
  | 'prior-authorization'
  | 'medical-necessity'
  | 'appeal'
  | 'waiver-enrollment'
  | 'single-case-agreement';

export interface LetterContext {
  letterType: LetterType;
  childName: string;
  childAge?: number;
  parentName: string;
  diagnosis?: string;
  diagnosisDate?: string;
  insuranceCompany?: string;
  memberId?: string;
  groupNumber?: string;
  state?: string;
  providerName?: string;
  providerCredentials?: string;
  denialDate?: string;
  denialReason?: string;
  requestedServices?: string;
  hoursRequested?: number;
  additionalContext?: string;
}

export interface DraftedLetter {
  subject: string;
  body: string;
  type: LetterType;
  generatedAt: string;
  suggestedAttachments: string[];
  nextSteps: string[];
}

/**
 * Get system prompt for letter drafting
 */
function getLetterSystemPrompt(letterType: LetterType): string {
  const basePrompt = `You are an expert healthcare advocate specializing in autism and developmental disability services. You help parents draft professional, compelling letters to insurance companies.

Your letters should be:
- Professional but warm in tone
- Clear and well-organized
- Persuasive with specific evidence
- Compliant with insurance industry standards
- Empowering for parents to use

Always use proper letter formatting with:
- Clear date and address blocks
- Professional salutation
- Organized body paragraphs
- Strong closing with call to action
- Signature block`;

  const typeSpecificPrompts: Record<LetterType, string> = {
    'prior-authorization': `
${basePrompt}

You are drafting a PRIOR AUTHORIZATION REQUEST letter. Key elements:
- State the specific services requested (ABA therapy, speech, OT, etc.)
- Include CPT codes when known
- Reference medical necessity
- Include diagnosis information
- Request specific hours/units
- Provide timeline for response`,

    'medical-necessity': `
${basePrompt}

You are drafting a LETTER OF MEDICAL NECESSITY. Key elements:
- Explain the child's diagnosis and functional limitations
- Describe how the requested treatment addresses these needs
- Reference evidence-based research supporting the treatment
- Include measurable goals that treatment will address
- Explain consequences of not receiving treatment
- Reference relevant medical guidelines (AAP, ASHA, etc.)`,

    'appeal': `
${basePrompt}

You are drafting an INSURANCE APPEAL LETTER. Key elements:
- Clearly reference the denial being appealed
- State why the denial should be overturned
- Reference state mandates and plan terms
- Include supporting medical evidence
- Cite relevant case law or regulations if applicable
- Set clear timeline expectations
- Mention external review rights`,

    'waiver-enrollment': `
${basePrompt}

You are drafting a MEDICAID WAIVER ENROLLMENT letter. Key elements:
- Express interest in specific waiver program
- Describe the child's diagnosis and needs
- Explain why waiver services are needed
- Request information on the application process
- Ask about wait list status
- Request expedited review if applicable`,

    'single-case-agreement': `
${basePrompt}

You are drafting a SINGLE-CASE AGREEMENT REQUEST letter. Key elements:
- Document the lack of in-network providers
- Name the out-of-network provider you want to use
- Explain why this provider is necessary
- Request in-network reimbursement rates
- Provide provider credentials and NPI
- Offer to provide additional documentation`
  };

  return typeSpecificPrompts[letterType];
}

/**
 * Generate a draft letter using AI
 */
export async function generateLetterDraft(
  context: LetterContext
): Promise<DraftedLetter> {
  const systemPrompt = getLetterSystemPrompt(context.letterType);

  const userPrompt = buildUserPrompt(context);

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          context: { step: 'letter_drafting', letterType: context.letterType }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const letterBody = data.message;

    return {
      subject: generateSubject(context),
      body: letterBody,
      type: context.letterType,
      generatedAt: new Date().toISOString(),
      suggestedAttachments: getSuggestedAttachments(context.letterType),
      nextSteps: getNextSteps(context.letterType)
    };
  } catch (error) {
    console.error('Letter drafting error:', error);
    // Return a template-based fallback
    return generateFallbackLetter(context);
  }
}

/**
 * Build user prompt from context
 */
function buildUserPrompt(context: LetterContext): string {
  let prompt = `Please draft a ${getLetterTypeName(context.letterType)} for me.

Here's the information:
- Child's name: ${context.childName}`;

  if (context.childAge) {
    prompt += `\n- Child's age: ${context.childAge}`;
  }

  prompt += `\n- Parent's name: ${context.parentName}`;

  if (context.diagnosis) {
    prompt += `\n- Diagnosis: ${context.diagnosis}`;
  }

  if (context.diagnosisDate) {
    prompt += `\n- Diagnosis date: ${context.diagnosisDate}`;
  }

  if (context.insuranceCompany) {
    prompt += `\n- Insurance company: ${context.insuranceCompany}`;
  }

  if (context.memberId) {
    prompt += `\n- Member ID: ${context.memberId}`;
  }

  if (context.groupNumber) {
    prompt += `\n- Group number: ${context.groupNumber}`;
  }

  if (context.state) {
    prompt += `\n- State: ${context.state}`;
  }

  if (context.providerName) {
    prompt += `\n- Provider/BCBA name: ${context.providerName}`;
  }

  if (context.providerCredentials) {
    prompt += `\n- Provider credentials: ${context.providerCredentials}`;
  }

  if (context.denialDate) {
    prompt += `\n- Denial date: ${context.denialDate}`;
  }

  if (context.denialReason) {
    prompt += `\n- Denial reason: ${context.denialReason}`;
  }

  if (context.requestedServices) {
    prompt += `\n- Services requested: ${context.requestedServices}`;
  }

  if (context.hoursRequested) {
    prompt += `\n- Hours requested per week: ${context.hoursRequested}`;
  }

  if (context.additionalContext) {
    prompt += `\n\nAdditional context: ${context.additionalContext}`;
  }

  prompt += `\n\nPlease draft a complete, professional letter I can send. Include placeholders like [DATE] or [PHONE NUMBER] for any information I'll need to fill in.`;

  return prompt;
}

/**
 * Get human-readable letter type name
 */
function getLetterTypeName(type: LetterType): string {
  const names: Record<LetterType, string> = {
    'prior-authorization': 'Prior Authorization Request Letter',
    'medical-necessity': 'Letter of Medical Necessity',
    'appeal': 'Insurance Appeal Letter',
    'waiver-enrollment': 'Medicaid Waiver Enrollment Letter',
    'single-case-agreement': 'Single-Case Agreement Request Letter'
  };
  return names[type];
}

/**
 * Generate subject line for the letter
 */
function generateSubject(context: LetterContext): string {
  const subjects: Record<LetterType, string> = {
    'prior-authorization': `Prior Authorization Request for ${context.childName} - ABA Therapy Services`,
    'medical-necessity': `Letter of Medical Necessity for ${context.childName}`,
    'appeal': `Appeal of Denial for ${context.childName} - ${context.memberId || '[Member ID]'}`,
    'waiver-enrollment': `Medicaid Waiver Enrollment Request for ${context.childName}`,
    'single-case-agreement': `Single-Case Agreement Request for ${context.childName}`
  };
  return subjects[context.letterType];
}

/**
 * Get suggested attachments for letter type
 */
function getSuggestedAttachments(type: LetterType): string[] {
  const attachments: Record<LetterType, string[]> = {
    'prior-authorization': [
      'Diagnostic evaluation report',
      'Treatment plan from BCBA',
      'Prescription or referral from pediatrician',
      'Provider credentials and NPI',
      'Recent progress notes (if applicable)'
    ],
    'medical-necessity': [
      'Full diagnostic evaluation',
      'Developmental assessment results',
      'Treatment plan with measurable goals',
      'Provider credentials',
      'Peer-reviewed research articles (optional)'
    ],
    'appeal': [
      'Copy of denial letter',
      'Diagnostic evaluation',
      'Letter of medical necessity from BCBA',
      'Treatment plan',
      'Progress reports showing treatment effectiveness',
      'Peer-reviewed research supporting ABA',
      'State mandate information'
    ],
    'waiver-enrollment': [
      'Proof of diagnosis',
      'Recent psychological evaluation',
      'Description of current services',
      'Proof of Medicaid eligibility',
      'Financial documentation (if required)'
    ],
    'single-case-agreement': [
      'Documentation of network inadequacy search',
      'Out-of-network provider credentials',
      'Provider NPI and tax ID',
      'Treatment plan',
      'Diagnostic documentation'
    ]
  };
  return attachments[type];
}

/**
 * Get next steps after sending letter
 */
function getNextSteps(type: LetterType): string[] {
  const steps: Record<LetterType, string[]> = {
    'prior-authorization': [
      'Send via certified mail with return receipt',
      'Keep a copy for your records',
      'Call to confirm receipt after 5 business days',
      'Note the reference number when you call',
      'Follow up if no response within 15 days'
    ],
    'medical-necessity': [
      'Have your provider review and sign if requested',
      'Attach all supporting documentation',
      'Keep copies of everything',
      'Submit with prior authorization request'
    ],
    'appeal': [
      'Send via certified mail with return receipt',
      'File within the appeal deadline (check your denial letter)',
      'Keep a complete copy of the appeal package',
      'Request written confirmation of receipt',
      'Mark your calendar for response deadline',
      'Prepare for external review if internal appeal is denied'
    ],
    'waiver-enrollment': [
      'Submit to your state\'s developmental disabilities office',
      'Follow up within 2 weeks',
      'Ask about wait list position',
      'Inquire about emergency/expedited placement criteria',
      'Apply to multiple waiver programs simultaneously'
    ],
    'single-case-agreement': [
      'Send to the network adequacy department',
      'Confirm receipt within 5 business days',
      'Follow up on decision timeline',
      'Get agreement in writing before starting services',
      'Clarify duration and renewal process'
    ]
  };
  return steps[type];
}

/**
 * Generate fallback letter when AI is unavailable
 */
function generateFallbackLetter(context: LetterContext): DraftedLetter {
  const templates: Record<LetterType, string> = {
    'prior-authorization': `[DATE]

[INSURANCE COMPANY NAME]
Prior Authorization Department
[ADDRESS]

RE: Prior Authorization Request for ABA Therapy
Patient: ${context.childName}
Member ID: ${context.memberId || '[MEMBER ID]'}
Group Number: ${context.groupNumber || '[GROUP NUMBER]'}

Dear Prior Authorization Department,

I am writing to request prior authorization for Applied Behavior Analysis (ABA) therapy services for my child, ${context.childName}${context.childAge ? `, age ${context.childAge}` : ''}.

${context.childName} was diagnosed with ${context.diagnosis || '[DIAGNOSIS]'} on ${context.diagnosisDate || '[DATE]'}. Based on this diagnosis and the recommendation of ${context.providerName || '[PROVIDER NAME]'}, ${context.childAge && context.childAge < 10 ? 'he/she' : 'they'} require${context.childAge && context.childAge < 10 ? 's' : ''} intensive ABA therapy services.

I am requesting authorization for:
- ${context.requestedServices || 'ABA therapy services (CPT codes 97151, 97153, 97155, 97156)'}
- ${context.hoursRequested || '[NUMBER]'} hours per week

I have enclosed the following supporting documentation:
1. Diagnostic evaluation
2. Treatment plan from BCBA
3. Prescription from pediatrician

Please process this request as expeditiously as possible. If you require any additional information, please contact me at [PHONE NUMBER] or [EMAIL].

Thank you for your prompt attention to this matter.

Sincerely,

${context.parentName}
[ADDRESS]
[PHONE NUMBER]
[EMAIL]

Enclosures: [LIST ATTACHMENTS]`,

    'medical-necessity': `[DATE]

To Whom It May Concern:

RE: Letter of Medical Necessity
Patient: ${context.childName}
Date of Birth: [DOB]

I am writing to document the medical necessity of Applied Behavior Analysis (ABA) therapy for ${context.childName}.

DIAGNOSIS:
${context.childName} was diagnosed with ${context.diagnosis || '[DIAGNOSIS]'} on ${context.diagnosisDate || '[DATE]'}.

FUNCTIONAL LIMITATIONS:
[Describe specific areas of difficulty - communication, social skills, adaptive behavior, etc.]

TREATMENT RECOMMENDATION:
Based on my clinical evaluation and the best available evidence, I recommend that ${context.childName} receive ${context.hoursRequested || '[NUMBER]'} hours per week of ABA therapy to address the following goals:
1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

MEDICAL NECESSITY JUSTIFICATION:
ABA therapy is recognized by the American Academy of Pediatrics, the U.S. Surgeon General, and numerous peer-reviewed studies as an evidence-based treatment for autism spectrum disorder. Without this intervention, ${context.childName}'s developmental trajectory and quality of life would be significantly impacted.

If you have any questions regarding this recommendation, please contact me at [PHONE].

Sincerely,

${context.providerName || '[PROVIDER NAME]'}
${context.providerCredentials || '[CREDENTIALS]'}
[NPI NUMBER]
[CONTACT INFORMATION]`,

    'appeal': `[DATE]

${context.insuranceCompany || '[INSURANCE COMPANY]'}
Appeals Department
[ADDRESS]

RE: Appeal of Denial for ${context.childName}
Member ID: ${context.memberId || '[MEMBER ID]'}
Group Number: ${context.groupNumber || '[GROUP NUMBER]'}
Claim/Authorization Number: [REFERENCE NUMBER]

Dear Appeals Committee,

I am writing to formally appeal the denial of coverage for Applied Behavior Analysis (ABA) therapy services for my child, ${context.childName}, dated ${context.denialDate || '[DENIAL DATE]'}.

REASON FOR DENIAL (as stated in your letter):
${context.denialReason || '[DENIAL REASON]'}

REASON FOR APPEAL:

1. Medical Necessity: ${context.childName} was diagnosed with ${context.diagnosis || '[DIAGNOSIS]'} and requires ABA therapy as documented by ${context.providerName || 'the treating provider'}.

2. State Mandate Compliance: ${context.state || '[STATE]'} requires insurance coverage for autism spectrum disorder treatments under [STATE LAW].

3. Evidence-Based Treatment: ABA therapy is recognized as medically necessary and effective by the American Academy of Pediatrics, U.S. Surgeon General, and the National Institute of Mental Health.

DOCUMENTATION ENCLOSED:
- Letter of medical necessity from BCBA
- Diagnostic evaluation
- Treatment plan with measurable goals
- Peer-reviewed research supporting ABA

I request that you overturn this denial and authorize ${context.hoursRequested || 'the recommended'} hours per week of ABA therapy.

Please respond within [30 days]. If I do not receive a favorable response, I will pursue an external review.

Sincerely,

${context.parentName}
[PHONE NUMBER]
[EMAIL ADDRESS]

Enclosures: [LIST]`,

    'waiver-enrollment': `[DATE]

[STATE MEDICAID/DD OFFICE]
[ADDRESS]

RE: Medicaid Waiver Enrollment Request
Child: ${context.childName}
Date of Birth: [DOB]

Dear Waiver Enrollment Team,

I am writing to request enrollment in the [WAIVER NAME] program for my child, ${context.childName}.

${context.childName} was diagnosed with ${context.diagnosis || '[DIAGNOSIS]'} and requires the following supports:
- ABA therapy services
- Respite care
- [Other services needed]

We are currently receiving [CURRENT SERVICES OR "no waiver services"] and are seeking enrollment to access additional supports that are critical for ${context.childName}'s development and our family's ability to care for ${context.childAge && context.childAge < 10 ? 'him/her' : 'them'} at home.

Please send me information about:
1. The application process
2. Current wait list status
3. Any expedited enrollment criteria
4. Required documentation

I can be reached at [PHONE NUMBER] or [EMAIL].

Thank you for your assistance.

Sincerely,

${context.parentName}
[ADDRESS]
[PHONE NUMBER]`,

    'single-case-agreement': `[DATE]

${context.insuranceCompany || '[INSURANCE COMPANY]'}
Network Adequacy / Single-Case Agreement Department
[ADDRESS]

RE: Single-Case Agreement Request
Patient: ${context.childName}
Member ID: ${context.memberId || '[MEMBER ID]'}
Group Number: ${context.groupNumber || '[GROUP NUMBER]'}

Dear Network Adequacy Team,

I am writing to request a single-case agreement for Applied Behavior Analysis (ABA) therapy services for my child, ${context.childName}.

NETWORK INADEQUACY:
I have contacted all in-network ABA providers within a 30-mile radius of my home. I was unable to access timely services due to:
- [Provider 1]: Not accepting new patients
- [Provider 2]: 6+ month wait list
- [Provider 3]: Does not serve children of ${context.childName}'s age/needs

PROPOSED OUT-OF-NETWORK PROVIDER:
${context.providerName || '[PROVIDER NAME]'}
${context.providerCredentials || '[CREDENTIALS]'}
NPI: [NPI NUMBER]
Tax ID: [TAX ID]
Address: [PROVIDER ADDRESS]
Phone: [PROVIDER PHONE]

This provider can begin services within [TIMEFRAME] and has availability for the ${context.hoursRequested || 'recommended'} hours per week that ${context.childName} needs.

I am requesting that [PROVIDER NAME] be authorized for ABA therapy services at your in-network reimbursement rate.

I have enclosed documentation of my network adequacy search and the provider's credentials.

Please contact me at [PHONE] or [EMAIL] to discuss this request.

Sincerely,

${context.parentName}
[ADDRESS]
[PHONE NUMBER]

Enclosures:
- Network adequacy search documentation
- Provider credentials
- Treatment plan`
  };

  return {
    subject: generateSubject(context),
    body: templates[context.letterType],
    type: context.letterType,
    generatedAt: new Date().toISOString(),
    suggestedAttachments: getSuggestedAttachments(context.letterType),
    nextSteps: getNextSteps(context.letterType)
  };
}

/**
 * Get available letter types with descriptions
 */
export function getLetterTypes(): { type: LetterType; name: string; description: string }[] {
  return [
    {
      type: 'prior-authorization',
      name: 'Prior Authorization Request',
      description: 'Request approval for ABA or other therapy services before starting treatment'
    },
    {
      type: 'medical-necessity',
      name: 'Letter of Medical Necessity',
      description: 'Document why specific treatments are medically necessary for your child'
    },
    {
      type: 'appeal',
      name: 'Insurance Appeal',
      description: 'Challenge a denial of coverage from your insurance company'
    },
    {
      type: 'waiver-enrollment',
      name: 'Medicaid Waiver Enrollment',
      description: 'Request enrollment in a Medicaid waiver program for additional services'
    },
    {
      type: 'single-case-agreement',
      name: 'Single-Case Agreement',
      description: 'Request in-network rates for an out-of-network provider'
    }
  ];
}
