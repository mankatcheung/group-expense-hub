import type { Page } from '@playwright/test';

export class TripDetailPage {
  constructor(private readonly page: Page) {}

  async goto(tripId: string): Promise<void> {
    await this.page.goto(`/trip/${tripId}`);
  }

  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get membersTab() {
    return this.page.getByRole('tab', { name: 'Members' });
  }

  get expensesTab() {
    return this.page.getByRole('tab', { name: 'Expenses' });
  }

  get summaryTab() {
    return this.page.getByRole('tab', { name: 'Summary' });
  }

  get memberNameInput() {
    return this.page.getByLabel('Member name');
  }

  get addMemberButton() {
    return this.page.getByRole('button', { name: 'Add member' });
  }

  get addExpenseButton() {
    return this.page.getByRole('button', { name: /add expense/i });
  }

  async addMember(name: string): Promise<void> {
    await this.membersTab.click();
    await this.memberNameInput.fill(name);
    await this.addMemberButton.click();
  }

  memberChip(name: string) {
    return this.page.locator('span', { hasText: name }).first();
  }

  expenseRow(description: string) {
    return this.page.locator('div', { hasText: description }).last();
  }
}
