/**
 * AI Fallback Engine — Offline-Capable Response Generation
 *
 * Provides intelligent, pattern-matched responses when:
 *   - AI API (Supabase edge function) is unreachable
 *   - pgvector embeddings haven't been loaded
 *   - User is offline / has poor connectivity
 *   - Rate limits have been hit
 *
 * Architecture:
 *   AIFallbackEngine (class):
 *     - generateFallbackResponse(userMessage, context)  — keyword + intent → helpful response
 *     - getFallbackInsights(childData)                   — basic insights without AI API
 *     - shouldUseFallback()                              — connectivity / availability check
 *
 * 30+ response templates covering:
 *   behavioral strategies, sensory support, communication tips, caregiver wellness,
 *   insurance navigation, scheduling help, Junior support, crisis resources
 *
 * @see ai-conversation-engine.ts — primary AI engine (this is the fallback)
 * @see demo-data/ai-demo-data.ts — demo conversations used for enrichment
 * @see proactive-insights.ts — insight format this module mimics
 * @see rag-engine.ts — RAG pipeline (unavailable = use fallback)
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  DEMO_CONVERSATIONS,
  DEMO_AI_INSIGHTS,
  type DemoInsight,
} from './demo-data/ai-demo-data';

// ============================================================================
// Types
// ============================================================================

export type IntentCategory =
  | 'behavioral_strategy'
  | 'sensory_support'
  | 'communication_tips'
  | 'caregiver_wellness'
  | 'insurance_navigation'
  | 'scheduling_help'
  | 'junior_support'
  | 'school_transition'
  | 'sibling_education'
  | 'crisis_support'
  | 'progress_question'
  | 'general_question'
  | 'greeting'
  | 'unknown';

export interface FallbackContext {
  childName?: string;
  childAge?: number;
  recentTopics?: string[];
  currentScreen?: string;
  hasJuniorData?: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface FallbackResponse {
  content: string;
  intent: IntentCategory;
  confidence: number;
  suggestedFollowUps: string[];
  isOffline: boolean;
  relatedDemoConversation?: string; // ID of relevant demo conversation
}

export interface FallbackInsight {
  title: string;
  body: string;
  type: 'tip' | 'reminder' | 'encouragement';
  domain: string;
}

// ============================================================================
// Keyword → Intent Classifier
// ============================================================================

interface IntentPattern {
  intent: IntentCategory;
  keywords: string[];
  phrases: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'behavioral_strategy',
    keywords: ['meltdown', 'tantrum', 'behavior', 'hitting', 'biting', 'screaming', 'aggression', 'elopement', 'running', 'noncompliance', 'defiance', 'bedtime', 'transition', 'routine'],
    phrases: ['acting out', 'won\'t listen', 'keeps hitting', 'having meltdowns', 'out of control', 'behavioral issue', 'behavior problems'],
    weight: 1.0,
  },
  {
    intent: 'sensory_support',
    keywords: ['sensory', 'overwhelmed', 'overstimulated', 'noise', 'texture', 'picky', 'eating', 'clothing', 'tags', 'lights', 'sounds', 'proprioceptive', 'vestibular', 'regulation', 'dysregulated', 'calming', 'fidget', 'weighted'],
    phrases: ['sensory issues', 'sensory diet', 'can\'t calm down', 'wound up', 'too loud', 'won\'t eat', 'picky eater', 'hates wearing'],
    weight: 1.0,
  },
  {
    intent: 'communication_tips',
    keywords: ['communication', 'speech', 'talking', 'words', 'language', 'verbal', 'nonverbal', 'AAC', 'PECS', 'sign', 'echolalia', 'scripting', 'requesting', 'labeling'],
    phrases: ['not talking', 'doesn\'t speak', 'how to communicate', 'more words', 'speech therapy', 'language delay', 'started talking'],
    weight: 1.0,
  },
  {
    intent: 'caregiver_wellness',
    keywords: ['overwhelmed', 'exhausted', 'burnout', 'tired', 'stress', 'anxiety', 'guilt', 'failing', 'help', 'support', 'self-care', 'alone', 'isolated', 'depression'],
    phrases: ['feeling overwhelmed', 'i\'m struggling', 'can\'t do this', 'so tired', 'need a break', 'burnt out', 'am i failing', 'i feel guilty', 'i\'m not enough'],
    weight: 1.2, // Higher weight — wellness queries are important
  },
  {
    intent: 'insurance_navigation',
    keywords: ['insurance', 'coverage', 'denied', 'denial', 'authorization', 'preauth', 'appeal', 'hours', 'BCBA', 'ABA', 'copay', 'deductible', 'claim', 'billing', 'Medicaid', 'AHCCCS'],
    phrases: ['insurance denied', 'not enough hours', 'fighting insurance', 'how to appeal', 'coverage question', 'insurance won\'t cover'],
    weight: 1.0,
  },
  {
    intent: 'scheduling_help',
    keywords: ['schedule', 'appointment', 'session', 'book', 'cancel', 'reschedule', 'availability', 'therapist', 'provider', 'waitlist'],
    phrases: ['book a session', 'find a therapist', 'schedule appointment', 'next available', 'cancel my', 'change my appointment'],
    weight: 0.8,
  },
  {
    intent: 'junior_support',
    keywords: ['Ease', 'Junior', 'activities', 'levels', 'game', 'app', 'progress', 'score', 'achievement', 'badge', 'streak', 'activity', 'session', 'calm corner', 'reward board', 'transitions'],
    phrases: ['ease says', 'junior says', 'in the app', 'ease activity', 'junior activity', 'my child\'s progress', 'ease data', 'junior data', 'how is my child doing', 'ease scores', 'reward board', 'calm corner'],
    weight: 0.9,
  },
  {
    intent: 'school_transition',
    keywords: ['school', 'IEP', 'teacher', 'classroom', 'mainstream', 'inclusion', 'special education', 'transition', 'kindergarten', 'preschool'],
    phrases: ['ready for school', 'IEP meeting', 'school transition', 'mainstream school', 'special education', 'change schools'],
    weight: 1.0,
  },
  {
    intent: 'sibling_education',
    keywords: ['sibling', 'brother', 'sister', 'explain', 'understand', 'jealous', 'attention', 'fair'],
    phrases: ['explain to sibling', 'tell my other child', 'brother doesn\'t understand', 'sister is jealous', 'other kids'],
    weight: 0.9,
  },
  {
    intent: 'crisis_support',
    keywords: ['crisis', 'emergency', 'danger', 'hurt', 'harm', 'suicide', 'hospital', 'unsafe', 'aggressive'],
    phrases: ['in crisis', 'need help now', 'is hurting', 'not safe', 'emergency help', 'call for help'],
    weight: 2.0, // Highest weight — safety critical
  },
  {
    intent: 'progress_question',
    keywords: ['progress', 'improving', 'better', 'worse', 'regression', 'milestone', 'development', 'growth', 'tracking'],
    phrases: ['how is my child doing', 'any progress', 'getting better', 'getting worse', 'is my child improving', 'development milestone'],
    weight: 0.9,
  },
  {
    intent: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'thanks', 'thank you'],
    phrases: ['how are you', 'good morning', 'good afternoon', 'what can you do', 'help me'],
    weight: 0.5,
  },
];

// ============================================================================
// Response Templates (30+)
// ============================================================================

const RESPONSE_TEMPLATES: Record<IntentCategory, string[]> = {
  behavioral_strategy: [
    'Behavioral challenges are tough, and you\'re not alone in dealing with them. Here are some evidence-based strategies that many families find helpful:\n\n**Prevention first:** Most meltdowns have a trigger \u2014 transitions, demand changes, sensory overload, or loss of a preferred item. Tracking the ABCs (Antecedent, Behavior, Consequence) can reveal patterns.\n\n**In the moment:** Stay calm (your regulation helps theirs), reduce language (short, simple phrases), offer a safe space, and wait it out without escalating.\n\n**Proactive tools:** Visual schedules, first-then boards, countdown timers, and social stories can prevent many behavioral escalations before they start.\n\nWould you like to tell me more about the specific behavior you\'re seeing? I can give more targeted advice.',
    'I understand how frustrating repeated behavioral challenges can be. Let me share what the research tells us works:\n\n**Antecedent strategies (preventing the behavior):**\n- Give warnings before transitions (5 min, 2 min, 1 min)\n- Offer choices when possible ("Red shirt or blue shirt?")\n- Use visual supports for expectations\n\n**Replacement behaviors (teaching what TO do):**\n- Instead of hitting: "Use your words" or hand a communication card\n- Instead of screaming: Teach a calm-down sequence\n- Instead of running: Teach "I need a break"\n\nYour BCBA can help create a specific behavior intervention plan. In the meantime, consistency across all caregivers is the most powerful tool you have.',
  ],
  sensory_support: [
    'Sensory regulation is foundational for everything else \u2014 learning, socializing, and daily routines all depend on it. Here are strategies organized by sensory need:\n\n**For a child who is sensory-seeking (needs MORE input):**\n- Heavy work: carrying books, pushing a cart, animal walks\n- Deep pressure: weighted blanket, firm hugs, compression clothing\n- Movement: trampoline, swing, spinning (with supervision)\n\n**For a child who is sensory-avoidant (needs LESS input):**\n- Reduce environmental noise (earplugs, quiet spaces)\n- Minimize visual clutter\n- Soft, tagless clothing\n- Gradual exposure to challenging textures/sounds\n\n**General regulation tools:**\n- A "sensory toolkit" they can carry (fidget, stress ball, chew necklace)\n- Scheduled movement breaks throughout the day\n- Consistent routines to reduce unpredictability\n\nI recommend discussing a personalized "sensory diet" with your occupational therapist.',
  ],
  communication_tips: [
    'Communication growth looks different for every child, and there are many ways to support it at home:\n\n**For pre-verbal or early verbal children:**\n- Model, model, model: narrate everything you do together\n- Reduce questions, increase comments ("Look, a big truck!" not "What\'s that?")\n- Use communication temptations: put desired items in sight but out of reach\n- Honor ALL communication (pointing, leading, gestures, sounds)\n\n**For verbal children expanding language:**\n- Expand their utterances: if they say "car," you say "Yes, a red car!"\n- Create opportunities for spontaneous language (environmental sabotage)\n- Read together daily \u2014 pause and let them fill in familiar words\n\n**AAC and other supports:**\n- AAC (Augmentative and Alternative Communication) is not a replacement for speech \u2014 research shows it actually supports speech development\n- PECS, speech-generating devices, and sign language are all valid communication tools\n\nYour speech-language pathologist is your best partner here. Would you like tips on a specific communication skill?',
  ],
  caregiver_wellness: [
    'I hear you, and what you\'re feeling is completely valid. Caring for a child with additional needs is one of the most demanding roles anyone can have. You are doing more than you realize.\n\nHere\'s what I want you to know:\n\n**You are not failing.** The fact that you\'re seeking support shows how much you care.\n\n**Caregiver burnout is real.** Research shows parents of autistic children experience chronic stress levels comparable to those in high-stress occupations. This isn\'t weakness \u2014 it\'s biology.\n\n**Small steps matter:**\n- Block 20 minutes this week that is just for YOU\n- It\'s okay to simplify the home program when you\'re running on empty\n- Ask for help \u2014 from family, respite care, or your therapy team\n- Connect with other parents who understand (Aminy\'s community hub is a good start)\n\n**When to seek more support:**\nIf you\'re experiencing persistent sadness, anxiety that interferes with daily function, or thoughts of hopelessness, please reach out to a mental health professional. Your wellbeing is not a luxury \u2014 it\'s the foundation your family is built on.\n\nI\'m here whenever you need to talk.',
  ],
  insurance_navigation: [
    'Insurance navigation is one of the most frustrating parts of this journey, but you have more power than the insurance company wants you to know. Here\'s your action plan:\n\n**If your claim was denied:**\n1. Request the denial IN WRITING (you have the legal right to this)\n2. Get a letter of medical necessity from your BCBA or prescribing physician\n3. File a formal appeal within the deadline (usually 30-60 days)\n4. Request a peer-to-peer review between your provider and their reviewer\n\n**Know your rights:**\n- Most states have autism insurance mandates that require coverage of ABA\n- "Medical necessity" is determined by YOUR provider, not the insurance company\n- If the first appeal fails, you can file an external review through your state\'s Department of Insurance\n\n**Resources:**\n- Your state\'s autism advocacy organization (many offer free insurance help)\n- Autism Speaks Insurance Resource Center (autismspeaks.org/insurance)\n- Your therapy provider\'s billing department (they fight these battles regularly)\n\nWould you like help finding your specific state\'s autism insurance mandate?',
  ],
  scheduling_help: [
    'I can help with scheduling. Here\'s what you can do in Aminy:\n\n- **Book a session:** Go to the Marketplace tab to browse available providers and book directly\n- **Manage appointments:** Check the Calendar screen for upcoming sessions\n- **Telehealth:** Video sessions can be scheduled from the provider\'s profile\n\nIf you need to find a new provider, try the Provider Discovery feature \u2014 it matches you based on your child\'s needs, your insurance, and your location.\n\nIs there a specific type of appointment you\'re looking for?',
  ],
  junior_support: [
    `Ease tracks the calm tools, rewards, transitions, and practice moments that help your child most. Here's what the data tells us and how to make the most of it:

**Understanding Ease data:**
- Calm Corner shows which soothing tools your child returns to most
- Rewards and streaks highlight what keeps motivation steady
- Transitions reveal which routines reduce pushback and overload
- Practice sessions still track progress over time when you use them

**Tips for getting the most from Ease:**
- Consistency matters more than duration — even 5 to 10 minutes daily helps
- Let your child gravitate toward the tools that feel soothing or motivating
- Celebrate engagement and regulation, not just accuracy
- Review the weekly summary to share what worked with your therapy team

Would you like me to look at a specific part of your child's Ease data?`,
  ],
  school_transition: [
    'School transitions are a big deal, and planning ahead makes all the difference. Here\'s a framework to help:\n\n**Key readiness areas to assess:**\n1. Academic skills \u2014 Can they follow classroom instructions?\n2. Social skills \u2014 Can they interact with peers during unstructured time?\n3. Self-regulation \u2014 Can they handle transitions and sensory challenges?\n4. Self-advocacy \u2014 Can they ask for help when needed?\n\n**Practical steps:**\n- Request a school visit before the transition\n- Meet the receiving teacher in advance\n- Create a visual "map" of the new school\n- Practice the morning routine for the new school\n- Develop an IEP transition plan with specific supports\n\n**IEP considerations:**\n- Ensure the IEP includes transition goals\n- Request a gradual phase-in schedule if needed\n- Discuss sensory accommodations for the new environment\n\nWould you like help preparing questions for your next IEP meeting?',
  ],
  sibling_education: [
    'Talking to siblings about neurodivergence is important, and your instinct to address it is right. Here\'s an age-appropriate approach:\n\n**For young children (3-6):**\n- Keep it concrete: "Everyone\'s brain works differently. Your sibling\'s brain is really good at some things and needs extra help with others."\n- Normalize therapy: "The helpers come to play special games that help their brain practice."\n- Validate feelings: "It\'s okay to feel frustrated sometimes."\n\n**For older children (7-12):**\n- Use the word "autism" (or the relevant diagnosis) \u2014 demystifying it reduces stigma\n- Answer questions honestly and age-appropriately\n- Share books and resources designed for siblings\n\n**For all ages:**\n- Make sure each child gets dedicated one-on-one time with you\n- Acknowledge that sometimes things feel unfair\n- Create opportunities for positive sibling interaction around shared interests\n\nThere are wonderful sibling support groups and books available. Would you like recommendations?',
  ],
  crisis_support: [
    '**If you or your child is in immediate danger, please call 911.**\n\n**If you need immediate emotional support:**\n- **988 Suicide & Crisis Lifeline:** Call or text 988 (24/7)\n- **Crisis Text Line:** Text HOME to 741741 (24/7)\n- **Autism Society Crisis Line:** 1-800-328-8476\n\n**If your child is in a behavioral crisis (not medical emergency):**\n- Ensure the environment is safe (remove objects that could cause harm)\n- Reduce stimulation (dim lights, lower noise, clear the area)\n- Stay calm and use minimal language\n- Do not physically restrain unless trained and absolutely necessary for safety\n- Wait for the crisis to pass, then comfort\n\nYou can always reach out to your child\'s BCBA or therapy team for crisis support planning. I\'m here if you want to talk through a safety plan.',
  ],
  progress_question: [
    'Tracking progress is one of the most empowering things you can do as a parent. Here\'s how to think about it:\n\n**Where to look for progress:**\n- Ease\'s weekly summary shows patterns in calm, rewards, transitions, and practice\n- Your behavior log tracks meltdown frequency, duration, and triggers over time\n- Your therapy team\'s session notes capture clinical progress\n\n**What "progress" looks like:**\n- Progress is rarely linear \u2014 expect ups, downs, and plateaus\n- Small gains (5 seconds more of eye contact, one fewer meltdown per week) ARE significant\n- Regression during illness, transitions, or stress is normal and temporary\n\n**Data-driven conversations:**\n- Bring Ease data and your behavior logs to therapy sessions\n- Ask your BCBA: "Based on the data, are we on track for this goal?"\n- Request updated benchmarks every 3-6 months\n\nWould you like me to pull up your child\'s recent Ease data?',
  ],
  general_question: [
    'I\'m here to help with anything related to your family\'s journey. I can assist with:\n\n- **Behavioral strategies** — managing meltdowns, transitions, routines\n- **Communication support** — speech development, AAC tools, language tips\n- **Sensory regulation** — sensory diets, calming strategies, OT activities\n- **Insurance navigation** — appeals, authorization, coverage questions\n- **Ease insights** — understanding your child\'s calm, rewards, transition, and practice data\n- **Care planning** — goal setting, therapy coordination, home programs\n- **Caregiver wellness** — burnout, self-care, support resources\n- **School & transitions** — IEPs, inclusion, new environments\n\nWhat would be most helpful for you right now?',
  ],
  greeting: [
    'Hi there! I\'m Ask Aminy, your family\'s AI companion. I\'m here to help with anything from behavioral strategies to insurance questions to just being a supportive listener.\n\nWhat\'s on your mind today?',
    'Hello! Welcome back. I\'m here whenever you need support, advice, or just want to talk through something. No question is too small.\n\nHow can I help today?',
  ],
  unknown: [
    'I want to make sure I give you the most helpful response. Could you tell me a bit more about what you\'re looking for? I can help with:\n\n- Behavioral strategies and meltdown management\n- Communication and speech development\n- Sensory regulation tips\n- Insurance and coverage questions\n- Understanding your child\'s progress data\n- Caregiver wellness and self-care\n- School transitions and IEP support\n\nWhat would be most useful for you?',
  ],
};

// ============================================================================
// AIFallbackEngine
// ============================================================================

export class AIFallbackEngine {
  private lastApiCheckTime = 0;
  private lastApiStatus = false;
  private readonly API_CHECK_INTERVAL = 60_000; // Re-check every 60 seconds

  /**
   * Generate a helpful response using keyword detection and intent classification.
   * Used when the AI API is unavailable or as a fast first response.
   */
  generateFallbackResponse(
    userMessage: string,
    context: FallbackContext = {}
  ): FallbackResponse {
    const intent = this.classifyIntent(userMessage);
    const template = this.selectTemplate(intent.category, context);
    const personalized = this.personalizeResponse(template, context);
    const followUps = this.generateFollowUps(intent.category, context);
    const relatedConvo = this.findRelatedDemoConversation(intent.category);

    return {
      content: personalized,
      intent: intent.category,
      confidence: intent.confidence,
      suggestedFollowUps: followUps,
      isOffline: true,
      relatedDemoConversation: relatedConvo,
    };
  }

  /**
   * Generate basic insights from Junior data without calling the AI API.
   * Uses simple heuristics on session data.
   */
  getFallbackInsights(childData: {
    recentSessions?: Array<{
      domain: string;
      accuracy: number;
      completed: boolean;
      date: string;
    }>;
    streakDays?: number;
    lastActiveDate?: string;
  }): FallbackInsight[] {
    const insights: FallbackInsight[] = [];
    const sessions = childData.recentSessions || [];

    // Streak encouragement
    if (childData.streakDays && childData.streakDays >= 7) {
      insights.push({
        title: `${childData.streakDays}-day streak!`,
        body: `Amazing consistency! Your family has been active for ${childData.streakDays} days in a row. Keep it up \u2014 consistency is the strongest predictor of progress.`,
        type: 'encouragement',
        domain: 'engagement',
      });
    }

    // Domain-specific insights from session data
    if (sessions.length > 0) {
      const domainStats: Record<string, { total: number; correct: number; count: number }> = {};
      sessions.forEach(s => {
        if (!domainStats[s.domain]) {
          domainStats[s.domain] = { total: 0, correct: 0, count: 0 };
        }
        domainStats[s.domain].total++;
        domainStats[s.domain].correct += s.accuracy;
        domainStats[s.domain].count++;
      });

      // Find strongest and weakest domains
      const domainAvgs = Object.entries(domainStats).map(([domain, stats]) => ({
        domain,
        avg: stats.correct / stats.count,
      }));

      const strongest = domainAvgs.sort((a, b) => b.avg - a.avg)[0];
      const weakest = domainAvgs.sort((a, b) => a.avg - b.avg)[0];

      if (strongest && strongest.avg > 75) {
        insights.push({
          title: `Excelling in ${strongest.domain}!`,
          body: `Your child is averaging ${Math.round(strongest.avg)}% accuracy in ${strongest.domain} activities. This is a real strength worth celebrating!`,
          type: 'encouragement',
          domain: strongest.domain,
        });
      }

      if (weakest && weakest.avg < 50 && weakest.domain !== strongest?.domain) {
        insights.push({
          title: `Room to grow in ${weakest.domain}`,
          body: `${weakest.domain} activities are averaging ${Math.round(weakest.avg)}% accuracy. This is normal \u2014 consider discussing targeted strategies with your therapist.`,
          type: 'tip',
          domain: weakest.domain,
        });
      }

      // Completion rate check
      const completionRate = sessions.filter(s => s.completed).length / sessions.length;
      if (completionRate < 0.5) {
        insights.push({
          title: 'Activity completion tip',
          body: 'Less than half of recent activities were completed. Consider shorter sessions or letting your child pick which activities to do. Engagement matters more than completion.',
          type: 'tip',
          domain: 'engagement',
        });
      }
    }

    // Inactivity check
    if (childData.lastActiveDate) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(childData.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActive >= 3) {
        insights.push({
          title: 'Welcome back!',
          body: `It\'s been ${daysSinceActive} days since the last session. Even a quick 5-minute activity helps maintain progress. Jump back in whenever you\'re ready \u2014 no pressure!`,
          type: 'reminder',
          domain: 'engagement',
        });
      }
    }

    // Always include a general encouragement if no other insights
    if (insights.length === 0) {
      insights.push({
        title: 'You\'re doing great',
        body: 'Every interaction with your child is an opportunity for growth. Whether it\'s a formal activity or just playing together, you\'re making a difference.',
        type: 'encouragement',
        domain: 'general',
      });
    }

    return insights;
  }

  /**
   * Check if the AI API is available. Caches result for 60 seconds.
   */
  async shouldUseFallback(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastApiCheckTime < this.API_CHECK_INTERVAL) {
      return !this.lastApiStatus;
    }

    try {
      // Check if Supabase edge function is reachable
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      this.lastApiStatus = response.ok;
      this.lastApiCheckTime = now;
      return !response.ok;
    } catch {
      this.lastApiStatus = false;
      this.lastApiCheckTime = now;
      return true; // Use fallback
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private classifyIntent(
    message: string
  ): { category: IntentCategory; confidence: number } {
    const lower = message.toLowerCase();
    const scores: Array<{ intent: IntentCategory; score: number }> = [];

    for (const pattern of INTENT_PATTERNS) {
      let score = 0;

      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          score += pattern.weight;
        }
      }

      // Phrase matching (higher weight)
      for (const phrase of pattern.phrases) {
        if (lower.includes(phrase.toLowerCase())) {
          score += pattern.weight * 1.5;
        }
      }

      if (score > 0) {
        scores.push({ intent: pattern.intent, score });
      }
    }

    if (scores.length === 0) {
      return { category: 'unknown', confidence: 0.2 };
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    const topScore = scores[0];

    // Normalize confidence to 0-1 range
    const maxPossibleScore = 10; // rough ceiling
    const confidence = Math.min(topScore.score / maxPossibleScore, 0.95);

    return { category: topScore.intent, confidence };
  }

  private selectTemplate(intent: IntentCategory, context: FallbackContext): string {
    const templates = RESPONSE_TEMPLATES[intent] || RESPONSE_TEMPLATES.unknown;
    // Pick a random template for variety
    const idx = Math.floor(Math.random() * templates.length);
    return templates[idx];
  }

  private personalizeResponse(template: string, context: FallbackContext): string {
    let response = template;

    // Personalize with child name if available
    if (context.childName) {
      response = response.replace(/your child/gi, context.childName);
      response = response.replace(/their brain/gi, `${context.childName}'s brain`);
    }

    // Add time-of-day greeting context
    if (context.timeOfDay === 'night') {
      response += '\n\n_Note: It\'s late \u2014 remember that rest is just as important as everything else. Take care of yourself tonight._';
    }

    return response;
  }

  private generateFollowUps(intent: IntentCategory, context: FallbackContext): string[] {
    const followUpMap: Record<IntentCategory, string[]> = {
      behavioral_strategy: [
        'Can you help me track this behavior?',
        'What should I tell the babysitter about handling meltdowns?',
        'Are there specific ABA techniques I can use at home?',
      ],
      sensory_support: [
        'How do I create a sensory toolkit?',
        'What sensory activities can we do at home?',
        'Should I talk to an OT about this?',
      ],
      communication_tips: [
        'How do I encourage more spontaneous language?',
        'What is AAC and should we try it?',
        'How can siblings help with communication practice?',
      ],
      caregiver_wellness: [
        'How do I find a therapist who understands autism families?',
        'Are there parent support groups near me?',
        'How do I simplify our home therapy routine?',
      ],
      insurance_navigation: [
        'Can you help me write an appeal letter?',
        'What are my state\'s autism insurance laws?',
        'How do I request a peer-to-peer review?',
      ],
      scheduling_help: [
        'Show me available providers',
        'How do I set up telehealth?',
        'Can I see my upcoming appointments?',
      ],
      junior_support: [
        'Show me my child\'s weekly progress',
        'What activities should we focus on?',
        'How does the adaptive difficulty work?',
      ],
      school_transition: [
        'What questions should I ask at the IEP meeting?',
        'How do I prepare my child for a new school?',
        'What accommodations can I request?',
      ],
      sibling_education: [
        'What books do you recommend for siblings?',
        'How do I make sure each child gets enough attention?',
        'Should I explain the diagnosis to their classmates?',
      ],
      crisis_support: [
        'Can you help me create a safety plan?',
        'What calming strategies work during a crisis?',
        'How do I access respite care?',
      ],
      progress_question: [
        'Show me Junior\'s data for this week',
        'What milestones should I expect next?',
        'How do I share progress with my therapist?',
      ],
      general_question: [
        'Help me with behavioral strategies',
        'Tell me about Junior activities',
        'I need help with insurance',
      ],
      greeting: [
        'I need help with a behavior issue',
        'How is my child doing in Junior?',
        'I\'m feeling overwhelmed',
      ],
      unknown: [
        'Tell me what you can help with',
        'I have a question about my child\'s therapy',
        'I need support as a caregiver',
      ],
    };

    return followUpMap[intent] || followUpMap.unknown;
  }

  private findRelatedDemoConversation(intent: IntentCategory): string | undefined {
    const intentToTopic: Record<string, string> = {
      behavioral_strategy: 'behavioral-strategy',
      sensory_support: 'sensory-strategy',
      communication_tips: 'progress-planning',
      caregiver_wellness: 'caregiver-wellness',
      insurance_navigation: 'insurance-navigation',
      junior_support: 'ai-insight',
      school_transition: 'transition-planning',
      sibling_education: 'family-education',
    };

    const topic = intentToTopic[intent];
    if (!topic) return undefined;

    const match = DEMO_CONVERSATIONS.find(c => c.topic === topic);
    return match?.id;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _engine: AIFallbackEngine | null = null;

export function getAIFallbackEngine(): AIFallbackEngine {
  if (!_engine) {
    _engine = new AIFallbackEngine();
  }
  return _engine;
}

export default {
  AIFallbackEngine,
  getAIFallbackEngine,
};
