import { useRef } from 'react';
import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import Character from '../components/Character';
import Campfire from '../components/Campfire';
import PixelIcon, { type PixelIconName } from '../components/PixelIcon';
import { Button } from '../components/ui/Button';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { useToast } from '../components/ui/Toast';

/** Toast after the address lands on the clipboard. */
export const EMAIL_COPIED_MESSAGE = 'Email copied · progress saved';
/** Toast when the browser refuses both copy paths: the address is selected instead. */
export const EMAIL_SELECTED_MESSAGE = 'Copy blocked · address selected below';

/** Keeps "CS × neuroscience" on one line, so the "×" never starts or ends a line. */
const blurb = bio.contactBlurb.replace(/ × /g, '\u00a0×\u00a0');

/** "+972547287807" → "+972 54 728 7807", so screen readers read digit groups, not one number. */
const phoneSpoken = bio.phone.replace(/^(\+\d{3})(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3 $4');

interface Channel {
  label: string;
  /** Accessible name; starts with the visible label. */
  name: string;
  icon: PixelIconName;
  href: string;
  external: boolean;
}

const channels: Channel[] = [
  { label: 'GitHub', name: 'GitHub profile', icon: 'github', href: bio.github, external: true },
  { label: 'LinkedIn', name: 'LinkedIn profile', icon: 'linkedin', href: bio.linkedin, external: true },
  { label: 'Phone', name: `Phone ${phoneSpoken}`, icon: 'phone', href: `tel:${bio.phone}`, external: false },
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

/**
 * Ground the fire lights: its own width in `accent`, then one more sprite pixel (4 native px
 * × scale) each side in `accent-press`, drawn over the 4px ground line.
 */
function LitGround({ scale }: { scale: 3 | 4 }) {
  const reach = scale === 4 ? '-inset-x-4' : '-inset-x-3';
  return (
    <>
      <span className={`absolute -bottom-1 h-1 bg-accent-press ${reach}`} />
      <span className="absolute inset-x-0 -bottom-1 h-1 bg-accent" />
    </>
  );
}

/** The "save point": Roy standing by a campfire on a 4px ground line. Decorative. */
function SavePoint() {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-end justify-center gap-6 border-b-4 border-border-subtle px-10 lg:gap-8 lg:px-14"
        aria-hidden="true"
      >
        {/* One sprite per breakpoint: both render at integer scale, CSS picks one. */}
        <span className="block lg:hidden">
          <Character pose="idle" scale={2} decorative />
        </span>
        <span className="hidden lg:block">
          <Character pose="idle" scale={3} decorative />
        </span>
        <span className="relative block lg:hidden">
          <Campfire scale={3} />
          <LitGround scale={3} />
        </span>
        <span className="relative hidden lg:block">
          <Campfire scale={4} />
          <LitGround scale={4} />
        </span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-hud uppercase text-fg-subtle">
        <PixelIcon name="check" size={12} className="text-xp" />
        Save point · progress saved
      </p>
    </div>
  );
}

/**
 * Zone 05 · Save Point (SPEC §4 Contact). No form (there is no backend): a `mailto:` button,
 * a copy-to-clipboard button with a toast, the address as selectable text, and GitHub,
 * LinkedIn and Phone as labelled secondary buttons.
 */
export default function Contact() {
  const toast = useToast();
  const addressRef = useRef<HTMLParagraphElement>(null);

  const copyEmail = async () => {
    if (await copyText(bio.email)) {
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
    <section id="contact" aria-labelledby="contact-title" className="relative bg-bg px-dots py-16 md:py-24">
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
          <Reveal index={1} className="lg:col-span-5">
            <SavePoint />
          </Reveal>

          <Reveal index={2} className="lg:col-span-7">
            <PixelPanel variant="wood" elevation={2}>
              <p className="max-w-[60ch] text-body text-fg">{blurb}</p>

              <div className="mt-6 flex gap-4">
                <Button
                  href={`mailto:${bio.email}`}
                  size="lg"
                  aria-label={`Email me at ${bio.email}`}
                  leadingIcon={<PixelIcon name="mail" size={24} />}
                  className="flex-1 sm:flex-none"
                >
                  Email me
                </Button>
                <Button variant="icon" size="lg" aria-label="Copy email" onClick={copyEmail}>
                  <PixelIcon name="copy" size={24} />
                </Button>
              </div>
              <p ref={addressRef} className="mt-6 select-all break-all text-hud text-fg-muted">
                {bio.email}
              </p>

              <ul className="mt-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3 lg:flex lg:flex-wrap">
                {channels.map(channel => (
                  <li key={channel.label}>
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
