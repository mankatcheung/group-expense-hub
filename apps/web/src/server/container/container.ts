import { createContainer } from '@evyweb/ioctopus';
import type { AppRegistry } from './tokens';
import { createInfrastructureModule } from './modules/infrastructure.module';
import { createUseCasesModule } from './modules/use-cases.module';

export type AppContainer = ReturnType<typeof createContainer<AppRegistry>>;

export function createAppContainer(): AppContainer {
  const container = createContainer<AppRegistry>();
  container.load('infrastructure', createInfrastructureModule());
  container.load('use-cases', createUseCasesModule());
  return container;
}
