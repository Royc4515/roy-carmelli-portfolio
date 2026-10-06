import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gis = vi.hoisted(() => ({
  load: vi.fn(),
  clientId: 'client-123' as string | null,
}));
vi.mock('../../lib/googleIdentity', () => ({ loadGoogleIdentity: gis.load }));
vi.mock('../../lib/scoreboardConfig', () => ({ googleClientId: () => gis.clientId }));

import GoogleSignInButton from './GoogleSignInButton';

beforeEach(() => {
  gis.load.mockReset();
  gis.clientId = 'client-123';
});

describe('GoogleSignInButton', () => {
  it('initializes Google with this client and renders its button into the slot', async () => {
    let callback: (r: { credential?: string }) => void = () => {};
    const id = {
      initialize: vi.fn(cfg => (callback = cfg.callback)),
      renderButton: vi.fn(),
      disableAutoSelect: vi.fn(),
    };
    gis.load.mockResolvedValue(id);
    const onCredential = vi.fn();
    render(<GoogleSignInButton onCredential={onCredential} />);
    expect(screen.getByText(/loading google sign-in/i)).toBeInTheDocument();

    await waitFor(() => expect(id.renderButton).toHaveBeenCalled());
    expect(id.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-123', auto_select: false }));
    expect(id.renderButton.mock.calls[0][0]).toBe(screen.getByTestId('google-button-slot'));
    expect(screen.queryByText(/loading google sign-in/i)).toBeNull();

    callback({ credential: 'tok' });
    callback({}); // a callback without a credential is ignored
    expect(onCredential).toHaveBeenCalledTimes(1);
    expect(onCredential).toHaveBeenCalledWith('tok');
  });

  it('explains when the script is blocked or fails', async () => {
    gis.load.mockRejectedValue(new Error('blocked'));
    render(<GoogleSignInButton onCredential={() => {}} />);
    expect(await screen.findByText(/didn't load/i)).toBeInTheDocument();
  });

  it('does not load anything without a client ID', async () => {
    gis.clientId = null;
    render(<GoogleSignInButton onCredential={() => {}} />);
    expect(await screen.findByText(/didn't load/i)).toBeInTheDocument();
    expect(gis.load).not.toHaveBeenCalled();
  });
});
