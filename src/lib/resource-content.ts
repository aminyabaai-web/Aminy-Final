// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Resource library content — BCBA-authored guides, visual aids, and strategies.
 * Written in plain language for neurodivergent families. Curated > comprehensive.
 * Covers the same topic categories as Ask Your BCBA Team and Group Sessions
 * so discovery feels like a natural continuum.
 */

export interface Resource {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  type: 'guide' | 'printable' | 'video' | 'checklist' | 'script';
  readTimeMinutes: number;
  ageRange?: string;
  body: string; // markdown-ish plain text
  relatedQuestions?: string[];
  relatedGroupTopics?: string[]; // maps to group session topic_category
  isPremium: boolean; // false = free for all tiers
  author?: string;
  authorCredentials?: string;
}

export const RESOURCE_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'meltdowns', label: 'Meltdowns', emoji: '🌊' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'school', label: 'School & IEP plans', emoji: '🏫' },
  { id: 'transitions', label: 'Transitions', emoji: '🔄' },
  { id: 'feeding', label: 'Feeding', emoji: '🍴' },
  { id: 'sensory', label: 'Sensory', emoji: '✨' },
  { id: 'social', label: 'Social Skills', emoji: '👥' },
  { id: 'communication', label: 'AAC & Communication', emoji: '💬' },
  { id: 'behavior', label: 'Behavior Basics', emoji: '🎯' },
  { id: 'tools', label: 'Tools & Visuals', emoji: '🛠️' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
];

export const RESOURCES: Resource[] = [
  // ── MELTDOWNS ──────────────────────────────────────────────────────────────
  {
    id: 'meltdown-vs-tantrum',
    title: 'Meltdown vs. Tantrum: Why It Matters',
    subtitle: 'They look the same but require completely different responses',
    category: 'meltdowns',
    tags: ['autism', 'behavior', 'regulation', 'caregiving'],
    type: 'guide',
    readTimeMinutes: 4,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `A tantrum is goal-directed. A meltdown is a neurological overload. Responding the same way to both makes things worse.

**Tantrum (communication attempt)**
• Child can stop when they get what they want
• Maintains some awareness of audience
• Usually has a clear trigger (denied request, attention)
• Calms quickly once need is met

**Meltdown (neurological flood)**
• Child cannot stop even if you give them what they want
• No audience awareness — the brain is in survival mode
• Often builds over hours or days (not the final trigger)
• Takes significant time to return to baseline

**What to do during a meltdown**
1. **Stop talking.** Language processing shuts down during overload. Words add stimulation.
2. **Reduce all sensory input.** Lower lights, reduce sound, clear the immediate space.
3. **Stay calm and physically close** — but don't force touch. Your regulated nervous system helps regulate theirs.
4. **Wait it out.** The brain needs to return to baseline on its own. You cannot rush this.
5. **Do not address the behavior during the meltdown.** That conversation happens 20–30 minutes AFTER, when the child is fully calm.

**The iceberg model**
What you see (the meltdown) is the tip. Below the surface: sensory overload accumulated throughout the day, sleep quality last night, hunger, anxiety about an upcoming change, a hard moment at school they couldn't express. The final trigger (you said no to screen time) is almost never the real cause.

**For your toolkit**: Keep a log of meltdown time, duration, and what happened in the 2 hours before. Patterns become obvious within 2 weeks. That data is what your BCBA uses to build a prevention plan.`,
    relatedQuestions: ['Why does he melt down after school?', 'How long should I wait before talking to her after a meltdown?'],
    relatedGroupTopics: ['meltdowns'],
  },
  {
    id: 'proactive-de-escalation',
    title: 'Proactive De-escalation: Catching It Early',
    subtitle: 'The window where you can actually make a difference',
    category: 'meltdowns',
    tags: ['regulation', 'prevention', 'warning signs'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Meltdowns have stages. Most parents only try to intervene at stage 4 — when it's too late. The window for prevention is stages 1–2.

**The escalation cycle**
1. **Calm** — baseline, regulated, available for learning
2. **Trigger/Agitation** — small sign something is off. Pacing, increased vocal volume, repetitive questions, skin picking, avoiding eye contact more than usual
3. **Acceleration** — clear distress. Voice higher, body tense, may start refusing, stimming intensifying
4. **Peak** — full meltdown. Cannot be redirected.
5. **De-escalation** — system naturally coming down
6. **Recovery** — back to baseline. Can take 20–90 minutes

**Your job is to act at stage 2.**

At Stage 2 signs:
• Name what you see, not what you want: *"I can see something feels hard right now."* Not: *"Calm down."*
• Offer a regulating activity before asking (snack, movement, quiet space)
• Reduce demands immediately — this is not "giving in," it's preventing neurological flood
• Use fewer words. Short sentences. Calm tone.

**Build your child's early warning sign list**
Every child has unique tells. Common ones:
- Increased humming or vocal stimming
- Touching face or ears repeatedly
- Starting to ask the same question on repeat
- Becoming clingy OR withdrawing suddenly
- Eyes getting "glassy" or unfocused

Once you know your child's tells, you have a 5–15 minute window. Use it.`,
    relatedGroupTopics: ['meltdowns'],
  },

  // ── SLEEP ──────────────────────────────────────────────────────────────────
  {
    id: 'sleep-autism-basics',
    title: 'Why Sleep Is Different for Autistic Kids',
    subtitle: 'The neuroscience, and what you can actually do about it',
    category: 'sleep',
    tags: ['sleep', 'melatonin', 'routine', 'sensory'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Sleep problems affect 50–80% of autistic children. This is not a parenting problem — it's neurological. But there are things that consistently work.

**Why it's harder for autistic brains**
- Melatonin is produced later and at lower levels. The brain doesn't get the normal "time to sleep" signal.
- Sensory sensitivities (sheets, tags, sounds, light) that are manageable during the day become unbearable at bedtime.
- Anxiety peaks at night when there's nothing to focus on.
- The brain has difficulty transitioning states — including from awake to asleep.

**What works — evidence-based strategies**

*1. Visual bedtime routine (non-negotiable)*
A picture schedule of exactly what happens before bed. Same order, every night. The visual does the cognitive work of "what's next" so the child's brain doesn't have to. 5–7 steps, laminated, on the bedroom wall.

*2. Sensory audit of the sleep environment*
- Weighted blanket (1–3 lbs for most children) — research supports this for autistic kids specifically
- White noise or brown noise — masks sensory distractions that spike at night
- Blackout curtains — many autistic children are extremely light-sensitive
- Remove tags from all sleep clothing
- Keep room 65–68°F — cooler is more sleep-conducive

*3. Screen cutoff — 1.5 hours minimum*
Blue light suppresses melatonin. For autistic kids who already produce it late, screens before bed push onset even later. This is hard but non-negotiable.

*4. Melatonin — if used, low dose and timing matters*
0.5–1mg (low-dose) taken 60 minutes BEFORE desired sleep onset. Most families use too high a dose, too late. Talk to your pediatrician.

*5. Sleep training must account for sensory needs*
Standard cry-it-out often backfires for autistic children because it adds anxiety without addressing the underlying sensory issue. Graduated approaches work better. A BCBA can build a sleep protocol specific to your child.

**Track it first**: One week of sleep logs before changing anything. Note: what time child went to bed, what time they fell asleep, how many times they woke, what happened. Patterns make the intervention clear.`,
    relatedGroupTopics: ['sleep'],
  },
  {
    id: 'visual-bedtime-routine',
    title: 'Printable: Visual Bedtime Routine',
    subtitle: 'Customizable 6-step picture schedule — print and laminate',
    category: 'sleep',
    tags: ['printable', 'visual schedule', 'routine'],
    type: 'printable',
    readTimeMinutes: 1,
    isPremium: false,
    body: `**How to use this schedule**

Print the schedule and laminate it. Put it at the child's eye level in their bedroom or bathroom — wherever the routine starts.

Point to each step as you do it. Let the child point to the next step themselves once they've memorized it (usually 3–5 days).

The schedule does the work of "what comes next" so you don't have to say it, and the child doesn't have to ask.

**Suggested 6-step routine:**
1. 🛁 Bath / wash up
2. 👕 Put on pajamas
3. 🦷 Brush teeth
4. 📖 One book (same book, same time)
5. 💡 Lights out
6. 😴 Sleep time

**Customization notes:**
- Use actual photos of YOUR child doing each step (more effective than clip art)
- Add your child's preferred activities (fidget toy, white noise on, weighted blanket)
- Keep it to 5–7 steps maximum — more than that overwhelms the schedule's purpose

*(A customizable printable PDF will be added here — currently in production.)*`,
    relatedGroupTopics: ['sleep'],
  },

  // ── SCHOOL & IEP ──────────────────────────────────────────────────────────
  {
    id: 'iep-parent-rights',
    title: 'Your IEP Rights: What Schools Count On You Not Knowing',
    subtitle: 'The 5 most frequently violated parent rights in IEP meetings',
    category: 'school',
    tags: ['IEP', 'IDEA', 'rights', 'school', 'advocacy'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `IEP meetings are designed to feel collaborative. But you are in a negotiation, and the school's interests don't always align with your child's.

**Right 1: Prior written notice**
Before any change to your child's placement or services, the school must give you written notice explaining what they're changing, why, and what alternatives they considered. Many schools skip this. If they change anything without it, that's a procedural violation of IDEA.

**Right 2: Independent educational evaluation (IEE)**
If you disagree with the school's evaluation, you can request an IEE at the school's expense. They can either pay for an outside evaluator or take you to due process — they cannot simply refuse. Most schools don't mention this.

**Right 3: Meaningful participation**
You are an equal member of the IEP team. Not a guest. You can bring anyone to the IEP meeting — your BCBA, an advocate, a family member. You do not need to give advance notice for most supports.

**Right 4: Consent is revocable**
You can revoke consent for any service at any time in writing. The school cannot continue services you've withdrawn consent for.

**Right 5: "Free and appropriate" does not mean "best"**
Schools are required to provide a "free and appropriate public education" — not the best education possible. This is frequently misunderstood. "Appropriate" still means meaningfully educational and sufficient for the child to make progress. If your child is not making meaningful progress, that's a valid legal challenge.

**Practical tips:**
- Bring a recording device (check your state's laws on consent to record)
- Never agree to anything at the meeting itself — ask for 10 days to review and respond
- Always follow up verbal agreements in writing: *"As we discussed on [date], the team agreed to..."*
- Keep every email, report, and document — dated and organized`,
    relatedGroupTopics: ['school'],
  },

  // ── TRANSITIONS ───────────────────────────────────────────────────────────
  {
    id: 'transition-strategies',
    title: 'Transitions Without Tears: A Practical Guide',
    subtitle: 'Why switches are so hard for autistic kids, and exactly what to do',
    category: 'transitions',
    tags: ['transitions', 'flexibility', 'routine', 'expectations'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Transitions require the brain to stop predicting, release a current task, and switch to a new one. For autistic brains, that cognitive switch is genuinely harder — not stubbornness.

**Why transitions are hard**
- Difficulty with executive function (the brain's "task-switching" system)
- Strong need for predictability — transitions are inherently unpredictable in their details
- Deep engagement with current activity makes stopping painful (not just preference — neurological)
- Anxiety about what comes next, even familiar activities

**The strategies that consistently work**

*1. Countdown warnings — specific and consistent*
"5 more minutes, then we're leaving." Set a visual timer. At 3 minutes, remind again. At 1 minute, begin the closing-down routine. The warning isn't just courtesy — it gives the brain time to prepare.

*2. "First/Then" framing*
"First we put on shoes, then we go to the park." Not: "We have to leave." First/then preserves predictability and shows the child there's something worth transitioning to.

*3. Tell them what IS happening — not what isn't*
"We're going to the car" instead of "Stop playing." The brain processes "stop" as a threat; "we're going to X" is navigable.

*4. Give them a role in the transition*
"Can you be the one to turn off the TV?" Autistic kids often regulate better when they have agency in the moment. Let them close the book, press the button, carry something.

*5. Make the ending a ritual*
"We always say bye to the park." A short, predictable closing ritual creates a natural stopping point that the brain recognizes over time.

**The school-to-home transition specifically**
This is the highest-risk transition of the day. Your child has been masking, regulating, and performing all day. When they get home, the mask comes off — and accumulated stress releases. This is why meltdowns at home don't mean school is fine. It means home is safe. Set a decompression window (30 minutes, snack, no demands, preferred activity) before anything else happens.`,
    relatedGroupTopics: ['transitions'],
  },

  // ── BEHAVIOR BASICS ───────────────────────────────────────────────────────
  {
    id: 'abc-data',
    title: 'ABC Data: The Foundation of ABA',
    subtitle: 'How to track behavior like your BCBA does — and why it matters',
    category: 'behavior',
    tags: ['ABA', 'data', 'ABC', 'antecedent', 'behavior', 'consequence'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Every behavior makes sense when you understand its function. ABC data collection is how you find the function.

**A = Antecedent (what happened right before)**
The trigger, or context. Not always obvious. Could be: a demand was placed, preferred item was removed, a transition was announced, sensory environment changed, peer interaction.

**B = Behavior (what exactly happened)**
Be specific and observable. "Had a meltdown" is not measurable. "Dropped to the floor, screamed, hit head on ground for 4 minutes" is. Only describe what you can see and count.

**C = Consequence (what happened immediately after)**
What did you do? What did others do? Did the behavior "work" — did the child get or avoid something? This is the most important column because it reveals why the behavior is happening.

**The 4 functions of behavior (every behavior has one)**
1. **Attention** — getting connection from people
2. **Escape/Avoidance** — getting away from something unpleasant
3. **Tangible** — getting a preferred item or activity
4. **Sensory** — getting internal sensory stimulation (stims, rocking, etc.)

**How to use this**
Track 10–15 instances of a behavior you want to understand. Look at the C column. If the same consequence appears repeatedly, that's the function. Once you know the function, your BCBA can build a replacement behavior that serves the same function more appropriately.

Example: Child screams → parent immediately gives phone. Behavior function = tangible. Replacement = teach child to request phone using words/PECS/device. The screaming loses its function.`,
    relatedGroupTopics: ['meltdowns', 'school'],
  },
  {
    id: 'reinforcement-guide',
    title: 'Reinforcement 101: Why Praise Alone Doesn\'t Work',
    subtitle: 'What actually motivates change — and how to find it for your child',
    category: 'behavior',
    tags: ['reinforcement', 'motivation', 'ABA', 'praise'],
    type: 'guide',
    readTimeMinutes: 4,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `"Good job!" isn't reinforcement unless the child cares about your approval. For many autistic children, social praise has limited motivating value — at least initially. That's not a character flaw. It's a difference in what's reinforcing.

**Reinforcement = anything that increases the future probability of a behavior**
If praise makes the behavior more likely, it's reinforcing. If it doesn't, it's not — regardless of your intention.

**Finding your child's reinforcers**
Observe, don't assume. Common motivators for autistic children:
- Specific sensory experiences (deep pressure, certain textures, specific sounds)
- Access to a preferred item (iPad, specific toy, specific food)
- Time doing a preferred activity (trampolining, building blocks, watching specific videos)
- Predictability itself (knowing what happens next)
- Specific praise about specific things (not "good job" but "you waited so patiently while I talked — that was really hard and you did it")

**Rules for effective reinforcement**
1. **Immediate** — within 2–3 seconds of the desired behavior. Delay kills the connection.
2. **Contingent** — only given for the target behavior, not for other reasons
3. **Valued by the child** — if they don't want it, it won't work
4. **Varied** — the same reinforcer loses value with repetition (called satiation)

**The Premack principle ("Grandma's rule")**
High-probability behaviors reinforce low-probability behaviors. "First homework, then iPad." The iPad isn't a bribe — it's a scheduled reinforcer contingent on completing work.

**What about intrinsic motivation?**
It develops after extrinsic reinforcement builds fluency. You don't teach a child to ride a bike by withholding training wheels and hoping intrinsic motivation kicks in. You scaffold, then fade.`,
    relatedGroupTopics: ['meltdowns', 'school'],
  },

  // ── SENSORY ───────────────────────────────────────────────────────────────
  {
    id: 'sensory-profile',
    title: 'Understanding Your Child\'s Sensory Profile',
    subtitle: 'Hyper-sensitive, hypo-sensitive, or both — and what it means practically',
    category: 'sensory',
    tags: ['sensory processing', 'OT', 'sensory diet', 'regulation'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Sensory processing differences affect 90%+ of autistic individuals. The same child can be hypersensitive in some senses and hyposensitive in others — which looks contradictory until you understand the neuroscience.

**The 8 senses**
Most people know 5. There are 3 more that matter enormously for autistic kids:
- **Proprioception**: sense of where your body is in space. Impacts need for jumping, crashing, tight hugs, heavy work.
- **Vestibular**: sense of movement and balance. Impacts need for spinning, swinging, rocking.
- **Interoception**: sense of internal body states (hunger, thirst, needing the bathroom, heart racing). Often dysregulated in autistic people — they may not feel hunger until it becomes extreme, or feel anxious without knowing why.

**Hypersensitive (over-responsive)**: Brain amplifies input
- Covers ears in normal environments
- Gags at textures others don't notice
- Cannot wear certain clothing
- Overwhelmed in visually "busy" environments
- Light touch feels painful; avoids hugs

**Hyposensitive (under-responsive)**: Brain doesn't register input adequately
- Seeks intense sensory input: crashing, spinning, chewing, very loud music
- Doesn't feel pain or temperature reliably
- May not notice when hungry or needs to use the bathroom
- Appears clumsy or unaware of personal space

**A sensory diet is not a food diet**
It's a scheduled set of sensory activities throughout the day designed to keep the nervous system regulated — like a maintenance schedule. A good OT or BCBA will build one based on your child's specific profile. Without it, the nervous system gets dysregulated by late afternoon regardless of what happens.`,
    relatedGroupTopics: ['sensory', 'meltdowns'],
  },

  // ── COMMUNICATION ─────────────────────────────────────────────────────────
  {
    id: 'aac-basics',
    title: 'AAC: Giving Your Child a Voice',
    subtitle: 'Augmentative and alternative communication — what it is, myths busted',
    category: 'communication',
    tags: ['AAC', 'communication', 'PECS', 'speech', 'device'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `AAC — Augmentative and Alternative Communication — refers to any method of communication beyond speech. It includes picture exchange, speech-generating devices (like Proloquo2Go), sign language, and low-tech picture boards.

**The biggest myth: AAC will prevent speech development**
Research is unambiguous on this. AAC does not reduce spoken language — it increases it. Children with more communication access have more reasons to communicate, which builds the neural pathways for all communication including speech. Every speech-language pathologist and BCBA will confirm this. If someone tells you otherwise, ask for the research.

**What counts as AAC**
- Low-tech: picture boards, PECS binders, laminated word cards
- Mid-tech: single-message speech output buttons (Big Mack)
- High-tech: dedicated speech-generating devices, tablet apps (Proloquo2Go, TouchChat, LAMP Words for Life)
- Sign language, gestures, writing

**Who benefits from AAC**
Anyone who cannot reliably communicate their needs through speech alone. Age doesn't matter. Cognitive level doesn't matter — presume competence. Communication is a human right, not something earned through prerequisite skills.

**Getting started without an evaluation**
An SLP evaluation is ideal. While you wait (waitlists can be 6–18 months), you can start:
1. PECS Phase 1: child physically exchanges a picture to get a desired item. This builds the concept of communication as tool.
2. Core word boards: 20–30 high-frequency words on a laminated board. Teach yourself to use it too (aided language stimulation).
3. Download a free AAC app (e.g., Snap Core First free trial) and model using it.

**The modeling rule**
Your child needs to hear/see a word 50–100 times before using it independently. You model using the AAC first. They watch. They learn. They use it.`,
    relatedGroupTopics: ['communication'],
  },

  // ── TOOLS & VISUALS ───────────────────────────────────────────────────────
  {
    id: 'first-then-board',
    title: 'Printable: First/Then Board',
    subtitle: 'The most-used tool in ABA — a guide to making and using it',
    category: 'tools',
    tags: ['printable', 'first then', 'visual', 'compliance', 'transitions'],
    type: 'printable',
    readTimeMinutes: 2,
    isPremium: false,
    body: `**What it is**
A visual with two boxes: FIRST (a picture of the task) and THEN (a picture of the reward).

**Why it works**
It makes the deal visible and concrete. The child can see that the reward exists and that it's coming — no need to trust a verbal promise they may not fully process.

**How to make one**
1. Take a piece of cardboard or laminate paper
2. Draw or print two boxes side by side
3. Label: FIRST \_\_\_ THEN \_\_\_
4. Use actual photos of your child or clipart that's meaningful to them
5. Make it velcro-backed so you can swap pictures

**Example uses**
- FIRST put on shoes → THEN we go to the park
- FIRST finish 3 bites → THEN iPad for 10 minutes
- FIRST homework → THEN video game

**Key rules**
- The "then" must be something the child actually wants
- Follow through every time — the child's trust in the system depends on it
- Start with short, achievable "first" tasks — build duration gradually
- Fade the board once the routine is established

*(Printable PDF template — in production. Use any two boxes drawn by hand for now.)*`,
    relatedGroupTopics: ['transitions', 'meltdowns'],
  },
  {
    id: 'token-board-guide',
    title: 'Token Boards: How to Use Them Correctly',
    subtitle: 'Most families use them wrong — here\'s the right way',
    category: 'tools',
    tags: ['token board', 'reinforcement', 'ABA', 'compliance'],
    type: 'guide',
    readTimeMinutes: 4,
    isPremium: true,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Token boards are one of the most powerful tools in ABA when used correctly — and one of the most commonly misused by families.

**What a token board is**
A visual board where the child earns tokens (stickers, stamps, chips) for demonstrating target behaviors. When the board is full, they exchange tokens for a preferred reward.

**The most common mistakes**

*Mistake 1: Tokens that are never exchanged*
The child earns tokens but the exchange is always delayed or never happens. Destroys the contingency — the child stops caring about the tokens.

*Mistake 2: Too many tokens required*
A child who needs 20 tokens for a reward will give up before getting there. Start with 3 tokens. Increase gradually.

*Mistake 3: Taking tokens away as punishment*
This is called "response cost." It can work in very specific contexts but requires careful BCBA guidance. Casual use usually increases escape-motivated behavior.

*Mistake 4: Using it reactively, not proactively*
"If you stop screaming I'll give you a token" teaches the child that screaming is the path to attention + tokens. Always award tokens proactively for behavior you want to see more of.

**Setting up a token board correctly**
1. Choose a clear target behavior ("staying in your seat during homework")
2. Choose 3–5 tokens to start
3. Choose a backup reinforcer the child actually wants
4. Set a predictable earning schedule (every 5 minutes of on-task = 1 token)
5. Exchange tokens immediately when board is filled — no exceptions

**Fading the board**
Increase token requirements gradually. Introduce variable schedules (sometimes 3 tokens, sometimes 5). Eventually shift to intermittent social reinforcement. Done correctly, the board becomes unnecessary.`,
    relatedGroupTopics: ['behavior', 'school'],
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    id: 'social-skills-reframe',
    title: 'Social Skills: Rethinking What We\'re Actually Teaching',
    subtitle: 'The difference between masking and genuine connection',
    category: 'social',
    tags: ['social skills', 'autism', 'masking', 'connection', 'peer'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Traditional social skills training has a complicated history. Teaching autistic children to make eye contact and use neurotypical social scripts has been shown to increase anxiety and burnout in the long run — even when it "works" on the surface.

**What we're actually trying to achieve**
Connection, not compliance. A child who makes forced eye contact and recites scripts isn't connecting — they're performing. The goal is genuine reciprocal relationships on terms that work for the child's neurology.

**What skills actually matter for connection**

*Shared interest — the foundation*
Most lasting autistic friendships form around shared interests, not social scripts. Finding environments where the child's interests are the norm (Minecraft club, robotics team, art program, drama) is often more effective than direct social skills training.

*Turn-taking and reciprocity*
Games with clear, structured turn-taking rules are excellent natural practice. Board games, card games, building games. The rule-based structure removes ambiguity.

*Repair after rupture*
Knowing how to reconnect after conflict — apologizing, taking breaks, trying again — is more important than preventing conflict. Conflict is inevitable; repair is the skill.

**What research says about masking**
Forced masking (behaving neurotypically for social acceptance) is strongly associated with burnout, anxiety, and depression in autistic adolescents and adults. The goal is not to make a child look neurotypical — it's to help them build real relationships while being themselves.

**Practical approach**
Find one peer who shares a genuine interest. One friendship is enough. Structure interactions around that shared interest with clear expectations. Let the relationship develop at the child's pace.`,
    relatedGroupTopics: ['social'],
  },

  // ── FEEDING ───────────────────────────────────────────────────────────────
  {
    id: 'picky-eating-autism',
    title: 'Picky Eating vs. ARFID: What\'s Actually Happening',
    subtitle: 'Why your child\'s food refusal isn\'t a behavior problem',
    category: 'feeding',
    tags: ['feeding', 'ARFID', 'sensory', 'food', 'mealtime'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Extreme food selectivity is present in about 70% of autistic children. It's not willfulness. It's not bad parenting. It's a combination of sensory sensitivity, predictability needs, and in some cases diagnosable ARFID.

**ARFID vs. typical pickiness**
Avoidant/Restrictive Food Intake Disorder (ARFID) is an eating disorder characterized by food avoidance that isn't related to body image. Children with ARFID may have fewer than 20 accepted foods. They may gag, vomit, or have extreme anxiety responses to new foods. This requires professional support — not pressure.

**Why pressure makes it worse**
The most harmful feeding intervention is "they'll eat when they're hungry enough." For autistic children with sensory-based food refusal, this causes:
- Increased anxiety around mealtimes
- Expansion of the refusal to include previously accepted foods
- Damage to the parent-child relationship around food
- Potential nutritional deficiencies

**What actually works: systematic food exposure**
The gold standard is a sensory-based feeding therapy program. The hierarchy: tolerate food in the room → touch food → smell food → kiss food → lick food → bite and spit → chew and swallow. This process takes weeks to months per food. It cannot be rushed.

**Practical home strategies**
1. Serve one "safe" food at every meal alongside new foods — no pressure to try new foods
2. Involve the child in food preparation — touching raw ingredients in a low-stakes context
3. Keep mealtimes low-stimulation — not the time for demands
4. Celebrate looking at new foods as progress — any engagement is progress
5. Track accepted foods and note what they have in common (texture, color, temperature, brand) — this reveals the sensory pattern

**When to seek help**
Fewer than 20 accepted foods, nutritional deficiency, weight loss, extreme anxiety that spreads to non-mealtime contexts. Seek a feeding-specialized SLP or OT.`,
    relatedGroupTopics: ['feeding'],
  },

  // ── SAFETY ────────────────────────────────────────────────────────────────
  {
    id: 'elopement-safety-plan',
    title: 'Elopement: Building a Safety Plan That Works',
    subtitle: 'Half of autistic children wander — here\'s the plan that keeps them safe',
    category: 'behavior',
    tags: ['elopement', 'wandering', 'safety', 'autism', 'emergency'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Nearly 50% of autistic children attempt to elope (wander or bolt) — and it's the single greatest safety fear most parents carry. A real safety plan has three layers: prevention, containment, and rapid response.

**First: understand WHY your child elopes**
Elopement always has a function. The most common:
- **Toward something** — water (the most dangerous), trains, a favorite place
- **Away from something** — sensory overload, demands, anxiety
- **The act itself** — running feels regulating

Log every incident: where they were heading, what happened right before. The function determines the intervention.

**Layer 1 — Prevention**
1. Teach an exit-asking routine ("I need to go" card or phrase) and honor it EVERY time — eloping decreases when leaving legitimately works
2. Schedule movement breaks before overload builds
3. Visual "STOP" cues on exits — paired with explicit teaching, not alone
4. Address the trigger pattern your log reveals

**Layer 2 — Containment**
1. Deadbolts above the child's reach + door/window chimes (cheap, instant alert)
2. GPS tracker — shoe insert, belt clip, or watch (AngelSense, Jiobit are autism-specific)
3. Fence the yard if water or roads are nearby
4. Brief every caregiver: school, grandparents, respite — elopement plans fail at handoffs

**Layer 3 — Rapid response**
1. Register with your local police department's special-needs registry (most have one)
2. Prepare a "first 5 minutes" card: recent photo, height/weight, communication level, fascinations (where they'd head), water sources nearby
3. Search WATER FIRST. Drowning is the leading cause of death in elopement cases.
4. Teach your child their name + your phone number — by speech, card, or medical ID bracelet

**The IEP connection**
If elopement happens at school, it belongs in the IEP with a formal safety plan — not an informal understanding with one aide. Request it in writing.`,
    relatedQuestions: ['My son keeps trying to run out the front door', 'What GPS tracker works for a child who removes everything?'],
    relatedGroupTopics: ['behavior', 'safety'],
  },

  // ── TOILETING ─────────────────────────────────────────────────────────────
  {
    id: 'toilet-training-autism',
    title: 'Toilet Training: The Autism-Adapted Protocol',
    subtitle: 'Why standard methods stall — and the data-based approach that works',
    category: 'behavior',
    tags: ['toileting', 'potty training', 'autism', 'routines'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: true,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Autistic children toilet train later on average — and that's okay. Readiness matters more than age. Standard 3-day methods usually fail because they assume the child finds social praise reinforcing and tolerates interruption well. Here's the adapted approach BCBAs actually use.

**Readiness signals (age is NOT one of them)**
- Stays dry 1–2 hours at a time
- Shows awareness of being wet/soiled (pulling at diaper, moving away)
- Can sit (even briefly) on the toilet without distress
- Follows a 1–2 step routine with visual support

If none of these are present, wait and work on the prerequisite skills. Forcing it early creates toilet anxiety that takes months to undo.

**The protocol**
1. **Data first (3 days):** Log every wet/soiled diaper time. You're finding their natural rhythm.
2. **Scheduled sits:** Take them at their high-probability times — not every 20 minutes (that teaches the toilet is an interruption machine).
3. **Visual sequence on the wall:** pants down → sit → try → wipe → flush → wash. Same order, every time, photographed steps work better than cartoons for many kids.
4. **Reinforce SITTING first, production second.** The most common mistake is only rewarding success — sitting calmly IS the skill in week one.
5. **The powerful reinforcer rule:** Whatever you use (a specific video, a particular snack) must be available ONLY for toileting. If they get it elsewhere free, it stops working.

**Sensory blockers to check**
- Toilet flush sound (let them flush with headphones on, or flush after they leave)
- Cold seat (padded ring)
- Feet dangling (footstool — non-negotiable, dangling feet make bodies feel unsafe)
- Bathroom echo and lighting

**Regression is normal**
New school, new sibling, illness — expect setbacks and return to a denser schedule briefly. Regression is not failure; it's a flare.

**When to get help**
Constipation (treat it FIRST — most "training failures" are withholding from painful stools), age 5+ with no progress after a systematic attempt, or fear so intense the bathroom itself is avoided. Your BCBA or pediatrician can build an individualized plan.`,
    relatedQuestions: ['Is 5 too old to not be potty trained?', 'He will pee in the toilet but refuses to poop'],
    relatedGroupTopics: ['routines'],
  },

  // ── FAMILY ────────────────────────────────────────────────────────────────
  {
    id: 'sibling-support',
    title: 'The Siblings: Supporting the Kids Who Aren\'t in Therapy',
    subtitle: 'Neurotypical siblings carry an invisible load — here\'s how to lighten it',
    category: 'social',
    tags: ['siblings', 'family', 'support', 'wellbeing'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Siblings of autistic children grow up faster. They learn to wait, to de-escalate, to explain their brother or sister to strangers. Many become extraordinary humans because of it — but only if the load is acknowledged.

**What siblings commonly feel (and rarely say)**
- Guilt for being angry at a sibling "who can't help it"
- Embarrassment in public, then shame about the embarrassment
- Invisibility — every family resource flows to the child with higher needs
- Fear about the future ("will I have to take care of them?")

**The protected-time rule**
Fifteen minutes a day, or one hour a week, that belongs ONLY to the sibling. Not interruptible by a meltdown (have a backup plan for coverage). The consistency matters more than the duration — it's proof they're held in mind.

**Give them language, scaled by age**
- Age 4–6: "His brain works differently. Loud places hurt his ears like a sunburn hurts skin."
- Age 7–11: Actual diagnosis name, what it means, what it doesn't mean. Kids fill information gaps with worse stories than the truth.
- Age 12+: Honest conversations about the future, including the explicit reassurance: "Your life is yours. Caring for your sibling is our job, not your inheritance."

**Let them be a kid, not a co-therapist**
It's tempting to enlist siblings as helpers — and some genuinely enjoy it. But "helper" must be a role they can decline. Watch for the parentified child who never says no.

**Sibling rage is information, not betrayal**
When a sibling explodes with "I hate him, he ruins everything" — that's trust. Don't correct it ("you don't mean that"). Receive it: "It IS unfair sometimes. You're allowed to feel that and still love him." Both things are true.

**Resources**
Sibshops (sibling support groups, search by city) are the gold standard. Many kids meet the only other people on earth who get it.`,
    relatedQuestions: ['My daughter resents her autistic brother', 'How do I explain autism to a 5-year-old?'],
    relatedGroupTopics: ['family', 'support'],
  },

  // ── PARENT WELLBEING ──────────────────────────────────────────────────────
  {
    id: 'parent-burnout',
    title: 'Caregiver Burnout Is a Clinical Issue, Not a Character Flaw',
    subtitle: 'The research on parental burnout in autism families — and what actually helps',
    category: 'behavior',
    tags: ['burnout', 'self-care', 'parent', 'mental health', 'stress'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Mothers of autistic children show cortisol profiles similar to combat soldiers — that's not a metaphor, it's a published finding (Seltzer et al.). If you're exhausted, it's not because you're doing it wrong. It's because the load is objectively extreme.

**Burnout is not the same as stress**
Stress is having too much. Burnout is having nothing left. Signs you've crossed over:
- Going through caregiving motions on autopilot, feeling detached from your child
- Dreading routines you used to manage fine
- Rage that surprises you, followed by crushing guilt
- "I can't do this anymore" thoughts that recur, not just on the worst days

**Why "self-care" advice fails autism parents**
Bubble baths don't fix structural overload. What moves the needle is reducing the load itself:
1. **Respite is medicine, not luxury.** Most states fund respite hours through Medicaid waivers (check your state's DD services — Aminy's Coverage Coach can help you find them). Using respite predicts lower depression scores in caregiver studies more than ANY self-care behavior.
2. **Lower the bar deliberately.** Pick the two things that matter this season (safety + sleep, for example) and consciously let the rest be mediocre. Mediocre is a strategy, not a failure.
3. **One micro-recovery daily.** Not an hour — 10 minutes that is yours, defended like a medical appointment.
4. **Treat your own mental health.** Parental depression and anxiety are 2–3× more prevalent in autism parents. Treating YOUR brain is a clinical intervention for your child — regulated parents co-regulate kids.

**The oxygen mask is real**
Your child's outcomes are mediated by your capacity. This is uncomfortable but liberating: caring for yourself isn't selfish; it's the platform every other intervention stands on.

**Crisis line**
If you're having thoughts of harming yourself: call or text 988 (Suicide & Crisis Lifeline). For overwhelming moments that aren't emergencies, Aminy's crisis resources screen lists parent warmlines by state.`,
    relatedQuestions: ['I feel like a terrible parent', 'How do I get respite care?'],
    relatedGroupTopics: ['support', 'self-care'],
  },

  // ── FUNDING ───────────────────────────────────────────────────────────────
  {
    id: 'funding-navigation',
    title: 'Paying for Autism Care: The Funding Map Nobody Gives You',
    subtitle: 'Insurance, Medicaid waivers, grants, and HSA strategies — in plain English',
    category: 'school',
    tags: ['insurance', 'medicaid', 'funding', 'waiver', 'grants', 'money'],
    type: 'guide',
    readTimeMinutes: 7,
    isPremium: true,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Autism care can cost $40,000–$60,000+ per year. Almost no family pays that out of pocket — but the funding map is deliberately confusing. Here's the whole picture.

**Layer 1: Private insurance (if you have it)**
All 50 states now mandate some autism coverage, but the details vary wildly. Key facts:
- ABA typically requires a formal autism diagnosis + prior authorization
- Self-funded employer plans (most large companies) are exempt from state mandates but most cover ABA anyway — ASK
- Denials are routinely overturned on appeal. Always appeal. The first denial is often automated.

**Layer 2: Medicaid — even if your income is "too high"**
This is the layer most families miss. Children with disabilities can qualify for Medicaid REGARDLESS of parent income through:
- **TEFRA/Katie Beckett provisions** (~half of states): child's needs, not family income
- **HCBS waivers**: home and community-based services — respite, habilitation, sometimes ABA. Waitlists can be years, so APPLY NOW even if you don't need it yet.
Medicaid as secondary insurance also picks up copays your primary leaves behind.

**Layer 3: School district**
If a service is educationally necessary it goes in the IEP and the district pays: speech, OT, social skills, sometimes district-funded ABA support. The school evaluation is free — formally request it in writing.

**Layer 4: Grants and one-time funds**
- Autism Care Today, ACT Today, MyGOAL, United Healthcare Children's Foundation — equipment, therapy, camps
- Local Autism Society chapters often have emergency funds
- AAC devices: ask the SLP about device-loan programs before buying

**Layer 5: Tax strategy**
- ABLE accounts: tax-advantaged savings that don't break benefit eligibility (up to $100K doesn't count against SSI)
- Therapy mileage, special diets (with doctor letter), and home modifications can be medical deductions
- HSA/FSA funds cover therapy copays, sensory equipment with a Letter of Medical Necessity — and your Aminy subscription qualifies

**The order of operations**
1. Apply for the Medicaid waiver TODAY (the waitlist is the bottleneck)
2. Get the school evaluation request in writing this week
3. Appeal every insurance denial
4. ABLE account once any benefits exist

Aminy's Coverage Coach walks you through your state's specific programs — open it from the Benefits tab.`,
    relatedQuestions: ['We make too much for Medicaid but can\'t afford therapy', 'What is a Medicaid waiver?'],
    relatedGroupTopics: ['insurance', 'advocacy'],
  },

  // ── BEHAVIOR: AGGRESSION ──────────────────────────────────────────────────
  {
    id: 'aggression-self-injury',
    title: 'Aggression and Self-Injury: The Functional Approach',
    subtitle: 'The behaviors that scare parents most — and the framework that actually reduces them',
    category: 'behavior',
    tags: ['aggression', 'self-injury', 'SIB', 'hitting', 'safety', 'behavior'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: true,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Hitting, biting, head-banging — these behaviors frighten parents into reactive mode. But aggression and self-injury follow the same laws as all behavior: they happen because they WORK. Find what they accomplish, and you can replace them.

**Rule out pain FIRST**
Before any behavior plan: dental exam, ear check, GI workup (constipation and reflux are epidemic in autistic kids and invisible drivers of self-injury). A child who can't say "my tooth hurts" may hit their face instead. New or escalating self-injury = medical evaluation, full stop.

**The four functions, applied**
- **Escape**: aggression ends demands → child learns hitting = work stops
- **Attention**: even angry attention is attention for a child who's invisible otherwise
- **Tangible**: aggression has produced the iPad before → it will be tried again
- **Automatic/sensory**: head-banging can produce endorphin release or block overwhelming input

Your ABC log (track it in Aminy) reveals the function in 1–2 weeks. The intervention DEPENDS on the function — escape-driven aggression and sensory-driven self-injury need opposite responses.

**The universal moves (safe for any function)**
1. **Teach a replacement that works FASTER than the behavior.** A "break" card only competes with hitting if it produces a break instantly, every time, at first.
2. **Catch the ramp.** Aggression rarely comes from zero — there's a build (pacing, vocal changes, repetitive questions). Intervene at the ramp, not the peak.
3. **During the behavior: minimum attention, maximum safety.** Block, don't restrain (restraint escalates and is dangerous). Flat voice, few words.
4. **Never give the function during the episode.** If it's escape-driven, the demand resumes (modified if needed) once calm.

**Protect everyone**
Head-banging: padded zone, helmet conversation with your team if intense. Aggression toward siblings: physical safety plan first, behavior plan second.

**Get professional support if**
Behavior draws blood, involves weapons-grade objects, targets infants, or you're afraid in your own home. This is exactly what intensive ABA exists for — and crisis-level behavior often qualifies for expedited insurance authorization.`,
    relatedQuestions: ['My son hits his head when frustrated', 'She attacks her baby brother and I\'m scared'],
    relatedGroupTopics: ['behavior', 'safety'],
  },

  // ── COMMUNICATION: ECHOLALIA ──────────────────────────────────────────────
  {
    id: 'echolalia-gestalt',
    title: 'Echolalia Is Communication: Understanding Gestalt Language',
    subtitle: 'Why script-repeating isn\'t meaningless — it\'s a different path to language',
    category: 'communication',
    tags: ['echolalia', 'gestalt', 'language', 'speech', 'scripting'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Your child quotes entire movie scenes. Answers questions with lines from songs. Repeats your question back instead of answering. Old-school advice said to extinguish this "meaningless" echo. Modern speech science says the opposite: echolalia is often a STAGE of language development, not a dead end.

**Gestalt language processing**
Some children acquire language in whole chunks ("gestalts") rather than single words. Where an analytic processor builds "want" → "want cookie" → "I want a cookie," a gestalt processor might start with the entire phrase "ToInfinityAndBeyond!" as a unit meaning excitement. Many autistic children are gestalt processors.

**Decode the script**
Echolalia usually carries meaning — you have to find it:
- "Are you okay?" (when THEY are hurt) — they've heard it in that context; it means "I'm hurt"
- A scene from a movie where a character leaves — may mean "I'm anxious about you leaving"
- Immediate echo of your question — often means "I'm processing" or "I don't know how to answer"

Log scripts and their contexts in Aminy. The pattern is the dictionary.

**How to respond (do this, not that)**
- DON'T: "Stop scripting" or ignore it
- DO: Acknowledge the communicative intent. If "Are you okay?" means "I'm hurt," respond: "You're hurt! Let me see."
- DO: Model the next-stage language naturally: child says the whole movie line; you respond with a smaller remix of it
- DON'T: Drill "say it THIS way" — partial scripts loosen naturally as the system matures

**The stages (so you can see progress)**
1. Whole scripts ("Let's get out of here!")
2. Mix-and-match chunks ("Let's get + cookie")
3. Single words isolated from chunks
4. Original novel grammar

Movement through stages can take years. The job is meaning and connection at every stage — not speed.

**Tell your team**
Ask whether your SLP is familiar with gestalt language processing / Natural Language Acquisition (NLA). It changes therapy targets significantly.`,
    relatedQuestions: ['My son only quotes movies, is that talking?', 'Should I stop my daughter from scripting?'],
    relatedGroupTopics: ['communication'],
  },

  // ── ADOLESCENCE ───────────────────────────────────────────────────────────
  {
    id: 'puberty-adolescence',
    title: 'Puberty and Autism: The Guide Nobody Hands You',
    subtitle: 'Body changes, big feelings, and safety — preparing early changes everything',
    category: 'social',
    tags: ['puberty', 'adolescence', 'teen', 'hygiene', 'safety'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: true,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Puberty arrives on a biological schedule that doesn't wait for developmental readiness. For autistic kids, body changes can be genuinely frightening without preparation — and the social rules shift exactly when peers stop being forgiving. Start earlier than feels necessary: age 8–9 for the basics.

**Teach the body changes BEFORE they happen**
Surprise is the enemy. Social narratives with visuals, repeated calmly long before changes start:
- What will change (hair, smell, size, periods, erections — use real words)
- That it happens to EVERYONE and is healthy
- Who they can ask (name 2–3 specific safe people)

For menstruation: practice the full hygiene routine with supplies BEFORE the first period. Track cycles once started — for many autistic girls, premenstrual mood and sensory amplification are severe (PMDD is more common; it's treatable).

**Hygiene as a visual routine, not nagging**
Deodorant, showering, and face-washing fail as verbal reminders. Build a visual sequence in the bathroom, same as any routine. Tie it to a fixed anchor (after breakfast, not "when you're smelly").

**Privacy rules are now safety-critical**
Concrete, explicit teaching — vague hints don't transfer:
- Where touching your own body is okay (own bedroom/bathroom, door closed) — frame as WHERE, not shame
- Public vs. private body parts, clothing rules
- The underwear rule: nobody touches where your swimsuit covers, no keeping secrets about bodies — autistic children are sexually victimized at far higher rates; explicit teaching is protection

**The emotional storm is real**
Hormones amplify everything. Meltdowns may return after years of calm. This is neurology, not regression of skills — adjust support up temporarily without shame.

**Update the supports**
- IEP: add transition planning (legally required by 16, smart by 14)
- Re-evaluate medication with a prescriber who knows autism + adolescence
- Peer relationships: explicit teaching about flirting vs. friendliness, online safety, and consent — in both directions`,
    relatedQuestions: ['How do I prepare my autistic daughter for her period?', 'My teenage son touches himself in public'],
    relatedGroupTopics: ['social', 'teens'],
  },

  // ── SCREENS ───────────────────────────────────────────────────────────────
  {
    id: 'screen-time-autism',
    title: 'Screen Time and Autism: An Honest Framework',
    subtitle: 'Beyond the guilt — what screens actually do for autistic brains, good and bad',
    category: 'behavior',
    tags: ['screens', 'iPad', 'video games', 'YouTube', 'routines'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Every autism parent carries screen guilt. Here's the honest version: screens are neither poison nor babysitter-of-shame. For autistic kids they're often genuine regulation, predictability, and special-interest joy — AND they can crowd out everything else. The framework is function, not minutes.

**Why screens are MORE compelling for autistic brains**
- Perfect predictability (the video is identical every time — the world isn't)
- Controllable sensory input (volume, brightness, pause button)
- No social demands
- Special interests live there

That's why "just take it away" produces meltdowns that look like addiction withdrawal. You're not removing entertainment; you're removing a regulation tool.

**The questions that matter (instead of counting minutes)**
1. Is it displacing sleep? (The non-negotiable. Screens off 60 min before bed, devices out of the bedroom.)
2. Is it displacing ALL other regulation? If the iPad is the only calming tool, build alternatives alongside it — not instead of it.
3. Can they transition off without a crisis? If no — that's the skill to teach, not the screen to ban.
4. Is the content feeding or feeding on them? A kid deep in train videos is in special-interest heaven. Endless algorithmic shorts are a different machine.

**Make transitions off-screen survivable**
- Countdown warnings tied to content units, not minutes ("after this episode" beats "in 5 minutes" — episodes have natural endings)
- First/Then with the NEXT preferred thing visible ("First tablet off, then trampoline")
- Never make screen-removal the consequence for unrelated behavior — it turns the most valuable reinforcer into a battleground

**Use the screen, don't fight it**
Screens are the most powerful reinforcer most autistic kids have. That's leverage: earned through token boards, used in First/Then sequences, deployed for tough transitions (the dentist iPad is medicine, use it without shame).

**The honest bottom line**
A regulated kid who watched four hours on a hard day beats a dysregulated kid who hit their quota. Aim the worry at sleep, breadth of regulation tools, and transition skills — not the minute count.`,
    relatedQuestions: ['Is my son addicted to his iPad?', 'Screen time limits cause huge meltdowns'],
    relatedGroupTopics: ['routines', 'behavior'],
  },

  // ── NEW DIAGNOSIS ─────────────────────────────────────────────────────────
  {
    id: 'first-90-days',
    title: 'Just Diagnosed: Your First 90 Days, Step by Step',
    subtitle: 'The roadmap for the overwhelming weeks after the diagnosis',
    category: 'behavior',
    tags: ['diagnosis', 'new diagnosis', 'roadmap', 'getting started'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `The diagnosis appointment ends, you're handed a packet, and the door closes. Here's what the packet should have said.

**Week 1–2: Breathe. Nothing is on fire.**
The diagnosis changed your information, not your child. They are the same kid they were last week. You don't have to learn everything this month. Two tasks only:
1. Request the full written evaluation report (you'll need it for everything)
2. Tell the people who need to know — on your timeline, in your words

**Week 3–4: Start the clocks (waitlists are the enemy)**
Several waitlists are months-to-years long. Getting ON them costs nothing:
1. **Medicaid waiver application** — your state's DD services agency (even if your income seems too high — see the Funding guide)
2. **ABA intake** at 2–3 providers (multi-list; take the first good fit)
3. **School:** written request for evaluation/IEP eligibility (they have legal timelines once it's in writing)
4. **SSI** if income-eligible

**Month 2: Build the home base**
- Start ONE routine with visual supports (mornings are the classic). Small wins compound.
- Start logging behaviors in Aminy — by intake day you'll hand the BCBA a month of ABC data, which accelerates everything
- Read your child's evaluation report twice: once to cry, once to highlight the recommendations (they're your service-request checklist)

**Month 3: Assemble the team**
- First IEP meeting (bring the advocacy guide; you can bring a support person)
- ABA intake assessments
- Find ONE parent who's two years ahead of you — local support group or Aminy community. They're worth ten pamphlets.

**What NOT to do in the first 90 days**
- Don't buy a supplement protocol from the internet
- Don't commit to 40 hrs/week of anything before you've seen your child's response
- Don't read prognosis forums at 2am — every trajectory on earth is in there and none of them is your child
- Don't quit your job in week 2 (some parents eventually restructure work; do it from data, not panic)

**The truth from the other side**
Thousands of parents will tell you the same thing: the diagnosis day felt like an ending, and it was actually the day the right help became possible. Your child just became eligible for every support in this library.`,
    relatedQuestions: ['We just got the diagnosis, what do I do first?', 'How long are ABA waitlists?'],
    relatedGroupTopics: ['new-diagnosis', 'support'],
  },

  // ── SCHOOL & IEP ──────────────────────────────────────────────────────────────
  {
    id: 'how-to-request-iep-evaluation',
    title: 'How to Request a School IEP Evaluation',
    subtitle: 'A parent-written letter triggers federal timelines — here is exactly how to do it',
    category: 'school',
    tags: ['IEP', 'school', 'evaluation', 'special education', 'IDEA', 'legal rights'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Under the Individuals with Disabilities Education Act (IDEA), your child has the right to a free, appropriate public school evaluation. The school must respond within 60 days of receiving your written request (timelines vary slightly by state).

**Step 1: Write the request letter (today)**
Address it to the school principal AND the special education director. Keep it short:

*"I am formally requesting a full and individual evaluation for my child [Name], grade [X], to determine if they qualify for special education services and an Individualized Education Program (IEP). I understand the school has 60 days to complete this evaluation under IDEA. Please contact me to schedule the consent meeting."*

Date and sign it. Send it via email AND certified mail (keep both copies).

**Step 2: What happens next**
- Within 15 school days, the school must respond with a "prior written notice"
- They will schedule a meeting to discuss what the evaluation will cover
- You sign consent forms for the evaluation to begin
- A multidisciplinary team evaluates your child (psychological, educational, speech, OT as needed)
- Results meeting held — if eligible, IEP is developed within 30 days

**If the school refuses:** They must give you written notice explaining why. You have the right to request mediation or a due process hearing. Contact your state's Parent Training and Information Center (PTI) — it is free.

**Key parent rights:**
- You must consent to each evaluation
- You can request an Independent Educational Evaluation (IEE) if you disagree with the school's findings
- You are a full member of the IEP team — your input is required, not optional
- The IEP must be reviewed at least annually`,
    relatedQuestions: ['How do I get my child an IEP?', 'What if the school says my child does not qualify?'],
    relatedGroupTopics: ['school', 'new-diagnosis'],
  },

  {
    id: 'first-iep-meeting-what-to-expect',
    title: 'What to Expect at Your First IEP Meeting',
    subtitle: 'Walk in knowing the process, your rights, and the questions that matter most',
    category: 'school',
    tags: ['IEP', 'school', 'meeting', 'special education', 'goals', 'services'],
    type: 'guide',
    readTimeMinutes: 6,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `An IEP meeting can feel overwhelming — you are sitting across from 6-8 school professionals. Here is what to expect and how to show up prepared.

**Who will be in the room**
- General education teacher
- Special education teacher
- School psychologist or evaluator
- Related service providers (speech, OT, PT — as applicable)
- School administrator (required by law)
- You (the parent — a required team member, not a guest)
- Your child (if 16 or older; younger is optional)

You may also bring: a support person, an advocate, or a recording device (check state law first, but federal law says you can bring whoever you need).

**The meeting structure**
1. Present levels of performance — what the evaluation found
2. Goals development — what your child will work on this year (must be measurable)
3. Services discussion — how many minutes/week of each support
4. Placement decision — where services are delivered (least restrictive environment)
5. Parent consent — you sign at the end (or take it home to review)

**Questions to ask**
- "How was this goal chosen over other areas?"
- "How will progress be measured and how often will I receive updates?"
- "What does 'least restrictive environment' look like for my child specifically?"
- "What happens if my child is not making expected progress?"
- "Can I see the data from the evaluation that supports this recommendation?"

**You do not have to sign at the meeting.** You can take the IEP home, review it, and sign later. The school cannot implement the IEP until you sign. If you have questions, ask them — or request another meeting.

**After the meeting**
Keep your copy. Track progress reports. Request a review meeting any time you have concerns — annually is the minimum, but you can request one whenever needed.`,
    relatedQuestions: ['What do I say at my first IEP meeting?', 'Can I bring someone with me to an IEP?'],
    relatedGroupTopics: ['school'],
  },

  // ── FAMILY ────────────────────────────────────────────────────────────────────
  {
    id: 'supporting-neurotypical-siblings',
    title: 'Supporting Neurotypical Siblings',
    subtitle: 'How to help your other children thrive when the family focus has shifted',
    category: 'family',
    tags: ['siblings', 'family', 'neurotypical', 'ASD', 'emotion regulation', 'equity'],
    type: 'guide',
    readTimeMinutes: 5,
    isPremium: false,
    author: 'Aminy BCBA Team',
    authorCredentials: 'BCBA',
    body: `Siblings of autistic children carry a unique emotional load that often goes unaddressed. They love their sibling, and they also feel overlooked, confused, and sometimes resentful — all at the same time. That is not a character flaw. It is a normal response to a changed family dynamic.

**What siblings actually experience**
- "Why does [sibling] get all the attention?"
- Confusion about what autism is and whether it is "catching"
- Fear during meltdowns they don't understand
- Pride in their sibling alongside frustration with them
- Embarrassment in social situations
- Worry about their parents' stress

**What they need from you**

**1. Age-appropriate explanations**
Children can handle the truth when it is framed simply: "Your brother's brain works differently. He needs extra help learning some things. It does not mean he loves you less, and it does not mean you will get less from us — it means we have to work at it."

**2. Protected 1:1 time**
Schedule it. Even 20 minutes without phones, without the sibling present, completely focused on them. Predictable and protected.

**3. Permission to have mixed feelings**
"It's okay to feel frustrated that we had to leave early. That makes sense. You're allowed to feel that." Do not require positivity or guilt them about normal feelings.

**4. Their own language for it**
Let them decide how (or if) they explain it to friends. Give them simple, true sentences they can use if they want: "My sister has autism — she has a hard time with loud sounds." Then step back.

**5. A trusted adult who is just theirs**
A therapist, school counselor, coach, or aunt/uncle who is reliably available just for them — not pulled into the autism journey. Siblings of kids with disabilities have higher rates of anxiety; this relationship can make a real difference.

**Signs to watch for**
- Consistent withdrawal or irritability at home
- School performance dropping
- Refusal to participate in family activities
- Expressions of wishing the sibling "wasn't there"

These are signals to get support — not evidence of a bad sibling relationship. Sibling support groups (Sibshops is a national program) can help them find community with kids who get it.`,
    relatedQuestions: ['How do I explain autism to my other kids?', 'My other child says it is not fair — how do I respond?'],
    relatedGroupTopics: ['family', 'support'],
  },
];

export function getResourcesByCategory(category: string): Resource[] {
  if (category === 'all') return RESOURCES;
  return RESOURCES.filter(r => r.category === category);
}

export function searchResources(query: string): Resource[] {
  const q = query.toLowerCase();
  return RESOURCES.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.subtitle.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q)) ||
    r.body.toLowerCase().includes(q)
  );
}

export function getRecommendedResources(
  childConditions: string[],
  recentBehaviorCategories: string[],
  limit = 4
): Resource[] {
  const relevant = new Set<string>();
  for (const cat of recentBehaviorCategories) relevant.add(cat);
  if (childConditions.some(c => c.toLowerCase().includes('autism'))) {
    relevant.add('meltdowns'); relevant.add('sensory'); relevant.add('communication');
  }
  if (childConditions.some(c => c.toLowerCase().includes('adhd'))) {
    relevant.add('transitions'); relevant.add('school');
  }

  const scored = RESOURCES.map(r => ({
    resource: r,
    score: (relevant.has(r.category) ? 3 : 0) +
           r.tags.filter(t => [...relevant].some(rel => t.includes(rel))).length +
           (r.isPremium ? 0 : 1)
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.resource);
}
