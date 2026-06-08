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
  { id: 'school', label: 'School & IEP', emoji: '🏫' },
  { id: 'transitions', label: 'Transitions', emoji: '🔄' },
  { id: 'feeding', label: 'Feeding', emoji: '🍴' },
  { id: 'sensory', label: 'Sensory', emoji: '✨' },
  { id: 'social', label: 'Social Skills', emoji: '👥' },
  { id: 'communication', label: 'AAC & Communication', emoji: '💬' },
  { id: 'behavior', label: 'Behavior Basics', emoji: '🎯' },
  { id: 'tools', label: 'Tools & Visuals', emoji: '🛠️' },
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
