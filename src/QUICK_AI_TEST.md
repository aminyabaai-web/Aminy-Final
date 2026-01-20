# ⚡ Quick AI Chat Test Guide

## 🧪 **How to Test the Fix**

### **1. Open Aminy App**
- Navigate to any screen (Dashboard, Jr, Shop, Hub, etc.)

### **2. Click "Ask Aminy 💬" FAB**
- Fixed bottom-right floating button
- Should open bottom-sheet chat overlay

### **3. Send a Test Message**

Try these sample messages:

**Simple Test:**
```
Hi Aminy!
```
**Expected Response:** Warm greeting acknowledging you

**Context Test (on Jr screen):**
```
What activities should I do today?
```
**Expected Response:** Jr-specific recommendations

**Planning Test:**
```
I need to schedule a doctor appointment, prepare for the IEP meeting, and get groceries today.
```
**Expected Response:** Categorized tasks with priorities

### **4. Check Console**
Open browser DevTools (F12) and check Console tab:

**✅ Success Indicators:**
- No 404 errors
- No "not_found_error" messages
- Typing indicator shows (3 pulsing dots)
- AI response appears in chat

**❌ Failure Indicators:**
- Red error: "AI service error: 404"
- Red error: "model: claude-3-5-sonnet-20241022"
- No typing indicator
- Empty response

---

## 🎯 **What Was Fixed**

### **Problem:**
```javascript
model: 'claude-3-5-sonnet-20241022'  // ❌ Invalid model name
```

### **Solution:**
```javascript
model: 'claude-3-5-sonnet-20240620'  // ✅ Valid model name
```

### **Files Updated:**
- `/supabase/functions/server/index.tsx` (4 instances)

---

## 📊 **Expected Behavior**

### **Chat Flow:**

1. **User types message** → Input appears in chat
2. **User hits send** → Message sent to server
3. **Typing indicator shows** → 3 pulsing dots appear
4. **AI responds** → Response appears in slate-50 bubble
5. **Scroll to bottom** → Auto-scrolls to new message

### **Timing:**

- **Fast messages** (simple): 1-3 seconds
- **Complex messages** (planning): 3-5 seconds
- **Timeout** (if > 10s): Check network/API key

---

## 🚨 **Troubleshooting**

### **Still seeing 404 errors?**

1. **Check deployment:**
   - Ensure server code is deployed
   - Server endpoint: `/make-server-8a022548/ai/brain`

2. **Check API key:**
   - `ANTHROPIC_API_KEY` must be set
   - Valid Anthropic API key required

3. **Check network:**
   - Open DevTools → Network tab
   - Look for POST to `/ai/brain`
   - Check request/response

### **Chat opens but no response?**

1. **Check console** for errors
2. **Check typing indicator** (should show)
3. **Check network request** (should return 200)
4. **Check API quota** (Anthropic usage limits)

### **Wrong model error?**

If you see a different model error, valid options are:
- `claude-3-5-sonnet-20240620` (recommended)
- `claude-3-opus-20240229` (more powerful)
- `claude-3-haiku-20240307` (faster)

---

## ✅ **Success Checklist**

After testing, verify:

- [ ] Chat overlay opens with spring animation
- [ ] Messages send without errors
- [ ] Typing indicator shows
- [ ] AI responses appear
- [ ] No 404 errors in console
- [ ] Module-specific placeholders work
- [ ] Smart cues appear (after 3s)
- [ ] FAB pulse works (if hasInsight={true})

---

## 📱 **Test Across Modules**

Test chat on different screens to verify module awareness:

| **Module** | **Expected Placeholder** |
|------------|-------------------------|
| Dashboard | "Ask Aminy anything..." |
| Jr | "Ask about Jr routines, activities, or progress..." |
| Shop | "Ask about tools, resources, or recommendations..." |
| Hub | "Ask about community, stories, or support..." |
| Coverage | "Ask about insurance, benefits, or coverage..." |
| Plan | "Ask about your plan, routines, or goals..." |

---

**🎉 If all tests pass, the AI fix is working correctly!**
