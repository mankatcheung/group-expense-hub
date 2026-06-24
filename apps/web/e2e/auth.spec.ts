import { test, expect } from '@playwright/test';
import { RegisterPage } from './pages/register-page.js';
import { LoginPage } from './pages/login-page.js';
import { HeaderComponent } from './pages/header.js';
import { createTestUser } from './fixtures/test-user.js';

test.describe('authentication', () => {
  test('registers a new user and lands authenticated on the home page', async ({ page }) => {
    const user = createTestUser('register');
    const registerPage = new RegisterPage(page);

    await registerPage.goto();
    await registerPage.register(user.name, user.email, user.password);

    await expect(page).toHaveURL('/en');
    await expect(page.getByText(`Hello, ${user.name}`)).toBeVisible();
  });

  test('logs out and logs back in with the same credentials', async ({ page }) => {
    const user = createTestUser('login');
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const header = new HeaderComponent(page);

    await registerPage.goto();
    await registerPage.register(user.name, user.email, user.password);
    await expect(page).toHaveURL('/en');

    await header.logout();
    await expect(page).toHaveURL('/en/login');

    await loginPage.login(user.email, user.password);

    await expect(page).toHaveURL('/en');
    await expect(page.getByText(`Hello, ${user.name}`)).toBeVisible();
  });

  test('shows an error toast on login with the wrong password', async ({ page }) => {
    const user = createTestUser('badpw');
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const header = new HeaderComponent(page);

    // Register first so the account genuinely exists, then sign out so the
    // wrong-password attempt below exercises a real credential mismatch
    // rather than a "no such user" error.
    await registerPage.goto();
    await registerPage.register(user.name, user.email, user.password);
    await expect(page).toHaveURL('/en');
    await header.logout();
    await expect(page).toHaveURL('/en/login');

    await loginPage.login(user.email, 'definitely-the-wrong-password');

    await expect(page.getByText('Failed to login')).toBeVisible();
    await expect(page).toHaveURL('/en/login');
  });
});
