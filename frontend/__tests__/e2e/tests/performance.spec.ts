import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TimesheetPage } from '../pages/TimesheetPage';

test.describe('Timesheet Performance Tests', () => {
  test('should load calendar view within acceptable time', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const timesheetPage = new TimesheetPage(page);
    await page.goto('/');
    await loginPage.loginAsEmployee();
    const start = Date.now();
    await timesheetPage.navigateToCalendarView();
    await timesheetPage.calendarGrid.waitFor();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('should handle large timesheet datasets efficiently', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const timesheetPage = new TimesheetPage(page);
    await page.goto('/');
    await loginPage.loginAsEmployee();
    const start = Date.now();
    await timesheetPage.navigateToListView();
    await timesheetPage.timesheetCards.first().waitFor();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
