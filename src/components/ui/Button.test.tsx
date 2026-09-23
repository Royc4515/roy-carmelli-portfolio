import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a <button type="button"> with its label by default', () => {
    render(<Button>View projects</Button>);
    const button = screen.getByRole('button', { name: 'View projects' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('px-btn', 'px-btn--primary');
    expect(button).not.toHaveClass('px-btn--lg');
  });

  it('keeps an explicit submit type', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('renders an <a> when href is set, without target/rel by default', () => {
    render(<Button href="#projects">View projects</Button>);
    const link = screen.getByRole('link', { name: 'View projects' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#projects');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
    expect(link).not.toHaveAttribute('type');
  });

  it('opens external links in a new tab with rel="noreferrer"', () => {
    render(
      <Button href="https://github.com/Royc4515" external variant="secondary">
        Code
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Code' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveClass('px-btn--secondary');
  });

  it('adds the download attribute (boolean or file name)', () => {
    render(
      <>
        <Button href="/cv.pdf" download>
          Download
        </Button>
        <Button href="/cv.pdf" download="Roy_Carmelli_CV.pdf">
          Save as
        </Button>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', '');
    expect(screen.getByRole('link', { name: 'Save as' })).toHaveAttribute('download', 'Roy_Carmelli_CV.pdf');
  });

  it('disables a <button> natively and ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Start
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disables a link with aria-disabled and no href, so it cannot navigate', async () => {
    const onClick = vi.fn();
    render(
      <Button href="/cv.pdf" download external disabled onClick={onClick}>
        Resume
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Resume' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('href');
    expect(link).not.toHaveAttribute('download');
    expect(link).not.toHaveAttribute('target');
    await userEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('names an icon button from aria-label and hides the icon', () => {
    render(
      <Button variant="icon" aria-label="Copy email">
        <svg data-testid="icon" />
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Copy email' });
    expect(button).toHaveClass('px-btn--icon');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders leading and trailing icons as decoration around the label', () => {
    render(
      <Button
        size="lg"
        leadingIcon={<svg data-testid="lead" />}
        trailingIcon={<svg data-testid="trail" />}
      >
        Live
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Live' });
    expect(button).toHaveClass('px-btn--lg');
    const [lead, label, trail] = Array.from(button.children);
    expect(lead).toContainElement(screen.getByTestId('lead'));
    expect(lead).toHaveAttribute('aria-hidden', 'true');
    expect(label).toHaveTextContent('Live');
    expect(trail).toContainElement(screen.getByTestId('trail'));
    expect(trail).toHaveAttribute('aria-hidden', 'true');
  });

  it('ignores size on the ghost variant', () => {
    render(
      <Button variant="ghost" size="lg">
        Quest log
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Quest log' });
    expect(button).toHaveClass('px-btn--ghost');
    expect(button).not.toHaveClass('px-btn--lg');
  });

  it('forwards refs and extra props', () => {
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>();
    render(
      <Button ref={ref} className="w-full" aria-expanded="false" data-testid="menu">
        Menu
      </Button>,
    );
    const button = screen.getByTestId('menu');
    expect(ref.current).toBe(button);
    expect(button).toHaveClass('px-btn', 'w-full');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
