# ✅ Verify AI Fix - Quick Guide

## 🎯 **What Was Fixed**

Changed AI model from Claude 3.5 (broken) → Claude 3 Sonnet (working)

---

## ⚡ **30-Second Test**

1. **Open Aminy app**
2. **Click "Ask Aminy 💬"** (bottom-right floating button)
3. **Type:** `Hi Aminy!`
4. **Click send** (gradient button)
5. **Wait 2-4 seconds**
6. **✅ Expected:** AI response appears
7. **❌ If broken:** Error message or no response

---

## 🔍 **Console Check**

Open browser DevTools (press F12):

### **✅ Success Looks Like:**
```
POST /make-server-8a022548/ai/brain 200 OK
Response received in 2.4s
Using model: claude-3-sonnet-20240229
Message: "Hi! I'm Aminy..."
```

### **❌ Failure Looks Like:**
```
POST /make-server-8a022548/ai/brain 503 Service Unavailable
AI service error: 404
not_found_error
```

---

## 📋 **Full Test Checklist**

### **Basic Chat:**
- [ ] FAB appears (bottom-right, gradient circle)
- [ ] Click FAB → overlay opens (80vh, blurred bg)
- [ ] Type message → input works
- [ ] Send → message appears in chat
- [ ] Wait → typing indicator shows (3 dots)
- [ ] Response → AI message appears
- [ ] No errors → console is clean

### **Smart Cues:**
- [ ] Wait 3+ seconds on any screen
- [ ] Smart cue appears above FAB
- [ ] Cue is contextual to current screen
- [ ] Click cue → chat opens with context

### **Module Context:**
- [ ] Dashboard → placeholder: "Ask Aminy anything..."
- [ ] Jr → placeholder: "Ask about Jr routines..."
- [ ] Shop → placeholder: "Ask about tools..."
- [ ] Hub → placeholder: "Ask about community..."
- [ ] Coverage → placeholder: "Ask about insurance..."

### **Memory & Context:**
- [ ] Ask: "What did we talk about before?"
- [ ] AI should reference past conversations
- [ ] Context awareness works

---

## 🐛 **Troubleshooting**

### **Problem: Still getting 404**
**Cause:** Code not deployed or cached  
**Fix:** 
1. Hard refresh (Ctrl+Shift+R)
2. Clear cache
3. Verify deployment

### **Problem: No response at all**
**Cause:** API key issue  
**Fix:**
1. Check `ANTHROPIC_API_KEY` is set
2. Verify key is valid
3. Test key with curl

### **Problem: Slow responses (>10s)**
**Cause:** Network or API issues  
**Fix:**
1. Check network tab
2. Verify API status
3. Consider switching to Haiku model for speed

### **Problem: Chat doesn't open**
**Cause:** Frontend issue, not API  
**Fix:**
1. Check FAB component loaded
2. Verify overlay component exists
3. Check z-index issues

---

## 📊 **Model Info**

### **Current Model:**
```
Name: Claude 3 Sonnet
Version: 20240229
Speed: 2-4 seconds
Quality: High
Status: ✅ Working
```

### **Previous Model (Broken):**
```
Name: Claude 3.5 Sonnet
Version: 20240620
Speed: N/A
Quality: N/A
Status: ❌ 404 Error
```

---

## ✅ **Success Criteria**

Fix is successful when:
1. ✅ No 404 errors in console
2. ✅ AI responds to messages
3. ✅ Typing indicator works
4. ✅ Smart cues appear
5. ✅ Module context works
6. ✅ Chat overlay smooth
7. ✅ No error messages

---

## 🎯 **Key Files Changed**

**Modified:**
- `/supabase/functions/server/index.tsx` (4 model references)

**Not Modified:**
- Frontend code (already using correct model)
- Components (no changes needed)
- Styles (no changes needed)

---

## 📞 **If Still Broken**

### **Check These:**

1. **Deployment status**
   ```bash
   # Verify server is running
   curl https://{projectId}.supabase.co/functions/v1/make-server-8a022548/health
   # Should return: {"status":"ok"}
   ```

2. **API key validity**
   ```bash
   # Test Anthropic API directly
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
   ```

3. **Network connectivity**
   - Check browser can reach Supabase
   - Verify no CORS errors
   - Check firewall/proxy settings

---

## 🎉 **When Fixed**

You'll know it's working when:
- Chat opens smoothly ✅
- AI responds intelligently ✅
- No errors in console ✅
- Smart cues appear ✅
- Module context works ✅

**Expected experience:** Bevel-level fluid AI chat

---

## 📚 **Related Docs**

- `/AI_MODEL_FIX_FINAL.md` - Detailed fix documentation
- `/URGENT_AI_FIX_SUMMARY.md` - Quick summary
- `/BEVEL_INTEGRATION_GUIDE.md` - Chat features guide
- `/QUICK_AI_TEST.md` - Testing scenarios

---

**✅ Use this guide to verify the AI fix is working correctly!**
