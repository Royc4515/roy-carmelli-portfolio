import { describe, it, expect } from 'vitest';
import { frameScrollTop } from './frame';

describe('frameScrollTop', () => {
  it('centres a panel that fits between the nav and the dock', () => {
    // 900px window: clear band 88..816 (728px). A 400px panel sits 164px below the band top.
    expect(frameScrollTop(1500, 400, 2000, 900)).toBe(2000 + 1500 - (88 + 164));
  });

  it('puts a panel taller than the band just under the nav, so the heading shows', () => {
    expect(frameScrollTop(1500, 900, 2000, 900)).toBe(2000 + 1500 - 96);
  });

  it('never scrolls above the top of the page', () => {
    expect(frameScrollTop(-500, 400, 100, 900)).toBe(0);
  });
});
