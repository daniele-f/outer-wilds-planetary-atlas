import { describe, expect, it } from 'vitest';
import {
  createAnimationClock,
  type AnimationFrameScheduler,
  type FrameCallback,
} from './useAnimationClock';

class ControlledFrameScheduler implements AnimationFrameScheduler {
  private callback: FrameCallback | null = null;

  request(callback: FrameCallback): number {
    this.callback = callback;
    return 1;
  }

  cancel(): void {
    this.callback = null;
  }

  step(timestamp: number): void {
    const callback = this.callback;
    this.callback = null;
    if (callback === null) {
      throw new Error('No animation frame was scheduled.');
    }
    callback(timestamp);
  }
}

describe('createAnimationClock', () => {
  it('freezes while paused and advances twice as far at 2x speed', () => {
    const scheduler = new ControlledFrameScheduler();
    const clock = createAnimationClock({ scheduler, speed: 1 });

    clock.start();
    scheduler.step(1_000);
    scheduler.step(1_500);
    expect(clock.getTime()).toBeCloseTo(0.5, 10);

    clock.setSpeed(0);
    scheduler.step(2_000);
    expect(clock.getTime()).toBeCloseTo(0.5, 10);

    clock.setSpeed(2);
    scheduler.step(2_500);
    expect(clock.getTime()).toBeCloseTo(1.5, 10);

    clock.stop();
  });
});
