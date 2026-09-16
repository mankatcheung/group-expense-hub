import { createAppContainer, type AppContainer } from './container';

// The container holds instance state - the in-memory cache and rate
// limiters in particular - that must survive across requests within the
// same lambda instance. Rebuilding it per-request would silently turn
// caching and rate limiting into no-ops.
let container: AppContainer | undefined;

export function getContainer(): AppContainer {
  container ??= createAppContainer();
  return container;
}
