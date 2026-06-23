import type { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  get nameInput() {
    return this.page.getByPlaceholder('Full Name');
  }

  get emailInput() {
    return this.page.getByPlaceholder('Email');
  }

  get passwordInput() {
    return this.page.getByPlaceholder('Password', { exact: true });
  }

  get confirmPasswordInput() {
    return this.page.getByPlaceholder('Confirm Password');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /sign up/i });
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }
}
