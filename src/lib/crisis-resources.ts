/**
 * Crisis Resources - Offline-Available Emergency Information
 *
 * These resources are cached by the service worker and available
 * even when the user has no internet connection.
 */

export interface CrisisResource {
  id: string;
  category: 'emergency' | 'hotline' | 'technique' | 'safety' | 'self-care';
  title: string;
  description: string;
  content: string;
  phoneNumber?: string;
  url?: string;
  isEmergency?: boolean;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  // EMERGENCY SERVICES
  {
    id: 'emergency-911',
    category: 'emergency',
    title: 'Emergency Services',
    description: 'For immediate danger to life',
    content: 'Call 911 if your child or anyone is in immediate physical danger, having a medical emergency, or you need emergency responders.',
    phoneNumber: '911',
    isEmergency: true,
  },
  {
    id: 'poison-control',
    category: 'emergency',
    title: 'Poison Control',
    description: 'If your child has ingested something dangerous',
    content: 'The Poison Control Center is available 24/7 for guidance if your child has swallowed, inhaled, or touched something potentially harmful.',
    phoneNumber: '1-800-222-1222',
    isEmergency: true,
  },

  // CRISIS HOTLINES
  {
    id: 'crisis-text',
    category: 'hotline',
    title: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    content: 'Free, 24/7 crisis support via text message. Trained crisis counselors respond to help you through difficult moments. Perfect if you cannot speak on the phone.',
    phoneNumber: '741741',
  },
  {
    id: 'suicide-prevention',
    category: 'hotline',
    title: 'Suicide & Crisis Lifeline',
    description: '988 - 24/7 support',
    content: 'The 988 Suicide and Crisis Lifeline provides free, confidential support for people in distress, prevention and crisis resources. Available 24/7.',
    phoneNumber: '988',
  },
  {
    id: 'parent-helpline',
    category: 'hotline',
    title: 'Parent Helpline',
    description: 'Emotional support for parents',
    content: 'The National Parent Helpline provides emotional support and resources to parents and caregivers. They understand the unique challenges of parenting.',
    phoneNumber: '1-855-427-2736',
  },
  {
    id: 'autism-crisis',
    category: 'hotline',
    title: 'Autism Crisis Line',
    description: 'Autism-specific support',
    content: 'Autism Society of America provides support for families dealing with autism-related crises. Specialists understand the unique needs of autistic individuals.',
    phoneNumber: '1-800-328-8476',
  },

  // CALMING TECHNIQUES
  {
    id: 'deep-pressure',
    category: 'technique',
    title: 'Deep Pressure Technique',
    description: 'Calm through proprioceptive input',
    content: `**Deep Pressure for Meltdowns**

When your child is overwhelmed, deep pressure can help regulate their nervous system:

1. **Firm Hug** - Wrap your arms around them firmly (not tight) for 20-30 seconds
2. **Weighted Blanket** - If available, drape over shoulders or lap
3. **Joint Compressions** - Gently press down on shoulders, elbows, wrists
4. **Bear Walk** - Have them walk on hands and feet (when calm enough)
5. **Wall Push-Ups** - Push against a wall with straight arms

**Important:** Never force physical contact. If they pull away, try offering a pillow to squeeze instead.`,
  },
  {
    id: 'breathing-exercises',
    category: 'technique',
    title: 'Breathing Exercises',
    description: 'Regulate through breath',
    content: `**Breathing Techniques for Children**

**1. Balloon Breathing (Ages 3+)**
- "Let's blow up a balloon in your belly"
- Breathe in slowly through nose (belly rises)
- Breathe out slowly through mouth (belly falls)
- Repeat 5 times

**2. Square Breathing (Ages 5+)**
- Breathe IN for 4 counts
- HOLD for 4 counts
- Breathe OUT for 4 counts
- HOLD for 4 counts
- Trace a square in the air while doing this

**3. Smell the Flower, Blow the Candle (Ages 2+)**
- "Smell the pretty flower" (breathe in through nose)
- "Blow out the birthday candle" (breathe out through mouth)

**Tip:** Practice these when your child is CALM so they're familiar when needed.`,
  },
  {
    id: 'sensory-break',
    category: 'technique',
    title: 'Sensory Break Ideas',
    description: 'Quick sensory regulation strategies',
    content: `**Sensory Breaks for Overwhelm**

**Calming (Low Arousal):**
- Dim lights or use sunglasses
- Noise-canceling headphones or quiet space
- Weighted lap pad or stuffed animal
- Slow rocking in a chair
- Warm bath or shower

**Alerting (When Shutdown):**
- Crunchy snacks (carrots, pretzels)
- Cold water on face or hands
- Jumping jacks or bouncing
- Bright colors or interesting textures
- Upbeat music

**Heavy Work (Regulation):**
- Carrying heavy items (books, groceries)
- Push/pull activities (wagon, laundry basket)
- Climbing playground equipment
- Chewing gum or chewy foods
- Play-doh or therapy putty

**Read your child:** Some kids need calm input, others need alerting input. Watch what helps them most.`,
  },
  {
    id: 'verbal-de-escalation',
    category: 'technique',
    title: 'Verbal De-escalation',
    description: 'What to say during a meltdown',
    content: `**What to Say (and Not Say) During a Meltdown**

**DO Say:**
- "I'm here with you"
- "You're safe"
- "I can see this is really hard"
- "Let's breathe together"
- "I'm not going anywhere"
- "It's okay to feel upset"

**DON'T Say:**
- "Calm down" (they can't)
- "Use your words" (they can't access language)
- "Stop crying" (invalidates feelings)
- "You're being dramatic" (dismissive)
- "If you don't stop..." (threats escalate)

**Body Language:**
- Get on their level
- Keep your voice low and slow
- Maintain a calm face (they mirror you)
- Give physical space if they need it
- Avoid direct eye contact if it overwhelms them

**Remember:** You cannot reason with a dysregulated brain. Connection before correction.`,
  },
  {
    id: 'safe-space',
    category: 'technique',
    title: 'Creating a Safe Space',
    description: 'Quick calm-down area setup',
    content: `**Creating a Calm-Down Space**

You can create a temporary calm space anywhere:

**Essential Elements:**
1. **Reduced Stimulation** - Dim lights, reduce noise, limit visual clutter
2. **Soft Surface** - Pillows, bean bag, blanket, or just a carpet
3. **Comfort Item** - Favorite stuffed animal, blanket, or fidget
4. **Boundary** - Under a table, in a closet, behind furniture, or a pop-up tent

**Quick Setup Ideas:**
- Blanket fort with pillows
- Under a desk with a blanket draped
- Closet with fairy lights
- Bathroom with lights off, bath running
- Car with AC on and music off

**Rules for the Space:**
- No talking required
- No time limit
- Child chooses when to leave
- Parent stays nearby but gives space
- This is NOT a punishment - it's a tool

**Teach When Calm:** Practice using the space during good times so it's familiar during hard times.`,
  },

  // SAFETY PLANNING
  {
    id: 'elopement-safety',
    category: 'safety',
    title: 'Elopement (Wandering) Safety',
    description: 'If your child tends to run/wander',
    content: `**Elopement Safety Checklist**

**Immediate Steps if Child is Missing:**
1. Call 911 immediately - mention autism/special needs
2. Check water sources first (pools, ponds, bathtubs)
3. Check favorite hiding spots and interests
4. Alert neighbors to search
5. Have a recent photo ready

**Prevention:**
- Door/window alarms (under $20 on Amazon)
- GPS tracker (Angel Sense, Jiobit)
- Medical ID bracelet with phone number
- Teach neighbors about your child
- "Stop" sign on doors at child's eye level
- Fence locks, deadbolts out of reach

**Communication:**
- Contact local police non-emergency line BEFORE an incident
- Provide photo and description
- Explain communication challenges
- Ask about Project Lifesaver or similar programs

**Resources:**
- National Autism Association Big Red Safety Box (free)
- Awaare.org - wandering prevention resources`,
  },
  {
    id: 'aggression-safety',
    category: 'safety',
    title: 'Managing Aggression Safely',
    description: 'When your child becomes physically aggressive',
    content: `**Safety During Aggressive Behaviors**

**Your Safety First:**
- You cannot help your child if you're injured
- It's okay to create distance
- Protect your face, remove glasses/jewelry

**De-escalation:**
1. Reduce demands immediately
2. Clear the area of dangerous objects
3. Guide siblings/others away
4. Lower your voice and slow your movements
5. Offer an alternative outlet (pillow to hit, something to throw safely)

**If Physical Intervention Needed:**
- Use minimal force necessary for safety
- Never restrain face-down (dangerous)
- Release as soon as it's safe
- Document what happened

**After the Crisis:**
- Wait until fully calm to discuss (may be hours)
- Focus on what they CAN do differently
- Identify triggers for next time
- Take care of yourself too

**When to Get Help:**
- Injuries are occurring regularly
- Property damage is significant
- Siblings are afraid
- You're afraid
- Call your BCBA, pediatrician, or crisis line

**Remember:** Aggression is communication. Your child isn't giving you a hard time - they're having a hard time.`,
  },

  // SELF-CARE FOR PARENTS
  {
    id: 'caregiver-burnout',
    category: 'self-care',
    title: 'Caregiver Burnout Signs',
    description: 'Recognizing when you need help',
    content: `**Signs of Caregiver Burnout**

You might be burned out if you're experiencing:

**Physical:**
- Exhaustion that sleep doesn't fix
- Getting sick more often
- Changes in appetite or weight
- Headaches, muscle tension
- Neglecting your own health appointments

**Emotional:**
- Feeling hopeless about the future
- Resentment toward your child or family
- Crying more than usual
- Numbness or detachment
- Guilt about everything

**Behavioral:**
- Withdrawing from friends/activities
- Increased alcohol or substance use
- Short temper with everyone
- Neglecting your own needs
- Fantasies about "escaping"

**What to Do:**
1. This is normal - you're not a bad parent
2. Ask for help (respite care, family, friends)
3. Talk to your doctor about how you're feeling
4. Connect with other special needs parents
5. Consider therapy for yourself
6. Take breaks without guilt

**Crisis Resources for Parents:**
- Parent Helpline: 1-855-427-2736
- Crisis Text Line: Text HOME to 741741
- SAMHSA Helpline: 1-800-662-4357

**You cannot pour from an empty cup.**`,
  },
  {
    id: 'quick-reset',
    category: 'self-care',
    title: '5-Minute Parent Reset',
    description: 'Quick self-regulation for caregivers',
    content: `**5-Minute Reset for Parents**

When you're at your breaking point:

**1. Tag Out (1 min)**
If another adult is present, say "I need 5 minutes" and step away. If alone, ensure child is safe and step to another room.

**2. Physical Reset (2 min)**
- Splash cold water on your face
- Step outside and feel the air
- Do 10 jumping jacks or wall push-ups
- Shake out your hands and arms

**3. Breathing Reset (1 min)**
- 4 counts in through nose
- 7 counts hold
- 8 counts out through mouth
- Repeat 3 times

**4. Thought Reset (1 min)**
- "This moment will pass"
- "I'm doing my best"
- "My child is having a hard time, not giving me a hard time"
- "I can handle this"

**Longer-Term:**
- Schedule "me time" like a medical appointment
- Find your support (online groups, local support)
- Move your body daily, even 10 minutes
- Lower your standards temporarily - survival mode is okay

**Remember:** Regulating yourself first is not selfish - it's necessary. Your child co-regulates with you.`,
  },
];

/**
 * Get resources by category
 */
export function getResourcesByCategory(category: CrisisResource['category']): CrisisResource[] {
  return CRISIS_RESOURCES.filter(r => r.category === category);
}

/**
 * Get emergency resources only
 */
export function getEmergencyResources(): CrisisResource[] {
  return CRISIS_RESOURCES.filter(r => r.isEmergency);
}

/**
 * Search resources by keyword
 */
export function searchResources(query: string): CrisisResource[] {
  const lowerQuery = query.toLowerCase();
  return CRISIS_RESOURCES.filter(r =>
    r.title.toLowerCase().includes(lowerQuery) ||
    r.description.toLowerCase().includes(lowerQuery) ||
    r.content.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all resources for caching
 */
export function getAllResources(): CrisisResource[] {
  return CRISIS_RESOURCES;
}
