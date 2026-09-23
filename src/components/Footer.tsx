import PixelIcon from './PixelIcon';
import { Button } from './ui/Button';

/**
 * Site footer (SPEC §4): `Continue?` back to the title screen, the name and year, and the
 * build line. One row from `lg` (the name centred on the page), stacked and centred below.
 *
 * `Continue?` is a plain in-page link to `#hero`: the browser scrolls to the top (smoothly
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
          aria-label="Continue? Back to top"
          leadingIcon={<PixelIcon name="arrow-up" size={12} />}
          className="lg:justify-self-start"
        >
          Continue?
        </Button>
        <p className="text-hud text-fg-muted">Roy Carmelli © {year}</p>
        <p className="text-body-s text-fg-subtle lg:justify-self-end lg:text-right">
          Built from scratch: React · TypeScript · Canvas
        </p>
      </div>
    </footer>
  );
}
