// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Password Strength Meter
 *
 * 4-segment bar (weak → fair → good → strong) + checklist of unmet requirements.
 * Real-time scoring as the parent types. Matches the validation in
 * src/lib/schemas/auth.ts (min 8 chars, uppercase, number).
 */

import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function scorePassword(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: { id: string; label: string; passed: boolean }[];
} {
  const checks = [
    { id: 'length',    label: 'At least 8 characters',  passed: password.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter',   passed: /[A-Z]/.test(password) },
    { id: 'number',    label: 'One number',             passed: /\d/.test(password) },
    { id: 'symbol',    label: 'One symbol (recommended)', passed: /[!@#$%^&*()_+\-=[\]{};:'",.<>?/\\|`~]/.test(password) },
  ];
  const passed = checks.filter(c => c.passed).length;

  if (password.length < 8) return { score: 0, label: 'Too short', checks };
  if (passed === 1) return { score: 1, label: 'Weak', checks };
  if (passed === 2) return { score: 2, label: 'Fair', checks };
  if (passed === 3) return { score: 3, label: 'Good', checks };
  return { score: 4, label: 'Strong', checks };
}

const COLORS: Record<number, string> = {
  0: '#e2e8f0',  // slate-200 (empty)
  1: '#f87171',  // red
  2: '#fbbf24',  // amber
  3: '#60a5fa',  // blue
  4: '#2A7D99',  // teal (brand)
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, label, checks } = scorePassword(password);
  const fillColor = COLORS[score];

  return (
    <div style={{ marginTop: 8 }}>
      {/* 4-segment bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {[1, 2, 3, 4].map(seg => (
          <div
            key={seg}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: score >= seg ? fillColor : '#e2e8f0',
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>

      {/* Label + minimum-requirement summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
        <span style={{ color: fillColor, fontWeight: 600 }}>{label}</span>
        <span>{checks.filter(c => c.passed).length}/4 met</span>
      </div>

      {/* Checklist — only show items not yet passed, to reduce noise */}
      {score < 4 && (
        <ul style={{ marginTop: 6, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {checks.map(c => (
            <li
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: c.passed ? '#2A7D99' : '#94a3b8',
                background: c.passed ? '#2A7D9912' : '#f1f5f9',
                padding: '3px 8px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              {c.passed
                ? <Check style={{ width: 11, height: 11 }} />
                : <X style={{ width: 11, height: 11 }} />}
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
