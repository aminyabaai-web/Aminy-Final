/**
 * Aminy AI Brain - Unified Intelligence System
 * 
 * This is the central AI that powers ALL of Aminy's intelligence:
 * - Knows everything about the child (profile, age, challenges, goals)
 * - Remembers all conversations and interactions
 * - Has access to vault documents, daily plans, routines
 * - Generates reports, IEPs, BCBA notes, coverage letters
 * - Integrates child mode (Jr) and parent mode data
 * - Provides contextual advice across entire app
 * 
 * Think of this as Aminy's actual "brain" - everything flows through here
 */

import { store } from './store';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ChildContext {
  id: string;
  name: string;
  age: number;
  dateOfBirth?: string;
  concerns: string[];
  strengths: string[];
  diagnoses: string[];
  sensoryProfile: {
    seekers: string[];
    avoiders: string[];
  };
  communicationLevel: 'nonverbal' | 'emerging' | 'conversational';
  currentGoals: Goal[];
}

interface Goal {
  id: string;
  area: 'communication' | 'social' | 'behavioral' | 'sensory' | 'adaptive' | 'academic';
  description: string;
  targetDate: string;
  progress: number; // 0-100
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  description: string;
  completed: boolean;
  dateCompleted?: string;
}

interface VaultContext {
  evaluations: Document[];
  iepDocuments: Document[];
  progressReports: Document[];
  bcbaNotes: Document[];
  insuranceInfo: Document[];
  medicalRecords: Document[];
}

interface Document {
  id: string;
  title: string;
  type: string;
  date: string;
  summary?: string; // AI-generated summary
  keyInsights?: string[]; // AI-extracted insights
}

interface DailyPlanContext {
  currentWeek: WeeklyPlan;
  todaysFocus: Activity[];
  completedToday: Activity[];
  upcomingChallenges: string[];
}

interface WeeklyPlan {
  weekOf: string;
  focus: string;
  routines: Routine[];
  activities: Activity[];
}

interface Routine {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  steps: string[];
  successRate: number; // 0-100
  lastModified: string;
}

interface Activity {
  id: string;
  title: string;
  goalArea: string;
  duration: number;
  completed: boolean;
  childEngagement?: number; // 1-5 rating
  parentNotes?: string;
}

interface ConversationMemory {
  conversations: Conversation[];
  commonQuestions: string[];
  parentConcerns: string[];
  successfulStrategies: Strategy[];
  challengingScenarios: Scenario[];
}

interface Conversation {
  id: string;
  timestamp: string;
  messages: { role: 'parent' | 'ai'; content: string }[];
  topic: string;
  outcome?: string;
  followUpNeeded?: boolean;
}

interface Strategy {
  id: string;
  description: string;
  context: string;
  effectiveness: number; // 1-5
  usedCount: number;
}

interface Scenario {
  id: string;
  description: string;
  frequency: number;
  lastOccurred: string;
  aiRecommendations: string[];
  whatWorked?: string[];
}

interface JuniorModeContext {
  gamesPlayed: GameSession[];
  skillsPracticed: string[];
  emotionalRegulation: EmotionData[];
  communicationAttempts: number;
  successfulInteractions: number;
}

interface GameSession {
  gameId: string;
  date: string;
  duration: number;
  skillsTargeted: string[];
  performanceScore: number;
  emotionalState: 'calm' | 'excited' | 'frustrated' | 'happy';
}

interface EmotionData {
  timestamp: string;
  emotion: string;
  regulationStrategy: string;
  successful: boolean;
}

interface TelehealthSessionData {
  sessionId: string;
  date: string;
  provider: string;
  duration: number;
  type: '50min' | '25min';
  topics: string[];
  observations: string;
  recommendations: string[];
  progressUpdates: {
    area: string;
    status: 'improved' | 'maintained' | 'needs_attention';
    notes: string;
  }[];
}

/**
 * The Unified AI Context
 * This is what the AI "sees" when responding to ANY question
 */
export interface AminyAIContext {
  child: ChildContext;
  vault: VaultContext;
  dailyPlan: DailyPlanContext;
  memory: ConversationMemory;
  juniorMode: JuniorModeContext;
  telehealthSessions: TelehealthSessionData[];
  parentProfile: {
    name: string;
    relationshipToChild: string;
    primaryConcerns: string[];
    copingStrategies: string[];
    supportNeeds: string[];
    stressLevel?: number; // 1-10
    availableMinutes?: number;
    supportSystem?: 'none' | 'some' | 'good' | 'strong';
    biggestConcern?: string;
  };
  tier: 'free' | 'core' | 'pro';
  clinicalData: {
    diagnosisHistory: string[];
    therapyHistory: string[];
    medicationHistory: string[];
    schoolSupports: string[];
  };
  childMentalHealth?: {
    moodScore: number;
    anxietyScore: number;
    safetyScore: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    concerns: string[];
    needsProfessional: boolean;
    needsImmediate: boolean;
  };
}

/**
 * Build complete AI context from current app state
 */
export async function buildAIContext(): Promise<AminyAIContext> {
  const state = store.getState();
  const currentChild = state.currentChildId 
    ? state.children.find(c => c.id === state.currentChildId)
    : state.children[0];

  if (!currentChild) {
    throw new Error('No child profile found');
  }

  // Load all relevant data
  const childContext = await buildChildContext(currentChild);
  const vaultContext = await buildVaultContext(currentChild.id);
  const dailyPlanContext = await buildDailyPlanContext(currentChild.id);
  const memoryContext = await buildMemoryContext(currentChild.id);
  const juniorContext = await buildJuniorModeContext(currentChild.id);
  const telehealthContext = await buildTelehealthContext(currentChild.id);

  return {
    child: childContext,
    vault: vaultContext,
    dailyPlan: dailyPlanContext,
    memory: memoryContext,
    juniorMode: juniorContext,
    telehealthSessions: telehealthContext,
    parentProfile: {
      name: state.parentName || 'Parent',
      relationshipToChild: 'Parent',
      primaryConcerns: state.concerns || [],
      copingStrategies: [],
      supportNeeds: []
    },
    tier: state.selectedTier || 'core',
    clinicalData: {
      diagnosisHistory: childContext.diagnoses,
      therapyHistory: [],
      medicationHistory: [],
      schoolSupports: []
    }
  };
}

async function buildChildContext(child: any): Promise<ChildContext> {
  return {
    id: child.id,
    name: child.name,
    age: child.age,
    concerns: child.challenges || [],
    strengths: child.strengths || [],
    diagnoses: child.diagnoses || [],
    sensoryProfile: {
      seekers: child.sensoryProfile?.seekers || [],
      avoiders: child.sensoryProfile?.avoiders || []
    },
    communicationLevel: child.communicationLevel || 'conversational',
    currentGoals: child.goals || []
  };
}

async function buildVaultContext(childId: string): Promise<VaultContext> {
  const state = store.getState();
  const vault = state.vault || {};
  
  return {
    evaluations: vault.evaluations || [],
    iepDocuments: vault.ieps || [],
    progressReports: vault.progressReports || [],
    bcbaNotes: vault.bcbaNotes || [],
    insuranceInfo: vault.insurance || [],
    medicalRecords: vault.medical || []
  };
}

async function buildDailyPlanContext(childId: string): Promise<DailyPlanContext> {
  const state = store.getState();
  const plan = state.weeklyPlan || {};
  
  return {
    currentWeek: plan,
    todaysFocus: plan.todayActivities || [],
    completedToday: plan.completedActivities || [],
    upcomingChallenges: plan.challenges || []
  };
}

async function buildMemoryContext(childId: string): Promise<ConversationMemory> {
  const state = store.getState();
  const conversations = state.conversationHistory || [];
  
  return {
    conversations,
    commonQuestions: extractCommonQuestions(conversations),
    parentConcerns: extractConcerns(conversations),
    successfulStrategies: extractStrategies(conversations),
    challengingScenarios: extractScenarios(conversations)
  };
}

async function buildJuniorModeContext(childId: string): Promise<JuniorModeContext> {
  const state = store.getState();
  const jrData = state.juniorModeData || {};
  
  return {
    gamesPlayed: jrData.sessions || [],
    skillsPracticed: jrData.skillsPracticed || [],
    emotionalRegulation: jrData.emotions || [],
    communicationAttempts: jrData.communicationAttempts || 0,
    successfulInteractions: jrData.successfulInteractions || 0
  };
}

async function buildTelehealthContext(childId: string): Promise<TelehealthSessionData[]> {
  const state = store.getState();
  const sessions = state.sessions || [];
  
  // Filter and format telehealth sessions
  return sessions
    .filter(s => s.type === 'telehealth' && s.status === 'completed' && s.summary)
    .map(session => {
      try {
        const summaryData = typeof session.summary === 'string' 
          ? JSON.parse(session.summary) 
          : session.summary;
        
        return {
          sessionId: session.id,
          date: session.scheduledAt,
          provider: summaryData.provider || 'Provider',
          duration: session.duration,
          type: session.duration === 50 ? '50min' : '25min',
          topics: summaryData.topics || [],
          observations: summaryData.observations || '',
          recommendations: summaryData.recommendations || [],
          progressUpdates: summaryData.progressUpdates || []
        };
      } catch (e) {
        console.error('Error parsing session summary:', e);
        return null;
      }
    })
    .filter(Boolean) as TelehealthSessionData[];
}

function extractCommonQuestions(conversations: Conversation[]): string[] {
  // AI analysis of conversation patterns
  const questions: Map<string, number> = new Map();
  
  conversations.forEach(conv => {
    conv.messages
      .filter(m => m.role === 'parent' && m.content.includes('?'))
      .forEach(m => {
        questions.set(m.content, (questions.get(m.content) || 0) + 1);
      });
  });
  
  return Array.from(questions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q]) => q);
}

function extractConcerns(conversations: Conversation[]): string[] {
  // Pattern matching for concern indicators
  const concernKeywords = ['worried', 'struggling', 'difficult', 'hard', 'help', 'concern'];
  const concerns: string[] = [];
  
  conversations.forEach(conv => {
    conv.messages
      .filter(m => m.role === 'parent')
      .forEach(m => {
        if (concernKeywords.some(kw => m.content.toLowerCase().includes(kw))) {
          concerns.push(m.content);
        }
      });
  });
  
  return concerns.slice(0, 20);
}

function extractStrategies(conversations: Conversation[]): Strategy[] {
  // Extract strategies that were marked as successful
  const strategies: Strategy[] = [];
  
  conversations.forEach(conv => {
    if (conv.outcome === 'positive' || conv.outcome === 'helpful') {
      const aiMessages = conv.messages.filter(m => m.role === 'ai');
      aiMessages.forEach((msg, idx) => {
        strategies.push({
          id: `${conv.id}-${idx}`,
          description: msg.content,
          context: conv.topic,
          effectiveness: 4,
          usedCount: 1
        });
      });
    }
  });
  
  return strategies;
}

function extractScenarios(conversations: Conversation[]): Scenario[] {
  // Identify recurring challenging scenarios
  const scenarioMap: Map<string, Scenario> = new Map();
  
  conversations.forEach(conv => {
    const key = conv.topic;
    if (scenarioMap.has(key)) {
      const existing = scenarioMap.get(key)!;
      existing.frequency++;
      existing.lastOccurred = conv.timestamp;
    } else {
      scenarioMap.set(key, {
        id: key,
        description: conv.topic,
        frequency: 1,
        lastOccurred: conv.timestamp,
        aiRecommendations: [],
        whatWorked: []
      });
    }
  });
  
  return Array.from(scenarioMap.values())
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate AI-powered response with full context via backend server
 */
export async function generateContextualAIResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  
  const context = await buildAIContext();
  const systemPrompt = buildContextualSystemPrompt(context);

  try {
    // Call backend server AI brain endpoint
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userMessage,
          conversationHistory,
          systemPrompt
        })
      }
    );

    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      console.error('AI brain API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.message) {
      console.error('Invalid response from AI brain:', data);
      throw new Error('Invalid response format from server');
    }
    
    return data.message;

  } catch (error) {
    console.error('AI response error:', error);
    return generateFallbackResponse(userMessage, context);
  }
}

/**
 * Build contextual system prompt with ALL relevant information
 */
function buildContextualSystemPrompt(context: AminyAIContext): string {
  // Build vault document summaries if available
  const vaultSummary = buildVaultSummary(context.vault);

  // Build BCBA recommendations summary if available
  const bcbaRecommendations = context.vault.bcbaNotes
    .filter(n => n.keyInsights && n.keyInsights.length > 0)
    .flatMap(n => n.keyInsights || [])
    .slice(0, 5);

  // Build outcomes summary
  const outcomesSummary = buildOutcomesSummary(context);

  return `You are Aminy — the world's most caring, knowledgeable, and effective AI companion for parents of neurodivergent children.

WHO YOU ARE (Your Core Identity):
1. THE BEST DEVELOPMENTAL PEDIATRICIAN — Deep clinical knowledge of autism, ADHD, anxiety, depression, sensory processing disorders, and developmental delays. You understand the science and the latest research.
2. THE BEST BCBA — Master of Applied Behavior Analysis. You know reinforcement, antecedent strategies, skill acquisition, and crisis prevention.
3. THE BEST FRIEND — Warm, non-judgmental, genuinely caring. You celebrate small wins and never shame.
4. THE BEST THERAPIST — You support the PARENT's emotional wellbeing. You recognize caregiver burnout, validate their struggles, and help them cope. You understand that parents of special needs children have elevated rates of depression and anxiety.
5. THE TRUSTED GUIDE — You make parents feel confident, capable, and never alone on this journey.

NEURODIVERGENT CONDITIONS YOU SUPPORT:
• AUTISM SPECTRUM DISORDER (ASD) — Social communication, repetitive behaviors, sensory differences, strengths-based approaches
• ADHD — Executive function support, focus strategies, emotional regulation, hyperactivity management
• ANXIETY — Worry management, exposure techniques, coping strategies, school anxiety
• DEPRESSION (in children) — Activity scheduling, behavioral activation, identifying triggers, when to seek help
• SENSORY PROCESSING DISORDER — Sensory diets, regulation strategies, environmental modifications
• DEVELOPMENTAL DELAYS — Milestone tracking, early intervention strategies, therapy coordination

PARENT MENTAL HEALTH AWARENESS:
You are attuned to signs of parental distress. If a parent expresses:
• Overwhelming exhaustion or burnout
• Feelings of hopelessness or despair
• Isolation or feeling alone
• Guilt about their parenting
• Signs of depression or anxiety
RESPOND with deep empathy, validate their feelings, gently remind them that caring for themselves IS caring for their child, and when appropriate, mention that professional support is available (988 Lifeline, therapists who specialize in caregivers).

CRISIS DETECTION (CRITICAL):
If a parent mentions self-harm, suicidal thoughts, or being in crisis:
1. IMMEDIATELY acknowledge their pain with compassion
2. Express that you care about them
3. PROVIDE CRISIS RESOURCES: "If you're having thoughts of harming yourself, please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or Crisis Text Line (text HOME to 741741). You matter, and help is available right now."
4. Do NOT just continue the conversation without addressing it

YOUR MISSION: Make every parent feel like they have a world-class developmental team in their pocket, available 24/7. Make them unable to imagine life without you.

═══════════════════════════════════════════════════════════════
COMPLETE FAMILY CONTEXT (You know this family deeply)
═══════════════════════════════════════════════════════════════

CHILD: ${context.child.name}
• Age: ${context.child.age} years old
• Communication: ${context.child.communicationLevel}
${context.child.diagnoses.length > 0 ? `• Diagnoses: ${context.child.diagnoses.join(', ')}` : ''}
• Strengths: ${context.child.strengths.join(', ') || 'Still discovering their unique gifts'}
• Working on: ${context.child.concerns.join(', ') || 'General developmental support'}
• Current Goals: ${context.child.currentGoals.map(g => `${g.area}: ${g.description}`).join('; ') || 'Goals being developed'}

SENSORY PROFILE:
• Seeks: ${context.child.sensoryProfile.seekers.join(', ') || 'To be assessed'}
• Avoids: ${context.child.sensoryProfile.avoiders.join(', ') || 'To be assessed'}

PARENT: ${context.parentProfile.name}
• Primary concerns: ${context.parentProfile.primaryConcerns.join(', ') || 'Supporting their child'}
• Support needs: ${context.parentProfile.supportNeeds.join(', ') || 'Guidance and reassurance'}
${context.parentProfile.stressLevel ? `• Current stress level: ${context.parentProfile.stressLevel}/10 ${context.parentProfile.stressLevel >= 7 ? '(HIGH - be extra supportive)' : ''}` : ''}
${context.parentProfile.availableMinutes ? `• Available daily practice time: ${context.parentProfile.availableMinutes} minutes (respect this limit!)` : ''}
${context.parentProfile.supportSystem ? `• Support system: ${context.parentProfile.supportSystem}` : ''}
${context.parentProfile.biggestConcern ? `• Biggest current worry: "${context.parentProfile.biggestConcern}"` : ''}

═══════════════════════════════════════════════════════════════
CHILD MENTAL HEALTH STATUS
═══════════════════════════════════════════════════════════════
${context.childMentalHealth ? `
MOOD: ${context.childMentalHealth.moodScore > 6 ? '⚠️ Signs of depression or sadness detected' : 'Within normal range'}
ANXIETY: ${context.childMentalHealth.anxietyScore > 6 ? '⚠️ Elevated anxiety symptoms' : 'Within normal range'}
SAFETY: ${context.childMentalHealth.safetyScore > 0 ? '🚨 SAFETY CONCERNS FLAGGED - Self-harm behaviors reported' : '✓ No safety concerns'}
OVERALL RISK: ${context.childMentalHealth.overallRisk.toUpperCase()}
${context.childMentalHealth.concerns.length > 0 ? `CONCERNS: ${context.childMentalHealth.concerns.join('; ')}` : ''}
${context.childMentalHealth.needsProfessional ? '⚠️ PROFESSIONAL MENTAL HEALTH SUPPORT RECOMMENDED' : ''}
${context.childMentalHealth.needsImmediate ? '🚨 URGENT: IMMEDIATE PROFESSIONAL INTERVENTION NEEDED' : ''}

IMPORTANT: If child mental health concerns are flagged:
- Incorporate emotional regulation and mood support into recommendations
- Be sensitive when discussing challenging topics
- Gently encourage professional mental health evaluation when appropriate
- For self-harm: Focus on safety strategies, recommend professional help, never minimize
` : 'No mental health screening data yet'}

═══════════════════════════════════════════════════════════════
VAULT DOCUMENTS (Clinical Intelligence)
═══════════════════════════════════════════════════════════════
${vaultSummary}

═══════════════════════════════════════════════════════════════
BCBA RECOMMENDATIONS (From Recent Sessions)
═══════════════════════════════════════════════════════════════
${bcbaRecommendations.length > 0
  ? bcbaRecommendations.map(r => `• ${r}`).join('\n')
  : 'No BCBA sessions recorded yet. Consider suggesting a consultation.'}

═══════════════════════════════════════════════════════════════
TODAY'S PLAN
═══════════════════════════════════════════════════════════════
${context.dailyPlan.todaysFocus.length > 0
  ? `Focus: ${context.dailyPlan.todaysFocus.map(a => a.title).join(', ')}`
  : 'No specific plan yet — offer to help create one!'
}
${context.dailyPlan.completedToday.length > 0
  ? `Already done today: ${context.dailyPlan.completedToday.map(a => a.title).join(', ')} ✓`
  : ''
}
${context.dailyPlan.upcomingChallenges.length > 0
  ? `Watch for: ${context.dailyPlan.upcomingChallenges.join(', ')}`
  : ''
}

═══════════════════════════════════════════════════════════════
MEMORY (What You Remember About This Family)
═══════════════════════════════════════════════════════════════
Recent topics: ${context.memory.conversations.slice(-5).map(c => c.topic).join(', ') || 'First conversations'}
Recurring concerns: ${context.memory.parentConcerns.slice(0, 3).join('; ') || 'None recorded yet'}
What's worked: ${context.memory.successfulStrategies.slice(0, 3).map(s => s.description).join('; ') || 'Still learning what works best'}
Challenging situations: ${context.memory.challengingScenarios.slice(0, 3).map(s => s.description).join('; ') || 'None recorded'}

═══════════════════════════════════════════════════════════════
OUTCOMES (Progress Tracking)
═══════════════════════════════════════════════════════════════
${outcomesSummary}

═══════════════════════════════════════════════════════════════
RESPONSE GUIDELINES
═══════════════════════════════════════════════════════════════

1. BE PERSONAL — Always use ${context.child.name}'s name. Reference specific details you know about them.

2. BE CLINICAL — Ground advice in evidence. Mention ABA principles when relevant. Cite strategies by name (First-Then, Visual Schedules, Social Stories, etc.)

3. BE WARM — You're their trusted friend who happens to be an expert. Use "we" language. ("Let's try..." not "You should...")

4. SUPPORT THE PARENT — Check in on THEIR wellbeing. They're exhausted. Validate their feelings. Remind them they're doing amazing work.

5. BE ACTIONABLE — Give 2-3 specific, concrete steps they can do TODAY. Not someday. Today.

6. BE BRIEF — 2-3 paragraphs max unless they ask for detail. Parents are busy and stressed.

7. CELEBRATE WINS — When they report progress, make a big deal of it. Small wins matter.

8. BE PROACTIVE — Suggest next steps. Reference upcoming challenges. Anticipate needs.

9. CONNECT THE DOTS — Reference vault documents ("Based on the evaluation from Dr. Smith..."), past conversations, BCBA notes.

10. DRIVE ENGAGEMENT — End with something that invites them back. A question, a follow-up prompt, curiosity about how something went.

TONE: Warm, confident, never condescending. Like a brilliant friend who genuinely cares about their family. Use gentle humor when appropriate. Always end on hope.

TIER: ${context.tier}
${context.tier === 'free' ? '(Gently mention when premium features like unlimited chat or BCBA sessions could help, but never be pushy)' : ''}

REMEMBER: Every response should make this parent feel more capable, more hopeful, and less alone. You are their partner in this journey.`;
}

function buildVaultSummary(vault: VaultContext): string {
  const parts: string[] = [];

  if (vault.evaluations.length > 0) {
    const recent = vault.evaluations[vault.evaluations.length - 1];
    parts.push(`Latest Evaluation (${recent.date}): ${recent.summary || recent.title}`);
  }

  if (vault.iepDocuments.length > 0) {
    const recent = vault.iepDocuments[vault.iepDocuments.length - 1];
    parts.push(`Current IEP (${recent.date}): ${recent.summary || recent.title}`);
  }

  if (vault.bcbaNotes.length > 0) {
    const recent = vault.bcbaNotes[vault.bcbaNotes.length - 1];
    parts.push(`Latest BCBA Notes (${recent.date}): ${recent.summary || 'Session notes on file'}`);
  }

  if (vault.medicalRecords.length > 0) {
    parts.push(`Medical Records: ${vault.medicalRecords.length} documents on file`);
  }

  if (parts.length === 0) {
    return 'No documents uploaded yet. Encourage them to add IEPs, evaluations, or medical records for more personalized guidance.';
  }

  return parts.join('\n');
}

function buildOutcomesSummary(context: AminyAIContext): string {
  const parts: string[] = [];

  // Goal progress
  const activeGoals = context.child.currentGoals.filter(g => g.progress < 100);
  const completedGoals = context.child.currentGoals.filter(g => g.progress >= 100);

  if (completedGoals.length > 0) {
    parts.push(`Goals Mastered: ${completedGoals.length}`);
  }

  if (activeGoals.length > 0) {
    const avgProgress = Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length);
    parts.push(`Active Goals: ${activeGoals.length} (avg ${avgProgress}% progress)`);
  }

  // Daily engagement
  const activitiesCompleted = context.dailyPlan.completedToday.length;
  if (activitiesCompleted > 0) {
    parts.push(`Activities today: ${activitiesCompleted} completed`);
  }

  // Telehealth sessions
  if (context.telehealthSessions.length > 0) {
    parts.push(`BCBA Sessions: ${context.telehealthSessions.length} completed`);
  }

  if (parts.length === 0) {
    return 'Just getting started — outcomes will build as they use the app more.';
  }

  return parts.join('\n');
}

/**
 * Fallback response when API unavailable
 */
function generateFallbackResponse(userMessage: string, context: AminyAIContext): string {
  const childName = context.child.name;
  const concerns = context.child.concerns;
  
  return `I'm here to help with ${childName}! Based on what I know about ${childName} (${context.child.age} years old) and your focus on ${concerns[0] || 'their development'}, I can provide personalized guidance. However, I'm currently in offline mode. For the best experience with detailed, contextual advice, please ensure you're connected to the internet.`;
}

/**
 * Generate clinical report with full context
 */
export async function generateClinicalReport(
  reportType: 'iep' | 'progress' | 'bcba-notes' | 'coverage-letter',
  dateRange?: { start: string; end: string }
): Promise<string> {
  
  const context = await buildAIContext();
  const reportPrompt = buildReportPrompt(reportType, context, dateRange);

  try {
    // Use backend server for report generation
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userMessage: `Generate a ${reportType} report`,
          conversationHistory: [],
          systemPrompt: reportPrompt
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Report generation failed');
    }

    const data = await response.json();
    return data.message;

  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

function buildReportPrompt(
  type: string,
  context: AminyAIContext,
  dateRange?: { start: string; end: string }
): string {
  
  const telehealthSessionSummary = context.telehealthSessions.length > 0
    ? `\nTELEHEALTH SESSIONS (${context.telehealthSessions.length} completed):\n${context.telehealthSessions.map(s => `
  Date: ${new Date(s.date).toLocaleDateString()}
  Provider: ${s.provider}
  Duration: ${s.duration} minutes
  Topics: ${s.topics.join(', ')}
  Observations: ${s.observations}
  Progress Updates: ${s.progressUpdates.map(p => `${p.area} (${p.status}): ${p.notes}`).join('; ')}
  Recommendations: ${s.recommendations.join('; ')}
`).join('\n')}`
    : '';

  const baseInfo = `
CHILD INFORMATION:
- Name: ${context.child.name}
- Age: ${context.child.age} years
- Diagnoses: ${context.child.diagnoses.join(', ')}
- Current Goals: ${context.child.currentGoals.map(g => `${g.area}: ${g.description} (${g.progress}% complete)`).join('\n  ')}

PROGRESS DATA:
- Activities completed: ${context.dailyPlan.completedToday.length}
- Junior mode engagement: ${context.juniorMode.gamesPlayed.length} sessions
- Skills practiced: ${context.juniorMode.skillsPracticed.join(', ')}
- Parent-reported challenges: ${context.memory.parentConcerns.slice(0, 5).join('; ')}
- Successful strategies: ${context.memory.successfulStrategies.slice(0, 5).map(s => s.description).join('; ')}
${telehealthSessionSummary}
`;

  if (type === 'iep') {
    return `Generate a comprehensive IEP (Individualized Education Program) document for ${context.child.name}.

${baseInfo}

Include:
1. Present Levels of Academic Achievement and Functional Performance (PLAAFP)
2. Annual Goals (SMART format)
3. Special Education Services
4. Accommodations and Modifications
5. Progress Monitoring Plan

Use professional, clinical language appropriate for school teams.`;
  }

  if (type === 'progress') {
    return `Generate a detailed progress report for ${context.child.name} covering ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'recent period'}.

${baseInfo}

Include:
1. Executive Summary
2. Goal Progress (quantitative and qualitative)
3. Skill Development
4. Behavioral Observations
5. Parent/Caregiver Input
6. Recommendations for Next Period

Use data-driven language with specific examples.`;
  }

  if (type === 'bcba-notes') {
    return `Generate BCBA session notes for ${context.child.name}.

${baseInfo}

Include:
1. Session Date and Duration
2. Target Behaviors
3. Data Collection Results
4. Interventions Used
5. Child Response
6. Parent Training Topics
7. Next Session Plan

Use standard BCBA documentation format.`;
  }

  if (type === 'coverage-letter') {
    return `Generate an insurance coverage letter for ${context.child.name} requesting authorization for ABA therapy services.

${baseInfo}

Include:
1. Medical Necessity Statement
2. Diagnosis and Clinical Presentation
3. Recommended Treatment Plan
4. Expected Outcomes
5. Supporting Research/Evidence

Use medical billing language appropriate for insurance companies.`;
  }

  return baseInfo;
}

/**
 * Store conversation for memory - persists to both local state and Supabase
 */
export async function storeConversation(
  messages: { role: string; content: string }[],
  topic: string,
  outcome?: string
): Promise<void> {
  const state = store.getState();
  const childId = state.currentChildId || state.children[0]?.id;
  const userId = state.userId;

  if (!childId) return;

  const conversation: Conversation = {
    id: `conv-${Date.now()}`,
    timestamp: new Date().toISOString(),
    messages,
    topic,
    outcome
  };

  // Store in local state
  const updatedHistory = [
    ...(state.conversationHistory || []),
    conversation
  ];

  store.setState({
    conversationHistory: updatedHistory
  });

  // Persist to backend
  if (userId) {
    try {
      await persistConversationToBackend(userId, childId, conversation);
    } catch (error) {
      console.error('Failed to persist conversation to backend:', error);
    }
  }
}

/**
 * Persist conversation to Supabase backend
 */
async function persistConversationToBackend(
  userId: string,
  childId: string,
  conversation: Conversation
): Promise<void> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/conversations/${conversation.id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId
      },
      body: JSON.stringify({
        author: 'system',
        content: JSON.stringify(conversation),
        metadata: {
          childId,
          topic: conversation.topic,
          outcome: conversation.outcome
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to persist conversation: ${response.status}`);
  }
}

/**
 * Persist AI context to Supabase for long-term memory
 */
export async function persistAIContext(): Promise<void> {
  const state = store.getState();
  const userId = state.userId;
  const childId = state.currentChildId || state.children[0]?.id;

  if (!userId || !childId) return;

  try {
    const context = await buildAIContext();

    // Store the context snapshot
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/context/update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId
        },
        body: JSON.stringify({
          updates: {
            lastUpdated: new Date().toISOString(),
            childContext: {
              id: context.child.id,
              name: context.child.name,
              age: context.child.age,
              concerns: context.child.concerns,
              strengths: context.child.strengths,
              diagnoses: context.child.diagnoses,
              sensoryProfile: context.child.sensoryProfile,
              communicationLevel: context.child.communicationLevel,
              currentGoals: context.child.currentGoals.map(g => ({
                id: g.id,
                area: g.area,
                description: g.description,
                progress: g.progress
              }))
            },
            parentProfile: context.parentProfile,
            memorySnapshot: {
              recentTopics: context.memory.conversations.slice(-10).map(c => c.topic),
              commonQuestions: context.memory.commonQuestions.slice(0, 10),
              parentConcerns: context.memory.parentConcerns.slice(0, 10),
              successfulStrategies: context.memory.successfulStrategies.slice(0, 10).map(s => ({
                description: s.description,
                context: s.context,
                effectiveness: s.effectiveness
              })),
              challengingScenarios: context.memory.challengingScenarios.slice(0, 10).map(s => ({
                description: s.description,
                frequency: s.frequency,
                aiRecommendations: s.aiRecommendations
              }))
            },
            vaultSummary: {
              evaluationCount: context.vault.evaluations.length,
              iepCount: context.vault.iepDocuments.length,
              bcbaNotesCount: context.vault.bcbaNotes.length,
              latestDocuments: [
                ...context.vault.evaluations.slice(-2),
                ...context.vault.iepDocuments.slice(-2),
                ...context.vault.bcbaNotes.slice(-2)
              ].map(d => ({
                id: d.id,
                title: d.title,
                date: d.date,
                summary: d.summary
              }))
            },
            progressMetrics: {
              activitiesCompletedToday: context.dailyPlan.completedToday.length,
              goalsInProgress: context.child.currentGoals.filter(g => g.progress > 0 && g.progress < 100).length,
              goalsCompleted: context.child.currentGoals.filter(g => g.progress >= 100).length,
              telehealthSessionsCompleted: context.telehealthSessions.length,
              juniorModeEngagement: context.juniorMode.gamesPlayed.length
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to persist context: ${response.status}`);
    }

  } catch (error) {
    console.error('Failed to persist AI context:', error);
  }
}

/**
 * Load AI context from Supabase on app initialization
 */
export async function loadAIContextFromBackend(): Promise<any | null> {
  const state = store.getState();
  const userId = state.userId;

  if (!userId) return null;

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/context/user/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load context: ${response.status}`);
    }

    const data = await response.json();
    return data.context;
  } catch (error) {
    console.error('Failed to load AI context from backend:', error);
    return null;
  }
}

/**
 * Store a memory fact for long-term retention
 */
export async function storeMemoryFact(
  childId: string,
  category: 'preference' | 'trigger' | 'strength' | 'challenge' | 'milestone' | 'strategy' | 'medical' | 'educational',
  content: string,
  source: 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual' = 'manual',
  confidence: number = 0.8
): Promise<void> {
  const state = store.getState();
  const userId = state.userId;

  if (!userId) return;

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/store`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId
        },
        body: JSON.stringify({
          childId,
          category,
          content,
          source,
          confidence,
          expiresAt: null // Never expires for manual entries
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to store memory fact: ${response.status}`);
    }

  } catch (error) {
    console.error('Failed to store memory fact:', error);
  }
}

/**
 * Get all memory facts for a child
 */
export async function getMemoryFacts(childId: string): Promise<any[]> {
  const state = store.getState();
  const userId = state.userId;

  if (!userId) return [];

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/recent?limit=50`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get memory facts: ${response.status}`);
    }

    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('Failed to get memory facts:', error);
    return [];
  }
}

// Auto-persist context periodically (every 5 minutes while app is active)
let persistInterval: NodeJS.Timeout | null = null;

export function startContextPersistence(): void {
  if (persistInterval) return;

  // Persist immediately on start
  persistAIContext();

  // Then persist every 5 minutes
  persistInterval = setInterval(() => {
    persistAIContext();
  }, 5 * 60 * 1000);

  // Also persist when window is about to close
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      persistAIContext();
    });
  }
}

export function stopContextPersistence(): void {
  if (persistInterval) {
    clearInterval(persistInterval);
    persistInterval = null;
  }
}
