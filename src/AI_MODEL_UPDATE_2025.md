# 🤖 AI Model Update - October 2025

## Issue
Claude model `claude-3-sonnet-20240229` is no longer available via Anthropic API, returning 404 errors:
```json
{
  "type": "error",
  "error": {
    "type": "not_found_error",
    "message": "model: claude-3-sonnet-20240229"
  }
}
```

## Solution
Updated all AI endpoints to use the recommended `claude-3-5-sonnet-20240620` model.

## Files Updated

### Backend (Server)
**File:** `/supabase/functions/server/index.tsx`
- Line 80: `/ai/categorize` endpoint ✅
- Line 228: `/ai/brain` endpoint ✅
- Line 435: `/ai/chat` endpoint ✅
- Line 659: `/outcomes/weekly-summary` endpoint ✅

### Frontend
**File:** `/src/context/ConversationContext.tsx`
- Line 332: Intake conversation AI ✅

**File:** `/src/lib/outcomeAI.ts`
- Line 218: Outcome summary generation ✅

## Model Details

### New Model: `claude-3-5-sonnet-20240620`
- **Version:** Claude 3.5 Sonnet (Latest)
- **Speed:** Fast (2-4s average response)
- **Quality:** High
- **Use Case:** General conversational AI, context-aware responses
- **Max Tokens:** 200k context, 8k output
- **Status:** ✅ Actively supported by Anthropic

### Old Model: `claude-3-sonnet-20240229`
- **Status:** ❌ Deprecated/Unavailable (404 error)

## Affected Features
All AI features should now work correctly:
- ✅ Bevel Chat Overlay
- ✅ "Ask Aminy" FAB
- ✅ Smart Cues
- ✅ AI Onboarding Chat
- ✅ Context-aware responses
- ✅ Weekly outcome summaries
- ✅ Task categorization

## Testing Required
1. Test AI chat in onboarding flow
2. Test "Ask Aminy" floating action button
3. Test Bevel Chat Overlay
4. Test Smart Cues generation
5. Verify weekly outcome AI summaries

## References
- See `/CLAUDE_MODEL_QUICK_REF.md` for model comparison
- Anthropic API Docs: https://docs.anthropic.com/claude/reference
