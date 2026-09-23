import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Contact, { EMAIL_COPIED_MESSAGE, EMAIL_SELECTED_MESSAGE, EMAIL_SHOWN } from './Contact';
import { ToastProvider } from '../components/ui/Toast';
import { bio } from '../data/bio';

function renderContact() {
  return render(
    <ToastProvider>
      <Contact />
    </ToastProvider>,
  );
}

/** jsdom has neither API: each test installs the one it needs. */
function mockClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function mockExecCommand(impl: ((command: string) => boolean) | undefined) {
  Object.defineProperty(document, 'execCommand', { configurable: true, writable: true, value: impl });
}

afterEach(() => {
  mockClipboard(undefined);
  mockExecCommand(undefined);
  window.getSelection()?.removeAllRanges();
});

describe('Contact', () => {
  it('is a region labelled by its zone title', () => {
    renderContact();
    const region = screen.getByRole('region', { name: "Let's Talk" });
    expect(region).toHaveAttribute('id', 'contact');
    expect(within(region).getByRole('heading', { level: 2, name: "Let's Talk" })).toBeInTheDocument();
    expect(within(region).getByText('Zone 05 · Save Point')).toBeInTheDocument();
  });

  it('renders the email, GitHub, LinkedIn and phone links with accessible names', () => {
    renderContact();

    // Shown and read in lowercase; the mailto: link keeps the canonical address.
    expect(EMAIL_SHOWN).toBe('roy.y.carmelli@gmail.com');
    const email = screen.getByRole('link', { name: `Email me at ${EMAIL_SHOWN}` });
    expect(email).toHaveAttribute('href', `mailto:${bio.email}`);
    expect(email).toHaveTextContent('Email me');

    const github = screen.getByRole('link', { name: 'GitHub profile (opens in a new tab)' });
    expect(github).toHaveAttribute('href', bio.github);
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noreferrer');
    expect(github).toHaveTextContent('GitHub');

    const linkedin = screen.getByRole('link', { name: 'LinkedIn profile (opens in a new tab)' });
    expect(linkedin).toHaveAttribute('href', bio.linkedin);
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveTextContent('LinkedIn');

    const phone = screen.getByRole('link', { name: /^Phone \+972 54 728 7807$/ });
    expect(phone).toHaveAttribute('href', `tel:${bio.phone}`);
    expect(phone).not.toHaveAttribute('target');
    expect(phone).toHaveTextContent('Phone');
  });

  it('shows the contact blurb and the address as selectable text', () => {
    renderContact();
    expect(screen.getByText(/Available now for software engineering/)).toBeInTheDocument();
    expect(screen.getByText(EMAIL_SHOWN)).toHaveClass('select-all');
  });

  it('copies the email with the Clipboard API and shows the save toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderContact();

    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

    expect(await within(screen.getByRole('status')).findByText(EMAIL_COPIED_MESSAGE)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(EMAIL_SHOWN);
  });

  it('falls back to a hidden input and execCommand without the Clipboard API', async () => {
    let copiedValue = '';
    const execCommand = vi.fn((command: string) => {
      const active = document.activeElement as HTMLInputElement;
      copiedValue = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0);
      return command === 'copy';
    });
    mockExecCommand(execCommand);
    renderContact();
    const button = screen.getByRole('button', { name: 'Copy email' });
    button.focus();

    fireEvent.click(button);

    expect(await screen.findByText(EMAIL_COPIED_MESSAGE)).toBeInTheDocument();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copiedValue).toBe(EMAIL_SHOWN);
    // The helper input is gone and focus is back on the button.
    expect(document.querySelector('input')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('selects the address when the browser blocks both copy paths', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    mockExecCommand(() => false);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderContact();

    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

    expect(await screen.findByText(EMAIL_SELECTED_MESSAGE)).toBeInTheDocument();
    expect(window.getSelection()?.toString()).toBe(EMAIL_SHOWN);
    // The toast points "below", so the selected address is brought on screen.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrollIntoView.mock.contexts[0]).toHaveTextContent(EMAIL_SHOWN);
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('labels the copy button "Copy" and shows the phone number as text', () => {
    renderContact();
    const copy = screen.getByRole('button', { name: 'Copy email' });
    // The visible label (hidden below 640px by CSS) starts the accessible name.
    expect(copy).toHaveTextContent('Copy');
    const number = screen.getByText('+972 54 728 7807');
    expect(number).toHaveAttribute('aria-hidden', 'true');
    expect(number.closest('li')).toContainElement(screen.getByRole('link', { name: /^Phone / }));
  });

  it('draws Roy and the campfire once each, at one integer scale', () => {
    const { container } = renderContact();
    const roy = container.querySelectorAll<HTMLElement>('.px-character');
    const fire = container.querySelectorAll<HTMLElement>('.px-campfire');
    expect(roy).toHaveLength(1);
    expect(fire).toHaveLength(1);
    // jsdom has no matchMedia: the narrow (×2) scene. Roy's idle frame is 28×67.
    expect(fire[0]).toHaveAttribute('data-scale', '2');
    expect(roy[0].style.width).toBe('56px');
    expect(roy[0].style.height).toBe('134px');
  });

  it.each([
    ['laptops (1024-1599px)', ['(min-width: 1024px)'], '3', '201px'],
    ['large screens (1600px+)', ['(min-width: 1024px)', '(min-width: 1600px)'], '4', '268px'],
  ])('draws the save point larger on %s', (_label, matching, scale, royHeight) => {
    const matchMedia = vi.fn((query: string) => ({
      matches: matching.includes(query),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      const { container } = renderContact();
      expect(container.querySelector('.px-campfire')).toHaveAttribute('data-scale', scale);
      expect(container.querySelector<HTMLElement>('.px-character')!.style.height).toBe(royHeight);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the save-point sprites and caption out of the accessibility tree', () => {
    const { container } = renderContact();
    const sprites = container.querySelectorAll('.px-campfire, .px-character');
    expect(sprites.length).toBeGreaterThan(0);
    sprites.forEach(sprite => expect(sprite.closest('[aria-hidden="true"]')).not.toBeNull());
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Save point · progress saved/i).closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
