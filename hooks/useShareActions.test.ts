import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShareActions } from './useShareActions';
import type { DashboardExportData } from '@/types/dashboard';

const mockUsername = 'testuser';
const mockExportData: DashboardExportData = {
  stats: { totalContributions: 10, currentStreak: 3, peakStreak: 5 },
  activity: [],
  languages: [],
};
const mockOnClose = vi.fn();
const url = 'https://commitpulse.app/testuser';

vi.mock('@/utils/urls', () => ({
  getDashboardUrl: () => url,
  getOrigin: () => 'https://commitpulse.app',
}));

describe('useShareActions error logging', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnClose.mockReset();
  });

  it('logs error when handleCopyLink fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('permission denied')) },
    });
    const { result } = renderHook(() => useShareActions(mockUsername, mockExportData, mockOnClose));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await result.current.handleCopyLink();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useShareActions] copy link failed:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('logs error when handleDownloadPNG fails', async () => {
    const { result } = renderHook(() => useShareActions(mockUsername, mockExportData, mockOnClose));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await result.current.handleDownloadPNG();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useShareActions] PNG download failed:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('logs error when handleCopyMarkdown fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('clipboard error')) },
    });
    const { result } = renderHook(() => useShareActions(mockUsername, mockExportData, mockOnClose));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await result.current.handleCopyMarkdown();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useShareActions] copy markdown failed:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
