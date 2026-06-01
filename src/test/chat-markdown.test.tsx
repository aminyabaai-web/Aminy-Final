/**
 * Rich chat markdown renderer tests (Bevel-grade AI answers)
 * Proves the assistant's structured output — GFM tables, headings, bullet &
 * numbered lists, bold — renders as real DOM, not flat text. This is the
 * renderer behind the "amazing" Bevel-style answers (prose -> data table ->
 * bold-led observations).
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderRichMarkdown } from '../lib/chat-markdown';

function renderMd(md: string) {
  return render(<div data-testid="md">{renderRichMarkdown(md)}</div>);
}

describe('renderRichMarkdown — GFM tables', () => {
  it('renders a markdown table as a real <table> with header + data cells', () => {
    const md = [
      'Here is the comparison:',
      '',
      '| Metric | Before | Since |',
      '|--------|--------|-------|',
      '| Sleep | 6.2 hrs | 7.8 hrs |',
      '| Meltdowns | 4/wk | 1/wk |',
    ].join('\n');
    const { container, getByText } = renderMd(md);

    expect(container.querySelector('table')).toBeTruthy();
    const headers = Array.from(container.querySelectorAll('th')).map((t) => t.textContent);
    expect(headers).toEqual(['Metric', 'Before', 'Since']);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    expect(getByText('7.8 hrs')).toBeTruthy();
    expect(getByText('Meltdowns')).toBeTruthy();
    // intro prose still renders as a paragraph above the table
    expect(getByText(/Here is the comparison/)).toBeTruthy();
  });

  it('handles a 4-column table and ragged/missing trailing cells without crashing', () => {
    const md = [
      '| Metric | Before | Since | Change |',
      '|--------|--------|-------|--------|',
      '| Sleep | 6.2 | 7.8 | +1.6 |',
      '| Notes | partial |',
    ].join('\n');
    const { container } = renderMd(md);
    expect(container.querySelectorAll('th').length).toBe(4);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    // every row renders 4 cells (missing ones empty), matching the header width
    container.querySelectorAll('tbody tr').forEach((tr) => {
      expect(tr.querySelectorAll('td').length).toBe(4);
    });
  });
});

describe('renderRichMarkdown — inline + block elements', () => {
  it('renders **bold** as <strong> (the "Key Observations" lead-ins)', () => {
    const { container } = renderMd('**Sleep improved:** up ~1.5 hrs/night.');
    expect(container.querySelector('strong')?.textContent).toBe('Sleep improved:');
  });

  it('renders bullet lists as <ul><li>', () => {
    const { container } = renderMd(['Observations:', '- HRV climbed 20%', '- RHR dropped 5 bpm'].join('\n'));
    expect(container.querySelector('ul')).toBeTruthy();
    expect(container.querySelectorAll('li').length).toBe(2);
  });

  it('renders numbered lists as <ol><li>', () => {
    const { container } = renderMd(['1. First', '2. Second', '3. Third'].join('\n'));
    expect(container.querySelector('ol')).toBeTruthy();
    expect(container.querySelectorAll('li').length).toBe(3);
  });

  it('renders headings as bold text', () => {
    const { getByText } = renderMd('## Key Observations\nText below the heading.');
    expect(getByText('Key Observations')).toBeTruthy();
    expect(getByText(/Text below the heading/)).toBeTruthy();
  });

  it('does NOT turn plain prose into a table or list', () => {
    const { container } = renderMd('Just a normal sentence with no structure at all.');
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('p')).toBeTruthy();
  });
});

describe('renderRichMarkdown — full Bevel-style answer', () => {
  it('renders prose + data table + bold-led bullet observations cohesively', () => {
    const md = [
      "Here's what your data shows since starting the new bedtime routine:",
      '',
      '| Metric | Before | Since | Change |',
      '|--------|--------|-------|--------|',
      '| Sleep | 6.2 hrs | 7.8 hrs | +1.6 |',
      '| Meltdowns | 4/wk | 1/wk | -75% |',
      '',
      '## Key Observations',
      '- **Sleep improved:** consistent 7.5+ hrs supports regulation.',
      '- **Fewer meltdowns:** down 75%, likely from the predictable bedtime.',
    ].join('\n');
    const { container, getByText } = renderMd(md);

    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    expect(container.querySelector('ul')).toBeTruthy();
    expect(container.querySelectorAll('strong').length).toBe(2);
    expect(getByText('Key Observations')).toBeTruthy();
    expect(getByText(/data shows since starting/)).toBeTruthy();
  });
});
