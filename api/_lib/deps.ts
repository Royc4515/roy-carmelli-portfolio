import { readServerConfig, type ServerConfig } from './config.js';
import { verifyGoogleIdToken, type GoogleIdentity } from './google.js';
import { storeFor, type ScoreStore } from './store.js';

/** What the handlers need from the outside world; tests pass fakes instead. */
export interface Deps {
  config: ServerConfig | null;
  store: (config: ServerConfig) => ScoreStore;
  verifyGoogle: (token: string, clientId: string) => Promise<GoogleIdentity | null>;
}

export function defaultDeps(): Deps {
  return {
    config: readServerConfig(),
    store: config => storeFor(config.databaseUrl),
    verifyGoogle: (token, clientId) => verifyGoogleIdToken(token, clientId),
  };
}
