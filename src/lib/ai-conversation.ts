/**
 * Real AI-Powered Conversational Intelligence
 * Connects to backend server which calls OpenAI GPT
 * Like talking to a real developmental pediatrician/BCBA
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  message: string;
  detectedName?: string;
  detectedAge?: string;
  shouldProceed?: boolean;
}

/**
 * Generate intelligent AI response via backend server
 */
export async function generateAIResponse(
  conversationHistory: { role: string; content: string }[],
  currentContext: {
    step: 'welcome' | 'asking_name' | 'asking_age' | 'main_story' | 'summary';
    childName?: string;
    childAge?: string;
    parentEmpathy?: 'stressed' | 'calm' | 'hopeful';
  }
): Promise<AIResponse> {

  try {
    // Call backend server AI endpoint
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          messages: conversationHistory,
          context: currentContext
        })
      }
    );

    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}`;
      let debugInfo = null;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        debugInfo = errorData.debug;
        
        // Log detailed error info
        console.error('AI chat API error:', {
          status: response.status,
          error: errorMessage,
          debug: debugInfo
        });
      } catch (e) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
        console.error('AI chat API error (text):', errorMessage);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.message) {
      console.error('Invalid response from AI server:', data);
      throw new Error('Invalid response format from server');
    }
    
    const aiMessage = data.message;

    // Parse response for extracted data
    const extracted = extractDataFromResponse(aiMessage, conversationHistory);

    return {
      message: aiMessage,
      detectedName: extracted.name || currentContext.childName,
      detectedAge: extracted.age || currentContext.childAge,
      shouldProceed: extracted.shouldProceed
    };

  } catch (error) {
    console.error('AI conversation error:', error);
    // Fallback to smart template-based response
    return getFallbackResponse(currentContext, conversationHistory);
  }
}

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context: {
  step: string;
  childName?: string;
  childAge?: string;
  parentEmpathy?: string;
}): string {
  
  const basePersonality = `You are Aminy — a world-class developmental pediatrician and BCBA who has also mastered the art of emotional connection and genuine support.

You sound like a calm, intelligent friend who helps parents feel seen, supported, and capable.

Personality:
• Warm, clear, and clinically precise
• Celebrates small wins and progress
• Uses gentle humor and reassurance when appropriate
• Never robotic — always curious and genuinely human
• Confidently invites parents to explore features, like a coach who believes in them

Style:
• Use natural language — contractions, pauses, small emojis when it feels right
• Write like a text conversation with a trusted friend, not a script or medical document
• Ask simple, emotionally intelligent follow-ups
• Mirror the user's energy and pacing
• Keep responses warm and concise (2-3 sentences unless providing important guidance)

Clinical Intelligence:
• Draw on ABA principles and developmental pediatrics when helpful
• Explain concepts in parent-friendly language
• Reference the child's vault documents, daily plans, goals, and progress when relevant
• Remember context from previous conversations to provide personalized advice

Gentle Sales Intelligence:
• Naturally guide parents toward discovering Aminy's value
• When appropriate, mention features they haven't explored yet
• Invite them to start their free trial with genuine enthusiasm, not pressure
• Celebrate when they take steps forward (completing onboarding, setting first goal, etc.)`;

  // Context-specific guidance
  let contextGuidance = '';
  
  if (context.step === 'asking_name') {
    contextGuidance = `\n\nCurrent situation: You're asking for the child's name in a warm, natural way. If the parent gives something that doesn't sound like a name (like random letters or numbers), gently and naturally ask again. Be conversational.`;
  } else if (context.step === 'asking_age') {
    contextGuidance = `\n\nCurrent situation: You're asking for the child's age. ${context.childName ? `The child's name is ${context.childName}.` : ''} If they give you something that's not a number between 1-18 (like letters, symbols, or unrealistic ages), respond naturally like a real person would - maybe with a light touch of humor, but always warm. Don't get stuck repeating the same question.`;
  } else if (context.step === 'main_story') {
    contextGuidance = `\n\nCurrent situation: The parent is sharing their story about ${context.childName || 'their child'}${context.childAge ? ` (age ${context.childAge})` : ''}. Listen deeply, acknowledge their feelings, and reflect back what you're hearing with genuine empathy. This is the most important part - make them feel truly heard and understood.`;
  }

  return basePersonality + contextGuidance;
}

/**
 * Extract structured data from AI response and conversation
 */
function extractDataFromResponse(
  aiMessage: string, 
  conversationHistory: { role: string; content: string }[]
): { name?: string; age?: string; shouldProceed: boolean } {
  
  const lastUserMessage = conversationHistory
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  // Extract name
  let name: string | undefined;
  const namePatterns = [
    /(?:name is|called|they're|this is)\s+([A-Z][a-z]+)/i,
    /^([A-Z][a-z]+)$/i
  ];
  for (const pattern of namePatterns) {
    const match = lastUserMessage.match(pattern);
    if (match && match[1] && match[1].length >= 2 && match[1].length <= 20) {
      name = match[1];
      break;
    }
  }

  // Extract age
  let age: string | undefined;
  const agePatterns = [
    /(?:is|age|old)?\s*(\d+)(?:\s*years?)?/i,
    /^(\d+)$/
  ];
  for (const pattern of agePatterns) {
    const match = lastUserMessage.match(pattern);
    if (match && match[1]) {
      const ageNum = parseInt(match[1]);
      if (ageNum >= 1 && ageNum <= 18) {
        age = match[1];
        break;
      }
    }
  }

  // Determine if we should proceed
  // Check if AI is asking a clarifying question (ends with ?)
  const isAskingQuestion = aiMessage.trim().endsWith('?');
  const shouldProceed = !isAskingQuestion || (name !== undefined || age !== undefined);

  return { name, age, shouldProceed };
}

/**
 * Smart fallback responses when API is unavailable
 */
function getFallbackResponse(
  context: {
    step: string;
    childName?: string;
    childAge?: string;
    parentEmpathy?: string;
  },
  conversationHistory: { role: string; content: string }[]
): AIResponse {
  
  const lastUserMessage = conversationHistory
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  if (context.step === 'asking_name') {
    // Vary the language to sound natural
    const responses = [
      "What's your child's name?",
      "What should I call your little one?",
      "Tell me your child's name so I can personalize everything for you."
    ];
    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      shouldProceed: false
    };
  }

  if (context.step === 'asking_age') {
    const extracted = extractDataFromResponse('', conversationHistory);
    if (!extracted.age) {
      const responses = [
        `Got it! And how old is ${context.childName}? Just the age in years works - like 3, 5, or 7.`,
        `Perfect! What's ${context.childName}'s age? You can just type the number.`,
        `Thanks! How many years old is ${context.childName}?`
      ];
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        shouldProceed: false
      };
    }
  }

  return {
    message: "I'm here to listen. Tell me more about what brought you here today.",
    shouldProceed: true
  };
}

/**
 * Validate and clean user input
 */
export function validateUserInput(
  input: string,
  expectedType: 'name' | 'age' | 'story'
): { isValid: boolean; cleanedValue?: string; issue?: string } {
  
  const trimmed = input.trim();

  if (expectedType === 'name') {
    // Name should be letters, reasonable length
    if (trimmed.length < 2) {
      return { isValid: false, issue: 'too_short' };
    }
    if (trimmed.length > 30) {
      return { isValid: false, issue: 'too_long' };
    }
    if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
      return { isValid: false, issue: 'invalid_characters' };
    }
    // Extract first name if they gave full name
    const firstName = trimmed.split(/\s+/)[0];
    return { isValid: true, cleanedValue: firstName };
  }

  if (expectedType === 'age') {
    const ageNum = parseInt(trimmed);
    if (isNaN(ageNum)) {
      return { isValid: false, issue: 'not_a_number' };
    }
    if (ageNum < 1 || ageNum > 18) {
      return { isValid: false, issue: 'out_of_range' };
    }
    return { isValid: true, cleanedValue: ageNum.toString() };
  }

  if (expectedType === 'story') {
    if (trimmed.length < 5) {
      return { isValid: false, issue: 'too_short' };
    }
    return { isValid: true, cleanedValue: trimmed };
  }

  return { isValid: false };
}

/**
 * Generate intelligent summary of parent's story
 */
export async function generateStorySummary(
  fullStory: string,
  childName: string,
  childAge: string
): Promise<{ insights: string[]; encouragement: string }> {
  
  const systemPrompt = `You are Aminy, analyzing a parent's story about their child ${childName} (age ${childAge}). 

Extract 3-5 key insights that show you truly heard them. Format as:
- Bullet points that are specific and empathetic
- Reference their actual challenges and concerns
- Show clinical understanding

Then provide ONE warm, encouraging sentence that makes them feel supported.

Respond ONLY in this exact JSON format:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "encouragement": "single encouraging sentence"
}`;

  try {
    // Use backend server for AI summary generation
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
            { role: 'user', content: fullStory }
          ],
          context: { step: 'summary', childName, childAge }
        })
      }
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const parsed = JSON.parse(data.message);

    return {
      insights: parsed.insights || [],
      encouragement: parsed.encouragement || "I'm here to support you every step of the way."
    };

  } catch (error) {
    console.error('Summary generation error:', error);
    // Fallback to pattern-based extraction
    return extractInsightsFallback(fullStory, childName, childAge);
  }
}

/**
 * Fallback insight extraction using patterns
 */
function extractInsightsFallback(
  story: string,
  childName: string,
  childAge: string
): { insights: string[]; encouragement: string } {
  
  const insights: string[] = [];
  const lower = story.toLowerCase();

  if (/morning|wake|breakfast|dress/i.test(lower)) {
    insights.push(`Morning routines with ${childName} need extra support`);
  }
  if (/meltdown|tantrum|cry|upset|overwhelm/i.test(lower)) {
    insights.push(`${childName} experiences big emotions that are challenging to navigate`);
  }
  if (/speech|talk|language|word/i.test(lower)) {
    insights.push(`Communication and language development are areas of focus for ${childName}`);
  }
  if (/sleep|bedtime|night/i.test(lower)) {
    insights.push(`Sleep and bedtime routines could use some gentle strategies`);
  }
  if (/school|teacher|class/i.test(lower)) {
    insights.push(`${childName}'s school experience needs additional support`);
  }
  if (/food|eat|meal|picky/i.test(lower)) {
    insights.push(`Mealtimes and eating present challenges for your family`);
  }

  if (insights.length === 0) {
    insights.push(`You're navigating ${childName}'s developmental journey with love and dedication`);
  }

  return {
    insights,
    encouragement: `I see you, and I'm here to support ${childName}'s growth every step of the way.`
  };
}
