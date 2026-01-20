# Server Integration Guide

## Quick Integration Steps

### 1. Add New Routes to Main Server

Open `/supabase/functions/server/index.tsx` and add near the end of the file (before `Deno.serve` if it exists):

```typescript
// Import new routes
import newRoutes from './new-routes.tsx';

// Mount new routes
app.route('/make-server-8a022548', newRoutes);
```

### 2. Start Server (if not already started)

At the very end of `/supabase/functions/server/index.tsx`, add:

```typescript
// Start server
Deno.serve(app.fetch);
```

### 3. Environment Variables

Ensure these are set in your Supabase project:

```
ANTHROPIC_API_KEY=<already set>
SUPABASE_URL=<already set>
SUPABASE_ANON_KEY=<already set>
SUPABASE_SERVICE_ROLE_KEY=<already set>
VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from same command>
SENDGRID_API_KEY=<optional, for email digest>
```

### 4. Test New Endpoints

```bash
# Test conversation
curl -X POST https://<project-id>.supabase.co/functions/v1/make-server-8a022548/conversation/save \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","threadKey":"user_test_thread","message":{"role":"user","content":"Hello"}}'

# Test analytics
curl -X POST https://<project-id>.supabase.co/functions/v1/make-server-8a022548/analytics/track \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","event":"test_event","timestamp":"2025-10-28T12:00:00Z"}'
```

## New Endpoints Available

### Conversation
- `POST /conversation/load`
- `POST /conversation/save`
- `POST /ai/chat` (with streaming)
- `POST /ai/summarize`

### Notifications
- `POST /notifications/subscribe`
- `GET /notifications/vapid-key`
- `POST /notifications/weekly-digest`

### Analytics
- `POST /analytics/track`
- `POST /analytics/module-usage`
- `GET /analytics/summary`
- `GET /analytics/cohort/export`

### Emotion Tracking
- `GET /emotion/history`
- `POST /emotion/save`

### Wins Journal
- `GET /wins/load`
- `POST /wins/save`
- `POST /wins/share`
- `POST /wins/export`

### Privacy & Data
- `GET /privacy/settings`
- `POST /privacy/update`
- `GET /privacy/audit-log`
- `POST /privacy/export`
- `POST /privacy/delete`

## Frontend Integration

### Enable Features in App.tsx

Add these imports:

```typescript
import { registerServiceWorker } from './lib/notification-system';
import { trackEvent } from './lib/analytics-tracker';
import { NotificationCenter } from './components/NotificationCenter';
import { StreamingAIChat } from './components/StreamingAIChat';
import { EmotionTracker } from './components/EmotionTracker';
import { WinsJournal } from './components/WinsJournal';
import { TrustAndPrivacy } from './components/TrustAndPrivacy';
import { AdminDashboard } from './components/AdminDashboard';
```

Initialize on app load:

```typescript
useEffect(() => {
  // Register service worker
  registerServiceWorker();
  
  // Track app open
  trackEvent('app_opened', { platform: 'web' });
}, []);
```

Add to navigation:

```typescript
// In your More menu or Settings
<MenuItem onClick={() => navigate('/notifications')}>
  <NotificationCenter />
</MenuItem>

<MenuItem onClick={() => navigate('/privacy')}>
  <TrustAndPrivacy userId={userId} />
</MenuItem>

<MenuItem onClick={() => navigate('/wins')}>
  <WinsJournal userId={userId} />
</MenuItem>

<MenuItem onClick={() => navigate('/emotions')}>
  <EmotionTracker userId={userId} />
</MenuItem>

{userRole === 'admin' && (
  <MenuItem onClick={() => navigate('/admin')}>
    <AdminDashboard />
  </MenuItem>
)}
```

## Optional: Weekly Digest Cron

Create Supabase Edge Function cron job:

```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT 
    net.http_post(
      url := 'https://<project-id>.supabase.co/functions/v1/make-server-8a022548/notifications/weekly-digest',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service-role-key>"}'::jsonb,
      body := json_build_object('userId', id)::jsonb
    )
  FROM auth.users;
  $$
);
```

## Troubleshooting

### Service Worker Not Registering
- Check that `/sw.js` exists in public directory
- Ensure HTTPS (required for service workers)
- Check browser console for errors

### Push Notifications Not Working
- Generate VAPID keys: `npx web-push generate-vapid-keys`
- Set environment variables
- Request permission after user interaction (not on load)

### Analytics Not Tracking
- Check network tab for failed requests
- Verify `publicAnonKey` is set in `/utils/supabase/info.tsx`
- Ensure user is authenticated (userId exists)

### AI Chat Streaming Fails
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check Anthropic API quota/limits
- Try non-streaming mode first (`stream: false`)

## Performance Tips

1. **Lazy Load Heavy Components**:
   ```typescript
   const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
   const EmotionTracker = lazy(() => import('./components/EmotionTracker'));
   ```

2. **Debounce Analytics**:
   ```typescript
   import { debounce } from 'lodash';
   const debouncedTrack = debounce(trackEvent, 1000);
   ```

3. **Cache Conversation History**:
   ```typescript
   // Already implemented in conversation engine
   // Uses last 10 messages for context
   ```

4. **Batch Notification Reads**:
   ```typescript
   // Mark multiple as read at once
   await Promise.all(notifIds.map(id => markAsRead(id)));
   ```

## Security Checklist

- [ ] VAPID keys are environment variables (not hardcoded)
- [ ] Service worker only registers on HTTPS
- [ ] User authentication checked on all backend routes
- [ ] PII is redacted in analytics events
- [ ] Privacy settings respected (Enhanced Privacy Mode)
- [ ] Data deletion is permanent and immediate
- [ ] Audit log tracks all data access

## Next Steps

1. Test all new endpoints locally
2. Deploy to Supabase staging environment
3. Run through Beta QA checklist
4. Monitor analytics dashboard for usage patterns
5. Iterate based on user feedback

---

**Status**: Ready for Integration ✅  
**Estimated Integration Time**: 30 minutes  
**Dependencies**: All files created, routes ready to mount
