// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
//
// Chat markdown renderers — extracted from BevelChatOverlay so they can be
// unit-tested in isolation (no supabase/motion deps) and reused. Inline +
// rich block (GFM tables, headings, lists, paragraphs). Structural styling is
// INLINE (this repo precompiles Tailwind with no JIT — see CLAUDE.md).

import React from 'react';

// ─── Lightweight inline markdown renderer ────────────────────────────────────
// Handles **bold**, `code`, and [label](url) links — the three patterns the AI
// uses in confirmation messages and short replies. Full markdown libs are
// overkill for our use case and bloat the chat bundle.

export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Combined regex: link OR bold OR code
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      // Markdown link
      const href = match[2];
      const isExternal = /^https?:\/\//.test(href);
      out.push(
        <a
          key={`md-${key++}`}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-teal-700 font-medium underline underline-offset-2 break-words"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      // Bold
      out.push(<strong key={`md-${key++}`} className="font-semibold">{match[3]}</strong>);
    } else if (match[4]) {
      // Inline code
      out.push(<code key={`md-${key++}`} className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out.length > 0 ? out : [text];
}

// ─── Rich block markdown renderer (Bevel-grade) ──────────────────────────────
// Renders the assistant's structured answers: GFM tables, headings, bullet &
// numbered lists, and paragraphs — with inline **bold**/`code`/[links] inside
// each. Structural styling uses INLINE styles (not Tailwind classes) because
// this repo precompiles Tailwind with NO JIT: less-common/arbitrary utilities
// silently don't paint (see CLAUDE.md — the same trap that made the brand
// gradient invisible). Inline styles always render. We control the AI's output
// shape via the system prompt, so this covers the patterns Aminy emits without
// pulling react-markdown's large dependency tree onto a live HIPAA bundle.

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

const isTableSeparator = (s: string): boolean =>
  s.includes('-') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s);

const isPipeRow = (s: string): boolean => {
  const t = s.trim();
  return t.length > 1 && t.startsWith('|') && t.includes('|');
};

const isBlockSpecial = (s: string): boolean => {
  const t = s.trim();
  return /^#{1,3}\s+/.test(t) || /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t) || isPipeRow(t);
};

export function renderRichMarkdown(raw: string): React.ReactNode {
  const lines = (raw || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

    // ── Table ── a pipe row immediately followed by a |---|---| separator
    if (isPipeRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && isPipeRow(lines[i]) && !isTableSeparator(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`b${key++}`} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px', lineHeight: 1.35 }}>
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci} style={{ textAlign: 'left', fontWeight: 600, padding: '7px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 ? '#ffffff' : '#f8fafc' }}>
                  {header.map((_, ci) => (
                    <td key={ci} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', verticalAlign: 'top', color: '#334155' }}>
                      {renderInlineMarkdown(row[ci] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Heading (#, ##, ###) ──
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? '17px' : level === 2 ? '15px' : '14px';
      blocks.push(
        <p key={`b${key++}`} style={{ fontWeight: 700, fontSize: size, color: '#0f172a', margin: '10px 0 4px' }}>
          {renderInlineMarkdown(h[2])}
        </p>
      );
      i++;
      continue;
    }

    // ── Bullet list ──
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`b${key++}`} style={{ margin: '6px 0', paddingLeft: '18px', listStyleType: 'disc' }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ margin: '3px 0', lineHeight: 1.5 }}>{renderInlineMarkdown(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Numbered list ──
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`b${key++}`} style={{ margin: '6px 0', paddingLeft: '20px', listStyleType: 'decimal' }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ margin: '3px 0', lineHeight: 1.5 }}>{renderInlineMarkdown(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Paragraph ── gather consecutive plain lines
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockSpecial(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={`b${key++}`} style={{ margin: '6px 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
        {renderInlineMarkdown(para.join('\n'))}
      </p>
    );
  }

  return blocks;
}
