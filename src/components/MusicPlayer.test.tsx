// @vitest-environment jsdom

import { act } from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicPlayer } from './MusicPlayer';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('MusicPlayer loading feedback', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete window.YT;
    vi.restoreAllMocks();
  });

  it('shows a loading indicator after Play until playback starts', async () => {
    vi.useFakeTimers();
    let events: Record<string, (event: { data: number }) => void> = {};
    const playVideo = vi.fn();
    class TestPlayer {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        events = options.events as typeof events;
      }
      playVideo = playVideo;
      pauseVideo = vi.fn();
      nextVideo = vi.fn();
      previousVideo = vi.fn();
      seekTo = vi.fn();
      mute = vi.fn();
      unMute = vi.fn();
      isMuted = () => false;
      getVolume = () => 100;
      setVolume = vi.fn();
      getCurrentTime = () => 0;
      getDuration = () => 120;
      getVideoData = () => ({ title: 'Timber Hearth' });
      destroy = vi.fn();
    }
    window.YT = {
      Player: TestPlayer,
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 },
    };
    render(<MusicPlayer autoplayOnLoad={false} onPlaybackChange={vi.fn()} onMinimizedChange={vi.fn()} />);
    act(() => events.onReady?.({ data: 5 }));

    fireEvent.click(screen.getByRole('button', { name: 'Play soundtrack' }));

    expect(playVideo).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Play soundtrack' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('button', { name: 'Loading soundtrack' })).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('.music-player__loading')).toBeInTheDocument();

    act(() => events.onStateChange?.({ data: 1 }));
    expect(screen.getByRole('button', { name: 'Pause soundtrack' })).not.toHaveAttribute('aria-busy');
    expect(document.querySelector('.music-player__loading')).not.toBeInTheDocument();
  });
});
