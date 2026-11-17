/**
 * In-page links in option F land on the panel, framed on screen, instead of on the top of its
 * section. A section has 34vh of air above its panel (that gap is where Roy travels to the next
 * island), so a plain anchor jump left the panel low and cut off at the bottom.
 */

/** Space kept clear at the top (the nav pill) and the bottom (the dock), in CSS px. */
const TOP_CLEAR = 88;
const BOTTOM_CLEAR = 84;

/**
 * Where to scroll so `card` is in view (`cardTop` relative to the viewport at `scrollY`): centred in the clear band when it fits, otherwise its
 * top just under the nav, so the reader starts at the heading. Pure, for tests.
 */
export function frameScrollTop(cardTop: number, cardHeight: number, scrollY: number, viewport: number): number {
  const band = viewport - TOP_CLEAR - BOTTOM_CLEAR;
  const offset = cardHeight <= band ? TOP_CLEAR + (band - cardHeight) / 2 : TOP_CLEAR + 8;
  return Math.max(0, Math.round(scrollY + cardTop - offset));
}

/** Scrolls to the panel of section `id` (or the page top for the hero). Returns false when there is none. */
export function frameSection(id: string, smooth: boolean): boolean {
  const section = document.getElementById(id);
  if (!section) return false;
  const card = section.querySelector<HTMLElement>('[data-station]') ?? section;
  // Layout offsets, not getBoundingClientRect: the panels rise in with a transform as they
  // enter the view, which shifted the measured box by up to 40px.
  let pageTop = 0;
  for (let el: HTMLElement | null = card; el; el = el.offsetParent as HTMLElement | null) pageTop += el.offsetTop;
  const top = id === 'main' ? 0 : frameScrollTop(pageTop, card.offsetHeight, 0, window.innerHeight);
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  // Move focus with the view, for keyboard and screen-reader users, without a second jump.
  const heading = card.querySelector<HTMLElement>('h1, h2') ?? card;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
  return true;
}
