/**
 * AI Demo Data — Realistic Sample Conversations, Insights, and Care Plans
 *
 * Provides demo content for the Ask Aminy AI when:
 *   - No real conversation history exists (new user)
 *   - pgvector embeddings haven't been loaded yet
 *   - AI API is unavailable (offline mode)
 *   - Demo / sales presentation mode
 *
 * All conversations are realistic but clearly identifiable as demo data.
 * Topics cover the full spectrum of parent needs: behavioral strategies,
 * school transitions, sibling education, insurance advocacy, AI-powered
 * Junior insights, sensory regulation, progress planning, and caregiver wellness.
 *
 * @see ai-fallback-engine.ts — uses this data for offline responses
 * @see ai-conversation-engine.ts — integrates demo data for onboarding
 * @see proactive-insights.ts — insight format matches this demo data
 * @see ai-care-plan-generator.ts — care plan format matches this demo data
 */

// ============================================================================
// Types
// ============================================================================

export interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DemoConversation {
  id: string;
  title: string;
  topic: string;
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'concerned' | 'distressed';
  messages: DemoMessage[];
  metadata: {
    childAge?: number;
    childName?: string;
    domain: string;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

export interface DemoInsight {
  id: string;
  type: 'progress_alert' | 'behavioral_pattern' | 'recommendation' | 'celebration' | 'caregiver_wellness';
  title: string;
  body: string;
  severity: 'info' | 'attention' | 'action_needed';
  actionability: 'informational' | 'suggestion' | 'urgent';
  relatedDomains: string[];
  confidence: number;
  generatedAt: string;
  expiresAt: string;
  sourceData: Record<string, unknown>;
}

export interface DemoCarePlanRecommendation {
  id: string;
  childName: string;
  summary: string;
  goals: Array<{
    title: string;
    description: string;
    category: string;
    targetFrequency: string;
    measurable: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  interventions: Array<{
    name: string;
    description: string;
    frequency: string;
    setting: string;
    responsibleParty: string;
  }>;
  progressMetrics: Array<{
    metric: string;
    baseline: string;
    target: string;
    measurementMethod: string;
  }>;
  generatedAt: string;
}

// ============================================================================
// Helper
// ============================================================================

function demoTimestamp(daysAgo: number, hoursAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

// ============================================================================
// DEMO_CONVERSATIONS — 8 realistic parent-AI exchanges
// ============================================================================

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  // ---- 1. Bedtime Meltdowns ----
  {
    id: 'demo-conv-001',
    title: 'Bedtime Meltdown Strategies',
    topic: 'behavioral-strategy',
    tags: ['bedtime', 'meltdowns', 'transitions', 'routine', 'ABA'],
    sentiment: 'concerned',
    messages: [
      {
        id: 'msg-001-1',
        role: 'user',
        content: 'My son keeps having meltdowns at bedtime. It\'s been every night this week and I don\'t know what to do anymore.',
        timestamp: demoTimestamp(2, 8),
      },
      {
        id: 'msg-001-2',
        role: 'assistant',
        content: 'I hear you, and bedtime meltdowns are one of the most draining things parents deal with. Let me ask a couple of questions so I can give you the most relevant strategies.\n\nFirst, can you tell me roughly what time the meltdowns start? And is there a specific part of the bedtime routine where things escalate \u2014 like brushing teeth, changing clothes, or turning off screens?',
        timestamp: demoTimestamp(2, 7.9),
      },
      {
        id: 'msg-001-3',
        role: 'user',
        content: 'It usually starts around 7:30 when we say it\'s time to turn off the iPad. He\'s 6 and the meltdown can last 30-45 minutes.',
        timestamp: demoTimestamp(2, 7.5),
      },
      {
        id: 'msg-001-4',
        role: 'assistant',
        content: 'That transition from a preferred activity (iPad) to a non-preferred one (bedtime) is one of the most common triggers. Here are three evidence-based strategies you can start tonight:\n\n**1. Visual countdown timer** \u2014 Set a timer the child can see (not just hear). Show "15 minutes left," then "5 minutes," then "1 minute." This makes the transition predictable rather than sudden.\n\n**2. Choice within the routine** \u2014 Instead of "Turn off the iPad," try "Do you want to brush teeth first or put on pajamas first?" Giving small choices preserves autonomy and reduces opposition.\n\n**3. First-Then board** \u2014 "First pajamas, THEN one bedtime story." Using a visual board makes the reward concrete.\n\nWould you like me to help you build a visual bedtime routine? Junior also has a "Bedtime Buddy" activity that practices transitions in a low-pressure way.',
        timestamp: demoTimestamp(2, 7.4),
      },
      {
        id: 'msg-001-5',
        role: 'user',
        content: 'The visual timer is a great idea. We tried it last night and it helped a little. He still cried but it was only 10 minutes instead of 45.',
        timestamp: demoTimestamp(1, 6),
      },
      {
        id: 'msg-001-6',
        role: 'assistant',
        content: 'That is real progress! Going from 45 minutes down to 10 minutes in one night is significant. It shows that predictability is a key factor for your son.\n\nHere\'s what I\'d suggest for the next week:\n- Keep using the visual timer consistently (consistency is what cements it)\n- Add a "calm down corner" option \u2014 if he does get upset, having a designated space with a weighted blanket or fidget toy gives him a way to self-regulate rather than escalate\n- Track the meltdown duration each night in the behavior log \u2014 I think you\'ll see a steady decline\n\nI\'ll note this pattern in your family profile so your BCBA can see what\'s working when you discuss it at your next session.',
        timestamp: demoTimestamp(1, 5.9),
      },
    ],
    metadata: {
      childAge: 6,
      childName: 'Liam',
      domain: 'behavioral',
      complexity: 'moderate',
    },
  },

  // ---- 2. School Transition Readiness ----
  {
    id: 'demo-conv-002',
    title: 'Mainstream School Readiness',
    topic: 'transition-planning',
    tags: ['school', 'transition', 'inclusion', 'IEP', 'readiness'],
    sentiment: 'neutral',
    messages: [
      {
        id: 'msg-002-1',
        role: 'user',
        content: 'Is my daughter ready for mainstream school? She\'s been in a special education classroom for 2 years and her teacher says she might be ready to transition.',
        timestamp: demoTimestamp(5, 3),
      },
      {
        id: 'msg-002-2',
        role: 'assistant',
        content: 'That\'s an exciting possibility! Transition readiness involves several dimensions. Let me walk through the key areas to consider:\n\n**Academic readiness** \u2014 Can she follow multi-step instructions independently? Is she at or near grade level in reading and math?\n\n**Social readiness** \u2014 Can she initiate and sustain peer interactions? Does she handle unstructured time (lunch, recess) without significant support?\n\n**Behavioral regulation** \u2014 Can she manage transitions between activities without major disruption? Does she self-advocate when she needs help?\n\n**Sensory tolerance** \u2014 Can she handle a noisy, busy classroom without shutting down or becoming overwhelmed?\n\nHow does your daughter do in each of these areas? And what does her IEP say about her current goals?',
        timestamp: demoTimestamp(5, 2.8),
      },
      {
        id: 'msg-002-3',
        role: 'user',
        content: 'She\'s great academically \u2014 actually above grade level in reading. But social situations are tough. She tends to play alone at recess and gets overwhelmed in the cafeteria.',
        timestamp: demoTimestamp(5, 2.5),
      },
      {
        id: 'msg-002-4',
        role: 'assistant',
        content: 'That profile is actually very common and very workable for inclusion. Strong academics are a great foundation \u2014 they mean she won\'t fall behind while she adjusts socially.\n\nFor the social and sensory areas, I\'d recommend discussing these supports with her IEP team:\n\n1. **Structured recess program** \u2014 Many schools have "lunch bunch" groups where a counselor facilitates social interactions\n2. **Sensory breaks** \u2014 A pass to leave the cafeteria for a quieter space when it gets overwhelming\n3. **Social skills group** \u2014 A weekly pullout group to practice peer interaction in a supported environment\n4. **Gradual transition** \u2014 Start with mainstream for 1-2 subjects, then expand over a semester\n\nWould you like me to generate a list of questions to bring to your next IEP meeting? I can also create a transition readiness checklist you can fill out with her current teacher.',
        timestamp: demoTimestamp(5, 2.3),
      },
    ],
    metadata: {
      childAge: 8,
      childName: 'Maya',
      domain: 'transition',
      complexity: 'complex',
    },
  },

  // ---- 3. Explaining Autism to Siblings ----
  {
    id: 'demo-conv-003',
    title: 'Explaining Autism to Siblings',
    topic: 'family-education',
    tags: ['siblings', 'autism', 'family', 'education', 'disclosure'],
    sentiment: 'neutral',
    messages: [
      {
        id: 'msg-003-1',
        role: 'user',
        content: 'How do I explain autism to my 5-year-old? Her older brother was just diagnosed and she keeps asking why he acts differently.',
        timestamp: demoTimestamp(7, 4),
      },
      {
        id: 'msg-003-2',
        role: 'assistant',
        content: 'What a thoughtful question. Five-year-olds understand more than we think, and they respond best to concrete, simple language. Here\'s an approach many families find helpful:\n\n**Keep it simple and positive:**\n"Everyone\'s brain works a little differently. Your brother\'s brain works in a special way \u2014 it means he\'s really good at some things, like remembering facts about dinosaurs, but some things are harder for him, like when there\'s a lot of noise."\n\n**Normalize it:**\n"Just like some kids wear glasses because their eyes work differently, some kids\' brains work differently too. It doesn\'t mean anything is wrong \u2014 it just means he needs different help sometimes."\n\n**Validate her feelings:**\n"It\'s okay if you feel frustrated sometimes when he doesn\'t want to play the way you want to. You can always come talk to me about it."\n\nWould you like me to recommend some age-appropriate books? There are wonderful picture books that help siblings understand neurodivergence.',
        timestamp: demoTimestamp(7, 3.8),
      },
      {
        id: 'msg-003-3',
        role: 'user',
        content: 'Yes, book recommendations would be great. And what if she asks why he has therapists coming to the house?',
        timestamp: demoTimestamp(7, 3.5),
      },
      {
        id: 'msg-003-4',
        role: 'assistant',
        content: 'For the therapist question, you can say: "His helpers come to teach him skills, kind of like how your teacher helps you learn to read. They play games with him that help his brain practice things that are tricky for him."\n\nHere are some highly recommended sibling books:\n\n**For ages 4-6:**\n- "My Brother Charlie" by Holly Robinson Peete \u2014 warm, positive portrayal of an autistic sibling\n- "Since We\'re Friends" by Celeste Shally \u2014 focuses on friendship and differences\n\n**For ages 5-8:**\n- "All My Stripes" by Shaina Rudolph \u2014 a zebra who learns his autism stripe is part of what makes him unique\n- "A Friend Like Simon" by Kate Gaynor \u2014 a classmate\'s perspective\n\nOne more tip: make sure your daughter gets her own special time with you too. Siblings of neurodivergent kids sometimes feel like all the attention goes to their brother or sister. Even 15 minutes of "just you and me" time makes a big difference.',
        timestamp: demoTimestamp(7, 3.3),
      },
    ],
    metadata: {
      childAge: 7,
      childName: 'Ethan',
      domain: 'family-education',
      complexity: 'simple',
    },
  },

  // ---- 4. Insurance Hours Advocacy ----
  {
    id: 'demo-conv-004',
    title: 'Insurance Advocacy for ABA Hours',
    topic: 'insurance-navigation',
    tags: ['insurance', 'ABA', 'BCBA', 'authorization', 'advocacy', 'hours'],
    sentiment: 'distressed',
    messages: [
      {
        id: 'msg-004-1',
        role: 'user',
        content: 'The BCBA recommended 20 hours of ABA therapy but insurance only approved 10. What can I do?',
        timestamp: demoTimestamp(3, 5),
      },
      {
        id: 'msg-004-2',
        role: 'assistant',
        content: 'This is unfortunately common, but you have strong options for appealing. Insurance companies often start with lower hours and expect families to push back. Here\'s a step-by-step approach:\n\n**1. Request the denial in writing** \u2014 You have the right to a written explanation of why they reduced the hours. This is your starting point for the appeal.\n\n**2. Get a letter of medical necessity** from your BCBA \u2014 This letter should include:\n   - Specific behavioral data showing need for the recommended hours\n   - Peer-reviewed research supporting the prescribed intensity\n   - Evidence that reduced hours would compromise treatment outcomes\n   - Your child\'s specific deficits that require intervention\n\n**3. File a formal appeal** \u2014 Most states give you 30-60 days. Include the BCBA letter, any diagnostic reports, and progress notes.\n\n**4. Know your state\'s autism mandate** \u2014 What state are you in? Many states have laws requiring insurers to cover medically necessary ABA.',
        timestamp: demoTimestamp(3, 4.8),
      },
      {
        id: 'msg-004-3',
        role: 'user',
        content: 'We\'re in Arizona. Is there a law that protects us?',
        timestamp: demoTimestamp(3, 4.5),
      },
      {
        id: 'msg-004-4',
        role: 'assistant',
        content: 'Yes! Arizona has strong protections. Arizona Revised Statute 20-826.04 (known as "Steven\'s Law") requires health insurers to cover diagnosis and treatment of autism spectrum disorder, including ABA therapy, for dependents through age 18.\n\nKey points for your appeal:\n- Arizona\'s mandate does not cap the number of ABA hours \u2014 it requires coverage for what is "medically necessary"\n- The BCBA\'s clinical assessment of 20 hours IS the medical necessity determination\n- If the insurer\'s reviewer disagrees, they must have a qualified BCBA review the case (not just a general nurse reviewer)\n\n**Your next steps:**\n1. Call the number on the denial letter and request a peer-to-peer review between your BCBA and their reviewing clinician\n2. File the written appeal within the deadline\n3. If the first appeal is denied, file a second-level appeal or an external review through the Arizona Department of Insurance\n\nWould you like me to draft a template appeal letter you can customize? I can also connect you with Arizona autism advocacy organizations that provide free assistance with insurance appeals.',
        timestamp: demoTimestamp(3, 4.3),
      },
      {
        id: 'msg-004-5',
        role: 'user',
        content: 'A template letter would be amazing. Thank you.',
        timestamp: demoTimestamp(3, 4),
      },
      {
        id: 'msg-004-6',
        role: 'assistant',
        content: 'I\'ll generate that letter template for you now. It will include placeholders for your child\'s name, diagnosis code, the specific hours recommended, and the BCBA\'s credentials.\n\nIn the meantime, here are two Arizona-specific resources that can help:\n\n- **Raising Special Kids** (raisingspecialkids.org) \u2014 Free parent support and insurance advocacy in Arizona\n- **Arizona Center for Disability Law** \u2014 Can intervene if the insurer is violating the state mandate\n\nI\'ve also saved this conversation to your family profile so your care team can see what you\'re dealing with and help coordinate. You\'re doing the right thing by fighting for the hours your child needs.',
        timestamp: demoTimestamp(3, 3.8),
      },
    ],
    metadata: {
      childAge: 4,
      childName: 'Noah',
      domain: 'insurance',
      complexity: 'complex',
    },
  },

  // ---- 5. Junior AI-Powered Insight ----
  {
    id: 'demo-conv-005',
    title: 'Junior Social Activity Avoidance',
    topic: 'ai-insight',
    tags: ['Junior', 'social', 'avoidance', 'AI', 'data-driven'],
    sentiment: 'concerned',
    messages: [
      {
        id: 'msg-005-1',
        role: 'user',
        content: 'Junior says my child is avoiding social activities. What does that mean?',
        timestamp: demoTimestamp(1, 3),
      },
      {
        id: 'msg-005-2',
        role: 'assistant',
        content: 'Great question. Let me pull up the specific data Junior is seeing.\n\nOver the last 14 days, your child has:\n- Skipped 8 out of 12 social-themed activities (turn-taking games, conversation practice, group scenarios)\n- Completed all solo activities at a 92% accuracy rate\n- Average time on social activities when started: 45 seconds (compared to 3+ minutes on other domains)\n\nThis pattern suggests it\'s not a skill deficit \u2014 your child CAN do the social activities \u2014 but rather avoidance, possibly due to anxiety or discomfort with the social scenarios.\n\nThis is a common pattern we see, and it\'s actually helpful to identify because avoidance and inability require very different approaches.',
        timestamp: demoTimestamp(1, 2.8),
      },
      {
        id: 'msg-005-3',
        role: 'user',
        content: 'So what should we do about it?',
        timestamp: demoTimestamp(1, 2.5),
      },
      {
        id: 'msg-005-4',
        role: 'assistant',
        content: 'Here\'s what I\'d recommend, and I\'ve already adjusted Junior\'s algorithm to support this:\n\n**1. Gradual exposure in Junior** \u2014 I\'ve set Junior to sprinkle in one low-pressure social activity per session (instead of clustering them). This reduces the perceived "social load."\n\n**2. Pair social with preferred topics** \u2014 If your child loves dinosaurs, the social scenarios will feature dinosaur themes. This leverages special interests to reduce avoidance.\n\n**3. Celebrate engagement, not accuracy** \u2014 Junior will now give bonus points just for STARTING a social activity, regardless of the score.\n\n**4. Share this with your therapist** \u2014 The avoidance pattern is worth discussing at your next ABA session. Your BCBA can work on social motivation in parallel with what Junior is doing at home.\n\nI\'ll check back in a week to see if the avoidance pattern is shifting. You\'ll also see this tracked in your weekly summary.',
        timestamp: demoTimestamp(1, 2.3),
      },
    ],
    metadata: {
      childAge: 7,
      childName: 'Aiden',
      domain: 'ai-insight',
      complexity: 'moderate',
    },
  },

  // ---- 6. Sensory Regulation Activities ----
  {
    id: 'demo-conv-006',
    title: 'Sensory Regulation Activities',
    topic: 'sensory-strategy',
    tags: ['sensory', 'regulation', 'OT', 'activities', 'proprioceptive'],
    sentiment: 'neutral',
    messages: [
      {
        id: 'msg-006-1',
        role: 'user',
        content: 'What sensory activities help with regulation? My daughter gets really wound up after school and can\'t calm down.',
        timestamp: demoTimestamp(4, 6),
      },
      {
        id: 'msg-006-2',
        role: 'assistant',
        content: 'After-school dysregulation is extremely common \u2014 your daughter has been "holding it together" all day and needs to release that energy. The most effective sensory activities target proprioception (deep pressure and heavy work) and vestibular input (movement). Here are my top recommendations:\n\n**Heavy work activities (calming):**\n- Carrying grocery bags or a weighted backpack\n- Pushing a laundry basket across the floor\n- Animal walks (bear crawl, crab walk) down the hallway\n- Squeezing play-doh or therapy putty\n- Jumping on a mini trampoline (5-10 minutes)\n\n**Deep pressure (immediately calming):**\n- Weighted blanket or lap pad while doing homework\n- "Burrito roll" in a blanket\n- Firm (not light) squeezes or "sandwich" between couch cushions\n- Body sock or compression vest\n\n**Transition ritual:**\nCreate a consistent after-school routine: snack \u2192 10 minutes of movement \u2192 quiet activity. The predictability alone will help.',
        timestamp: demoTimestamp(4, 5.8),
      },
      {
        id: 'msg-006-3',
        role: 'user',
        content: 'The trampoline is brilliant \u2014 she loves jumping. Should I do it before or after homework?',
        timestamp: demoTimestamp(4, 5.5),
      },
      {
        id: 'msg-006-4',
        role: 'assistant',
        content: 'Definitely BEFORE homework. Research shows that 10-15 minutes of vestibular input (jumping, swinging, spinning) improves focus and self-regulation for up to 2 hours afterward.\n\nHere\'s an ideal after-school flow:\n\n1. **Arrive home** \u2192 Snack (protein-heavy, like cheese and crackers or apple with peanut butter)\n2. **10-15 min trampoline** \u2192 Let her jump it out \u2014 no rules, just free movement\n3. **Transition tool** \u2192 Weighted lap pad or fidget for the table\n4. **Homework** \u2192 She\'ll be much more regulated now\n5. **Break every 15 min** \u2192 Quick movement break (10 jumping jacks, wall push-ups)\n\nI\'d also recommend discussing a "sensory diet" with your OT at the next session. They can personalize a plan based on your daughter\'s specific sensory profile. Junior has some sensory regulation games too \u2014 want me to add those to her session mix?',
        timestamp: demoTimestamp(4, 5.3),
      },
    ],
    metadata: {
      childAge: 6,
      childName: 'Sophia',
      domain: 'sensory',
      complexity: 'simple',
    },
  },

  // ---- 7. Communication Progress Planning ----
  {
    id: 'demo-conv-007',
    title: 'Communication Progress \u2014 Next Steps',
    topic: 'progress-planning',
    tags: ['communication', 'speech', 'progress', 'goals', 'milestones'],
    sentiment: 'positive',
    messages: [
      {
        id: 'msg-007-1',
        role: 'user',
        content: 'My child\'s communication has improved 30% since we started \u2014 what should we focus on next?',
        timestamp: demoTimestamp(6, 2),
      },
      {
        id: 'msg-007-2',
        role: 'assistant',
        content: 'That is wonderful progress! A 30% improvement in communication is a significant milestone. Let me look at the specific areas to understand where the gains are coming from.\n\nBased on Junior\'s data and your session logs, the biggest improvements have been in:\n- **Requesting** (asking for items/activities) \u2014 up 45%\n- **Labeling** (naming objects and actions) \u2014 up 35%\n- **Responding to questions** \u2014 up 20%\n\nThe area with the most room for growth is **spontaneous commenting** \u2014 things like "Look, a dog!" or "That\'s funny." This is typically the next frontier after requesting and labeling are strong.',
        timestamp: demoTimestamp(6, 1.8),
      },
      {
        id: 'msg-007-3',
        role: 'user',
        content: 'How do we work on spontaneous commenting at home?',
        timestamp: demoTimestamp(6, 1.5),
      },
      {
        id: 'msg-007-4',
        role: 'assistant',
        content: 'Spontaneous commenting is all about making the environment "comment-worthy." Here are strategies you can weave into daily life:\n\n**1. Sabotage situations (playfully):**\n- Put shoes on the wrong feet and wait for a reaction\n- Give them a cup with no drink in it\n- Wear a silly hat. The goal is to create something worth commenting on.\n\n**2. Model, model, model:**\n- Narrate what YOU notice: "Wow, that cloud looks like a bunny!" "Oh no, the dog is eating your sock!"\n- Pause after modeling and give wait time (5-10 seconds) for them to comment\n\n**3. Shared experience activities:**\n- Cooking together ("Ooh, it\'s bubbling!")\n- Nature walks ("Look at that big puddle!")\n- Building with blocks ("Uh oh, it\'s going to fall!")\n\n**4. In Junior:** I\'ve unlocked the "What Do You See?" activity series, which practices noticing and commenting on scene changes. These are calibrated to your child\'s current level.\n\nI\'d suggest setting a goal of 3 spontaneous comments per day as a starting target. Track them in the progress log and I\'ll include them in next week\'s summary.',
        timestamp: demoTimestamp(6, 1.3),
      },
    ],
    metadata: {
      childAge: 5,
      childName: 'Oliver',
      domain: 'communication',
      complexity: 'moderate',
    },
  },

  // ---- 8. Caregiver Overwhelm ----
  {
    id: 'demo-conv-008',
    title: 'Caregiver Wellness Support',
    topic: 'caregiver-wellness',
    tags: ['caregiver', 'burnout', 'self-care', 'mental-health', 'support'],
    sentiment: 'distressed',
    messages: [
      {
        id: 'msg-008-1',
        role: 'user',
        content: 'I\'m feeling really overwhelmed as a caregiver. Between therapy appointments, school meetings, and trying to do activities at home, I feel like I\'m failing.',
        timestamp: demoTimestamp(0, 5),
      },
      {
        id: 'msg-008-2',
        role: 'assistant',
        content: 'First, I want you to hear this: you are not failing. The fact that you\'re managing therapy appointments, school meetings, and home activities means you\'re doing an incredible amount for your child. Caregiver burnout is real, and it doesn\'t mean you\'re weak \u2014 it means you\'re human.\n\nResearch shows that parents of children with autism experience stress levels comparable to combat veterans. That\'s not a metaphor \u2014 it\'s from peer-reviewed studies. So please be gentle with yourself.\n\nCan I ask: when was the last time you did something just for YOU? Not for your child, not for the family \u2014 just for yourself?',
        timestamp: demoTimestamp(0, 4.8),
      },
      {
        id: 'msg-008-3',
        role: 'user',
        content: 'I honestly can\'t remember. Maybe a month ago? I had coffee with a friend but I spent most of it talking about my son\'s therapy.',
        timestamp: demoTimestamp(0, 4.5),
      },
      {
        id: 'msg-008-4',
        role: 'assistant',
        content: 'That tells me a lot, and it\'s a pattern I see with many of the parents I work with. Here\'s what I want to gently suggest:\n\n**Immediate relief (this week):**\n- Block 30 minutes on your calendar this week that is YOURS. Not optional. Treat it like a therapy appointment. Read, walk, sit in silence \u2014 whatever fills your cup.\n- It\'s okay to skip one home activity session. Your child will not regress from one missed day. Your wellbeing matters too.\n\n**Sustainable changes:**\n- Talk to your BCBA about simplifying the home program. A focused 15-minute daily routine is more sustainable (and effective) than a 45-minute program that causes stress.\n- Consider a parent support group \u2014 Aminy\'s community hub has families going through the same thing. Sometimes just knowing you\'re not alone makes a real difference.\n\n**If it gets heavier:**\n- Many therapists now specialize in caregiver burnout for parents of neurodivergent kids. Your mental health is not a luxury \u2014 it\'s the foundation that everything else is built on.\n\nI\'m here whenever you need to vent, strategize, or just be heard. You\'re doing more than you realize.',
        timestamp: demoTimestamp(0, 4.3),
      },
      {
        id: 'msg-008-5',
        role: 'user',
        content: 'Thank you. I really needed to hear that.',
        timestamp: demoTimestamp(0, 4),
      },
      {
        id: 'msg-008-6',
        role: 'assistant',
        content: 'You\'re welcome. And I mean it \u2014 please come back anytime. There\'s no limit on conversations here, and no judgment.\n\nI\'ve added a gentle self-care reminder to your daily check-in for this week. It\'s just a simple prompt: "Did I do something for myself today?" No pressure \u2014 just a nudge.\n\nAlso, I\'ve adjusted your son\'s home activity recommendations to a lighter load this week \u2014 3 activities instead of 5. Quality over quantity, especially right now.\n\nYou\'re carrying a lot. It\'s okay to set some of it down.',
        timestamp: demoTimestamp(0, 3.8),
      },
    ],
    metadata: {
      childAge: 5,
      childName: 'Jackson',
      domain: 'caregiver-wellness',
      complexity: 'moderate',
    },
  },
];

// ============================================================================
// DEMO_AI_INSIGHTS — 10 proactive insights
// ============================================================================

export const DEMO_AI_INSIGHTS: DemoInsight[] = [
  {
    id: 'insight-001',
    type: 'progress_alert',
    title: 'Social engagement dropped 15% this week',
    body: 'Junior detected a 15% decrease in social activity engagement over the past 7 days. Your child completed 4 of 12 social scenarios compared to 8 of 11 last week. This could indicate avoidance behavior or increased anxiety around social themes. Consider discussing with your BCBA.',
    severity: 'attention',
    actionability: 'suggestion',
    relatedDomains: ['social', 'behavioral'],
    confidence: 0.87,
    generatedAt: demoTimestamp(0, 2),
    expiresAt: demoTimestamp(-7),
    sourceData: { metric: 'social_engagement', current: 33, previous: 73, delta: -40 },
  },
  {
    id: 'insight-002',
    type: 'celebration',
    title: 'Communication scores trending upward!',
    body: 'Your child\'s communication scores have improved 22% over the last 3 weeks. Requesting skills are now at 85% accuracy (up from 63%). This is a great time to consider increasing session frequency or introducing new communication targets.',
    severity: 'info',
    actionability: 'suggestion',
    relatedDomains: ['communication', 'speech'],
    confidence: 0.93,
    generatedAt: demoTimestamp(1, 0),
    expiresAt: demoTimestamp(-14),
    sourceData: { metric: 'communication_accuracy', current: 85, previous: 63, weeksTrending: 3 },
  },
  {
    id: 'insight-003',
    type: 'behavioral_pattern',
    title: 'Meltdown frequency increased on Mondays',
    body: 'Over the past month, 60% of reported meltdowns occurred on Mondays. This pattern suggests the transition from weekend to school routine may be a trigger. Consider implementing a Sunday evening "preview" routine to ease the Monday transition.',
    severity: 'attention',
    actionability: 'suggestion',
    relatedDomains: ['behavioral', 'routine', 'transitions'],
    confidence: 0.78,
    generatedAt: demoTimestamp(2, 1),
    expiresAt: demoTimestamp(-10),
    sourceData: { dayOfWeek: 'Monday', percentage: 60, totalIncidents: 15, mondayIncidents: 9 },
  },
  {
    id: 'insight-004',
    type: 'recommendation',
    title: 'Ready for level 3 activities in Daily Living',
    body: 'Your child has consistently scored above 80% on level 2 Daily Living activities for 10 consecutive sessions. Junior recommends advancing to level 3, which introduces multi-step routines like morning preparation and simple meal prep concepts.',
    severity: 'info',
    actionability: 'suggestion',
    relatedDomains: ['daily-living', 'independence'],
    confidence: 0.91,
    generatedAt: demoTimestamp(0, 6),
    expiresAt: demoTimestamp(-7),
    sourceData: { domain: 'daily_living', currentLevel: 2, avgAccuracy: 84, consecutiveSessions: 10 },
  },
  {
    id: 'insight-005',
    type: 'caregiver_wellness',
    title: 'You\'ve been especially active this week',
    body: 'You\'ve logged activities every day this week, attended 3 therapy sessions, and completed a school meeting. That\'s a heavy week! Remember to schedule some time for yourself. Caregiver resilience directly impacts your child\'s outcomes.',
    severity: 'info',
    actionability: 'informational',
    relatedDomains: ['caregiver', 'wellness'],
    confidence: 0.95,
    generatedAt: demoTimestamp(0, 1),
    expiresAt: demoTimestamp(-3),
    sourceData: { activeDays: 7, therapySessions: 3, meetings: 1, selfCareEvents: 0 },
  },
  {
    id: 'insight-006',
    type: 'progress_alert',
    title: 'Fine motor skills plateau detected',
    body: 'Junior\'s fine motor activities have shown no improvement over the past 3 weeks (holding at 62% accuracy). This may indicate the current activities are at an appropriate challenge level but additional OT strategies could help break through. Consider asking your OT about specific hand strengthening exercises.',
    severity: 'attention',
    actionability: 'suggestion',
    relatedDomains: ['fine-motor', 'OT'],
    confidence: 0.82,
    generatedAt: demoTimestamp(1, 4),
    expiresAt: demoTimestamp(-10),
    sourceData: { domain: 'fine_motor', accuracy: 62, weeksFlatlined: 3 },
  },
  {
    id: 'insight-007',
    type: 'celebration',
    title: '30-day streak achieved!',
    body: 'Your family has completed at least one activity every day for 30 consecutive days! This consistency is remarkable and is one of the strongest predictors of long-term progress. You\'re in the top 10% of Aminy families for engagement.',
    severity: 'info',
    actionability: 'informational',
    relatedDomains: ['engagement', 'consistency'],
    confidence: 1.0,
    generatedAt: demoTimestamp(0, 0),
    expiresAt: demoTimestamp(-7),
    sourceData: { streakDays: 30, percentile: 90 },
  },
  {
    id: 'insight-008',
    type: 'recommendation',
    title: 'Bedtime routine showing improvement',
    body: 'Based on the behavior logs you\'ve submitted, bedtime meltdown duration has decreased from an average of 35 minutes to 12 minutes over the past 2 weeks. The visual timer strategy appears to be working. Consider adding a "choice board" for the next step in reducing resistance.',
    severity: 'info',
    actionability: 'suggestion',
    relatedDomains: ['behavioral', 'routine', 'bedtime'],
    confidence: 0.88,
    generatedAt: demoTimestamp(0, 3),
    expiresAt: demoTimestamp(-7),
    sourceData: { avgDurationBefore: 35, avgDurationNow: 12, strategy: 'visual_timer', weeksSinceIntervention: 2 },
  },
  {
    id: 'insight-009',
    type: 'behavioral_pattern',
    title: 'Positive correlation: exercise and focus',
    body: 'On days when a physical activity is logged before Junior sessions, your child\'s accuracy is 23% higher than on sedentary days. This suggests that incorporating movement before learning activities significantly boosts engagement and performance.',
    severity: 'info',
    actionability: 'suggestion',
    relatedDomains: ['sensory', 'exercise', 'learning'],
    confidence: 0.85,
    generatedAt: demoTimestamp(3, 0),
    expiresAt: demoTimestamp(-14),
    sourceData: { accuracyWithExercise: 81, accuracyWithout: 58, sampleSize: 28 },
  },
  {
    id: 'insight-010',
    type: 'progress_alert',
    title: 'Authorization renewal due in 14 days',
    body: 'Your current ABA authorization expires in 14 days. Based on your child\'s progress data, I recommend requesting the same or increased hours. I can generate a progress summary report that your BCBA can attach to the re-authorization request.',
    severity: 'action_needed',
    actionability: 'urgent',
    relatedDomains: ['insurance', 'authorization', 'ABA'],
    confidence: 1.0,
    generatedAt: demoTimestamp(0, 0),
    expiresAt: demoTimestamp(-14),
    sourceData: { authExpiresAt: demoTimestamp(-14), currentHours: 15, recommendedHours: 20 },
  },
];

// ============================================================================
// DEMO_CARE_PLAN_RECOMMENDATIONS — 5 AI-generated plans
// ============================================================================

export const DEMO_CARE_PLAN_RECOMMENDATIONS: DemoCarePlanRecommendation[] = [
  {
    id: 'care-plan-001',
    childName: 'Liam',
    summary: 'Focus on bedtime transition skills and social initiation. Liam\'s behavioral data shows strong progress in requesting and labeling, with bedtime transitions and peer interaction as the primary areas for growth.',
    goals: [
      {
        title: 'Independent bedtime transition',
        description: 'Liam will complete the bedtime routine (pajamas, teeth, story) with no more than 1 verbal prompt within 20 minutes, 4 out of 5 nights.',
        category: 'daily-living',
        targetFrequency: 'Nightly',
        measurable: 'Meltdown duration < 5 minutes, prompt count < 2',
        priority: 'high',
      },
      {
        title: 'Peer play initiation',
        description: 'Liam will initiate play with a peer at least once per play session using a rehearsed script (e.g., "Can I play too?" or "Want to build with me?").',
        category: 'social',
        targetFrequency: '3x per week',
        measurable: 'Initiations per session tracked by RBT',
        priority: 'medium',
      },
      {
        title: 'Emotional identification',
        description: 'Liam will correctly identify 4 basic emotions (happy, sad, angry, scared) in himself and others across 3 consecutive sessions.',
        category: 'emotional',
        targetFrequency: 'Daily in Junior + 2x/week in therapy',
        measurable: '80% accuracy on emotion identification tasks',
        priority: 'medium',
      },
    ],
    interventions: [
      {
        name: 'Visual Bedtime Schedule',
        description: 'Laminated visual schedule with Velcro steps the child moves as completed. Paired with a countdown timer for screen-off transition.',
        frequency: 'Nightly',
        setting: 'Home',
        responsibleParty: 'Parent',
      },
      {
        name: 'Social Story + Role Play',
        description: 'Weekly social story reading about playground interactions, followed by role play practice with parent or sibling.',
        frequency: '3x per week',
        setting: 'Home + Therapy',
        responsibleParty: 'Parent + BCBA',
      },
      {
        name: 'Junior Social Activities',
        description: 'Targeted social scenarios in Junior app with adaptive difficulty. Focus on turn-taking and conversation initiation modules.',
        frequency: 'Daily (1 activity per session)',
        setting: 'Home (app)',
        responsibleParty: 'Parent (supervised)',
      },
    ],
    progressMetrics: [
      {
        metric: 'Bedtime meltdown duration',
        baseline: '35 minutes average',
        target: '< 5 minutes',
        measurementMethod: 'Parent behavior log in Aminy',
      },
      {
        metric: 'Social initiations per session',
        baseline: '0 per session',
        target: '1+ per session',
        measurementMethod: 'RBT session notes',
      },
      {
        metric: 'Emotion identification accuracy',
        baseline: '40%',
        target: '80%',
        measurementMethod: 'Junior activity scores',
      },
    ],
    generatedAt: demoTimestamp(1, 0),
  },
  {
    id: 'care-plan-002',
    childName: 'Maya',
    summary: 'Transition preparation plan for mainstream classroom inclusion. Maya\'s academic skills are strong; the focus is on social navigation, sensory self-regulation, and self-advocacy in a general education setting.',
    goals: [
      {
        title: 'Cafeteria independence',
        description: 'Maya will eat lunch in the cafeteria for the full period without requesting to leave, 3 out of 5 school days, using pre-taught coping strategies.',
        category: 'sensory',
        targetFrequency: 'Daily during school',
        measurable: 'Days completed without early exit',
        priority: 'high',
      },
      {
        title: 'Peer conversation maintenance',
        description: 'Maya will sustain a back-and-forth conversation of 4+ exchanges with a peer during structured and unstructured activities.',
        category: 'social',
        targetFrequency: '4x per week',
        measurable: 'Conversational turns per interaction',
        priority: 'high',
      },
      {
        title: 'Self-advocacy requests',
        description: 'Maya will independently request a break or sensory tool when feeling overwhelmed, using a pre-taught phrase, in 80% of opportunities.',
        category: 'self-advocacy',
        targetFrequency: 'As needed',
        measurable: 'Percentage of self-initiated break requests vs. adult-prompted',
        priority: 'medium',
      },
    ],
    interventions: [
      {
        name: 'Graduated cafeteria exposure',
        description: 'Start with 10 minutes in the cafeteria, increase by 5 minutes weekly. Use noise-reducing earplugs and a "calm card" for when she needs a break.',
        frequency: 'Daily',
        setting: 'School',
        responsibleParty: 'School counselor + parent coordination',
      },
      {
        name: 'Lunch bunch social group',
        description: 'Small structured social group during lunch 2x/week to practice peer interaction in a supported setting.',
        frequency: '2x per week',
        setting: 'School',
        responsibleParty: 'School counselor',
      },
    ],
    progressMetrics: [
      {
        metric: 'Cafeteria duration',
        baseline: '5 minutes',
        target: 'Full lunch period (25 minutes)',
        measurementMethod: 'School counselor log',
      },
      {
        metric: 'Conversational turns',
        baseline: '1-2 turns',
        target: '4+ turns',
        measurementMethod: 'Social skills group observation',
      },
    ],
    generatedAt: demoTimestamp(3, 0),
  },
  {
    id: 'care-plan-003',
    childName: 'Oliver',
    summary: 'Communication expansion plan building on strong requesting foundation. Oliver has made excellent gains in requesting and labeling; the next phase focuses on spontaneous commenting, multi-word combinations, and conversational turn-taking.',
    goals: [
      {
        title: 'Spontaneous commenting',
        description: 'Oliver will produce 5+ spontaneous comments per day about his environment, experiences, or observations without prompting.',
        category: 'communication',
        targetFrequency: 'Daily',
        measurable: 'Parent-tracked comments per day',
        priority: 'high',
      },
      {
        title: 'Two-word combinations',
        description: 'Oliver will consistently use 2+ word combinations (e.g., "big truck," "more juice," "Daddy look") in 80% of communication attempts.',
        category: 'communication',
        targetFrequency: 'Daily in all settings',
        measurable: 'Percentage of multi-word utterances',
        priority: 'high',
      },
    ],
    interventions: [
      {
        name: 'Environmental sabotage',
        description: 'Intentionally create situations that invite commenting: put things in silly places, wear something unexpected, "accidentally" do something wrong.',
        frequency: '3x per day',
        setting: 'Home',
        responsibleParty: 'Parent',
      },
      {
        name: 'Junior "What Do You See?" modules',
        description: 'Scene-change detection activities calibrated to Oliver\'s level. Practices noticing and verbalizing changes in visual scenes.',
        frequency: 'Daily (2 activities per session)',
        setting: 'Home (app)',
        responsibleParty: 'Parent (supervised)',
      },
    ],
    progressMetrics: [
      {
        metric: 'Spontaneous comments per day',
        baseline: '1-2',
        target: '5+',
        measurementMethod: 'Parent daily log + Junior activity data',
      },
      {
        metric: 'Multi-word utterance percentage',
        baseline: '30%',
        target: '80%',
        measurementMethod: 'SLP session data + parent report',
      },
    ],
    generatedAt: demoTimestamp(2, 0),
  },
  {
    id: 'care-plan-004',
    childName: 'Sophia',
    summary: 'Sensory regulation and after-school transition plan. Sophia\'s primary challenge is post-school dysregulation. The plan creates a structured sensory diet and predictable after-school routine to support self-regulation.',
    goals: [
      {
        title: 'After-school self-regulation',
        description: 'Sophia will transition from school to homework with no more than one instance of dysregulation per week, using her sensory toolkit.',
        category: 'sensory',
        targetFrequency: 'Daily',
        measurable: 'Dysregulation incidents per week',
        priority: 'high',
      },
      {
        title: 'Sensory self-awareness',
        description: 'Sophia will independently identify when she is becoming dysregulated and request a sensory tool or break in 3 out of 5 opportunities.',
        category: 'self-regulation',
        targetFrequency: 'As needed',
        measurable: 'Self-initiated regulation attempts vs. adult-prompted',
        priority: 'medium',
      },
    ],
    interventions: [
      {
        name: 'Structured after-school routine',
        description: 'Snack \u2192 10-minute trampoline \u2192 weighted lap pad \u2192 homework (15-minute intervals with movement breaks). Visual schedule posted in kitchen.',
        frequency: 'Daily after school',
        setting: 'Home',
        responsibleParty: 'Parent',
      },
      {
        name: 'Sensory toolkit',
        description: 'Portable kit with fidget tools, noise-reducing earplugs, stress ball, and "calm down" visual card. Available at school and home.',
        frequency: 'Always available',
        setting: 'Home + School',
        responsibleParty: 'Parent + teacher coordination',
      },
    ],
    progressMetrics: [
      {
        metric: 'After-school meltdowns per week',
        baseline: '5 per week',
        target: '1 or fewer per week',
        measurementMethod: 'Parent behavior log',
      },
      {
        metric: 'Self-regulation attempts',
        baseline: '10% self-initiated',
        target: '60% self-initiated',
        measurementMethod: 'Parent + teacher observation log',
      },
    ],
    generatedAt: demoTimestamp(4, 0),
  },
  {
    id: 'care-plan-005',
    childName: 'Aiden',
    summary: 'Social motivation and engagement plan driven by Junior AI insights. Aiden demonstrates strong cognitive skills but is actively avoiding social learning activities. The plan uses special interests and gradual exposure to build social motivation.',
    goals: [
      {
        title: 'Social activity completion rate',
        description: 'Aiden will complete 8 out of 12 social-themed Junior activities per week (up from current 4/12), with accuracy above 60%.',
        category: 'social',
        targetFrequency: 'Daily in Junior',
        measurable: 'Junior completion rate and accuracy metrics',
        priority: 'high',
      },
      {
        title: 'Interest-based social interaction',
        description: 'Aiden will engage in a shared-interest activity with a peer (e.g., building Lego, playing a collaborative game) for 10+ minutes, 2x per week.',
        category: 'social',
        targetFrequency: '2x per week',
        measurable: 'Duration of sustained peer interaction',
        priority: 'high',
      },
    ],
    interventions: [
      {
        name: 'Special interest integration',
        description: 'Junior social scenarios themed around Aiden\'s interests (space, Lego). Social skills practice embedded in preferred topics to reduce avoidance.',
        frequency: 'Daily in Junior',
        setting: 'Home (app)',
        responsibleParty: 'Automated (Junior algorithm) + parent oversight',
      },
      {
        name: 'Peer play dates with structure',
        description: 'Arranged play dates with 1 peer around a shared interest. Parent provides structure for the first 10 minutes, then gradually fades support.',
        frequency: '1-2x per week',
        setting: 'Home or community',
        responsibleParty: 'Parent',
      },
    ],
    progressMetrics: [
      {
        metric: 'Social activity completion rate',
        baseline: '33% (4/12 per week)',
        target: '67% (8/12 per week)',
        measurementMethod: 'Junior analytics dashboard',
      },
      {
        metric: 'Peer interaction duration',
        baseline: '< 5 minutes',
        target: '10+ minutes',
        measurementMethod: 'Parent observation log',
      },
    ],
    generatedAt: demoTimestamp(1, 0),
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a random subset of demo conversations for display.
 */
export function getRandomConversations(count: number = 3): DemoConversation[] {
  const shuffled = [...DEMO_CONVERSATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get demo insights filtered by severity or domain.
 */
export function getFilteredInsights(options?: {
  severity?: DemoInsight['severity'];
  domain?: string;
  limit?: number;
}): DemoInsight[] {
  let filtered = [...DEMO_AI_INSIGHTS];

  if (options?.severity) {
    filtered = filtered.filter(i => i.severity === options.severity);
  }

  if (options?.domain) {
    filtered = filtered.filter(i =>
      i.relatedDomains.some(d => d.toLowerCase().includes(options.domain!.toLowerCase()))
    );
  }

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get a care plan recommendation by child name (case-insensitive).
 */
export function getCarePlanByChild(childName: string): DemoCarePlanRecommendation | undefined {
  return DEMO_CARE_PLAN_RECOMMENDATIONS.find(
    cp => cp.childName.toLowerCase() === childName.toLowerCase()
  );
}

/**
 * Check if the current data is demo data (for UI labeling).
 */
export function isDemoData(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('insight-') || id.startsWith('care-plan-');
}

export default {
  DEMO_CONVERSATIONS,
  DEMO_AI_INSIGHTS,
  DEMO_CARE_PLAN_RECOMMENDATIONS,
  getRandomConversations,
  getFilteredInsights,
  getCarePlanByChild,
  isDemoData,
};
