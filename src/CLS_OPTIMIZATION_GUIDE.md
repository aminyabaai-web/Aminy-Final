# CLS (Cumulative Layout Shift) Optimization Guide

## Issue
Current CLS score: 0.5194ms (threshold: 0.25ms)
Target: < 0.25ms

## Fixes Implemented

### 1. CSS Optimizations (`/styles/cls-optimizations.css`)
- ✅ Added CSS containment (`contain: layout style paint`) to prevent layout recalculations
- ✅ Reserved minimum heights for dynamic content
- ✅ Fixed scrollbar-induced shifts with `scrollbar-gutter: stable`
- ✅ Optimized font loading with `font-display: swap`
- ✅ Used transform/opacity for animations instead of layout-affecting properties

### 2. Critical CSS Updates (`/styles/critical.css`)
- ✅ Added explicit dimensions for buttons, inputs, images
- ✅ Fixed positioning for modals and overlays
- ✅ Prevented font rendering shifts
- ✅ Added box-sizing to all elements

### 3. Component Updates

#### CoachModeComplete.tsx
- ✅ Added explicit `minHeight` to modal container
- ✅ Added CSS containment to prevent layout shifts
- ✅ Reserved space for dynamic sections (steps, completion)
- ✅ Added loading state to prevent instant appearance shifts

#### App.tsx
- ✅ Wrapped in CLSOptimizer component
- ✅ Added viewport height management

### 4. New Components

#### CLSOptimizer.tsx
- ✅ Manages viewport height on mobile
- ✅ Fixes scrollbar-induced shifts
- ✅ Provides skeleton loaders
- ✅ Image wrapper with dimensions
- ✅ Modal container with fixed positioning

## Key Strategies

### 1. Reserve Space for Dynamic Content
```css
.coach-mode-container {
  min-height: 400px;
  contain: layout;
}
```

### 2. Use CSS Containment
```css
.aminy-card {
  contain: layout style paint;
}
```

### 3. Fixed Positioning for Overlays
```css
[role="dialog"] {
  position: fixed !important;
  inset: 0 !important;
  contain: strict;
}
```

### 4. Transform-Only Animations
```css
/* ✅ Good - Uses transform */
@keyframes zoomIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* ❌ Bad - Affects layout */
@keyframes expand {
  from { height: 0; }
  to { height: 100px; }
}
```

### 5. Explicit Dimensions
```tsx
<div style={{ minHeight: '200px', contain: 'layout' }}>
  {dynamicContent}
</div>
```

### 6. Skeleton Loading States
```tsx
{isLoading ? (
  <SkeletonLoader height="100px" />
) : (
  <ActualContent />
)}
```

## Verification Steps

1. **Run Lighthouse**
   ```bash
   # Check CLS score
   lighthouse https://your-app.com --only-categories=performance
   ```

2. **Use Chrome DevTools**
   - Open DevTools > Performance
   - Record page load
   - Check "Experience" section for layout shifts

3. **Web Vitals Extension**
   - Install Web Vitals Chrome Extension
   - Monitor CLS in real-time

## Common CLS Causes & Fixes

### Font Loading Shifts
❌ Problem: Fonts load after initial render
✅ Fix: Use `font-display: swap` and system font fallbacks

### Image Loading Shifts
❌ Problem: Images appear without reserved space
✅ Fix: Always specify width/height or use aspect-ratio

### Modal/Overlay Shifts
❌ Problem: Modals push content down
✅ Fix: Use `position: fixed` with `contain: strict`

### Animation Shifts
❌ Problem: Animations change element dimensions
✅ Fix: Use only `transform` and `opacity`

### Scrollbar Shifts
❌ Problem: Scrollbar appears/disappears changing width
✅ Fix: Use `scrollbar-gutter: stable`

### Dynamic Content Shifts
❌ Problem: Content loads without reserved space
✅ Fix: Set `min-height` and use skeleton loaders

## Browser-Specific Fixes

### Safari
```css
@supports (-webkit-touch-callout: none) {
  body {
    -webkit-text-size-adjust: 100%;
  }
  html {
    -webkit-overflow-scrolling: touch;
  }
}
```

### Firefox
```css
@-moz-document url-prefix() {
  html {
    scrollbar-gutter: stable;
  }
}
```

### Chrome/Edge
```css
@supports (scrollbar-gutter: stable) {
  html {
    scrollbar-gutter: stable;
  }
}
```

## Performance Best Practices

1. **Always use CSS containment** for components
2. **Reserve space** for dynamic content
3. **Use transform/opacity** for animations
4. **Specify dimensions** for images and media
5. **Fixed positioning** for overlays/modals
6. **Skeleton loaders** during loading states
7. **Font-display: swap** for web fonts
8. **Scrollbar-gutter: stable** to prevent width shifts

## Testing Checklist

- [ ] CLS score < 0.25ms in Lighthouse
- [ ] No layout shifts during page load
- [ ] No shifts when images load
- [ ] No shifts when fonts load
- [ ] No shifts from modal/overlay appearance
- [ ] No shifts from animations
- [ ] No shifts from scrollbar appearance
- [ ] Works on mobile devices
- [ ] Works across browsers (Chrome, Safari, Firefox, Edge)

## Monitoring

### Production Monitoring
```javascript
// Web Vitals monitoring
import { getCLS } from 'web-vitals';

getCLS((metric) => {
  if (metric.value > 0.25) {
    console.warn('CLS threshold exceeded:', metric);
    // Send to analytics
  }
});
```

### Continuous Monitoring
- Set up Lighthouse CI in build pipeline
- Monitor CLS in Google Analytics/RUM tools
- Alert when CLS > 0.25ms

## Additional Resources

- [Web.dev CLS Guide](https://web.dev/cls/)
- [Chrome DevTools CLS Debugging](https://developer.chrome.com/docs/lighthouse/performance/layout-shift-elements/)
- [CSS Containment Spec](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)

## Rollback Plan

If CLS optimizations cause issues:

1. Remove `/styles/cls-optimizations.css` import from globals.css
2. Remove CLSOptimizer wrapper from App.tsx
3. Revert critical.css changes
4. Keep explicit dimensions on modals (safe change)
