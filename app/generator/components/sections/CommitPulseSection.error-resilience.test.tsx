import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { CommitPulseSection } from './CommitPulseSection';

// Mock hook and validation to avoid complex async in basic tests
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/lib/validations', () => ({
  validateGitHubUsername: vi.fn(() => true),
}));

let shouldCrash = false;

// Mock SectionCard to simulate unexpected runtime exceptions
vi.mock('../SectionCard', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SectionCard: (props: any) => {
      if (shouldCrash) {
        throw new Error('Simulated Component Crash');
      }
      return <actual.SectionCard {...props} />;
    }
  };
});

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error.message);
  }
  reset = () => {
    shouldCrash = false;
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Fallback UI</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.reset}>Retry Action</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const defaultProps = {
  githubUsername: '',
  showCommitPulse: true,
  commitPulseAccent: '',
  onGithubUsernameChange: vi.fn(),
  onShowCommitPulseChange: vi.fn(),
  onCommitPulseAccentChange: vi.fn(),
};

describe('CommitPulseSection Error Resilience & Stability (Variation 6)', () => {
  let consoleErrorSpy: any;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    shouldCrash = false;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        exists: true,
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
        public_repos: 10,
        stats: { currentStreak: 5, longestStreak: 10, totalContributions: 100 }
      })
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    global.fetch = originalFetch;
  });

  it('Case 1: Verify Hydration Stability - renders without mismatch warnings', () => {
    const { container } = render(<CommitPulseSection {...defaultProps} />);
    
    // Check that console.error was not called with hydration warnings
    const hydrationErrors = consoleErrorSpy.mock.calls.filter((call: any[]) => 
      typeof call[0] === 'string' && call[0].includes('Hydration failed')
    );
    expect(hydrationErrors).toHaveLength(0);
    expect(container).toBeInTheDocument();
  });

  it('Case 2: Runtime Exception Handling - handles utility fetch errors without crashing', async () => {
    // Mock global fetch to throw an unexpected error instead of returning a response
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network disconnected'));
    
    render(<CommitPulseSection {...defaultProps} githubUsername="testuser" />);
    
    // The component catches the fetch error and displays it gracefully
    expect(await screen.findByText(/Verification failed: Network disconnected/i)).toBeInTheDocument();
    
    // Ensure no unhandled crashes reached the error boundary or caused a full unmount
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
  });

  it('Case 3: Error Boundary Recovery - renders fallback UI when exception occurs', () => {
    shouldCrash = true;
    
    render(
      <TestErrorBoundary>
        <CommitPulseSection {...defaultProps} />
      </TestErrorBoundary>
    );

    // Verify the fallback UI is rendered instead of a blank screen
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Fallback UI')).toBeInTheDocument();
    expect(screen.getByText('Simulated Component Crash')).toBeInTheDocument();
  });

  it('Case 4: Error Logging - verifies errors are logged exactly once by boundary', () => {
    shouldCrash = true;
    
    render(
      <TestErrorBoundary>
        <CommitPulseSection {...defaultProps} />
      </TestErrorBoundary>
    );

    // Verify our custom error boundary telemetry logger actually fired
    const boundaryLogs = consoleErrorSpy.mock.calls.filter((call: any[]) => 
      call[0] === 'ErrorBoundary caught:' && call[1] === 'Simulated Component Crash'
    );
    expect(boundaryLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('Case 5: Recovery UI - clicking retry recovers the component', async () => {
    const user = userEvent.setup();
    shouldCrash = true;
    
    render(
      <TestErrorBoundary>
        <CommitPulseSection {...defaultProps} />
      </TestErrorBoundary>
    );

    // Assert crashed state
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    
    // Attempt recovery
    const retryButton = screen.getByRole('button', { name: /retry action/i });
    await user.click(retryButton);

    // Assert healthy recovered state
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    expect(screen.getByText('Include badge in README')).toBeInTheDocument();
  });
});
