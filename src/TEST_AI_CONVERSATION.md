# Test AI Conversation Intelligence

## Quick Test Guide

### Setup (if not done yet)
1. Add OpenAI API key to `.env`:
   ```
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```
2. Restart dev server

### Test Scenarios

#### Test 1: Invalid Name Input
1. Start onboarding
2. Click "Yes, let's go!"
3. When asked for name, type: **"df"**
4. **Expected:** AI says something like:
   - "I want to make sure I get this right! What's your little one's name?"
   - OR "Hmm, that doesn't look like a name. What should I call your child?"
5. Try again with: **"123"**
6. **Expected:** Different response than last time
7. Finally type: **"Emma"**
8. **Expected:** AI smoothly asks for age with natural language

#### Test 2: Invalid Age Input
1. After giving valid name
2. When asked for age, type: **"hjig"**
3. **Expected:** AI clarifies naturally:
   - "Got it! Just to confirm - how old is Emma? You can just type the number."
   - OR "Let me make sure I understand - what's Emma's age in years?"
4. Try: **"50"** (out of range)
5. **Expected:** Different clarification than before
6. Try: **"abc"**
7. **Expected:** Yet another variation
8. Finally type: **"5"**
9. **Expected:** AI transitions to main story question naturally

#### Test 3: Repetition Check
1. Complete onboarding once
2. Start fresh onboarding
3. Make same mistakes ("df" for name, "xyz" for age)
4. **Expected:** You should see DIFFERENT responses than first time
   - This proves it's real AI, not templates

### What to Look For

✅ **GOOD SIGNS:**
- Responses are different every time
- AI references the child's name naturally
- Tone feels warm and conversational  
- "Thinking..." indicator appears briefly
- Console shows no API errors

❌ **BAD SIGNS (means API key not working):**
- Same exact responses every time
- Generic fallback messages
- Console warning: "OpenAI API key not configured"

### Check Console

Open browser DevTools (F12) → Console tab

**If AI is working:**
```
(No warnings about API key)
```

**If using fallback:**
```
⚠️ OpenAI API key not configured - using smart fallback responses
```

### Compare: AI vs Fallback

| Aspect | Real AI (GPT) | Smart Fallback |
|--------|---------------|----------------|
| **Variety** | Infinite variations | ~5-7 pre-written options |
| **Context** | Understands full conversation | Basic pattern matching |
| **Natural** | Like texting a real person | Good but slightly templated |
| **Cost** | ~$0.02 per onboarding | Free |
| **Requires** | OpenAI API key | Nothing |

### Quick Test Commands

**Test with AI (if configured):**
```bash
# Make sure .env has VITE_OPENAI_API_KEY
npm run dev
```

**Test without AI (fallback mode):**
```bash
# Temporarily rename .env
mv .env .env.backup
npm run dev
# Then rename back
mv .env.backup .env
```

### Expected Conversation Flow

```
🤖 Aminy: Hi! I'm Aminy... Ready?

👤 You: Yes, let's go!

🤖 Aminy: Perfect! Let's start - what's your child's first name?

👤 You: df

🤖 Aminy: I want to make sure I get this right! What's your little one's name?

👤 You: Emma

🤖 Aminy: Emma! What a lovely name. And how old is she?

👤 You: xyz

🤖 Aminy: Got it! Just to confirm - how old is Emma in years? You can just type the number, like 3 or 5.

👤 You: 5

🤖 Aminy: Perfect! So Emma is 5 - such a wonderful age. Now tell me about a typical day with her. What's going well, and what feels challenging?
```

Notice:
- **Never repeats phrasing**
- **References "Emma" naturally**
- **Flows like real conversation**
- **Warm and professional tone**

### Troubleshooting

**Problem: Getting same responses every time**
- Check `.env` file exists in project root
- Verify `VITE_OPENAI_API_KEY=sk-...` (starts with "sk-")
- Restart dev server after adding key
- Check browser console for warnings

**Problem: API errors in console**
- Verify API key is valid on platform.openai.com
- Check OpenAI account has credits
- Verify no rate limiting (wait 1 minute, try again)

**Problem: "Thinking..." never finishes**
- Check network tab for failed requests
- Verify API key in request headers
- Check CORS (shouldn't be issue with OpenAI)

### Success Criteria

You know AI is working when:
1. ✅ Every response is unique and natural
2. ✅ Child's name is referenced appropriately  
3. ✅ Invalid input gets smart clarification
4. ✅ No repetitive phrasing
5. ✅ Feels like ChatGPT quality

If you see these, **congrats - you have real AI conversation working!** 🎉
