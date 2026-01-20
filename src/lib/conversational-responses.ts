/**
 * Natural Language Response Variations
 * Makes AI conversations feel human with variety like ChatGPT
 */

// Helper: Randomly select from array
export const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Invalid age clarifications - warm and varied
export const getAgeClarification = (childName: string): string => {
  const clarifications = [
    `I want to make sure I get this right - how old is ${childName} in years? Like 3, 5, or 7?`,
    `Got it! And just to confirm, what's ${childName}'s age? You can just put the number, like 4 or 6.`,
    `Perfect! Now, how many years old is ${childName}? For example, you could say "5" or "7".`,
    `Thanks! What's ${childName}'s age in years? Just the number works great - like 3, 4, or 8.`,
    `Okay! Could you share ${childName}'s age? Just the number of years - for example, 5 or 9.`,
    `Hmm, let me make sure I understand - how old is ${childName}? Just the age in years is perfect.`,
    `I might have missed that - what's ${childName}'s age? You can write something like "6" or "4".`
  ];
  return randomPick(clarifications);
};

// Asking for name - natural variations
export const getNameQuestion = (): string => {
  const questions = [
    "Perfect! Let's start with the basics - what's your child's first name?",
    "Wonderful! First, I'd love to know your child's name. What should I call them?",
    "Great! To start, what's your child's first name?",
    "Perfect! What's your little one's name?",
    "Excellent! Let's begin - what do you call your child?",
    "Great! First things first - what's your child's name?",
    "Perfect! I'd love to know - what should I call your child?"
  ];
  return randomPick(questions);
};

// Asking for age after getting name - natural variations
export const getAgeQuestion = (childName: string): string => {
  const questions = [
    `${childName}! What a lovely name. And how old is ${childName}?`,
    `Great to meet ${childName}! How old are they?`,
    `I love it - ${childName}. What's ${childName}'s age?`,
    `${childName} - wonderful. And how many years old?`,
    `Perfect, thank you! How old is ${childName}?`,
    `${childName} is such a sweet name! How old are they?`,
    `Nice! ${childName}. And what's their age?`
  ];
  return randomPick(questions);
};

// Transition to brain dump after getting age - natural variations
export const getBrainDumpTransition = (childName: string, age: string): string => {
  const transitions = [
    `Perfect! So ${childName} is ${age}. Now I'd love to hear about a typical day together. What's going well, and what feels hard right now? Share whatever comes to mind.`,
    `Great, thank you! ${age} is such a wonderful age. Tell me about your days with ${childName} - what flows smoothly, and where do you find yourself struggling?`,
    `Got it, ${age} years old. Now, walk me through a typical day with ${childName}. What parts feel good, and what's been challenging lately?`,
    `${age} - thank you! I'd love to understand what your days look like. What's working well with ${childName}, and what's been tough?`,
    `Perfect, ${age}! Now help me picture a regular day with ${childName}. What goes smoothly, and where do things feel hard?`,
    `Thank you! ${age} years old - such a special age. Tell me about daily life with ${childName}. What's going okay, and what needs support?`,
    `Got it! ${age}. Now I'd love to hear the real story - what's a typical day like with ${childName}? The good parts and the tough parts?`
  ];
  return randomPick(transitions);
};

// Empathy responses - stressed parent (ABA-based behavioral wellness tone)
export const getStressedResponse = (): string => {
  const responses = [
    "I completely understand, and I want you to know—you're not alone in this. The fact that you're here shows incredible strength and love for your child. What you're feeling is valid, and we're going to create calm, supportive routines together using proven ABA strategies, one gentle step at a time.",
    "I hear you, and what you're feeling makes complete sense. You're doing the hardest job in the world, and you're still showing up. That takes real courage. Let's use behavioral science to build calm and connection - you don't have to carry this alone.",
    "I can really feel how hard things have been, and I want you to know that your feelings are completely valid. You're here because you care deeply, and that already says so much. Using ABA principles, we'll take this one calm step at a time, together.",
    "Thank you for being so honest about how overwhelming this is. That takes real strength. You're not alone in feeling this way, and we're going to create predictable, calming structure together at a pace that feels manageable for your family."
  ];
  return randomPick(responses);
};

// Empathy responses - calm parent (ABA-based behavioral wellness tone)
export const getCalmResponse = (): string => {
  const responses = [
    "That's wonderful to hear. Having even a bit of breathing room can make all the difference in being present for both yourself and your child. I'm here to help you build on that foundation with ABA-based behavioral science strategies that work for real families in everyday life.",
    "I'm glad to hear you're in a good place right now. That stability is such a gift - let's build on it with gentle routines grounded in ABA principles and create even more of those calm, connected moments.",
    "That's great! Having some breathing room makes such a difference. Let's use this good foundation to build supportive structure that keeps things feeling steady and full of small wins.",
    "I love hearing that things feel manageable. Let's build on that momentum with behavioral wellness strategies that maintain this calm and create even more space for joy and progress."
  ];
  return randomPick(responses);
};

// Empathy responses - hopeful parent
export const getHopefulResponse = (): string => {
  const responses = [
    "I love that energy! That readiness for change is such a powerful force. You're already showing up for your child in an incredible way, and I'm here to help you channel that hope into a clear, actionable plan that feels manageable and gets real results.",
    "That hope and determination are so powerful - I can feel it! You're already doing the most important thing by showing up ready for positive change. Let's turn that energy into concrete strategies that really work.",
    "Your readiness for change is amazing, and it's exactly the mindset that creates real transformation. Let's harness that hope and build something concrete and actionable together.",
    "I absolutely love this energy! That hope is going to carry you so far. Let's channel it into a clear plan with real, achievable steps that get results."
  ];
  return randomPick(responses);
};

// Acknowledgment after parent shares their story
export const getStoryAcknowledgment = (name: string | null, isStressed: boolean, isHopeful: boolean): string => {
  let emotionalAcknowledgment = '';
  
  if (isStressed && !isHopeful) {
    const stressedAcks = [
      "I hear that things have been really challenging, and I want you to know—what you're feeling is completely valid. ",
      "I can feel how hard this has been for you, and your feelings are so understandable. ",
      "This sounds really tough, and I want you to know what you're experiencing is real and valid. ",
      "I hear the weight you're carrying, and I want to acknowledge how incredibly hard this is. "
    ];
    emotionalAcknowledgment = randomPick(stressedAcks);
  } else if (isHopeful) {
    const hopefulAcks = [
      "I can feel your determination and hope coming through, which is such a powerful place to start from. ",
      "Your strength and readiness for change really shine through - that's beautiful. ",
      "The hope in your words is so powerful, and it's going to make all the difference. ",
      "I can sense your determination, and that's exactly the energy that creates real change. "
    ];
    emotionalAcknowledgment = randomPick(hopefulAcks);
  }
  
  const greetings = name ? [
    `${emotionalAcknowledgment}Thank you so much for trusting me with ${name}'s story.`,
    `${emotionalAcknowledgment}I really appreciate you sharing ${name}'s story with me.`,
    `${emotionalAcknowledgment}Thank you for opening up about ${name}. That means a lot.`,
    `${emotionalAcknowledgment}I'm grateful you felt comfortable sharing about ${name}.`
  ] : [
    `${emotionalAcknowledgment}Thank you so much for sharing this with me.`,
    `${emotionalAcknowledgment}I really appreciate you opening up like this.`,
    `${emotionalAcknowledgment}Thank you for trusting me with your story.`,
    `${emotionalAcknowledgment}I'm grateful you felt safe sharing this.`
  ];
  
  return randomPick(greetings);
};

// Reflection transition
export const getReflectionTransition = (): string => {
  const transitions = [
    "I can hear how much you care. Let me reflect back what I'm understanding so you know I've really heard you...",
    "Your love for your child really comes through. Let me share what I'm hearing to make sure I've got this right...",
    "I want to make sure I've heard you clearly. Here's what I'm understanding...",
    "Let me reflect back what you've shared so you know I'm really listening...",
    "I've been listening closely. Here's what I'm hearing from you..."
  ];
  return randomPick(transitions);
};

// Summary header variations
export const getSummaryHeader = (childReference: string, ageContext: string): string => {
  const headers = [
    `Here's what I'm hearing about ${childReference}${ageContext}:`,
    `Based on what you've shared, here's what stands out about ${childReference}${ageContext}:`,
    `Let me summarize what I'm understanding about ${childReference}${ageContext}:`,
    `From everything you've told me, here's what I'm seeing with ${childReference}${ageContext}:`,
    `Here's what I'm picking up about ${childReference}${ageContext}:`
  ];
  return randomPick(headers);
};

// Closing encouragement (ABA-based behavioral wellness tone)
export const getClosingEncouragement = (name: string | null): string => {
  const childRef = name ? `${name}'s` : "your child's";
  
  const encouragements = [
    `I see you, and I'm here to support you. Using proven ABA principles, let's work together on making ${childRef} day-to-day calmer and more joyful—one gentle cue at a time.`,
    `You're not alone in this. Together, we'll use behavioral science to make ${childRef} daily life calmer and more connected—celebrating every bit of progress.`,
    `I'm here with you every step of the way. Let's build ABA-based routines that make ${childRef} days easier and full of small wins.`,
    `We're in this together. Let's create calm, supportive structure that brings more peace and connection to ${childRef} life.`,
    `You've got this, and I've got you. Let's make ${childRef} days smoother, calmer, and full of celebrated progress—one step at a time.`
  ];
  
  return randomPick(encouragements);
};

// Generic fallback
export const getGenericEncouragement = (): string => {
  const encouragements = [
    "Every child's journey is beautifully unique, and I'm honored to walk alongside your family as you navigate this path.",
    "Your child's story is unique and precious. I'm here to support your family every step of the way.",
    "Every family's journey is different, and I'm grateful to be part of yours.",
    "I'm honored to support your family on this journey. Every child's path is special."
  ];
  
  return randomPick(encouragements);
};
