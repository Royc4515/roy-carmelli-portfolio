import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatLauncher from './ChatLauncher';
import { chatPersona } from '../../data/chatPersona';

// A chunk that cannot be fetched (offline, or a tab left open across a redeploy).
vi.mock('./ChatPanel', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});

it('shows a load-failed message instead of a dead button', async () => {
  render(<ChatLauncher enabled />);
  await userEvent.click(screen.getByRole('button', { name: chatPersona.launcherLabel }));
  expect(await screen.findByRole('alert')).toHaveTextContent(chatPersona.loadFailed);
  await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
  expect(screen.queryByRole('alert')).toBeNull();
});
