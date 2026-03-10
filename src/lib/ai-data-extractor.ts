/**
 * AI Data Extractor
 *
 * Extracts structured data from natural conversation with parents.
 * Instead of requiring parents to fill out forms, Aminy can auto-detect
 * behavior reports, goal progress updates, and mood indicators from chat.
 *
 * This is distinct from:
 *   - ai-memory-engine.ts — stores extracted facts for later retrieval
 *   - ai-engine/conversation-memory.ts — per-conversation fact extraction
 *
 * This module focuses on STRUCTURED DATA extraction:
 *   - extractBehaviorData() → ABC-style behavior entries from conversation
 *   - extractGoalProgress() → goal completion/progress updates
 *   - extractMoodData() → parent emotional state tracking
 *
 * Extracted data feeds directly into the app's analytics and care plan systems.
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedBehaviorData {
  behaviorCategory: string;
  antecedentCategory?: string;
  consequenceCategory?: string;
  setting?: string;
  intensity?: number; // 1-5
  duration?: string;
  childName?: string;
  occurredAt?: string;
  notes?: string;
  confidence: number;
}

export interface ExtractedGoalProgress {
  goalDescription: string;
  progressType: 'completion' | 'partial' | 'regression' | 'attempt';
  details?: string;
  childName?: string;
  domain?: string;
  confidence: number;
}

export interface ExtractedMoodData {
  mood: 'positive' | 'neutral' | 'stressed' | 'frustrated' | 'overwhelmed' | 'hopeful' | 'worried';
  intensity: number; // 1-5
  triggers?: string[];
  selfCareNeeded: boolean;
  confidence: number;
}

export interface ExtractionResult {
  behaviors: ExtractedBehaviorData[];
  goalUpdates: ExtractedGoalProgress[];
  mood: ExtractedMoodData | null;
  rawContext: string;
}

// ============================================================================
// AI Data Extractor Class
// ============================================================================

export class AIDataExtractor {
  private backendUrl: string;

  constructor() {
    this.backendUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;
  }

  // ==========================================================================
  // Main Extraction Pipeline
  // ==========================================================================

  /**
   * Run the full extraction pipeline on a set of conversation messages.
   * Combines heuristic extraction with optional AI-powered extraction.
   */
  async extractAll(
    messages: Array<{ role: string; content: string }>,
    options: { useAI?: boolean; childName?: string } = {}
  ): Promise<ExtractionResult> {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    const combinedText = userMessages.join(' ');

    // Run heuristic extractors in parallel
    const [behaviors, goalUpdates, mood] = await Promise.all([
      this.extractBehaviorData(userMessages, options.childName),
      this.extractGoalProgress(userMessages, options.childName),
      this.extractMoodData(userMessages),
    ]);

    // Optionally enhance with AI
    if (options.useAI && userMessages.length >= 2) {
      try {
        const aiResult = await this.extractWithAI(combinedText, options.childName);
        // Merge AI results (higher confidence gets priority)
        return this.mergeResults(
          { behaviors, goalUpdates, mood, rawContext: combinedText },
          aiResult
        );
      } catch {
        // AI failed, return heuristic results
      }
    }

    return {
      behaviors,
      goalUpdates,
      mood,
      rawContext: combinedText,
    };
  }

  // ==========================================================================
  // Behavior Data Extraction
  // ==========================================================================

  /**
   * Extract behavior data from user messages.
   * Detects ABC-style incident reports from natural language.
   */
  async extractBehaviorData(
    messages: string[],
    childName?: string
  ): Promise<ExtractedBehaviorData[]> {
    const behaviors: ExtractedBehaviorData[] = [];
    const combined = messages.join(' ');

    // Pattern: "he/she had a meltdown" or "tantrum at school" etc.
    const behaviorPatterns: Array<{
      pattern: RegExp;
      category: string;
      minConfidence: number;
    }> = [
      { pattern: /(?:had|threw|another)\s+(?:a\s+)?(?:big\s+)?(?:meltdown|tantrum|outburst)/i, category: 'meltdown', minConfidence: 0.8 },
      { pattern: /(?:hit|hitting|bit|biting|kick|kicking|scratch|scratching)\s+(?:me|his|her|the|a|their)/i, category: 'aggression', minConfidence: 0.85 },
      { pattern: /(?:ran|running)\s+(?:away|off|out)/i, category: 'elopement', minConfidence: 0.75 },
      { pattern: /(?:refused|won't|wouldn't|refusing)\s+(?:to\s+)?(?:eat|sleep|go|do|get|take|stop)/i, category: 'refusal', minConfidence: 0.7 },
      { pattern: /(?:screaming|screamed|yelling|yelled)\s+(?:for|at|about)/i, category: 'vocal-outburst', minConfidence: 0.7 },
      { pattern: /(?:self[- ]harm|head[- ]bang|bang(?:ing|ed)\s+(?:his|her)\s+head|bit(?:ing|e)\s+(?:himself|herself))/i, category: 'self-injurious', minConfidence: 0.9 },
      { pattern: /(?:stimming|rocking|flapping|spinning)\s+(?:a\s+lot|more|excessively|constantly)/i, category: 'increased-stimming', minConfidence: 0.65 },
      { pattern: /(?:shut\s+down|shutdown|went\s+silent|stopped\s+responding|froze)/i, category: 'shutdown', minConfidence: 0.7 },
    ];

    for (const { pattern, category, minConfidence } of behaviorPatterns) {
      if (pattern.test(combined)) {
        const behavior: ExtractedBehaviorData = {
          behaviorCategory: category,
          childName,
          confidence: minConfidence,
        };

        // Try to extract antecedent/trigger
        behavior.antecedentCategory = this.extractAntecedent(combined);
        behavior.setting = this.extractSetting(combined);
        behavior.intensity = this.extractIntensity(combined);
        behavior.occurredAt = this.extractTimeReference(combined);

        behaviors.push(behavior);
      }
    }

    return behaviors;
  }

  private extractAntecedent(text: string): string | undefined {
    const antecedentPatterns: Array<{ pattern: RegExp; category: string }> = [
      { pattern: /(?:when|after|because)\s+(?:I|we)\s+(?:asked|told|said|tried)/i, category: 'demand' },
      { pattern: /(?:transition|switch|change|moved|moved to|going to)/i, category: 'transition' },
      { pattern: /(?:loud|noisy|crowded|bright|too many|overwhelming)/i, category: 'sensory-overload' },
      { pattern: /(?:took away|couldn't have|no more|said no|denied|told.*?no)/i, category: 'denied-access' },
      { pattern: /(?:sibling|brother|sister|another kid|other child)/i, category: 'peer-conflict' },
      { pattern: /(?:hungry|tired|didn't sleep|skipped|missed)\s+(?:lunch|nap|breakfast|sleep|meal)/i, category: 'physiological' },
      { pattern: /(?:unexpected|surprise|didn't expect|change of plans|cancelled)/i, category: 'unexpected-change' },
      { pattern: /(?:homework|school\s*work|assignment|test|exam)/i, category: 'academic-demand' },
    ];

    for (const { pattern, category } of antecedentPatterns) {
      if (pattern.test(text)) return category;
    }
    return undefined;
  }

  private extractSetting(text: string): string | undefined {
    const settingPatterns: Array<{ pattern: RegExp; setting: string }> = [
      { pattern: /(?:at\s+)?school|classroom|class/i, setting: 'school' },
      { pattern: /(?:at\s+)?home|house|bedroom|kitchen|living room/i, setting: 'home' },
      { pattern: /(?:at\s+)?(?:the\s+)?(?:store|grocery|walmart|target|mall|shop)/i, setting: 'store' },
      { pattern: /(?:in\s+)?(?:the\s+)?car|driving|ride/i, setting: 'car' },
      { pattern: /(?:at\s+)?(?:the\s+)?(?:park|playground|outside)/i, setting: 'outdoor' },
      { pattern: /(?:at\s+)?(?:the\s+)?(?:restaurant|eating out|dinner out)/i, setting: 'restaurant' },
      { pattern: /(?:at\s+)?(?:the\s+)?(?:doctor|therapist|clinic|hospital|appointment)/i, setting: 'clinic' },
      { pattern: /(?:at\s+)?(?:the\s+)?(?:church|service|worship)/i, setting: 'community' },
    ];

    for (const { pattern, setting } of settingPatterns) {
      if (pattern.test(text)) return setting;
    }
    return undefined;
  }

  private extractIntensity(text: string): number | undefined {
    // High intensity markers
    if (/(?:really\s+bad|terrible|worst|extreme|dangerous|scary|violent|uncontrollable|ambulance|police|ER|emergency)/i.test(text)) {
      return 5;
    }
    if (/(?:pretty\s+bad|very\s+intense|really\s+hard|struggled\s+a\s+lot|couldn't\s+control)/i.test(text)) {
      return 4;
    }
    if (/(?:moderate|regular|typical|normal|usual|standard)/i.test(text)) {
      return 3;
    }
    if (/(?:mild|small|minor|little|brief|quick)/i.test(text)) {
      return 2;
    }
    if (/(?:barely|almost|slight|tiny)/i.test(text)) {
      return 1;
    }
    return undefined;
  }

  private extractTimeReference(text: string): string | undefined {
    const now = new Date();

    if (/this\s+morning|earlier\s+today/i.test(text)) {
      const morning = new Date(now);
      morning.setHours(8, 0, 0, 0);
      return morning.toISOString();
    }
    if (/yesterday/i.test(text)) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return yesterday.toISOString();
    }
    if (/last\s+night|tonight/i.test(text)) {
      const night = new Date(now);
      night.setHours(20, 0, 0, 0);
      if (/last\s+night/i.test(text)) {
        night.setDate(night.getDate() - 1);
      }
      return night.toISOString();
    }
    if (/after\s+school|this\s+afternoon/i.test(text)) {
      const afternoon = new Date(now);
      afternoon.setHours(15, 0, 0, 0);
      return afternoon.toISOString();
    }

    return undefined;
  }

  // ==========================================================================
  // Goal Progress Extraction
  // ==========================================================================

  /**
   * Extract goal progress updates from user messages.
   * Detects completions, partial progress, attempts, and regressions.
   */
  async extractGoalProgress(
    messages: string[],
    childName?: string
  ): Promise<ExtractedGoalProgress[]> {
    const updates: ExtractedGoalProgress[] = [];
    const combined = messages.join(' ');

    // Completion patterns
    const completionPatterns: Array<{
      pattern: RegExp;
      progressType: ExtractedGoalProgress['progressType'];
      confidence: number;
    }> = [
      { pattern: /(?:finally|actually)\s+(?:did|used|tried|ate|said|went|slept|brushed)/i, progressType: 'completion', confidence: 0.8 },
      { pattern: /(?:managed|was\s+able)\s+to\s+\w+/i, progressType: 'completion', confidence: 0.75 },
      { pattern: /first\s+time\s+(?:he|she|they)\s+(?:ever|actually)/i, progressType: 'completion', confidence: 0.9 },
      { pattern: /(?:almost|nearly|close\s+to)\s+(?:doing|making|finishing)/i, progressType: 'partial', confidence: 0.7 },
      { pattern: /tried\s+(?:to|but)/i, progressType: 'attempt', confidence: 0.6 },
      { pattern: /(?:used\s+to|was\s+doing\s+well|regressed|went\s+back|stopped|lost\s+progress)/i, progressType: 'regression', confidence: 0.75 },
    ];

    for (const { pattern, progressType, confidence } of completionPatterns) {
      const match = combined.match(pattern);
      if (match) {
        // Extract the surrounding context for details
        const matchIndex = combined.indexOf(match[0]);
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(combined.length, matchIndex + match[0].length + 80);
        const context = combined.slice(start, end).trim();

        const domain = this.detectGoalDomain(context);

        updates.push({
          goalDescription: context,
          progressType,
          details: match[0],
          childName,
          domain,
          confidence,
        });
      }
    }

    // Deduplicate by domain
    const seen = new Set<string>();
    return updates.filter(u => {
      const key = `${u.progressType}:${u.domain || u.goalDescription.slice(0, 30)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private detectGoalDomain(text: string): string | undefined {
    const domainPatterns: Array<{ pattern: RegExp; domain: string }> = [
      { pattern: /(?:brush|teeth|dress|shoe|potty|toilet|wash|bath|hygiene)/i, domain: 'self-care' },
      { pattern: /(?:said|word|sentence|talk|speak|sign|point|PECS|AAC|communicate)/i, domain: 'communication' },
      { pattern: /(?:share|take\s+turns|play\s+with|friend|eye\s+contact|greet)/i, domain: 'social' },
      { pattern: /(?:routine|schedule|transition|morning|bedtime|follow)/i, domain: 'daily-routine' },
      { pattern: /(?:calm|deep\s+breath|regulate|cope|sensory|stim)/i, domain: 'sensory' },
      { pattern: /(?:sit|attend|focus|homework|read|write|count|letter)/i, domain: 'academic' },
      { pattern: /(?:walk|run|climb|throw|catch|balance|cut|draw|fine\s+motor)/i, domain: 'motor' },
      { pattern: /(?:wait|patient|no\s+hitting|gentle\s+hands|ask\s+first)/i, domain: 'behavior' },
    ];

    for (const { pattern, domain } of domainPatterns) {
      if (pattern.test(text)) return domain;
    }
    return undefined;
  }

  // ==========================================================================
  // Mood Extraction
  // ==========================================================================

  /**
   * Extract parent mood/emotional state from messages.
   * Helps trigger self-care reminders and adjust AI tone.
   */
  async extractMoodData(messages: string[]): Promise<ExtractedMoodData | null> {
    if (messages.length === 0) return null;

    const combined = messages.join(' ').toLowerCase();
    const triggers: string[] = [];

    // Define mood indicators with weights
    const moodSignals: Array<{
      pattern: RegExp;
      mood: ExtractedMoodData['mood'];
      intensity: number;
      trigger?: string;
    }> = [
      // Overwhelmed signals
      { pattern: /i\s+can'?t\s+(?:do\s+this|take\s+it|handle|anymore|cope)/i, mood: 'overwhelmed', intensity: 5, trigger: 'burnout' },
      { pattern: /(?:exhausted|drained|wiped\s+out|at\s+(?:my|the)\s+(?:limit|end))/i, mood: 'overwhelmed', intensity: 4, trigger: 'fatigue' },
      { pattern: /(?:too\s+much|overwhelming|breaking\s+point)/i, mood: 'overwhelmed', intensity: 4, trigger: 'overload' },

      // Frustrated signals
      { pattern: /(?:frustrated|frustrating|sick\s+of|fed\s+up|annoyed|angry)/i, mood: 'frustrated', intensity: 4, trigger: 'frustration' },
      { pattern: /(?:nothing\s+works|tried\s+everything|what\s+am\s+i\s+doing\s+wrong)/i, mood: 'frustrated', intensity: 4, trigger: 'ineffectiveness' },

      // Stressed signals
      { pattern: /(?:stressed|anxious|worried|nervous|scared|afraid)/i, mood: 'stressed', intensity: 3, trigger: 'stress' },
      { pattern: /(?:insurance|denied|coverage|money|afford|bill)/i, mood: 'stressed', intensity: 3, trigger: 'financial' },
      { pattern: /(?:school\s+called|teacher\s+said|principal|expelled|suspended)/i, mood: 'stressed', intensity: 4, trigger: 'school-issue' },

      // Worried signals
      { pattern: /(?:worried\s+about|concerned\s+about|scared\s+that|what\s+if)/i, mood: 'worried', intensity: 3, trigger: 'worry' },
      { pattern: /(?:falling\s+behind|not\s+progressing|delayed|regression)/i, mood: 'worried', intensity: 3, trigger: 'development-worry' },

      // Hopeful signals
      { pattern: /(?:hopeful|progress|better|improved|proud|excited|happy)/i, mood: 'hopeful', intensity: 2 },
      { pattern: /(?:finally|breakthrough|milestone|first\s+time)/i, mood: 'hopeful', intensity: 2 },

      // Positive signals
      { pattern: /(?:amazing|wonderful|grateful|thankful|blessed|love\s+that)/i, mood: 'positive', intensity: 1 },
      { pattern: /(?:great\s+day|good\s+day|best\s+day|so\s+happy)/i, mood: 'positive', intensity: 1 },
    ];

    // Score each mood
    const moodScores: Record<string, { total: number; count: number; maxIntensity: number }> = {};

    for (const signal of moodSignals) {
      if (signal.pattern.test(combined)) {
        const key = signal.mood;
        if (!moodScores[key]) {
          moodScores[key] = { total: 0, count: 0, maxIntensity: 0 };
        }
        moodScores[key].total += signal.intensity;
        moodScores[key].count++;
        moodScores[key].maxIntensity = Math.max(moodScores[key].maxIntensity, signal.intensity);

        if (signal.trigger) {
          triggers.push(signal.trigger);
        }
      }
    }

    // Pick the dominant mood
    const entries = Object.entries(moodScores);
    if (entries.length === 0) {
      return {
        mood: 'neutral',
        intensity: 2,
        triggers: [],
        selfCareNeeded: false,
        confidence: 0.4,
      };
    }

    entries.sort(([, a], [, b]) => b.total - a.total);
    const [dominantMood, scores] = entries[0];

    const selfCareNeeded = ['overwhelmed', 'frustrated', 'stressed'].includes(dominantMood)
      && scores.maxIntensity >= 4;

    return {
      mood: dominantMood as ExtractedMoodData['mood'],
      intensity: scores.maxIntensity,
      triggers: [...new Set(triggers)],
      selfCareNeeded,
      confidence: Math.min(0.95, 0.5 + (scores.count * 0.15)),
    };
  }

  // ==========================================================================
  // AI-Powered Extraction (Enhanced)
  // ==========================================================================

  /**
   * Use AI for more nuanced extraction when heuristics aren't enough.
   */
  private async extractWithAI(
    text: string,
    childName?: string
  ): Promise<ExtractionResult> {
    const prompt = `Analyze this parent's message about their neurodivergent child${childName ? ` (${childName})` : ''} and extract structured data. Return ONLY valid JSON with this exact shape:

{
  "behaviors": [{"category": "string", "antecedent": "string|null", "setting": "string|null", "intensity": 1-5, "notes": "string"}],
  "goalProgress": [{"description": "string", "type": "completion|partial|regression|attempt", "domain": "string|null"}],
  "mood": {"mood": "positive|neutral|stressed|frustrated|overwhelmed|hopeful|worried", "intensity": 1-5, "selfCareNeeded": boolean}
}

If no data for a category, use empty array or null. Be conservative — only extract what's clearly stated.

Parent's message:
${text.slice(0, 2000)}`;

    const response = await fetch(`${this.backendUrl}/ai/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a clinical data extraction assistant for a behavioral health app. Extract structured data from parent messages. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message || data.content || data.summary || '';

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      behaviors: (parsed.behaviors || []).map((b: Record<string, unknown>) => ({
        behaviorCategory: b.category as string,
        antecedentCategory: b.antecedent as string | undefined,
        setting: b.setting as string | undefined,
        intensity: b.intensity as number | undefined,
        notes: b.notes as string | undefined,
        childName,
        confidence: 0.85, // AI results get higher base confidence
      })),
      goalUpdates: (parsed.goalProgress || []).map((g: Record<string, unknown>) => ({
        goalDescription: g.description as string,
        progressType: g.type as ExtractedGoalProgress['progressType'],
        domain: g.domain as string | undefined,
        childName,
        confidence: 0.8,
      })),
      mood: parsed.mood ? {
        mood: parsed.mood.mood as ExtractedMoodData['mood'],
        intensity: parsed.mood.intensity as number,
        triggers: [],
        selfCareNeeded: (parsed.mood.selfCareNeeded || false) as boolean,
        confidence: 0.8,
      } : null,
      rawContext: content,
    };
  }

  // ==========================================================================
  // Merge Heuristic + AI Results
  // ==========================================================================

  private mergeResults(
    heuristic: ExtractionResult,
    ai: ExtractionResult
  ): ExtractionResult {
    // For behaviors: prefer AI results if they have higher confidence
    const allBehaviors = [...heuristic.behaviors, ...ai.behaviors];
    const behaviorsByCategory = new Map<string, ExtractedBehaviorData>();
    for (const b of allBehaviors) {
      const existing = behaviorsByCategory.get(b.behaviorCategory);
      if (!existing || b.confidence > existing.confidence) {
        behaviorsByCategory.set(b.behaviorCategory, b);
      }
    }

    // For goals: combine and deduplicate
    const allGoals = [...heuristic.goalUpdates, ...ai.goalUpdates];
    const goalsByType = new Map<string, ExtractedGoalProgress>();
    for (const g of allGoals) {
      const key = `${g.progressType}:${g.domain || g.goalDescription.slice(0, 20)}`;
      const existing = goalsByType.get(key);
      if (!existing || g.confidence > existing.confidence) {
        goalsByType.set(key, g);
      }
    }

    // For mood: prefer higher confidence
    let mood: ExtractedMoodData | null = null;
    if (heuristic.mood && ai.mood) {
      mood = heuristic.mood.confidence >= ai.mood.confidence ? heuristic.mood : ai.mood;
    } else {
      mood = heuristic.mood || ai.mood;
    }

    return {
      behaviors: Array.from(behaviorsByCategory.values()),
      goalUpdates: Array.from(goalsByType.values()),
      mood,
      rawContext: heuristic.rawContext,
    };
  }

  // ==========================================================================
  // Persistence: Save Extracted Data to Supabase
  // ==========================================================================

  /**
   * Save extracted behavior data as an ABC entry.
   */
  async saveBehaviorEntry(
    userId: string,
    childId: string,
    behavior: ExtractedBehaviorData
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('abc_entries')
        .insert({
          user_id: userId,
          child_id: childId,
          behavior_category: behavior.behaviorCategory,
          antecedent_category: behavior.antecedentCategory,
          consequence_category: behavior.consequenceCategory,
          setting: behavior.setting,
          intensity: behavior.intensity,
          notes: behavior.notes,
          occurred_at: behavior.occurredAt || new Date().toISOString(),
          source: 'ai-extraction',
          confidence: behavior.confidence,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('[AIDataExtractor] Failed to save behavior entry:', err);
      return null;
    }
  }

  /**
   * Save extracted goal progress.
   */
  async saveGoalProgress(
    userId: string,
    childId: string,
    goalUpdate: ExtractedGoalProgress
  ): Promise<void> {
    try {
      // Try to find a matching active goal
      const { data: goals } = await supabase
        .from('care_plan_goals')
        .select('id, title, category, current_progress, target_progress')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!goals || goals.length === 0) return;

      // Find the best matching goal by domain or description
      const matchingGoal = goals.find(g => {
        if (goalUpdate.domain && g.category === goalUpdate.domain) return true;
        const desc = goalUpdate.goalDescription.toLowerCase();
        return g.title.toLowerCase().split(' ').some((word: string) =>
          word.length > 3 && desc.includes(word)
        );
      });

      if (!matchingGoal) return;

      // Calculate progress increment based on type
      let newProgress = matchingGoal.current_progress;
      switch (goalUpdate.progressType) {
        case 'completion':
          newProgress = Math.min(matchingGoal.target_progress, newProgress + (matchingGoal.target_progress * 0.1));
          break;
        case 'partial':
          newProgress = Math.min(matchingGoal.target_progress, newProgress + (matchingGoal.target_progress * 0.05));
          break;
        case 'attempt':
          newProgress = Math.min(matchingGoal.target_progress, newProgress + (matchingGoal.target_progress * 0.02));
          break;
        case 'regression':
          newProgress = Math.max(0, newProgress - (matchingGoal.target_progress * 0.05));
          break;
      }

      await supabase
        .from('care_plan_goals')
        .update({
          current_progress: Math.round(newProgress),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchingGoal.id);

    } catch (err) {
      console.error('[AIDataExtractor] Failed to save goal progress:', err);
    }
  }
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _extractor: AIDataExtractor | null = null;

export function getDataExtractor(): AIDataExtractor {
  if (!_extractor) _extractor = new AIDataExtractor();
  return _extractor;
}

/**
 * Quick helper: extract all structured data from conversation messages.
 */
export async function extractFromConversation(
  messages: Array<{ role: string; content: string }>,
  options?: { useAI?: boolean; childName?: string }
): Promise<ExtractionResult> {
  return getDataExtractor().extractAll(messages, options);
}

export default AIDataExtractor;
