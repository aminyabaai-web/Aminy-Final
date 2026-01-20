# Onboarding Flow Updates - Item 3 Specification

## Current Status
The OnboardingFlow5Steps.tsx has 5 steps currently. We need to update Steps 1-3 with new copy and add an Approve screen.

## Required Changes

### Step 1: Priority Selection (NEW)
**AI Companion Strip:** "What matters most this week? Pick 1-3 areas."

**Headline:** "What matters most this week?"

**Chips:**
- Mornings
- Meltdowns
- Communication
- Sleep
- School
- Feeding

**Pattern:** Multi-select chips (1-3 allowed)

---

### Step 2: Time Availability (NEW)
**AI Companion Strip:** "When do you usually have a few minutes?"

**Headline:** "When do you usually have a few minutes?"

**Chips:**
- Morning
- Afternoon
- Evening
- Weekends

**Pattern:** Multi-select chips

---

### Step 3: Sensitivities (NEW)
**AI Companion Strip:** "Any sensitivities we should watch? (No pressure—just helps us be gentle.)"

**Headline:** "Any sensitivities we should watch?"

**Subhead:** "No pressure—just helps us be gentle"

**Chips:**
- Sound
- Light
- Texture
- Transitions
- Crowds
- None/Unsure

**Pattern:** Multi-select chips

---

### Step 4: Approve Screen (NEW)
**AI Companion Strip:** "Here's your personalized 7-day gentle start. Approve to begin!"

**Headline:** "Your 7-day gentle start"

**Subhead:** "I've prepared a gentle plan based on what you shared. You can approve it, simplify it, or save it for later."

**Toggles (all ON by default):**
1. Today's routine (2 steps · 6 min)
2. Two focus goals (Communication, Sensory)
3. Calming supports (Breathing, Music)

**Buttons (horizontal row):**
- "Approve" (primary CTA)
- "Simplify" (secondary)
- "Not now" (tertiary/text link)

**Output Label Below:**
"📊 Diagnostic Prep Packet (not a diagnosis)"
"I'll track progress and create a provider-ready report"

---

### Step 5: Keep existing Junior setup prompt

## Implementation Notes

1. Replace current Step 1 (Goal Selection) with Priority Selection
2. Replace current Step 2 (Schedule Setup) with Time Availability
3. Add new Step 3 (Sensitivities)
4. Add new Step 4 (Approve Screen)
5. Keep existing Step 5 (Junior Setup)

This makes it a true 5-step flow with the exact copy from the spec.

## Technical Details

- Maintain existing AICompanionStrip component
- Use existing chip styling patterns from globals.css
- Follow existing navigation patterns
- Preserve GlobalHelpFooter integration
- Keep all animations and transitions
