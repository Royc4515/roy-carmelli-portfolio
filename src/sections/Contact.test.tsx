import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Contact, { EMAIL_COPIED_MESSAGE, EMAIL_SELECTED_MESSAGE } from './Contact';
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

    const email = screen.getByRole('link', { name: `Email me at ${bio.email}` });
    expect(email).toHaveAttribute('href', `mailto:${bio.email}`);
    expect(email).toHaveTextContent('Email me');

    const github = screen.getByRole('link', { name: 'GitHub profile' });
    expect(github).toHaveAttribute('href', bio.github);
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noreferrer');
    expect(github).toHaveTextContent('GitHub');

    const linkedin = screen.getByRole('link', { name: 'LinkedIn profile' });
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
    expect(screen.getByText(bio.email)).toHaveClass('select-all');
  });

  it('copies the email with the Clipboard API and shows the save toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderContact();

    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

    expect(await within(screen.getByRole('status')).findByText(EMAIL_COPIED_MESSAGE)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(bio.email);
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
    expect(copiedValue).toBe(bio.email);
    // The helper input is gone and focus is back on the button.
    expect(document.querySelector('input')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('selects the address when the browser blocks both copy paths', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    mockExecCommand(() => false);
    renderContact();

    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

    expect(await screen.findByText(EMAIL_SELECTED_MESSAGE)).toBeInTheDocument();
    expect(window.getSelection()?.toString()).toBe(bio.email);
  });

  it('keeps the save-point sprites out of the accessibility tree', () => {
    const { container } = renderContact();
    const sprites = container.querySelectorAll('.px-campfire, .px-character');
    expect(sprites.length).toBeGreaterThan(0);
    sprites.forEach(sprite => expect(sprite.closest('[aria-hidden="true"]')).not.toBeNull());
    expect(screen.queryByRole('img')).toBeNull();
  });
});
