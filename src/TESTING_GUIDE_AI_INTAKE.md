# AI Intake Chat - Testing Guide

## Quick Test Access

**Test Page:** Open `/test-ai-intake.html` in your browser to run automated validation tests and try interactive examples.

---

## Manual Testing Scenarios

### 1. Age Validation Testing

#### ✅ Valid Age Inputs (Should Accept)
- "Emma is 5 years old"
- "My son is 7"
- "He's 3 and struggles with transitions"
- "Age is 12"
- "She just turned 4"
- "My 6 year old daughter"

#### ❌ Invalid Age Inputs (Should Ask for Clarification)
- "age is t" → Should say: "Could you let me know how old your child is in years?"
- "My child is 25 years old" → Should ask for clarification (outside 1-18 range)
- "He is old" → Should ask for clarification
- "age a" → Should ask for clarification
- "50 years" → Should ask for clarification

**Expected Response:**
> "Could you let me know how old your child is in years? For example, '5 years old' or just '5'."

---

### 2. Emotional Tone Detection

#### 😰 Stressed Parent (Should Acknowledge Challenges)
Test inputs:
- "I'm so overwhelmed and exhausted every day"
- "I can't do this anymore, mornings are breaking me"
- "I feel so alone and lost in all of this"
- "Everything is so hard and chaotic"
- "I'm drowning and don't know what to do"

**Expected Response:**
> "I hear that things have been really challenging, and I want you to know—what you're feeling is completely valid."

#### 🌟 Hopeful Parent (Should Encourage Positive Energy)
Test inputs:
- "We're ready for change and excited to improve"
- "I'm hopeful we can make progress together"
- "Looking forward to better days ahead"
- "I believe we can do this with the right help"
- "Feeling optimistic about finding solutions"

**Expected Response:**
> "I can feel your determination and hope coming through, which is such a powerful place to start from."

#### 😌 Neutral/Both (Should Use Appropriate Response)
Test inputs:
- "My son is 5" → No special emotional acknowledgment
- "It's been hard but I'm ready to improve" → Should detect hopeful (hope > stress)

---

### 3. Name Extraction & Natural Usage

#### Test Cases
Input → Expected Name → How It Should Be Used

1. "My daughter Emma is 5 and struggles with mornings"
   - Extract: "Emma"
   - Usage: "Thank you so much for trusting me with **Emma's** story"
   - Summary: "Here's what I'm hearing about **Emma (5 years old)**"
   - Routines: "Here are three routines made for **Emma**"

2. "This is Sarah and she struggles with speech"
   - Extract: "Sarah"
   - Natural usage throughout conversation

3. "Called him Max, he's 3"
   - Extract: "Max"
   - Should use "Max" in all subsequent responses

4. "My 5 year old son has autism"
   - Extract: No name (none provided)
   - Should use "your child" or "your son" instead

**Key Check:** Once a name is provided, Aminy should NEVER ask for it again and should use it naturally in every response.

---

### 4. Complete Conversation Flow Test

#### Full Journey Test Case:

**Step 1: Empathy Check**
- User clicks: "😓 Overwhelmed"
- Expected: Warm acknowledgment + invitation to share story

**Step 2: Share Story (with validation)**
Try these inputs:

**Test A: Complete, valid story**
```
"My daughter Emma is 5 years old. She struggles with morning 
transitions - getting dressed, leaving the house, everything is 
a battle. I'm exhausted and need help making mornings smoother."
```

Expected:
- ✓ Extracts: name="Emma", age="5"
- ✓ Detects: stressed tone
- ✓ Acknowledges: "I hear that things have been really challenging..."
- ✓ Summary includes: "Emma (5 years old)" with checkmarks
- ✓ Next step: Recommends "Calm Morning Routine" as one of 3 routines

**Test B: Invalid age (should ask for clarification)**
```
"My son is t years old and has meltdowns"
```

Expected:
- ✗ Validation fails
- ✓ Response: "Could you let me know how old your child is in years?"
- ✓ Allows re-entry

**Test C: Too short (should ask for more)**
```
"ok"
```

Expected:
- ✗ Validation fails  
- ✓ Response: "I want to make sure I understand you clearly. Could you share a bit more?"

**Test D: No name provided**
```
"My 7 year old struggles with speech and language development. 
He doesn't talk much and I'm worried about kindergarten."
```

Expected:
- ✓ Extracts: age="7"
- ✓ Uses: "your child" or "your son" (not a name)
- ✓ Summary: "Here's what I'm hearing about your child (7 years old)"
- ✓ Recommends speech-related routines

---

### 5. Insight Extraction Accuracy

Test inputs and expected insights:

**Input:**
```
"Emma is 5. Mornings are chaotic - she melts down getting dressed. 
She's very sensitive to textures and loud noises. I want to help 
her make friends at school too."
```

**Expected Insights (should detect 3-4):**
- ✓ "Morning transitions feel rushed and overwhelming"
- ✓ "Managing big emotions is challenging"
- ✓ "Sensory sensitivities need attention"
- ✓ "Social connections are important"

**Recommended Routines Should Include:**
1. Calm Morning Routine (morning transitions)
2. Emotion Toolkit (meltdowns)
3. Social Practice (making friends)

---

### 6. No Re-Asking Test

**Critical Test:** AI should NEVER re-ask for information it already has.

Test flow:
1. User provides: "My son Max is 7 and struggles with focus"
2. AI extracts: name="Max", age="7"
3. User adds more info: "He also has trouble sleeping"
4. AI should NOT ask for name or age again
5. AI should respond: "Thank you for sharing more—this helps me understand your situation better."

**Should NOT say:** "Great! Can you tell me your child's name and age?"

---

### 7. Paywall Integration

After routine selection:

**Expected Message:**
> "You've already done the hardest part—showing up and asking for support.
> 
> Now let me walk alongside you and **[Child's name]** with the clinical 
> expertise, practical strategies, and unwavering support your family deserves."

**Trial CTA Should Include:**
- ✓ Child's name: "You'll get immediate access to **Emma's** personalized routines"
- ✓ Age reference: "evidence-based strategies designed for 5-year-old children like Emma"
- ✓ Emphasis: **"No credit card required"** in bold or highlighted
- ✓ Clear value: "unlimited AI support whenever you need it"

---

## Automated Test Results

Run `/test-ai-intake.html` and verify:

### Expected Pass/Fail:
- **Age Validation - Valid:** All 4 tests should PASS ✓
- **Age Validation - Invalid:** All 4 tests should PASS ✓
- **Length Validation:** All 3 tests should PASS ✓
- **Emotional Tone Detection:** All 4 tests should PASS ✓
- **Name Extraction:** All 3 tests should PASS ✓

**Total:** 18/18 tests should pass

---

## Edge Cases to Verify

### 1. Multiple children mentioned
Input: "I have two kids, Emma (5) and Max (7)"
- Should extract first name mentioned
- May need future enhancement for multi-child support

### 2. Unusual names
- "My son X Æ A-12 is 4" → May not extract correctly
- "Called him DJ" → Should extract "DJ"

### 3. Non-English characters
- "María is 6" → Should extract "María"
- May have issues with regex patterns

### 4. Mixed signals
Input: "I'm stressed but hopeful"
- Should prioritize hopeful (current logic checks hopeful last)

### 5. Very long responses
- Should handle multi-paragraph stories
- Should extract all relevant insights

---

## What to Look For

### ✅ Good Signs:
- Warm, empathetic tone without being saccharine
- Natural use of child's name throughout
- Specific insights extracted (not generic)
- Clear next steps provided
- No repetitive questions
- Validation catches obvious errors
- Emotional acknowledgment feels authentic

### ❌ Red Flags:
- Generic "Great!" responses
- Re-asking for information already provided
- Not using child's name when available
- Accepting invalid ages without clarification
- Missing emotional cues (stressed parent gets neutral response)
- Insights don't match the input
- Recommendations feel cookie-cutter

---

## Browser Console Tests

Open browser console and test extraction functions:

```javascript
// Test name extraction
const testName = "My daughter Emma is 5 years old";
console.log(extractStructuredData(testName));
// Should return: { name: "Emma", age: "5", ageIsValid: true }

// Test invalid age
const testInvalidAge = "age is t";
console.log(extractStructuredData(testInvalidAge));
// Should return: { name: "", age: "", ageIsValid: false }

// Test validation
console.log(validateInput(testInvalidAge));
// Should return: { isValid: false, clarification: "..." }
```

---

## Performance Checks

- [ ] Messages appear within 800ms of user input
- [ ] Typing indicator shows while AI is "thinking"
- [ ] Smooth scrolling to new messages
- [ ] No layout shifts when messages appear
- [ ] Input field clears immediately after send
- [ ] No lag when typing in textarea

---

## Mobile-Specific Tests

- [ ] Empathy buttons are easy to tap (min 44px touch target)
- [ ] Textarea expands properly on mobile
- [ ] Voice input button is accessible
- [ ] Messages don't overflow on small screens
- [ ] Keyboard doesn't cover input area
- [ ] Can scroll through long conversations

---

## Accessibility Tests

- [ ] Can navigate with keyboard only
- [ ] Screen reader announces new messages
- [ ] Form labels are properly associated
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible

---

## Ready for Production Checklist

- [ ] All automated tests pass (18/18)
- [ ] Manual flow test completes successfully
- [ ] Name is used naturally throughout
- [ ] Age validation works correctly
- [ ] Emotional tone detection feels authentic
- [ ] No re-asking for information
- [ ] Insights are relevant and specific
- [ ] No credit card required is prominently displayed
- [ ] Paywall copy uses child's name
- [ ] Mobile experience is smooth
- [ ] Performance is acceptable (<1s response time)

---

## Notes for Future Enhancements

1. **Multi-child support:** Extract and track multiple children
2. **International names:** Better regex for non-English names
3. **More emotional nuance:** Detect frustration vs. desperation vs. hope
4. **Context memory:** Remember details across multiple inputs
5. **Insight refinement:** Use AI to generate custom insights instead of pattern matching
6. **Smart routine ordering:** Rank routines by relevance score
