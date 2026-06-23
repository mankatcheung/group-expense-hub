import type { Page } from '@playwright/test';

export class HeaderComponent {
  constructor(private readonly page: Page) {}

  get userMenuTrigger() {
    return this.page.getByRole('button', { name: /user menu/i });
  }

  get signOutItem() {
    return this.page.getByText('Sign Out');
  }

  async logout(): Promise<void> {
    await this.userMenuTrigger.click();
    await this.signOutItem.click();
  }
}
