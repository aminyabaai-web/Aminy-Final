# 🤖 Claude Model Quick Reference

## ✅ **Valid Claude 3 Models**

Use these model names when calling Anthropic API:

### **Claude 3.5 Sonnet** (Recommended - October 2024)
```typescript
model: 'claude-3-5-sonnet-20241022'
```
- **Best for:** General use, balanced speed/quality
- **Speed:** Fast (~2-4s)
- **Quality:** High
- **Cost:** Medium
- **Max tokens:** 200k context, 8k output
- **Status:** ✅ CURRENT (as of Oct 2024)

### **Claude 3 Opus** (Most Powerful)
```typescript
model: 'claude-3-opus-20240229'
```
- **Best for:** Complex reasoning, analysis
- **Speed:** Slower (~5-8s)
- **Quality:** Highest
- **Cost:** Highest
- **Max tokens:** 200k context, 4k output

### **Claude 3 Sonnet** (Legacy)
```typescript
model: 'claude-3-sonnet-20240229'
```
- **Best for:** Backward compatibility
- **Speed:** Medium (~3-5s)
- **Quality:** Good
- **Cost:** Medium
- **Max tokens:** 200k context, 4k output

### **Claude 3 Haiku** (Fastest)
```typescript
model: 'claude-3-haiku-20240307'
```
- **Best for:** Simple tasks, quick responses
- **Speed:** Fastest (~1-2s)
- **Quality:** Good
- **Cost:** Lowest
- **Max tokens:** 200k context, 4k output

---

## ❌ **Invalid Model Names**

**DO NOT USE:**
```typescript
❌ 'claude-3-5-sonnet-20240620'  // Deprecated (June 2024)
❌ 'claude-3-sonnet-20240229'    // Deprecated (Feb 2024)
❌ 'claude-3.5-sonnet'           // Missing date
❌ 'claude-sonnet'               // Missing version
❌ 'claude-3-5-sonnet-latest'    // No "latest" tag
```

---

## 📋 **Usage Examples**

### **Basic Request**
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});
```

### **With System Prompt**
```typescript
body: JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1000,
  system: 'You are a helpful assistant.',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})
```

### **Streaming (Not Supported in Make)**
```typescript
// ❌ Streaming not supported in Figma Make
// Use standard messages API instead
```

---

## 🎯 **Choosing the Right Model**

### **Use 3.5 Sonnet (20241022) when:**
- General chat/conversation ✅
- Context-aware responses ✅
- Module-specific placeholders ✅
- Real-time feedback ✅
- **This is our default** ⭐ (Updated Oct 2024)

### **Use Opus (20240229) when:**
- Complex analysis needed
- Multiple steps of reasoning
- Critical decision-making
- Report generation
- Clinical-quality output

### **Use Haiku (20240307) when:**
- Simple acknowledgments
- Quick categorization
- Speed is critical
- Cost optimization
- High-volume requests

### **Use 3 Sonnet (20240229) when:**
- Legacy code compatibility
- Testing/comparison
- Specific bugs with 3.5

---

## 🔧 **Aminy Current Setup**

### **Server (`/supabase/functions/server/index.tsx`):**

| **Endpoint** | **Model** | **Purpose** |
|--------------|-----------|-------------|
| `/ai/categorize` | 3.5 Sonnet | Task orchestration |
| `/ai/converse` | 3.5 Sonnet | General chat |
| `/ai/brain` | 3.5 Sonnet | Context-aware chat |
| `/ai/memory` | 3.5 Sonnet | Memory summaries |

### **Frontend:**

| **File** | **Model** | **Purpose** |
|----------|-----------|-------------|
| `ConversationContext.tsx` | 3 Sonnet | Intake conversation |
| `outcomeAI.ts` | 3 Sonnet | Outcome insights |

---

## 🚨 **Error Handling**

### **404 Not Found**
```json
{
  "type": "error",
  "error": {
    "type": "not_found_error",
    "message": "model: claude-3-5-sonnet-20241022"
  }
}
```
**Fix:** Use valid model name from list above

### **401 Unauthorized**
```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "invalid x-api-key"
  }
}
```
**Fix:** Check `ANTHROPIC_API_KEY` environment variable

### **429 Rate Limit**
```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "rate limit exceeded"
  }
}
```
**Fix:** Implement backoff or upgrade API tier

---

## 📊 **Performance Comparison**

| **Model** | **Avg Response Time** | **Quality** | **Cost (per 1M tokens)** |
|-----------|----------------------|-------------|-------------------------|
| Haiku | 1-2s | Good | $0.25 / $1.25 |
| 3 Sonnet | 3-5s | Good | $3 / $15 |
| 3.5 Sonnet | 2-4s | High | $3 / $15 |
| Opus | 5-8s | Highest | $15 / $75 |

*(Input / Output pricing)*

---

## 🔄 **Migration Guide**

### **From Invalid Model:**
```diff
- model: 'claude-3-5-sonnet-20241022'
+ model: 'claude-3-5-sonnet-20240620'
```

### **From Legacy Model:**
```diff
- model: 'claude-3-sonnet-20240229'
+ model: 'claude-3-5-sonnet-20240620'
```

### **To Faster Model:**
```diff
- model: 'claude-3-5-sonnet-20240620'
+ model: 'claude-3-haiku-20240307'
```

---

## 🎓 **Best Practices**

1. **Always use full model name with date**
   ```typescript
   ✅ 'claude-3-5-sonnet-20240620'
   ❌ 'claude-3.5-sonnet'
   ```

2. **Set appropriate max_tokens**
   ```typescript
   // Chat: 500-1000 tokens
   // Analysis: 1000-2000 tokens
   // Reports: 2000-4000 tokens
   max_tokens: 1000
   ```

3. **Use system prompts for consistency**
   ```typescript
   system: 'You are Aminy, a supportive AI companion...'
   ```

4. **Handle errors gracefully**
   ```typescript
   if (!response.ok) {
     console.log('AI error:', await response.text());
     return fallbackResponse;
   }
   ```

5. **Log for debugging**
   ```typescript
   console.log('Calling Claude with', messages.length, 'messages');
   ```

---

## 📚 **Further Reading**

- [Anthropic API Docs](https://docs.anthropic.com/claude/reference)
- [Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [Pricing](https://www.anthropic.com/api)
- [Rate Limits](https://docs.anthropic.com/claude/reference/rate-limits)

---

**✅ Always use `claude-3-5-sonnet-20241022` for Aminy AI features!**
