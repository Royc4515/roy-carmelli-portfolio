import '../shared/base.css';
import OptionF from './OptionF';

/**
 * The live site at "/": option F without the review chrome. `data-option="f"` on <html> (set
 * in main.tsx before the first render, and by the prerender in dist/index.html) switches the
 * page from the pixel theme to F's own tokens; the page keeps index.html's title and robots.
 */
export default function LiveSite() {
  return <OptionF live />;
}
