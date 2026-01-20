/**
 * Telehealth Integration Demo
 * 
 * This component demonstrates the complete Telehealth feature including:
 * - Monthly session credits (50min + 25min)
 * - Embedded calendar scheduling
 * - iCal/Google Calendar export
 * - Session notes that auto-integrate into progress reports
 */

import React from 'react';
import { TelehealthScreen } from './TelehealthScreen';
import { useAminyStore } from '../lib/store';

export function TelehealthDemo() {
  const user = useAminyStore(state => state.user);
  
  return (
    <div className="min-h-screen bg-white">
      <TelehealthScreen
        childName={user?.childName || 'Alex'}
        parentName={user?.caregiverName || 'Parent'}
        userTier={user?.tier || 'pro'}
      />
    </div>
  );
}

/**
 * USAGE NOTES:
 * 
 * 1. SESSION CREDITS
 *    - Each user gets 1x 50-minute and 1x 25-minute session per 30 days
 *    - Credits reset automatically after 30 days
 *    - NO ROLLOVER - unused credits don't carry over
 *    - Clear warning displayed to encourage usage
 * 
 * 2. SCHEDULING
 *    - Click "Schedule 50min" or "Schedule 25min" button
 *    - Embedded calendar modal opens
 *    - Select date (past dates disabled)
 *    - Choose time slot (8 AM - 6 PM)
 *    - Select provider from BCBA list
 *    - Confirm booking
 *    - Credit automatically deducted
 * 
 * 3. CALENDAR EXPORT
 *    - After booking, export options appear
 *    - ".ics" button downloads iCalendar file (works with Apple Calendar, Outlook)
 *    - "Google" button opens Google Calendar in new tab
 *    - 15-minute reminder automatically included
 * 
 * 4. SESSION NOTES
 *    - After session completion, provider adds notes
 *    - Notes include:
 *      - Topics covered
 *      - Clinical observations
 *      - Progress updates (color-coded by status)
 *      - Recommendations
 *      - Next steps
 *      - Parent questions addressed
 *    - Notes can be exported as text file
 * 
 * 5. PROGRESS REPORT INTEGRATION
 *    - Session notes automatically feed into AI brain
 *    - Included in all generated reports:
 *      - Progress Reports
 *      - IEP Documents
 *      - BCBA Session Notes
 *      - Insurance Coverage Letters
 *    - No manual copying needed
 *    - Clinical observations enrich report quality
 * 
 * 6. TECHNICAL DETAILS
 *    - Sessions stored in Zustand global store
 *    - Persisted across app sessions
 *    - Type-safe interfaces
 *    - Integration with aminy-ai-brain.ts
 *    - Follows Apple-clean design system
 * 
 * 7. BUSINESS VALUE
 *    - Professional clinical oversight
 *    - Insurance-compliant documentation
 *    - Builds trust with clinics and payers
 *    - Justifies premium pricing
 *    - Demonstrates real professional involvement
 */
