# iOS Safari PWA Test Checklist

This checklist covers testing Aminy as a PWA on iOS Safari, with special attention to push notifications and common iOS-specific issues.

---

## Test Environment Setup

### Required Devices
- [ ] iPhone (iOS 16.4+ required for push notifications)
- [ ] iPad (optional, for tablet layout testing)

### iOS Version Requirements
| Feature | Minimum iOS Version |
|---------|---------------------|
| Basic PWA | iOS 11.3+ |
| Web Push Notifications | **iOS 16.4+** |
| Add to Home Screen | iOS 11.3+ |
| Service Worker | iOS 11.3+ |
| Standalone Mode | iOS 11.3+ |

### How to Check iOS Version
**Settings → General → About → iOS Version**

---

## Part 1: Basic PWA Installation

### 1.1 Add to Home Screen
- [ ] Open Safari and navigate to https://aminy.app
- [ ] Tap the **Share** button (square with arrow)
- [ ] Scroll down and tap **Add to Home Screen**
- [ ] Verify app name is "Aminy"
- [ ] Verify icon displays correctly (not generic Safari icon)
- [ ] Tap **Add**
- [ ] Find Aminy on home screen

### 1.2 Standalone Mode
- [ ] Launch app from home screen icon
- [ ] Verify no Safari browser UI (no address bar)
- [ ] Verify status bar color matches app theme
- [ ] Verify app fills the screen properly (no white bars)

### 1.3 Splash Screen
- [ ] Cold launch the app (force quit first)
- [ ] Verify splash screen appears with Aminy branding
- [ ] Verify no white flash before content loads

---

## Part 2: Push Notifications (iOS 16.4+ Only)

### 2.1 Permission Request
- [ ] Navigate to Settings or Profile page
- [ ] Tap "Enable Notifications"
- [ ] iOS permission prompt should appear
- [ ] Select **Allow**
- [ ] Verify subscription is saved (check Supabase)

### 2.2 Test Notification Delivery

**Prerequisites:**
- App must be added to Home Screen (not in Safari)
- Notification permission must be granted
- App should be in background

Test steps:
- [ ] Put app in background (press home or swipe up)
- [ ] Trigger test notification from Supabase dashboard or API:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/push-notifications/test \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'
```
- [ ] Notification should appear on device
- [ ] Tap notification
- [ ] App should open to correct screen

### 2.3 Notification Content
- [ ] Title displays correctly
- [ ] Body text displays correctly
- [ ] App icon shows in notification
- [ ] Notification groups properly (if multiple)

### 2.4 Notification Settings
- [ ] Go to iOS Settings → Notifications → Aminy
- [ ] Verify app appears in notification settings
- [ ] Toggle notifications off, verify no notifications received
- [ ] Toggle back on, verify notifications resume

---

## Part 3: Offline Functionality

### 3.1 Cache Verification
- [ ] Load app while online
- [ ] Navigate through main sections (Care, Plan, Reports)
- [ ] Enable Airplane Mode
- [ ] Verify cached pages load
- [ ] Verify offline indicator appears (if implemented)
- [ ] Verify graceful error messages for unavailable features

### 3.2 Offline Form Submission
- [ ] Start filling out a form while online
- [ ] Enable Airplane Mode
- [ ] Submit form
- [ ] Verify queued message or error
- [ ] Disable Airplane Mode
- [ ] Verify form submits (if background sync implemented)

---

## Part 4: iOS-Specific UI Issues

### 4.1 Safe Areas
- [ ] Verify content doesn't overlap notch (iPhone X+)
- [ ] Verify content doesn't overlap home indicator
- [ ] Check landscape orientation (if supported)
- [ ] Verify modals/drawers respect safe areas

### 4.2 Scroll Behavior
- [ ] Pull-to-refresh works if implemented
- [ ] No rubber-band scrolling issues
- [ ] Scroll position maintained on navigation
- [ ] Momentum scrolling feels native

### 4.3 Touch Targets
- [ ] All buttons are at least 44x44pt
- [ ] No accidental touches on adjacent elements
- [ ] Tap highlighting/feedback works

### 4.4 Input Handling
- [ ] Keyboard doesn't cover input fields
- [ ] Input fields don't zoom unexpectedly (use 16px+ font)
- [ ] Date pickers use native iOS picker
- [ ] Form autocomplete works

### 4.5 Status Bar
- [ ] Status bar text is readable (light/dark based on background)
- [ ] Time and battery visible
- [ ] No overlap with content

---

## Part 5: Performance

### 5.1 Launch Time
- [ ] Cold start under 3 seconds
- [ ] Warm start under 1 second
- [ ] No visible loading spinner for cached content

### 5.2 Animations
- [ ] All animations run at 60fps
- [ ] No jank during scrolling
- [ ] Modal transitions are smooth
- [ ] No flash of unstyled content

### 5.3 Memory
- [ ] App doesn't get killed frequently in background
- [ ] No crashes during normal use
- [ ] Large image galleries load progressively

---

## Part 6: Known iOS Safari Limitations

### Things That Don't Work on iOS Safari PWA

| Feature | Status | Workaround |
|---------|--------|------------|
| Background Sync | ❌ Not supported | Queue and retry on next open |
| Persistent Storage | ⚠️ 7-day limit | Sync to server frequently |
| Push from Safari | ❌ Only from Home Screen | Prompt to install PWA |
| Web Bluetooth | ❌ Not supported | None |
| Web NFC | ❌ Not supported | None |
| File System Access | ❌ Not supported | Use traditional file upload |
| Badging API | ❌ Not supported | None (badge on icon) |

### iOS Safari Quirks to Test

- [ ] **Double-tap zoom disabled** - Verify viewport meta tag
- [ ] **300ms tap delay removed** - Touch response is immediate
- [ ] **Overscroll behavior** - No unwanted bouncing
- [ ] **Position fixed** - Elements stay fixed during scroll
- [ ] **100vh issue** - Test if full viewport height works correctly

---

## Part 7: Push Notification Troubleshooting

### Issue: Permission prompt doesn't appear
**Checklist:**
- [ ] iOS version is 16.4+
- [ ] App is installed to Home Screen (not in Safari)
- [ ] Haven't denied permission previously

**Fix for previously denied:**
1. Go to iOS Settings → Aminy
2. Enable Notifications

### Issue: Notifications don't arrive
**Checklist:**
- [ ] Permission is granted (check iOS Settings)
- [ ] Subscription exists in Supabase `push_subscriptions` table
- [ ] VAPID keys are correct
- [ ] Focus Mode/Do Not Disturb is off
- [ ] App is in background, not force quit

**Debug steps:**
1. Check Edge Function logs in Supabase
2. Verify subscription endpoint is valid
3. Test with simple notification first

### Issue: Notification appears but tap doesn't open app
**Checklist:**
- [ ] `data.url` is set correctly in notification payload
- [ ] Service worker `notificationclick` handler works
- [ ] App is installed (not in Safari)

---

## Part 8: Final Sign-Off

### Tester Information
- **Device**: ________________________
- **iOS Version**: ________________________
- **Test Date**: ________________________
- **Tester Name**: ________________________

### Summary

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| PWA Installation | ☐ | ☐ | ☐ |
| Push Notifications | ☐ | ☐ | ☐ |
| Offline Support | ☐ | ☐ | ☐ |
| UI/UX | ☐ | ☐ | ☐ |
| Performance | ☐ | ☐ | ☐ |

### Critical Issues Found
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Notes
_________________________________________________
_________________________________________________
_________________________________________________

---

## Quick Reference: iOS PWA Manifest Requirements

Ensure `manifest.json` has:
```json
{
  "name": "Aminy",
  "short_name": "Aminy",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#577590",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

And in HTML `<head>`:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Aminy">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
