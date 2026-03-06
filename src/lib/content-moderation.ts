/**
 * Content Moderation Library
 * Filters profanity, PII, and inappropriate content for Aminy Hub
 */

// Profanity word list (basic - in production, use comprehensive API)
const profanityList = [
  'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 'bastard',
  // Add more as needed
];

// PII patterns
const piiPatterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  address: /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/gi,
  zipCode: /\b\d{5}(-\d{4})?\b/g
};

// Inappropriate content patterns
const inappropriatePatterns = {
  spam: /(buy now|click here|limited time|act now|free money)/gi,
  harassment: /(kill yourself|you suck|you're stupid|loser|idiot)/gi,
  promotion: /(check out my|follow me|subscribe to|visit my website)/gi
};

export interface ModerationResult {
  passed: boolean;
  filteredContent: string;
  flags: string[];
  severity: 'clean' | 'mild' | 'moderate' | 'severe';
}

/**
 * Moderate user-generated content
 */
export function moderateContent(content: string): ModerationResult {
  if (!content || content.trim().length === 0) {
    return {
      passed: false,
      filteredContent: '',
      flags: ['empty_content'],
      severity: 'clean'
    };
  }

  let filteredContent = content;
  const flags: string[] = [];
  let severity: ModerationResult['severity'] = 'clean';

  // Check for profanity
  const profanityFound = profanityList.filter(word => 
    content.toLowerCase().includes(word)
  );

  if (profanityFound.length > 0) {
    flags.push('profanity');
    severity = profanityFound.length > 2 ? 'moderate' : 'mild';
    
    // Replace profanity with asterisks
    profanityFound.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
    });
  }

  // Check for PII
  const piiFound: string[] = [];
  
  Object.entries(piiPatterns).forEach(([type, pattern]) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      piiFound.push(type);
      flags.push(`pii_${type}`);
      
      // Redact PII
      filteredContent = filteredContent.replace(pattern, '[REDACTED]');
    }
  });

  if (piiFound.length > 0) {
    severity = 'moderate';
  }

  // Check for inappropriate content
  Object.entries(inappropriatePatterns).forEach(([type, pattern]) => {
    if (pattern.test(content)) {
      flags.push(`inappropriate_${type}`);
      severity = 'severe';
    }
  });

  // Determine if content should pass
  const passed = (severity as string) !== 'severe' && filteredContent.trim().length > 0;

  return {
    passed,
    filteredContent,
    flags,
    severity
  };
}

/**
 * Check if content is safe for children (used in Jr mode)
 */
export function isChildSafe(content: string): boolean {
  const result = moderateContent(content);
  return result.severity === 'clean' || result.severity === 'mild';
}

/**
 * Generate moderation report
 */
export function generateModerationReport(content: string): string {
  const result = moderateContent(content);
  
  if (result.passed) {
    return 'Content approved';
  }

  const messages = [];
  
  if (result.flags.includes('profanity')) {
    messages.push('Contains inappropriate language');
  }
  
  if (result.flags.some(f => f.startsWith('pii_'))) {
    messages.push('Contains personal information (will be redacted)');
  }
  
  if (result.flags.some(f => f.startsWith('inappropriate_'))) {
    messages.push('Contains inappropriate content');
  }

  return messages.join('. ');
}

/**
 * Validate post before submission
 */
export function validatePost(content: string, authorName: string): { 
  valid: boolean; 
  message: string; 
  filteredContent?: string;
} {
  // Check length
  if (content.length < 10) {
    return {
      valid: false,
      message: 'Post is too short. Please share more details.'
    };
  }

  if (content.length > 1000) {
    return {
      valid: false,
      message: 'Post is too long. Please keep it under 1000 characters.'
    };
  }

  // Moderate content
  const moderation = moderateContent(content);

  if (!moderation.passed) {
    return {
      valid: false,
      message: generateModerationReport(content)
    };
  }

  return {
    valid: true,
    message: 'Post approved',
    filteredContent: moderation.filteredContent
  };
}

/**
 * Rate limit check (basic implementation)
 */
const postTimestamps: Record<string, number[]> = {};

export function checkRateLimit(userId: string): { 
  allowed: boolean; 
  message: string;
} {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Get user's recent posts
  if (!postTimestamps[userId]) {
    postTimestamps[userId] = [];
  }

  // Remove posts older than 1 hour
  postTimestamps[userId] = postTimestamps[userId].filter(
    timestamp => now - timestamp < oneHour
  );

  // Check if user has posted too many times
  if (postTimestamps[userId].length >= 5) {
    return {
      allowed: false,
      message: 'You can only post 5 times per hour. Please try again later.'
    };
  }

  // Record this post
  postTimestamps[userId].push(now);

  return {
    allowed: true,
    message: 'Rate limit OK'
  };
}
