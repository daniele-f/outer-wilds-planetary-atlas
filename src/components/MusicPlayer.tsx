import { useCallback, useEffect, useRef, useState } from 'react';

const PLAYLIST_ID = 'OLAK5uy_lvIXOLFb_NVEjnyhZNE66G8O_oeF9IRII';
const PREVIOUS_TRACK_THRESHOLD_SECONDS = 5;
const VOLUME_SLIDER_CLOSE_DELAY_MILLISECONDS = 2_000;

type YouTubePlayer = Readonly<{
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => Readonly<{ title?: string }>;
  destroy: () => void;
}>;

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => YouTubePlayer;

declare global {
  interface Window {
    YT?: Readonly<{ Player: YouTubePlayerConstructor; PlayerState: Readonly<{ ENDED: number; PLAYING: number; PAUSED: number; CUED: number }> }>;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatTimestamp(seconds: number): string {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

/** Atlas-styled controls for the supplied Outer Wilds soundtrack playlist. */
export function MusicPlayer({ autoplayOnLoad, onPlaybackChange }: Readonly<{ autoplayOnLoad: boolean; onPlaybackChange: (playing: boolean) => void }>) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const autoplayOnLoadRef = useRef(autoplayOnLoad);
  const lastAudibleVolumeRef = useRef(100);
  const volumeSliderCloseTimerRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('Outer Wilds Original Soundtrack');
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [volumeSliderOpen, setVolumeSliderOpen] = useState(false);

  const refreshTitle = useCallback(() => {
    const nextTitle = playerRef.current?.getVideoData().title;
    if (nextTitle !== undefined && nextTitle.trim() !== '') setTitle(nextTitle);
  }, []);

  const refreshProgress = useCallback(() => {
    const player = playerRef.current;
    if (player === null) return;
    setProgress({ current: player.getCurrentTime(), duration: player.getDuration() });
  }, []);

  useEffect(() => {
    let disposed = false;
    const createPlayer = () => {
      if (disposed || mountRef.current === null || window.YT === undefined) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          list: PLAYLIST_ID,
          listType: 'playlist',
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (disposed) return;
            setReady(true);
            refreshTitle();
            refreshProgress();
            const player = playerRef.current;
            if (player !== null) {
              const initialVolume = player.getVolume();
              setVolume(initialVolume);
              setMuted(player.isMuted());
              if (initialVolume > 0) lastAudibleVolumeRef.current = initialVolume;
            }
            if (autoplayOnLoadRef.current) playerRef.current?.playVideo();
          },
          onStateChange: (event: Readonly<{ data: number }>) => {
            if (disposed || window.YT === undefined) return;
            const states = window.YT.PlayerState;
            setPlaying(event.data === states.PLAYING);
            if (event.data === states.PLAYING || event.data === states.CUED) refreshTitle();
            refreshProgress();
            if (event.data === states.ENDED) playerRef.current?.pauseVideo();
          },
        },
      });
    };

    if (window.YT !== undefined) createPlayer();
    else {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      window.onYouTubeIframeAPIReady = createPlayer;
      document.head.append(script);
    }
    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [refreshProgress, refreshTitle]);

  useEffect(() => {
    if (!ready || !playing) return undefined;
    const interval = window.setInterval(refreshProgress, 500);
    return () => window.clearInterval(interval);
  }, [playing, ready, refreshProgress]);

  useEffect(() => {
    onPlaybackChange(playing);
  }, [onPlaybackChange, playing]);

  useEffect(() => () => {
    if (volumeSliderCloseTimerRef.current !== null) window.clearTimeout(volumeSliderCloseTimerRef.current);
  }, []);

  const togglePlayback = () => {
    if (!ready) return;
    if (playing) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  };
  const previous = () => {
    const player = playerRef.current;
    if (!ready || player === null) return;
    if (player.getCurrentTime() <= PREVIOUS_TRACK_THRESHOLD_SECONDS) player.previousVideo();
    else player.seekTo(0, true);
  };
  const stopPlayback = () => {
    const player = playerRef.current;
    if (!ready || player === null) return;
    player.pauseVideo();
    player.seekTo(0, true);
    setProgress((current) => ({ ...current, current: 0 }));
  };
  const toggleMute = () => {
    const player = playerRef.current;
    if (!ready || player === null) return;
    if (muted || volume === 0) {
      const restoredVolume = volume > 0 ? volume : lastAudibleVolumeRef.current;
      player.setVolume(restoredVolume);
      player.unMute();
      setVolume(restoredVolume);
      setMuted(false);
      return;
    }
    player.mute();
    setMuted(true);
  };
  const setPlayerVolume = (nextVolume: number) => {
    const player = playerRef.current;
    if (!ready || player === null) return;
    player.setVolume(nextVolume);
    setVolume(nextVolume);
    if (nextVolume === 0) {
      player.mute();
      setMuted(true);
      return;
    }
    lastAudibleVolumeRef.current = nextVolume;
    player.unMute();
    setMuted(false);
  };
  const openVolumeSlider = () => {
    if (volumeSliderCloseTimerRef.current !== null) window.clearTimeout(volumeSliderCloseTimerRef.current);
    volumeSliderCloseTimerRef.current = null;
    setVolumeSliderOpen(true);
  };
  const deferVolumeSliderClose = () => {
    if (volumeSliderCloseTimerRef.current !== null) window.clearTimeout(volumeSliderCloseTimerRef.current);
    volumeSliderCloseTimerRef.current = window.setTimeout(() => {
      setVolumeSliderOpen(false);
      volumeSliderCloseTimerRef.current = null;
    }, VOLUME_SLIDER_CLOSE_DELAY_MILLISECONDS);
  };

  return (
    <section className="music-player" aria-label="Outer Wilds soundtrack player">
      <div ref={mountRef} className="music-player__embed" aria-hidden="true" />
      <p className="music-player__eyebrow">Now playing · Outer Wilds soundtrack</p>
      <div className="music-player__track">
        <p className="music-player__title" title={title}>{title}</p>
      </div>
      <div className="music-player__controls" aria-label="Music playback controls">
        <button type="button" onClick={previous} disabled={!ready} aria-label="Previous track or restart current track">
          <span className="music-player__skip music-player__skip--previous" aria-hidden="true"><i /><i /></span>
        </button>
        <button type="button" className="music-player__play" onClick={togglePlayback} disabled={!ready} aria-label={playing ? 'Pause soundtrack' : 'Play soundtrack'}>
          {playing ? <span className="music-player__pause" aria-hidden="true"><i /><i /></span> : <span className="music-player__play-icon" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => playerRef.current?.nextVideo()} disabled={!ready} aria-label="Next track">
          <span className="music-player__skip" aria-hidden="true"><i /><i /></span>
        </button>
        <button type="button" className="music-player__stop" onClick={stopPlayback} disabled={!ready} aria-label="Stop soundtrack">
          <span aria-hidden="true" />
        </button>
        <div className={`music-player__volume${volumeSliderOpen ? ' music-player__volume--slider-open' : ''}`} onMouseEnter={openVolumeSlider} onMouseLeave={deferVolumeSliderClose} onFocus={openVolumeSlider} onBlur={deferVolumeSliderClose}>
          <button type="button" onClick={toggleMute} disabled={!ready} aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}>
            <svg className="music-player__volume-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 9h4l5-4v14l-5-4H3Z" />
              {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M16 9c1.5 1.6 1.5 4.4 0 6m2.5-8.5c3 3 3 7 0 10" />}
            </svg>
          </button>
          <label className="music-player__volume-slider">
            <span className="sr-only">Volume</span>
            <input type="range" min="0" max="100" value={volume} disabled={!ready} onChange={(event) => setPlayerVolume(Number(event.target.value))} aria-label="Soundtrack volume" />
          </label>
        </div>
        <span className="music-player__progress">{formatTimestamp(progress.current)} / {formatTimestamp(progress.duration)}</span>
      </div>
    </section>
  );
}
