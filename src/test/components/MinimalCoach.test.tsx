import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
});

vi.mock('../../components/GlobalDisclaimer', () => ({
  GlobalDisclaimer: () => React.createElement('div', { 'data-testid': 'global-disclaimer' }, 'Disclaimer'),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CoachScreen } from '../../components/CoachScreen';

describe('CoachScreen minimal', () => {
  it('renders', () => {
    render(<CoachScreen title="Test" subtitle="Sub" userTier="pro" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
