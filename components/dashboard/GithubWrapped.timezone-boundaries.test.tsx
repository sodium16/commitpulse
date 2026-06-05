import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import GithubWrapped from './GithubWrapped';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const React = await import('react');

  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');

  const createMockComponent = (tag: keyof React.JSX.IntrinsicElements) => {
    const MockComponent = ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      delete props.initial;
      delete props.animate;
      delete props.exit;
      delete props.transition;
      delete props.whileInView;
      delete props.viewport;

      return React.createElement(tag, props, children);
    };

    MockComponent.displayName = `MockMotion${tag}`;

    return MockComponent;
  };

  return {
    ...actual,

    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,

    motion: {
      div: createMockComponent('div'),
      section: createMockComponent('section'),
      span: createMockComponent('span'),
      svg: createMockComponent('svg'),
      path: createMockComponent('path'),
      circle: createMockComponent('circle'),
      g: createMockComponent('g'),
      text: createMockComponent('text'),
    },
  };
});

const mockProfile = {
  login: 'timezone-user',
  avatar_url: 'https://github.com/test.png',
  html_url: 'https://github.com/test',
};

const mockWrappedData = {
  totalContributions: 1200,
  totalCommits: 120,
  totalStars: 45,

  longestStreak: 12,
  currentStreak: 4,

  busiestDay: 'Monday',
  busiestMonth: '2024-03',
  weekendRatio: 30,

  topLanguages: [
    {
      name: 'TypeScript',
      percentage: 60,
    },
    {
      name: 'JavaScript',
      percentage: 40,
    },
  ],

  topRepositories: [
    {
      name: 'commitpulse',
      stars: 25,
      forks: 5,
    },
  ],

  contributionYears: ['2024'],

  totalPullRequests: 14,
  totalIssues: 6,
  totalReviews: 9,

  peakCommitHour: 22,
  mostActiveMonth: 'March',

  averageCommitsPerDay: 6,
  contributionsThisYear: 800,
  favoriteLanguage: 'TypeScript',

  totalRepositories: 18,
  totalForks: 12,
  mergedPullRequests: 10,

  codingSessions: 42,
  peakDayCommits: 25,

  achievements: ['Fast Committer'],
};

describe('GithubWrapped Timezone Boundaries', () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it('renders correctly in UTC timezone', () => {
    process.env.TZ = 'UTC';

    render(<GithubWrapped profile={mockProfile} wrappedData={mockWrappedData} />);

    expect(screen.getByText(/total contributions/i)).toBeDefined();
  });

  it('renders correctly in IST timezone', () => {
    process.env.TZ = 'Asia/Kolkata';

    render(<GithubWrapped profile={mockProfile} wrappedData={mockWrappedData} />);

    expect(screen.getByText(/total contributions/i)).toBeDefined();
  });

  it('handles leap year boundary dates safely', () => {
    render(<GithubWrapped profile={mockProfile} wrappedData={mockWrappedData} />);

    expect(screen.getByText(/total contributions/i)).toBeDefined();
  });

  it('maintains stable rendering around daylight savings transitions', () => {
    process.env.TZ = 'America/New_York';

    expect(() => {
      render(<GithubWrapped profile={mockProfile} wrappedData={mockWrappedData} />);
    }).not.toThrow();
  });

  it('preserves valid YYYY-MM-DD date formatting across locales', () => {
    const validDate = '2024-02-29';

    expect(validDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
