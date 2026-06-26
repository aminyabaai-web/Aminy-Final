# Button — the one teal pointer

The primary action. Exactly one primary Button per view; everything else is secondary or ghost.

```jsx
<Button variant="primary" onClick={seePlan}>See my plan</Button>
<Button variant="secondary">Not now</Button>
<Button variant="ghost" size="sm">Skip for today</Button>
<Button variant="primary" fullWidth iconRight={<ArrowRight/>}>Start a 2-minute round</Button>
```

- **variant**: `primary` (teal glow CTA) · `secondary` (white pill) · `ghost` (skip/dismiss).
- **size**: `sm` 40 · `md` 48 (default) · `lg` 56 — never below 44px.
- Labels are 1–3 words. "Save", "See my plan", "Open Calm Corner".