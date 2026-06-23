import type { Page } from '@playwright/test';

export class AddExpensePage {
  constructor(private readonly page: Page) {}

  get descriptionInput() {
    return this.page.getByLabel('Expense description');
  }

  get amountInput() {
    return this.page.getByLabel('Expense amount');
  }

  get paidBySelect() {
    return this.page.getByLabel('Select who paid');
  }

  get selectAllSplitLink() {
    return this.page.getByText('Select all');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /^add expense$/i });
  }

  async addExpense(options: {
    description: string;
    amount: string;
    paidByName: string;
  }): Promise<void> {
    await this.descriptionInput.fill(options.description);
    await this.amountInput.fill(options.amount);

    await this.paidBySelect.click();
    await this.page.getByRole('option', { name: options.paidByName }).click();

    await this.selectAllSplitLink.click();
    await this.submitButton.click();
  }
}
