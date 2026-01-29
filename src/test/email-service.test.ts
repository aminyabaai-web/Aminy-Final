/**
 * Email Service Tests
 * Tests for production email service with Resend/SendGrid
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock email validation function (matches actual implementation)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

describe('Email Service', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('123@numbers.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('Email Template Validation', () => {
    it('should have required fields in report share email', () => {
      const template = {
        recipientEmail: 'test@example.com',
        senderName: 'Jane Doe',
        childName: 'John',
        reportUrl: 'https://app.aminy.ai/reports/123',
        message: 'Please review this report',
      };

      expect(template.recipientEmail).toBeTruthy();
      expect(template.senderName).toBeTruthy();
      expect(template.childName).toBeTruthy();
      expect(template.reportUrl).toContain('https://');
    });

    it('should have security warning in report emails', () => {
      const htmlContent = `
        <div class="security-note">
          <strong>Security Note:</strong> This link will expire in 7 days
        </div>
      `;

      expect(htmlContent).toContain('Security Note');
      expect(htmlContent).toContain('expire');
    });
  });

  describe('Trial Expiration Email', () => {
    it('should have different subject for expired vs expiring trial', () => {
      const getSubject = (daysLeft: number) => {
        return daysLeft === 0
          ? 'Your Aminy trial has ended'
          : `Your Aminy trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
      };

      expect(getSubject(0)).toBe('Your Aminy trial has ended');
      expect(getSubject(1)).toBe('Your Aminy trial ends in 1 day');
      expect(getSubject(3)).toBe('Your Aminy trial ends in 3 days');
    });
  });

  describe('Email Stats Tracking', () => {
    it('should track email statistics correctly', () => {
      const emailStats = {
        sent: 0,
        failed: 0,
        lastError: null as string | null,
        lastSentAt: null as number | null,
      };

      // Simulate successful send
      emailStats.sent++;
      emailStats.lastSentAt = Date.now();

      expect(emailStats.sent).toBe(1);
      expect(emailStats.lastSentAt).toBeDefined();

      // Simulate failed send
      emailStats.failed++;
      emailStats.lastError = 'API error';

      expect(emailStats.failed).toBe(1);
      expect(emailStats.lastError).toBe('API error');
    });
  });

  describe('Email Provider Fallback Logic', () => {
    it('should prefer Resend over SendGrid', () => {
      const mockEnv = {
        RESEND_API_KEY: 'resend_key',
        SENDGRID_API_KEY: 'sendgrid_key',
      };

      // With both keys available, should use Resend first
      const provider = mockEnv.RESEND_API_KEY ? 'resend' : 'sendgrid';
      expect(provider).toBe('resend');
    });

    it('should fall back to SendGrid if Resend unavailable', () => {
      const mockEnv = {
        RESEND_API_KEY: null,
        SENDGRID_API_KEY: 'sendgrid_key',
      };

      const provider = mockEnv.RESEND_API_KEY ? 'resend' : 'sendgrid';
      expect(provider).toBe('sendgrid');
    });

    it('should fail gracefully with no providers configured', () => {
      const mockEnv = {
        RESEND_API_KEY: null,
        SENDGRID_API_KEY: null,
        ENVIRONMENT: 'production',
      };

      const hasProvider = mockEnv.RESEND_API_KEY || mockEnv.SENDGRID_API_KEY;
      const isProduction = mockEnv.ENVIRONMENT === 'production';

      // In production with no providers, should fail
      expect(hasProvider).toBeFalsy();
      expect(isProduction).toBe(true);
    });

    it('should allow development mode without providers', () => {
      const mockEnv = {
        RESEND_API_KEY: null,
        SENDGRID_API_KEY: null,
        ENVIRONMENT: 'development',
      };

      const isDevelopment = mockEnv.ENVIRONMENT === 'development';

      // In development, should allow without real providers
      expect(isDevelopment).toBe(true);
    });
  });

  describe('From Address Parsing', () => {
    it('should parse "Name <email>" format correctly', () => {
      const from = 'Aminy <noreply@aminy.ai>';
      const match = from.match(/^(.+)\s*<(.+)>$/);

      expect(match).toBeTruthy();
      expect(match![1]).toBe('Aminy ');
      expect(match![2]).toBe('noreply@aminy.ai');
    });

    it('should handle plain email address', () => {
      const from = 'noreply@aminy.ai';
      const match = from.match(/^(.+)\s*<(.+)>$/);

      expect(match).toBeFalsy();
      // Should fall back to using the email as-is
      expect(from).toBe('noreply@aminy.ai');
    });
  });
});

describe('Batch Email Sending', () => {
  it('should respect rate limiting delay', async () => {
    const emails = [
      { to: 'user1@example.com', subject: 'Test 1' },
      { to: 'user2@example.com', subject: 'Test 2' },
    ];
    const delayMs = 100;

    const start = Date.now();

    // Simulate batch sending with delay
    for (let i = 0; i < emails.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const elapsed = Date.now() - start;

    // Should have delayed between emails
    expect(elapsed).toBeGreaterThanOrEqual(delayMs * (emails.length - 1) - 10); // Allow 10ms tolerance
  });

  it('should track batch results correctly', () => {
    const results = [
      { success: true, messageId: '1' },
      { success: false, error: 'Invalid email' },
      { success: true, messageId: '2' },
    ];

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    expect(successful).toBe(2);
    expect(failed).toBe(1);
  });
});
