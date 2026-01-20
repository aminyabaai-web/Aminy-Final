/**
 * Accessibility Audit for Development
 * Uses axe-core to detect accessibility issues in real-time
 */

import React, { useEffect, useState } from 'react';

interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

interface A11yAuditProps {
  enabled?: boolean;
}

/**
 * Initialize axe-core for accessibility auditing in development
 * Only runs in development mode
 */
export async function initAccessibilityAudit(): Promise<void> {
  if (import.meta.env.PROD) return;

  try {
    const axe = await import('@axe-core/react');
    const React = await import('react');
    const ReactDOM = await import('react-dom');

    axe.default(React.default, ReactDOM.default, 1000, {
      rules: [
        // Enable all rules for comprehensive testing
        { id: 'color-contrast', enabled: true },
        { id: 'label', enabled: true },
        { id: 'button-name', enabled: true },
        { id: 'image-alt', enabled: true },
        { id: 'link-name', enabled: true },
        { id: 'heading-order', enabled: true },
        { id: 'landmark-one-main', enabled: true },
        { id: 'region', enabled: true },
      ],
    });

  } catch (error) {
  }
}

/**
 * Component to display accessibility violations in development
 */
export function AccessibilityPanel({ enabled = true }: A11yAuditProps): JSX.Element | null {
  const [violations, setViolations] = useState<A11yViolation[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled || import.meta.env.PROD) return;

    const runAudit = async () => {
      try {
        const axeCore = await import('axe-core');
        const results = await axeCore.default.run();
        setViolations(results.violations as A11yViolation[]);
      } catch (error) {
      }
    };

    // Run audit after initial render and on mutations
    const timeout = setTimeout(runAudit, 2000);

    // Re-run on DOM changes
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      setTimeout(runAudit, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [enabled]);

  if (import.meta.env.PROD || !enabled) return null;

  const criticalCount = violations.filter(v => v.impact === 'critical').length;
  const seriousCount = violations.filter(v => v.impact === 'serious').length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        zIndex: 99999,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          background: violations.length > 0 ? (criticalCount > 0 ? '#dc2626' : '#f59e0b') : '#22c55e',
          color: 'white',
          fontWeight: 'bold',
        }}
        aria-label={`Accessibility: ${violations.length} issues`}
      >
        A11y: {violations.length} {isOpen ? '▼' : '▲'}
      </button>

      {isOpen && violations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: 0,
            width: '400px',
            maxHeight: '300px',
            overflow: 'auto',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0' }}>Accessibility Issues</h4>
          {violations.map((violation, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px',
                marginBottom: '8px',
                background: violation.impact === 'critical' ? '#fee2e2' :
                           violation.impact === 'serious' ? '#fef3c7' : '#f3f4f6',
                borderRadius: '4px',
              }}
            >
              <strong style={{ color: violation.impact === 'critical' ? '#dc2626' : '#000' }}>
                [{violation.impact}] {violation.id}
              </strong>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>{violation.help}</p>
              <a
                href={violation.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '10px', color: '#2563eb' }}
              >
                Learn more
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Accessibility best practices checker
 */
export function checkA11yBestPractices(): string[] {
  const issues: string[] = [];

  // Check for skip link
  if (!document.querySelector('[href="#main"], [href="#content"]')) {
    issues.push('Missing skip navigation link');
  }

  // Check for main landmark
  if (!document.querySelector('main, [role="main"]')) {
    issues.push('Missing <main> landmark');
  }

  // Check for page title
  if (!document.title || document.title.length < 5) {
    issues.push('Page title is missing or too short');
  }

  // Check for language attribute
  if (!document.documentElement.lang) {
    issues.push('Missing lang attribute on <html>');
  }

  // Check for focus visible styles
  const style = getComputedStyle(document.body);
  if (style.getPropertyValue('outline-style') === 'none') {
    issues.push('Focus styles may be removed globally');
  }

  return issues;
}
