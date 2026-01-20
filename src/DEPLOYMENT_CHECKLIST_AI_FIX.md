# 🚀 Deployment Checklist - AI Fix

## ✅ **Pre-Deployment Verification**

### **Code Changes:**
- [x] Updated `/supabase/functions/server/index.tsx`
- [x] Changed model on line 80 (categorize endpoint)
- [x] Changed model on line 228 (converse endpoint)
- [x] Changed model on line 435 (brain endpoint)
- [x] Changed model on line 659 (memory endpoint)
- [x] All models now: `claude-3-sonnet-20240229`

### **Consistency Check:**
- [x] Server code: `claude-3-sonnet-20240229` ✅
- [x] Frontend (`ConversationContext.tsx`): `claude-3-sonnet-20240229` ✅
- [x] Frontend (`outcomeAI.ts`): `claude-3-sonnet-20240229` ✅
- [x] No Claude 3.5 references remaining ✅

### **Documentation:**
- [x] Created `/AI_MODEL_FIX_FINAL.md`
- [x] Created `/URGENT_AI_FIX_SUMMARY.md`
- [x] Created `/VERIFY_AI_FIX.md`
- [x] Created `/AI_404_FIX_COMPLETE.md`
- [x] Updated `/CLAUDE_MODEL_QUICK_REF.md`

---

## 🚀 **Deployment Steps**

### **1. Pre-Deploy:**
- [ ] Commit changes with clear message
  ```bash
  git commit -m "Fix: Switch AI model from Claude 3.5 to Claude 3 Sonnet (resolves 404 errors)"
  ```
- [ ] Push to repository
- [ ] Verify CI/CD passes (if applicable)

### **2. Deploy:**
- [ ] Deploy to production
- [ ] Wait for deployment to complete
- [ ] Verify server restarts successfully
- [ ] Check deployment logs for errors

### **3. Initial Verification (First 5 minutes):**
- [ ] Open app in browser
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Open DevTools Console
- [ ] Click "Ask Aminy 💬" FAB
- [ ] Chat overlay opens smoothly
- [ ] Type test message: "Hi Aminy!"
- [ ] Send message
- [ ] Check console for POST request
- [ ] Verify NO 404 errors
- [ ] Wait for typing indicator (3 dots)
- [ ] Verify AI response appears
- [ ] Check response quality

### **4. Extended Testing (First 15 minutes):**
- [ ] Test on Dashboard screen
- [ ] Test on Jr screen
- [ ] Test on Shop screen
- [ ] Test on Hub screen
- [ ] Test on Coverage screen
- [ ] Verify module-specific placeholders
- [ ] Test smart cues (wait 3+ seconds)
- [ ] Test multiple messages in conversation
- [ ] Test memory/context awareness
- [ ] Test on mobile viewport
- [ ] Test on desktop viewport

### **5. Console Monitoring:**
- [ ] No 404 errors
- [ ] No 503 errors
- [ ] POST requests return 200 OK
- [ ] Response times 2-5 seconds
- [ ] No "not_found_error" messages
- [ ] No API key errors
- [ ] Clean console output

---

## 🧪 **Testing Scenarios**

### **Test 1: Basic Chat**
```
Action: Type "Hi Aminy!" and send
Expected: Warm greeting response
Time: 2-4 seconds
```

### **Test 2: Module Context (Jr Screen)**
```
Action: On Jr screen, ask "What should we do today?"
Expected: Jr-specific activity recommendations
Time: 2-4 seconds
```

### **Test 3: Task Planning**
```
Action: Type "I need to schedule doctor appointment and get groceries"
Expected: Categorized tasks with priorities
Time: 3-5 seconds
```

### **Test 4: Memory**
```
Action: Ask "What did we talk about earlier?"
Expected: Reference to previous conversation
Time: 2-4 seconds
```

### **Test 5: Smart Cue**
```
Action: Stay on Dashboard for 3+ seconds
Expected: Smart cue appears above FAB
Behavior: Click cue opens chat with context
```

---

## ✅ **Success Criteria**

### **Must Have (Critical):**
- [ ] ✅ Chat opens without errors
- [ ] ✅ AI responds to messages
- [ ] ✅ No 404 errors in console
- [ ] ✅ Response time < 10 seconds
- [ ] ✅ Typing indicator works
- [ ] ✅ Messages appear correctly

### **Should Have (Important):**
- [ ] ✅ Smart cues appear
- [ ] ✅ Module context works
- [ ] ✅ Memory/context awareness
- [ ] ✅ Response quality high
- [ ] ✅ Smooth animations
- [ ] ✅ Mobile responsive

### **Nice to Have (Optional):**
- [ ] Response time < 5 seconds
- [ ] Perfect context awareness
- [ ] Proactive suggestions accurate
- [ ] Zero console warnings

---

## 🚨 **Rollback Triggers**

### **Immediate Rollback If:**
- ❌ Still getting 404 errors
- ❌ No AI responses at all
- ❌ Errors on every request
- ❌ Server crashes
- ❌ Critical functionality broken

### **Consider Rollback If:**
- ⚠️ Response time > 15 seconds
- ⚠️ Error rate > 10%
- ⚠️ Poor response quality
- ⚠️ User complaints

### **Monitor But Don't Rollback:**
- ℹ️ Occasional slow responses
- ℹ️ Minor console warnings
- ℹ️ Edge case errors

---

## 🔄 **Rollback Plan**

### **Option 1: Revert to Previous Code**
```bash
git revert HEAD
git push
# Redeploy previous version
```

### **Option 2: Try Different Model**
```typescript
// In /supabase/functions/server/index.tsx
// Change to faster model:
model: 'claude-3-haiku-20240307'

// Or more powerful:
model: 'claude-3-opus-20240229'
```

### **Option 3: Debug API Access**
```bash
# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

---

## 📊 **Monitoring (First 24 Hours)**

### **Check Every Hour:**
- [ ] Console for errors
- [ ] Response times
- [ ] Error rate
- [ ] User feedback
- [ ] Server logs

### **Key Metrics:**
- **Success Rate:** Should be > 95%
- **Response Time:** Should average 2-5 seconds
- **Error Rate:** Should be < 5%
- **User Satisfaction:** No complaints

### **Log What You See:**
```
Hour 1: ✅ No errors, avg 3s response
Hour 2: ✅ No errors, avg 3.2s response
Hour 3: ⚠️ 1 timeout, avg 3.5s response
Hour 4: ✅ No errors, avg 2.8s response
...
```

---

## 📞 **Escalation Path**

### **If Issues Persist:**

**Step 1:** Check deployment
- Verify code deployed correctly
- Check server logs
- Verify environment variables

**Step 2:** Check API
- Test API key validity
- Check Anthropic status page
- Verify quota/limits

**Step 3:** Debug
- Enable detailed logging
- Test with curl
- Check network tab

**Step 4:** Rollback or Hotfix
- Revert if critical
- Hotfix if quick solution available
- Escalate if needed

---

## ✅ **Post-Deployment Checklist**

### **Immediate (0-1 hour):**
- [ ] All tests pass
- [ ] No critical errors
- [ ] Basic functionality works
- [ ] Console clean
- [ ] Performance acceptable

### **Short-term (1-24 hours):**
- [ ] No user complaints
- [ ] Metrics stable
- [ ] Error rate low
- [ ] Response quality good
- [ ] No regressions

### **Long-term (1-7 days):**
- [ ] Consistent performance
- [ ] User satisfaction high
- [ ] No unexpected issues
- [ ] Consider optimizations
- [ ] Document lessons learned

---

## 📋 **Sign-Off**

### **Technical Lead:**
- [ ] Code reviewed
- [ ] Changes approved
- [ ] Ready to deploy

### **QA:**
- [ ] Test plan reviewed
- [ ] Success criteria defined
- [ ] Monitoring plan ready

### **Deployment:**
- [ ] All checks passed
- [ ] Deployed successfully
- [ ] Initial tests passed
- [ ] Monitoring active

---

## 🎉 **Success Indicators**

When you see these, the fix is working:

1. ✅ Chat opens smoothly
2. ✅ "Hi Aminy!" gets intelligent response
3. ✅ Console shows `200 OK` not `404`
4. ✅ Smart cues appear contextually
5. ✅ Module placeholders work
6. ✅ No error messages
7. ✅ Typing indicator shows
8. ✅ Responses in 2-4 seconds

---

## 📝 **Deployment Log Template**

```
=== AI Model Fix Deployment ===
Date: [Date]
Time: [Time]
Deployed by: [Name]

Pre-Deploy Status:
- Code committed: ✅
- Tests passed: ✅
- Documentation: ✅

Deployment:
- Started: [Time]
- Completed: [Time]
- Duration: [Minutes]
- Issues: [None/List]

Post-Deploy Testing:
- Basic chat: ✅
- Module context: ✅
- Smart cues: ✅
- Console errors: None
- Response time: 3.2s avg

Result: ✅ Success / ❌ Rolled back

Notes:
[Any observations]
```

---

**✅ Ready to deploy! Follow this checklist for a smooth rollout.**
