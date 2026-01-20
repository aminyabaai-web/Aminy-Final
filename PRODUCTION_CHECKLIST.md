# Aminy MVP - Production Launch Checklist

## Pre-Launch Checklist

### 1. Environment & Secrets Setup
- [ ] **Supabase Project Created** (see SUPABASE_SETUP.md)
  - [ ] Database tables created
  - [ ] Row Level Security policies configured
  - [ ] Edge Functions deployed
  - [ ] Secrets configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)

- [ ] **Stripe Account Ready** (see STRIPE_SETUP.md)
  - [ ] Products and prices created
  - [ ] Webhook endpoint configured
  - [ ] Test mode verified
  - [ ] Production keys obtained (when ready)

- [ ] **Daily.co Account Ready**
  - [ ] API key obtained
  - [ ] Domain configured
  - [ ] HIPAA compliance verified (if needed)

- [ ] **AI Provider Configured**
  - [ ] API key obtained (Anthropic or OpenAI)
  - [ ] Rate limits understood
  - [ ] Fallback responses tested

### 2. Security Checklist
- [ ] All API keys in environment variables (never in code)
- [ ] Supabase RLS policies enabled
- [ ] CORS configured correctly
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Sensitive routes protected
- [ ] Input validation on all forms
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### 3. Performance Checklist
- [ ] Bundle size < 500KB (gzipped)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Images optimized (WebP where possible)
- [ ] Lazy loading implemented
- [ ] Code splitting working
- [ ] Caching headers configured

### 4. Testing Checklist
- [ ] Critical user flows tested manually:
  - [ ] Onboarding (create account → complete profile)
  - [ ] AI Chat (send message → receive response)
  - [ ] Subscription (select plan → payment → confirmation)
  - [ ] Telehealth (schedule → join video call)
  - [ ] Provider booking (search → book → confirm)
- [ ] Edge cases tested:
  - [ ] Empty states
  - [ ] Error states
  - [ ] Loading states
  - [ ] Offline behavior
- [ ] Browser testing:
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Chrome Mobile (Android)
- [ ] Accessibility:
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible
  - [ ] Color contrast passes WCAG AA

### 5. Analytics & Monitoring
- [ ] Google Analytics 4 configured
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] User session recording (LogRocket) optional
- [ ] Conversion funnel tracking set up

### 6. Legal & Compliance
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Telehealth consent forms reviewed by legal
- [ ] HIPAA compliance verified (if storing health data)
- [ ] Cookie consent banner (if needed for region)

### 7. Content & Copy
- [ ] All placeholder text replaced
- [ ] Error messages are user-friendly
- [ ] Empty states have helpful copy
- [ ] Pricing is accurate
- [ ] Feature descriptions are accurate

### 8. Email & Notifications
- [ ] Email provider configured (SendGrid/Resend)
- [ ] Welcome email template ready
- [ ] Password reset email working
- [ ] Session reminder emails working
- [ ] Email digest template ready

### 9. Support & Help
- [ ] Help/FAQ content created
- [ ] Support email configured (support@aminy.com)
- [ ] In-app help documentation
- [ ] Contact form working

### 10. Deployment
- [ ] Production environment configured
- [ ] Environment variables set in hosting platform
- [ ] Domain configured and SSL active
- [ ] CDN configured (if needed)
- [ ] Database backups enabled
- [ ] Monitoring alerts configured

---

## Launch Day Checklist

### Before Going Live
- [ ] Final smoke test of critical flows
- [ ] Team notified and on standby
- [ ] Rollback plan documented
- [ ] Support team briefed

### After Going Live
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Watch for user feedback

---

## Post-Launch (First Week)

- [ ] Daily error log review
- [ ] User feedback collection
- [ ] Performance baseline established
- [ ] First bug fixes deployed
- [ ] Analytics reviewed

---

## Key Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Onboarding Completion | > 70% | Analytics funnel |
| 7-Day Activation | 50-60% | Users who return within 7 days |
| AI Chat Usage | 5-10 msgs/user/week | Event tracking |
| Subscription Conversion | > 5% of free users | Stripe + Analytics |
| Session NPS | > 50 | Post-session survey |
| App Crashes | < 0.1% | Sentry |
| API Error Rate | < 1% | Monitoring |

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Technical Lead | [Your contact] |
| Supabase Support | support@supabase.com |
| Stripe Support | support@stripe.com |
| Daily.co Support | support@daily.co |
