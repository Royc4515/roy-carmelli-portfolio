import { useRef, type CSSProperties } from 'react';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import Character from '../components/Character';
import Campfire from '../components/Campfire';
import PixelIcon, { type PixelIconName } from '../components/PixelIcon';
import { Button } from '../components/ui/Button';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { useToast } from '../components/ui/Toast';
import { useMediaQuery } from '../hooks/useMediaQuery';

/** Toast after the address lands on the clipboard. */
export const EMAIL_COPIED_MESSAGE = 'Email copied · progress saved';
/** Toast when the browser refuses both copy paths: the address is selected instead. */
export const EMAIL_SELECTED_MESSAGE = 'Copy blocked · address selected below';

/**
 * The address as shown, read out and copied: lowercase reads cleaner (the domain is
 * case-insensitive and Gmail ignores case in the local part). `mailto:` keeps `bio.email`.
 */
export const EMAIL_SHOWN = bio.email.toLowerCase();

/** Keeps "CS × neuroscience" on one line, so the "×" never starts or ends a line. */
const blurb = bio.contactBlurb.replace(/ × /g, ' × ');

/** "+972547287807" → "+972 54 728 7807": readable on screen, read as digit groups aloud. */
const phoneSpoken = bio.phone.replace(/^(\+\d{3})(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3 $4');

interface Channel {
  label: string;
  /** Accessible name; starts with the visible label. */
  name: string;
  icon: PixelIconName;
  href: string;
  external: boolean;
  /** Shown under the button from 640px up, where a `tel:` link may not dial anything. */
  caption?: string;
}

const channels: Channel[] = [
  { label: 'GitHub', name: 'GitHub profile', icon: 'github', href: bio.github, external: true },
  { label: 'LinkedIn', name: 'LinkedIn profile', icon: 'linkedin', href: bio.linkedin, external: true },
  {
    label: 'Phone',
    name: `Phone ${phoneSpoken}`,
    icon: 'phone',
    href: `tel:${bio.phone}`,
    external: false,
    caption: phoneSpoken,
  },
];

/**
 * Copies `text`: the async Clipboard API first, then a hidden read-only input with
 * `execCommand('copy')` (older browsers, insecure contexts). Resolves `false` when both fail.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not a secure context: try the legacy path.
  }
  if (typeof document.execCommand !== 'function') return false;

  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = document.createElement('input');
  input.value = text;
  input.readOnly = true; // no on-screen keyboard on touch devices
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  input.className = 'pointer-events-none fixed left-0 top-0 h-px w-px opacity-0';
  document.body.append(input);
  // select() alone does not always focus, and execCommand copies the focused selection.
  input.focus({ preventScroll: true });
  input.select();
  input.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  input.remove();
  previous?.focus({ preventScroll: true });
  return copied;
}

/** The save point's scale: Roy ×4 from 1600px, ×3 on laptops (1024-1599), ×2 below. */
const WIDE_QUERY = '(min-width: 1024px)';
const XL_QUERY = '(min-width: 1600px)';

/**
 * The "save point": Roy standing by a campfire on a 4px ground line. Decorative, so hidden
 * from assistive tech. Roy and the fire render once each at ONE integer scale (their pixels
 * match), and distances in the scene are counted in sprite pixels (`--sp` is one sprite pixel
 * on screen): 8 between Roy and the fire, 2 of dimmer lit ground each side of the fire.
 *
 * ≥ 1024 the ground spans the column and the caption hangs below it, out of the flow, so the
 * ground can sit level with the bottom frame of the contact panel beside it. On short laptop
 * screens the section's 24px bottom padding can't hold it, so it floats above the scene
 * instead, in the flow (the column has room to spare above Roy).
 */
function SavePoint() {
  const wide = useMediaQuery(WIDE_QUERY);
  const xl = useMediaQuery(XL_QUERY);
  const scale = xl ? 4 : wide ? 3 : 2;
  const vars = { '--sp': `${scale}px` } as CSSProperties;

  return (
    <div className="relative flex flex-col items-center lg:items-stretch" style={vars} aria-hidden="true">
      <div className="flex items-end justify-center gap-[calc(var(--sp)*8)] border-b-4 border-border-subtle px-10">
        <Character pose="idle" scale={scale} decorative />
        <span className="relative block">
          <Campfire scale={scale} />
          {/* The ground the fire lights, drawn over the ground line. */}
          <span className="absolute -inset-x-[calc(var(--sp)*2)] -bottom-1 h-1 bg-accent-press" />
          <span className="absolute inset-x-0 -bottom-1 h-1 bg-accent" />
        </span>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-hud uppercase text-fg-subtle lg:absolute lg:inset-x-0 lg:top-full short:static short:order-first short:mb-4 short:mt-0">
        <PixelIcon name="check" size={12} className="text-xp" />
        Save point · progress saved
      </p>
    </div>
  );
}

/**
 * Zone 05 · Save Point (SPEC §4 Contact). No form (there is no backend): a `mailto:` button,
 * a copy-to-clipboard button with a toast, the address as selectable text, and GitHub,
 * LinkedIn and Phone as labelled secondary buttons (the number shown under Phone).
 */
export default function Contact() {
  const toast = useToast();
  const addressRef = useRef<HTMLParagraphElement>(null);

  const copyEmail = async () => {
    if (await copyText(EMAIL_SHOWN)) {
      toast.show(EMAIL_COPIED_MESSAGE, { icon: <PixelIcon name="check" size={24} /> });
      return;
    }
    // Last resort: select the visible address so a manual copy is one keystroke away.
    const address = addressRef.current;
    const selection = window.getSelection();
    if (address && selection) selection.selectAllChildren(address);
    toast.show(EMAIL_SELECTED_MESSAGE, { icon: <PixelIcon name="copy" size={24} /> });
  };

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative bg-bg px-dots py-12 md:py-16 min-[100rem]:py-20 short:py-6">
      <div className="relative mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={5}
            name="Save Point"
            title="Let's Talk"
            icon={<PixelIcon name="mail" size={36} />}
            id="contact-title"
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-6">
          {/* -mb-1: the ground line sits level with the panel's 4px bottom frame. */}
          <Reveal index={1} className="lg:col-span-5 lg:-mb-1">
            <SavePoint />
          </Reveal>

          {/* Short laptop screens: 16px padding and a tighter rhythm (12/16/16/16); buttons draw
              4px above and 8px below their box, so the visual gaps come out at 10-15px. */}
          <Reveal index={2} className="lg:col-span-7">
            <PixelPanel variant="wood" elevation={2} className="short:p-4">
              <p className="max-w-[60ch] text-body text-fg">{blurb}</p>

              <div className="mt-6 flex gap-4 short:mt-3">
                <Button
                  href={`mailto:${bio.email}`}
                  size="lg"
                  aria-label={`Email me at ${EMAIL_SHOWN}`}
                  leadingIcon={<PixelIcon name="mail" size={24} />}
                  className="flex-1 sm:flex-none"
                >
                  Email me
                </Button>
                {/* Icon + "Copy" from 640px; below, a 44px icon-only square (the lg height on phones). */}
                <Button
                  variant="secondary"
                  size="lg"
                  aria-label="Copy email"
                  onClick={copyEmail}
                  leadingIcon={<PixelIcon name="copy" size={24} />}
                  className="max-sm:w-11 max-sm:gap-0 max-sm:px-0 max-sm:[&_svg]:size-6"
                >
                  <span className="max-sm:hidden">Copy</span>
                </Button>
              </div>
              <p ref={addressRef} className="mt-6 select-all break-all text-hud text-fg-muted short:mt-4">
                {EMAIL_SHOWN}
              </p>

              <ul className="mt-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3 lg:flex lg:flex-wrap short:mt-4">
                {channels.map(channel => (
                  <li key={channel.label} className="flex flex-col items-center">
                    <Button
                      variant="secondary"
                      href={channel.href}
                      external={channel.external}
                      aria-label={channel.name}
                      leadingIcon={<PixelIcon name={channel.icon} size={12} />}
                      className="w-full"
                    >
                      {channel.label}
                    </Button>
                    {channel.caption && (
                      // Same text as the link's accessible name: shown, not read out twice.
                      <p aria-hidden="true" className="mt-4 hidden select-all text-hud text-fg-muted sm:block">
                        {channel.caption}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </PixelPanel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
