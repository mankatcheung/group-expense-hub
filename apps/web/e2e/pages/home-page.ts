import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  get newTripInput() {
    return this.page.getByPlaceholder('e.g. Bali 2026, Road Trip...');
  }

  get createTripButton() {
    return this.page.getByRole('button', { name: /create/i });
  }

  tripCard(name: string) {
    return this.page.locator('div.group', { hasText: name }).first();
  }

  async createTrip(name: string): Promise<void> {
    await this.newTripInput.fill(name);
    await this.createTripButton.click();
  }
}
