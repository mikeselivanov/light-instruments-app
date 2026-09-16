/**
 * The arithmetic behind the Galgal wheel, kept away from the screen.
 *
 * A mistake in here shows up as "the wheel looks a bit wrong" and takes a long
 * time to find by eye; as plain functions over plain numbers it can be checked
 * directly instead.
 */

export type WheelPoint = { x: number; y: number };

/** The largest tap target a letter is given: the 44pt Apple calls reliable. */
const MAX_HIT = 44;

/**
 * Where each letter's centre sits.
 *
 * Angle = π/2 − 2π·i/count, so the first letter stands at the top and the rest
 * run clockwise — the arrangement the printed wheel uses.
 *
 * `size` is the side of the square the wheel lives in, and the coordinates come
 * back in that square's own system, ready to drop into the `left`/`top` of an
 * absolutely positioned child.
 */
export function wheelPoints(count: number, size: number, radius: number): WheelPoint[] {
  const centre = size / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 - (2 * Math.PI * i) / count;
    return {
      x: centre + radius * Math.cos(angle),
      // Minus: the screen's Y axis grows downward, trigonometry's grows up.
      y: centre - radius * Math.sin(angle),
    };
  });
}

/**
 * A letter's partners: every other letter, clockwise, starting with its
 * neighbour. The anchor itself is skipped — which is why a circle through a
 * 22-letter wheel is 21 pairs, not 22.
 */
export function partnersOf(anchor: number, count: number): number[] {
  return Array.from({ length: count - 1 }, (_, k) => (anchor + k + 1) % count);
}

/**
 * The chord between two letters, laid out for an ordinary one-pixel-tall View.
 *
 * The one thing to be careful about, and the reason this is a function rather
 * than three lines at the call site: React Native rotates a view about its
 * centre, and unlike CSS there is no transform-origin to move. So the rectangle
 * is positioned with its middle on the middle of the chord — then rotating
 * about the centre lands it exactly where the line belongs. Positioning it from
 * the left edge, the way the same code would work on the web, swings it away
 * from both letters.
 */
export function chordLayout(a: WheelPoint, b: WheelPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const width = Math.hypot(dx, dy);
  return {
    left: (a.x + b.x) / 2 - width / 2,
    top: (a.y + b.y) / 2,
    width,
    angle: Math.atan2(dy, dx),
  };
}

/**
 * The side of a letter's tap target: exactly the gap between neighbours on the
 * circle, so that no two targets overlap.
 *
 * On a typical phone this lands near 42pt; on the narrowest one supported it is
 * about 34pt, under the 44pt guideline. That is a deliberate trade — on a ring
 * of 22 letters, overlapping targets are worse than small ones, the letter is
 * chosen once per session, and a miss costs one more tap. Do not add hitSlop
 * here: it would hand the overlap straight back.
 */
export function letterHitSize(radius: number, count: number): number {
  return Math.min(MAX_HIT, 2 * radius * Math.sin(Math.PI / count));
}
