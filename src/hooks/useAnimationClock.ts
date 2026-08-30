import { useEffect, useRef } from 'react';

export type FrameCallback = (timestampMilliseconds: number) => void;

export type AnimationFrameScheduler = Readonly<{
  request: (callback: FrameCallback) => number;
  cancel: (frameId: number) => void;
}>;

export type AnimationClock = Readonly<{
  getTime: () => number;
  setSpeed: (speed: number) => void;
  subscribe: (listener: (time: number) => void) => () => void;
  start: () => void;
  stop: () => void;
}>;

type CreateAnimationClockOptions = Readonly<{
  scheduler?: AnimationFrameScheduler;
  speed?: number;
}>;

const browserScheduler: AnimationFrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (frameId) => cancelAnimationFrame(frameId),
};

/** Creates a ref-friendly simulation clock that never requires React state per frame. */
export function createAnimationClock(options: CreateAnimationClockOptions = {}): AnimationClock {
  const scheduler = options.scheduler ?? browserScheduler;
  const listeners = new Set<(time: number) => void>();
  let time = 0;
  let speed = Math.max(0, options.speed ?? 1);
  let previousTimestamp: number | null = null;
  let frameId: number | null = null;

  const tick: FrameCallback = (timestamp) => {
    if (previousTimestamp !== null) {
      const elapsed = Math.max(0, timestamp - previousTimestamp) / 1_000;
      time += elapsed * speed;
    }
    previousTimestamp = timestamp;
    listeners.forEach((listener) => listener(time));
    frameId = scheduler.request(tick);
  };

  return {
    getTime: () => time,
    setSpeed: (nextSpeed) => {
      speed = Number.isFinite(nextSpeed) ? Math.max(0, nextSpeed) : 0;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => {
      if (frameId !== null) return;
      previousTimestamp = null;
      frameId = scheduler.request(tick);
    },
    stop: () => {
      if (frameId !== null) scheduler.cancel(frameId);
      frameId = null;
      previousTimestamp = null;
    },
  };
}

/** Keeps one animation clock alive for a component tree and updates its speed declaratively. */
export function useAnimationClock(speed = 1): AnimationClock {
  const clockRef = useRef<AnimationClock | null>(null);
  if (clockRef.current === null) {
    clockRef.current = createAnimationClock({ speed });
  }

  const clock = clockRef.current;
  useEffect(() => {
    clock.setSpeed(speed);
  }, [clock, speed]);
  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  return clock;
}
