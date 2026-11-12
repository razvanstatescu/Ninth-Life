// The step-class helpers of the website's played drawings (marketing-site design "Round 2" R2.2, MS-8.11).
import { describe, expect, it } from 'vitest';
import { lastChangeMs, play, role } from '@/components/site/pictures/roles';

describe('pictures/roles.ts', () => {
  it('MS-8.11 role and play build the step classes', () => {
    expect(role('in', 3)).toBe('site-in site-k3');
    expect(role('rise', 0)).toBe('site-rise site-k0');
    expect(role('mark', 12)).toBe('site-mark site-k12');
    expect(role('out', 13)).toBe('site-out site-u13');
    expect(role('during', 2, 3)).toBe('site-during site-k2 site-u3');
    expect(role('ring', 1, 2)).toBe('site-ring site-k1 site-u2');
    expect(role('ring', 2, 3, 'late')).toBe('site-ring site-k2 site-u3 site-late');
    expect(play('frame')).toBe('site-play--frame');
    expect(play('quick')).toBe('site-play--quick');
    expect(play('sweep')).toBe('site-play--sweep');
    expect(play('type')).toBe('site-play--type');
  });

  it('MS-8.11 lastChangeMs adds the lead, the step and the change', () => {
    // A fade ends motion-state (200 ms) after its step; a ring or mark motion-jump (120 ms) after.
    expect(lastChangeMs(role('rise', 3), 600, 700)).toBe(700 + 3 * 600 + 200); // Saved phrases, 2,700 ms
    expect(lastChangeMs(role('out', 2), 600, 300)).toBe(300 + 2 * 600 + 200);
    expect(lastChangeMs(role('during', 2, 3), 240, 300)).toBe(300 + 3 * 240 + 200);
    expect(lastChangeMs(role('ring', 6, 7), 400, 700)).toBe(700 + 7 * 400 + 120); // the switch drawing, 3,620 ms
    expect(lastChangeMs(role('mark', 6), 400, 700)).toBe(700 + 6 * 400 + 120);
    // A late ring fades in motion-jump after its step and still ends at t(u) plus the jump.
    expect(lastChangeMs(role('ring', 2, 3, 'late'), 520, 300)).toBe(300 + 3 * 520 + 120);
    expect(lastChangeMs(`site-key-ring ${role('ring', 3, 4)}`, 520, 300)).toBe(300 + 4 * 520 + 120); // How step 1, 2,500 ms
    // No step class: nothing changes.
    expect(lastChangeMs('site-cell', 600, 300)).toBe(0);
  });
});
