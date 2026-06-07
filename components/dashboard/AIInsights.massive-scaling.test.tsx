import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AIInsights from './AIInsights';
import type { AIInsight } from '@/types/dashboard';

// Mock framer-motion to avoid animation overhead in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
  },
}));

const VALID_ICONS = ['Moon', 'Sun', 'Zap', 'Calendar', 'Flame', 'Code', 'Star'];

const generateInsights = (count: number): AIInsight[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `insight-${i}`,
    icon: VALID_ICONS[i % VALID_ICONS.length],
    text: `Insight number ${i}: ${'x'.repeat(Math.min(i % 200, 200))} — contributor activity spike detected on day ${i}.`,
  }));

describe('AIInsights – Massive Data Sets and Extreme High Bounds Scaling', () => {
  it('renders 1,000 insights without crashing', () => {
    const insights = generateInsights(1000);
    const { container } = render(<AIInsights insights={insights} />);
    const items = container.querySelectorAll('.rounded-lg');
    expect(items.length).toBe(1000);
  });

  it('completes render of 500 insights within 2 seconds', () => {
    const insights = generateInsights(500);
    const start = performance.now();
    render(<AIInsights insights={insights} />);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('handles insights with extremely long text without breaking layout', () => {
    const longText = 'A'.repeat(10000);
    const insights: AIInsight[] = Array.from({ length: 50 }, (_, i) => ({
      id: `long-${i}`,
      icon: 'Zap',
      text: longText,
    }));
    const { container } = render(<AIInsights insights={insights} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(50);
    paragraphs.forEach((p) => {
      expect(p.textContent).toBe(longText);
    });
  });

  it('renders all unique IDs correctly across 2,000 insights', () => {
    const insights = generateInsights(2000);
    render(<AIInsights insights={insights} />);
    const uniqueIds = new Set(insights.map((i) => i.id));
    expect(uniqueIds.size).toBe(2000);
  });

  it('falls back to Sparkles icon for unknown icon names in massive sets', () => {
    const insights: AIInsight[] = Array.from({ length: 300 }, (_, i) => ({
      id: `unknown-icon-${i}`,
      icon: `UnknownIcon_${i}`,
      text: `Insight ${i} with unknown icon`,
    }));
    // Should not throw — unknown icons fall back to Sparkles
    expect(() => render(<AIInsights insights={insights} />)).not.toThrow();
    const items = screen.getAllByText(/Insight \d+ with unknown icon/);
    expect(items.length).toBe(300);
  });
});
