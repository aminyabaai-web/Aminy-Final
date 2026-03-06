/**
 * Notification Service - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

export const NotificationService = {
  sendScreenerResultsEmail: async (_email: string, _childName: string): Promise<void> => {
    console.warn('[NotificationService] sendScreenerResultsEmail is a no-op stub');
  },
  sendEVVTimesheetSubmitted: async (_email: string, _caregiverName: string): Promise<void> => {
    console.warn('[NotificationService] sendEVVTimesheetSubmitted is a no-op stub');
  },
};
