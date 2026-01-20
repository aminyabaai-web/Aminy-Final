# Telehealth Credit System - Quick Reference

## Monthly Allocation

Every user on **Pro** or **Premium** tier receives:
- **1x 50-minute session** per 30 days
- **1x 25-minute session** per 30 days

## How Credits Work

### Initial Allocation
- Credits granted when user upgrades to Pro/Premium
- Reset date set to 30 days from grant date
- Both credits start as "available"

### Using Credits
1. User clicks "Schedule 50min" or "Schedule 25min"
2. System checks if credit available
3. If yes: Opens scheduling modal
4. If no: Shows error toast with reset date
5. On successful booking: Credit moves from "available" to "used"

### Credit Reset
- Happens every 30 days from initial allocation
- Both credits reset to "available" simultaneously
- Used count resets to 0
- New reset date set 30 days forward

### Important: NO ROLLOVER
**Unused credits do NOT carry over to the next month.**

Example:
- Month 1: User schedules 50min session, doesn't use 25min
- Month 2: User gets 1x 50min + 1x 25min (NOT 1x 50min + 2x 25min)

## Credit Display

### Credits Overview Card
```
┌─────────────────────────────────────┐
│ Monthly Session Credits             │
│ Resets in 23 days                   │
├─────────────────────────────────────┤
│  50min         25min                │
│  █████░░░░░    █████████░           │
│  1 available   1 available          │
│  0 used        0 used               │
│  [Schedule]    [Schedule]           │
└─────────────────────────────────────┘
```

### After Using One Credit
```
┌─────────────────────────────────────┐
│ Monthly Session Credits             │
│ Resets in 23 days                   │
├─────────────────────────────────────┤
│  50min         25min                │
│  ░░░░░░░░░░    █████████░           │
│  0 available   1 available          │
│  1 used        0 used               │
│  [No Credits]  [Schedule]           │
└─────────────────────────────────────┘
```

## User Experience

### When Credits Available
✅ Green "Schedule" button enabled
✅ Can select date/time/provider
✅ Booking confirmation works
✅ Credit automatically deducted
✅ Session appears in "Upcoming Sessions"

### When Credits Exhausted
❌ "No Credits" button disabled
❌ Click shows toast: "You've used your 50min session for this month. Credits reset in 23 days."
❌ Cannot access scheduling modal
❌ User must wait for reset

## Warning System

Prominent alert displayed on credits card:

```
ℹ️ No rollover: Unused credits don't carry over to next month.
   Schedule your sessions to get the most value!
```

## Implementation Details

### Data Structure
```typescript
interface SessionCredit {
  type: '50min' | '25min';
  available: number;     // 0 or 1
  used: number;          // 0 or 1
  total: number;         // Always 1
  resetDate: Date;       // Same for both types
}
```

### State Management
- Stored in component state (could be lifted to global store)
- Credits array: `[{50min credit}, {25min credit}]`
- Shared reset date for simplicity

### Reset Logic
```typescript
const resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const getDaysUntilReset = () => {
  const now = new Date();
  const diff = resetDate.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};
```

### Credit Check
```typescript
const canScheduleSession = (type: '50min' | '25min'): boolean => {
  const credit = sessionCredits.find(c => c.type === type);
  return credit ? credit.available > 0 : false;
};
```

### Deduction on Booking
```typescript
setSessionCredits(prev => prev.map(credit => 
  credit.type === selectedSessionType
    ? { 
        ...credit, 
        available: credit.available - 1, 
        used: credit.used + 1 
      }
    : credit
));
```

## Business Rationale

### Why No Rollover?

1. **Consistent Engagement**
   - Encourages monthly touchpoints
   - Regular clinical oversight
   - Prevents "saving up" sessions

2. **Insurance Standards**
   - Aligns with typical insurance models
   - Monthly benefit structures
   - Prevents gaming the system

3. **Clinical Best Practice**
   - Regular check-ins preferred
   - Maintains continuity of care
   - Better progress tracking

4. **Resource Planning**
   - Predictable provider scheduling
   - Consistent capacity planning
   - Fair distribution of appointments

5. **User Motivation**
   - Creates urgency to schedule
   - Increases perceived value
   - Reduces procrastination

### Communication Strategy

**Upfront & Transparent:**
- Clearly stated in plan details
- Visual warning on credits page
- Mentioned in scheduling flow
- Toast notifications when credits reset

**Parent Ease Voice:**
> "We want to make sure you're getting the most from your plan. Your monthly sessions reset in 23 days—schedule now so you don't miss out on valuable professional guidance!"

## Future Enhancements

### Potential Additions (Not Currently Implemented)

1. **Rollover Option (Premium+)**
   - Allow 1-month rollover for higher tier
   - Max 2x sessions banked
   - Additional revenue opportunity

2. **Credit Purchase**
   - Buy additional sessions à la carte
   - $99 for 50min, $49 for 25min
   - No subscription required

3. **Family Pooling**
   - Share credits across multiple children
   - Flexible allocation
   - Family plan feature

4. **Unused Credit Alerts**
   - Email 7 days before reset
   - SMS reminder 3 days before
   - In-app notification

5. **Credit History**
   - Track usage over time
   - Show utilization rate
   - Encourage consistent use

6. **Gifting Credits**
   - Transfer to another family
   - Community support feature
   - Tax deduction for donor?

## FAQs

**Q: What happens if I don't use my credits this month?**
A: They expire. New credits will be available at your next reset date. We encourage scheduling early in the month!

**Q: Can I save credits for a longer session later?**
A: No, credits don't combine or roll over. Each month you get fresh credits.

**Q: What if I need more than the included sessions?**
A: Contact support about purchasing additional sessions or upgrading your plan.

**Q: When do credits reset?**
A: 30 days from when you first received them, then every 30 days after.

**Q: Can I see my credit history?**
A: Currently sessions are shown in "Session History." Credit usage history coming soon!

**Q: What if I cancel and re-subscribe?**
A: Credits reset with new subscription. Previous unused credits are not reinstated.

**Q: Do both session types have the same reset date?**
A: Yes, both 50min and 25min credits reset on the same day for simplicity.

---

## Summary

The credit system is designed to:
- ✅ Provide consistent monthly value
- ✅ Encourage regular professional contact
- ✅ Align with insurance standards
- ✅ Prevent system gaming
- ✅ Create urgency and perceived value
- ✅ Simplify resource planning
- ✅ Maintain clinical best practices

**Key Message:** Use it or lose it—we want families getting maximum value from professional guidance!
