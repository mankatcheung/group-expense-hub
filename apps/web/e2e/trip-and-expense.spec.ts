import { test, expect } from '@playwright/test';
import { RegisterPage } from './pages/register-page.js';
import { HomePage } from './pages/home-page.js';
import { TripDetailPage } from './pages/trip-detail-page.js';
import { AddExpensePage } from './pages/add-expense-page.js';
import { createTestUser } from './fixtures/test-user.js';

test.describe('trip and expense journey', () => {
  test('creates a trip from the home page and opens its detail page', async ({ page }) => {
    const user = createTestUser('trip-create');
    const registerPage = new RegisterPage(page);
    const homePage = new HomePage(page);

    await registerPage.goto();
    await registerPage.register(user.name, user.email, user.password);
    await expect(page).toHaveURL('/');

    const tripName = `Bali Trip ${Date.now()}`;
    await homePage.createTrip(tripName);

    await expect(page).toHaveURL(/\/trip\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: tripName })).toBeVisible();
  });

  test('adds an expense and sees it reflected in the expense list and balance summary', async ({
    page,
  }) => {
    const user = createTestUser('expense-add');
    const registerPage = new RegisterPage(page);
    const homePage = new HomePage(page);
    const tripDetailPage = new TripDetailPage(page);
    const addExpensePage = new AddExpensePage(page);

    await registerPage.goto();
    await registerPage.register(user.name, user.email, user.password);
    await expect(page).toHaveURL('/');

    const tripName = `Tokyo Trip ${Date.now()}`;
    await homePage.createTrip(tripName);
    await expect(page).toHaveURL(/\/trip\/[0-9a-f-]+$/);

    // Expenses require at least two members to split among, per AddExpense's
    // own guard ("Add at least 2 members to start adding expenses").
    await tripDetailPage.addMember('Alice');
    await tripDetailPage.addMember('Bob');
    await expect(tripDetailPage.memberChip('Alice')).toBeVisible();
    await expect(tripDetailPage.memberChip('Bob')).toBeVisible();

    // The "Add Expense" button only renders inside the Expenses tab's
    // content (app/trip/[tripId]/page.tsx), not the Members tab used above.
    await tripDetailPage.expensesTab.click();
    await tripDetailPage.addExpenseButton.click();
    await expect(page).toHaveURL(/\/trip\/[0-9a-f-]+\/add$/);

    await addExpensePage.addExpense({
      description: 'Dinner at Shibuya',
      amount: '42.50',
      paidByName: 'Alice',
    });

    // AddExpense's onAdd only updates trip-detail query cache state -
    // app/trip/[tripId]/add/page.tsx never navigates away on submit, so the
    // back button (wired to navigate(`/trip/${tripId}`)) is used explicitly.
    await page.getByLabel('Go back').click();
    await expect(page).toHaveURL(/\/trip\/[0-9a-f-]+$/);
    await tripDetailPage.expensesTab.click();
    await expect(page.getByText('Dinner at Shibuya')).toBeVisible();
    await expect(page.getByText('$42.50')).toBeVisible();

    await tripDetailPage.summaryTab.click();
    // Bob paid nothing and split a $42.50 expense evenly with Alice, so the
    // simplified-debt summary (calculateBalances) renders one row: Bob (the
    // debtor, "from") -> Alice (the creditor, "to") for half the amount.
    const balanceRow = page.locator('div', { hasText: 'Bob' }).filter({ hasText: 'Alice' }).last();
    await expect(balanceRow).toBeVisible();
    await expect(balanceRow).toContainText('$21.25');
  });
});
