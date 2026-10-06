import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatLauncher from './ChatLauncher';
import { chatPersona } from '../../data/chatPersona';

describe('ChatLauncher', () => {
  it('renders nothing unless the chat is enabled (tests and previews run without it)', () => {
    const { container } = render(<ChatLauncher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the panel lazily and closes it back to the launcher', async () => {
    render(<ChatLauncher enabled />);
    const launcher = screen.getByRole('button', { name: chatPersona.launcherLabel });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('chat-panel')).toBeNull();

    await userEvent.click(launcher);
    expect(await screen.findByRole('dialog', { name: /pixel roy/i })).toBeInTheDocument();
    expect(launcher).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher).toHaveFocus();
  });
});
