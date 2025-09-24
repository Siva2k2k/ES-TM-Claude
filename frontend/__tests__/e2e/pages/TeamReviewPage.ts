import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TeamReviewPage extends BasePage {
  readonly loadingScreen: Locator;
  readonly selectQueue: Locator;

  constructor(page: Page) {
    super(page);
    this.loadingScreen = page.getByText('Loading team timesheets...');
    this.selectQueue = page.getByRole('button', { name: /Approval Queue/i })
  }

  async navigateToTeamReview() {
    await this.loadingScreen.isHidden();
    await this.navigate('Team Review');
    await this.page.getByRole('heading', { name: 'Team Review' }).waitFor();
  }

  // async selectPendingTab() {
  //   await this.pendingTab.click();
  // }

  async selectQueueTab() {
    await this.selectQueue.click();
  }

  async selectManagementPendingTab() {
    // For management pending view, use the Approval Queue tab
    await this.selectQueue.click();
  }

  async findTimesheetByWeek(weekStart: string): Promise<Locator> {    
    const formattedDate = this.formatWeekStart(weekStart);
    return this.page.locator('tr').filter({ hasText: formattedDate });
  }

  private formatWeekStart(weekStart: string): string {
    const date = new Date(weekStart);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async findTimesheetByWeekAndEmployee(weekStart: string, employeeName: string): Promise<Locator> {
    const formattedDate = this.formatWeekStart(weekStart);
    return this.page.locator('tr')
      .filter({ hasText: formattedDate })
      .filter({ hasText: employeeName });
  }

  // async findTimesheetById(id: string): Promise<Locator> {
  //   return this.page.locator(`[data-testid="timesheet-${id}"]`);
  // }

  async approveTimesheet(card: Locator) {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept(); // always accept
    });

    await card.locator('button[title="Approve timesheet"]').click();
    await this.page.waitForTimeout(1000);
  }

  async finalApproveTimesheet(card: Locator) {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept(); // always accept
    });
    await card.locator('button[title="Approve timesheet"]').click();
    await this.page.waitForTimeout(1000);
  }

  async rejectTimesheet(card: Locator, reason: string) {
    await card.locator('button[title="Reject timesheet"]').click();
    // const modal = this.page.getByRole('dialog', { name: 'Reject Timesheet' });
    // await expect(modal.getByRole('heading', { name: 'Reject Timesheet' })).toBeVisible();
    await this.page.locator('textarea').fill(reason);
    await this.page.locator('[data-testid="reject-btn"]').click();
    await this.page.locator('[data-testid="reject=close-btn"]').click();
    // await expect(modal).toBeHidden({ timeout: 3000 });
    await this.page.waitForTimeout(1000);
  }

  getTimesheetStatus(card: Locator): Locator {
    // Status badge is in the 4th column (Status column) - use flexible selector
    return card.locator('td:nth-child(4) span, td span').filter({ 
      hasText: /SUBMITTED|MANAGER.APPROVED|MANAGER.REJECTED|MANAGEMENT.PENDING|FROZEN|DRAFT|BILLED/i 
    }).first();
  }

  async viewTimesheetDetails(card: Locator) {
    await card.locator('button[title="View full details"]').click();
  }





  async selectViewMode(mode: 'list' | 'approval') {
    if (mode === 'list') {
      await this.page.getByRole('button', { name: /All Timesheets/i }).click();
    } else {
      await this.page.getByRole('button', { name: /Approval Queue/i }).click();
    }
  }

  async expandTimesheetDetails(card: Locator) {
    // Click the chevron to expand row details
    await card.locator('button').first().click(); // The expand/collapse button is the first button
  }

  async searchTimesheets(searchTerm: string) {
    await this.page.getByPlaceholder('Search by employee name or status...').fill(searchTerm);
  }

  async filterByUser(userName: string) {
    await this.page.locator('select').nth(0).selectOption({ label: userName });
  }

  async filterByStatus(status: string) {
    await this.page.locator('select').nth(1).selectOption(status);
  }

  async refreshTimesheets() {
    await this.page.locator('button[title="Refresh"]').click();
  }

  async closeTimesheetModal() {
    // Close the timesheet detail modal
    await this.page.locator('button').filter({ hasText: 'Close' }).click();
  }

  async getTimesheetSummaryStats() {
    return {
      teamMembers: await this.page.locator('div:has-text("Team Members") + p').textContent(),
      pendingReview: await this.page.locator('div:has-text("Pending Review") + p').textContent(),
      approved: await this.page.locator('div:has-text("Approved") + p').textContent(),
      totalHours: await this.page.locator('div:has-text("Total Hours") + p').textContent(),
    };
  }

  // Wait for specific timesheet status
  async waitForTimesheetStatus(timesheetLocator: Locator, expectedStatus: string) {
    await timesheetLocator.locator(`span:has-text("${expectedStatus.toUpperCase()}")`).waitFor();
  }

  // Check if user has approval permissions
  async hasApprovalPermissions(): Promise<boolean> {
    return await this.page.getByRole('button', { name: /Approval Queue/i }).isVisible();
  }

  // Get user role indicator
  async getUserRoleIndicator(): Promise<string | null> {
    const roleSpan = this.page.locator('span').filter({ 
      hasText: /View Only Access|Approval Authority|Full Management Access/i 
    });
    return await roleSpan.textContent();
  }
}
