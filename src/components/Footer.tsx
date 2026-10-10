import { bio } from '../data/bio';
import PixelIcon from './PixelIcon';
import { Button } from './ui/Button';

/**
 * Site footer (SPEC §4): `Back to top` (the title screen), the name and year, and the
 * build line. One row from `lg` (the name centred on the page), stacked and centred below.
 *
 * `Back to top` is a plain in-page link to `#hero`: the browser scrolls to the top (smoothly
 * unless reduced motion is on, see index.css) and moves the keyboard starting point there,
 * so the next Tab continues from the top of the page instead of the bottom.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t-4 border-border-subtle bg-surface-sunken">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-4 px-4 py-8 text-center md:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:px-8">
        <Button
          variant="ghost"
          href="#hero"
          leadingIcon={<PixelIcon name="arrow-up" size={12} />}
          className="lg:justify-self-start"
        >
          Back to top
        </Button>
        {/* The Hebrew name is the one visible place people searching "רועי כרמלי" can match.
            lang + dir isolate it, so the RTL run never reorders the Latin text around it. */}
        <p className="text-hud text-fg-muted">
          {bio.name} ·{' '}
          <span lang="he" dir="rtl">
            {bio.nameHe}
          </span>{' '}
          © {year}
        </p>
        {/* One line from lg: the name column grew with the Hebrew name and would wrap "Canvas". */}
        <p className="text-hud text-fg-subtle lg:justify-self-end lg:whitespace-nowrap lg:text-right">
          {/* Non-breaking inside the stack list: a phone breaks after the colon, never before a dot. */}
          {'Built from scratch: React\u00a0·\u00a0TypeScript\u00a0·\u00a0Canvas'}
        </p>
      </div>
    </footer>
  );
}
