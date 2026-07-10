import { createContainer } from '@evyweb/ioctopus';
import type { AppRegistry } from './tokens.js';
import { createInfrastructureModule } from './modules/infrastructure.module.js';
import { createUseCasesModule } from './modules/use-cases.module.js';

export type AppContainer = ReturnType<typeof createContainer<AppRegistry>>;

export function createAppContainer(): AppContainer {
  const container = createContainer<AppRegistry>();
  container.load('infrastructure', createInfrastructureModule());
  container.load('use-cases', createUseCasesModule());
  return container;
}
