# 🧪 Quick Test Checklist - AI Intake Validation

## Critical Bug Fixes - User Testing Required

---

## ✅ Test #1: Invalid Age Catches All Variations

### What to test:
Type these exact inputs and verify you get a **clarification message** (NOT "Great!")

| Input | Expected Response |
|-------|------------------|
| `age was 'd'` | ❌ "Could you let me know how old your child is in years?" |
| `age is t` | ❌ "Could you let me know how old your child is in years?" |
| `age: d` | ❌ "Could you let me know how old your child is in years?" |
| `age = 'x'` | ❌ "Could you let me know how old your child is in years?" |

### How to test:
1. Start onboarding
2. Click an empathy option (e.g., "😓 Overwhelmed")
3. When prompted to share your story, type one of the invalid ages above
4. Hit Send
5. **Verify:** Should see clarification message, NOT "Great!"

**Bug was:** "age was 'd'" said "Great!" instead of asking for clarification ❌  
**Now should:** Ask for clarification for ALL letter-based ages ✅

---

## ✅ Test #2: Valid Age Extracts Correctly with Different Formats

### What to test:
Type these inputs and verify the age IS extracted (check summary shows correct age)

| Input | Should Extract | Notes |
|-------|---------------|-------|
| `Emma is 5 years old` | age = "5", name = "Emma" | Standard format ✅ |
| `age = 6` | age = "6" | Equals sign |
| `age: 7` | age = "7" | Colon separator |
| `age was 4` | age = "4" | Past tense |
| `My son is 3` | age = "3" | Natural language |

### How to test:
1. Start onboarding
2. Click empathy option
3. Type one of the inputs above
4. Hit Send
5. **Verify:** In the AI's summary response, check that it shows:
   - "Here's what I'm hearing about [Name] **(X years old)**" ← Should show the age
   - Name should appear if provided
   - No re-asking for age

**Bug was:** "age = 5" didn't extract the age ❌  
**Now should:** Extract age regardless of separator (=, :, is, was) ✅

---

## ✅ Test #3: Auto-Capitalize on Mobile

### What to test:
Verify first letter auto-capitalizes when typing

### How to test (Mobile Device or Chrome DevTools Mobile Mode):
1. Start onboarding
2. Click empathy option
3. Tap in the textarea
4. Type: `my son is 5` ← Start with lowercase 'm'
5. **Verify:** Mobile keyboard should suggest/auto-change to capital 'M'
6. Type a period: `My son is 5.` 
7. Start new sentence: `he struggles` ← Start with lowercase 'h'
8. **Verify:** Should auto-capitalize to 'H' after the period

### Desktop Testing:
- Desktop browsers already handle sentence capitalization via OS
- This fix primarily improves mobile UX

**Bug was:** No auto-capitalize, user had to manually capitalize ❌  
**Now should:** Mobile keyboards automatically capitalize sentence starts ✅

---

## 🚀 Automated Test Page

**Quick way to verify all fixes:**

1. Open `/test-ai-intake.html` in your browser
2. Scroll to test results
3. **Expected:** 23/23 tests PASS ✅

The automated tests cover:
- ✅ Valid age extraction (7 tests)
- ✅ Invalid age detection (6 tests)
- ✅ Length validation (3 tests)
- ✅ Emotional tone detection (4 tests)
- ✅ Name extraction (3 tests)

**If any fail:** Screenshot the failure and report which test case

---

## 📱 Mobile-Specific Testing

### iOS Testing:
1. Open on iPhone/iPad (Safari or Chrome)
2. Test auto-capitalize works
3. Verify keyboard doesn't cover input
4. Check voice input button works

### Android Testing:
1. Open on Android device
2. Test auto-capitalize suggestions appear
3. Verify textarea expands properly
4. Check no layout shifts

---

## 💡 Interactive Testing Tool

Use the **Interactive Test** section at bottom of `/test-ai-intake.html`:

1. Type your test input in the textarea
2. Click "Test This Input"
3. See instant feedback:
   - ✓ Valid or ✗ Invalid
   - Extracted name and age
   - Emotional tone detected
   - Any clarification messages

**Try these:**
```
age was 'd'  → Should show invalid ✗
age = 5      → Should extract age = "5" ✓
Emma is 5    → Should extract both name and age ✓
```

---

## ⚠️ What to Watch For

### Red Flags (Report These):
- ❌ Invalid age says "Great!" instead of asking for clarification
- ❌ Valid age with = or : doesn't extract
- ❌ AI re-asks for age after you already provided it
- ❌ No auto-capitalize on mobile keyboard
- ❌ Textarea doesn't accept input
- ❌ Validation blocks valid inputs

### Good Signs (Expected):
- ✅ Invalid ages get clear, helpful clarification message
- ✅ All valid age formats extract correctly (is/was/=/: )
- ✅ Name is used naturally throughout conversation
- ✅ Auto-capitalize works on mobile
- ✅ Emotional tone is detected and acknowledged
- ✅ Summary accurately reflects what you shared

---

## 🎯 Complete User Flow Test

**Full journey test (5 minutes):**

1. **Start:** Open app → Begin onboarding
2. **Empathy:** Click "😓 Overwhelmed"
3. **Invalid Test:** Type `age was 'd'`
   - ✅ Should ask for clarification
   - ✅ Allows you to re-enter
4. **Valid Input:** Type `My daughter Emma is 5. She has major meltdowns every morning getting dressed. I'm exhausted and need help making mornings smoother and calmer.`
   - ✅ Detects stressed tone: "I hear that things have been really challenging..."
   - ✅ Uses name: "Thank you for trusting me with Emma's story"
   - ✅ Summary shows: "Emma (5 years old)"
   - ✅ Insights mention: morning transitions, big emotions, exhaustion
5. **Routines:** Check personalized routines
   - ✅ Should say "Here are three routines made for Emma"
   - ✅ Recommends morning-related routine
6. **Paywall:** Review pricing screen
   - ✅ Uses Emma's name in CTA
   - ✅ Shows "No credit card required" prominently
   - ✅ Pricing: Starter $19, Core $69, Pro Plus $229

**Time to complete:** ~3-4 minutes  
**If all ✅:** Bugs are fixed! 🎉  
**If any ❌:** Note which step and what happened

---

## 📊 Success Metrics

### Before Fixes:
- ❌ "age was 'd'" accepted as valid
- ❌ "age = 5" didn't extract age
- ❌ No auto-capitalize on mobile
- Test coverage: 18 tests

### After Fixes:
- ✅ All invalid age formats caught
- ✅ All valid age formats extract correctly
- ✅ Auto-capitalize enabled
- ✅ Test coverage: 23 tests
- ✅ 100% pass rate expected

---

## 🔄 If You Find More Bugs

**Report format:**
1. **What you typed:** (exact input)
2. **What happened:** (actual behavior)
3. **What you expected:** (desired behavior)
4. **Screenshot:** (if helpful)

**Example:**
> **Input:** "age is five"  
> **Actual:** Accepted as valid but didn't extract age  
> **Expected:** Should either extract "5" or ask for numeric format  
> **Priority:** Medium

---

## ✅ Sign-Off Checklist

Once you've tested:

- [ ] Invalid ages trigger clarification (tested 3+ variations)
- [ ] Valid ages extract correctly (tested with =, :, was)
- [ ] Auto-capitalize works on mobile
- [ ] Complete user flow works end-to-end
- [ ] Automated tests show 23/23 PASS
- [ ] No re-asking for information already provided
- [ ] Name is used naturally throughout

**When all checked:** Ready for production! 🚀
