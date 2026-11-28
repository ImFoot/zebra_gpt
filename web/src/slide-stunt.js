import { MathUtils } from 'three';
import { runPace } from './route.js';

export const slideDuration = .92 / runPace;

const { clamp, smoothstep: ease } = MathUtils;
const grounded = { rise: 0, turn: 0, tuck: 0, balance: 0, settle: 0 };

export function slideCrossing(distance, speed) {
  return Number.isFinite(distance) ? clamp(distance / Math.max(speed, 1) / slideDuration, .11, .74) : .47;
}

export function sampleSlide(age, crossing) {
  if (age <= 0 || age >= slideDuration) return grounded;
  const t = age / slideDuration;
  const lift = ease(t, .018, Math.max(.085, crossing - .092));
  const descent = 1 - ease(t, Math.min(.79, crossing + .15), .965);
  // Accelerate into the spin, show Stan's face briefly at half a turn, then turn back toward the saddle.
  const first = ease(t, .072, Math.max(.245, crossing - .016));
  const second = ease(t, Math.max(.305, crossing + .057), .92);
  return {
    rise: 2.89 * lift * descent,
    turn: Math.PI * (first + second),
    tuck: ease(t, .055, Math.max(.10, crossing - .09)) * (1 - ease(t, Math.min(.80, crossing + .10), .945)),
    balance: ease(t, .007, .065) * (1 - ease(t, .91, .997)),
    settle: ease(t, .93, .967) * (1 - ease(t, .967, 1)),
  };
}
