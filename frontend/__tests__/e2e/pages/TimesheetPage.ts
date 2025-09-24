import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TimesheetPage extends BasePage {
  readonly calendarView: Locator;
  readonly calendarGrid: Locator;
  readonly monthNavigation: Locator;
  readonly newTimesheetButton: Locator;

  readonly listView: Locator;
  readonly timesheetCards: Locator;
  readonly viewToggle: Locator;

  readonly existingTimesheetModal: Locator;
  readonly createNewOnModal: Locator;
  readonly timesheetForm: Locator;
  readonly weekStartInput: Locator;
  readonly projectSelect: Locator;
  readonly taskSelect: Locator;
  readonly hoursInput: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly addEntryButton: Locator;
  readonly createButton: Locator;
  readonly submitButton: Locator;

  readonly statusBadge: Locator;
  readonly approvalButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.calendarView = page.getByText(/Timesheet Calendar/i);
    this.calendarGrid = page.locator('[data-testid="calendar-grid"]'); //added to the component
    this.monthNavigation = page.locator('[data-testid="month-navigation"]');
    this.newTimesheetButton = page.getByText(/New Timesheet/i);

    this.listView = page.getByText(/Timesheets List/i);
    this.timesheetCards = page.locator('[data-testid="timesheet-card"]');
    this.viewToggle = page.locator('[data-testid="view-toggle"]');

    this.existingTimesheetModal = page.getByText(/Select Timesheet to Continue/i);
    this.createNewOnModal = page.getByRole('button', { name: /create new/i });

    this.timesheetForm = page.getByText(/Create New Timesheet/i);
    this.weekStartInput = page.getByLabel('Week Starting (Monday)');
    this.projectSelect = page.getByLabel('Project *');
    this.taskSelect = page.getByLabel('Task *');
    this.hoursInput = page.getByLabel(/hours/i);
    this.descriptionInput =page.getByLabel('Work Description');
    this.dateInput = page.locator('#date-input');
    this.addEntryButton = page.getByText(/Add Entry/i);
    this.createButton =page.getByText(/Create Timesheet|Update Timesheet/i);
    this.submitButton = page.getByText(/Submit for Approval/i);
    this.statusBadge = page.locator('[data-testid="status-badge"]');
    this.approvalButtons = page.locator('[data-testid="approval-buttons"]');
  }

  async navigateToCalendarView() {
    // await this.navigate('timesheet', 'calendar');
    if (!(await this.page.getByRole('button', { name: 'calendar' }).isVisible())) {
      await this.page.getByRole('button', { name: 'timesheet' }).first().click();
    }
    await this.page.getByRole('button', { name: 'calendar' }).click();
    await expect(this.calendarView).toBeVisible();
  }

  async navigateToListView() {
    if (!(await this.page.getByRole('button', { name: 'list' }).isVisible())) {
      await this.page.getByRole('button', { name: 'timesheet' }).first().click();
    }
    await this.page.getByRole('button', { name: 'list' }).click();
    await expect(this.listView).toBeVisible();
  }

  async createNewTimesheet(weekStart: string) {
    await this.newTimesheetButton.click();
    if (await this.existingTimesheetModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    // If modal shows up, either resume existing or create new
    
    if (await this.createNewOnModal.isVisible()) {
      await this.createNewOnModal.click();
    } else {
      // fallback: pick the first draft/rejected one
      await this.existingTimesheetModal.getByText('Week of').first().click();
    }
  }
    await expect(this.timesheetForm).toBeVisible();
    await this.weekStartInput.fill(weekStart);
    await expect(this.page.getByText(/Week:/)).toBeVisible();
  }

  async addTimeEntry(entry: { project: string; task: string; date: string; hours: number; description: string; }) {
    await expect(
      this.projectSelect.locator('option[value=""]')
    ).toHaveText('Select a project...');
    await this.projectSelect.selectOption({ label: `${entry.project} (Active Project)` });
    await expect(this.taskSelect).toBeEnabled();
    await expect.poll(async () => {
      return await this.taskSelect.locator('option').count();
    }).toBeGreaterThan(0);
    await this.taskSelect.selectOption(entry.task);
    await this.hoursInput.fill(entry.hours.toString());
    await this.descriptionInput.fill(`[E2E_TEST] ${entry.description}`); // tag for cleanup
    await this.selectDate(entry.date);
    await this.addEntryButton.click();
  }

  async selectDate(entryDate: string, bulk = false) {
    if (bulk) {
      await this.page.getByText(`Multiple Days`).check();
    } else {
      await this.dateInput.fill(entryDate);
      await expect(this.dateInput).toHaveValue(entryDate);
    }
}

  async saveTimesheet() {
    this.page.on('dialog', async (dialog) => {
        console.log('Dialog:', dialog.message());
        await dialog.accept(); // Accept all dialogs
    });
    
    console.log('Clicking create button...');
    await this.createButton.click();
    
    console.log('Waiting for form to close...');
    // Wait for the form to close - this indicates the frontend process is done
    await expect(this.timesheetForm).toBeHidden({ timeout: 20000 });
    
    console.log('Form closed, waiting for network to settle...');
    // Wait for network to settle to ensure all requests are completed
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    
    console.log('Network settled, adding additional wait for database consistency...');
    // Additional wait for database consistency - critical for E2E tests
    await this.page.waitForTimeout(2000);
    
    // Remove dialog handlers
    this.page.removeAllListeners('dialog');
    
    console.log('Timesheet save operation completed');
}

  async submitForApproval(weekStart: string) {
    function formatWeekStart(isoDate: string) {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const weekLabel = `Week of ${formatWeekStart(weekStart)}`;
    const weekHeading = this.page.locator('h3', { hasText: weekLabel });
    await expect(weekHeading).toBeVisible({ timeout: 10000 });
    
    // Find the parent timesheet card
    const timesheetCard = weekHeading.locator('..').locator('..').locator('..');
    await expect(timesheetCard).toBeVisible();

    this.page.once('dialog', async (dialog) => {
      console.log('Submit dialog:', dialog.message());
      await dialog.accept(); // always accept
    });

    const submitBtn = timesheetCard.locator('button', { hasText: /submit for approval/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();
    
    await expect(submitBtn).toBeHidden({ timeout: 15000 });
  }

  async approveTimesheet() {
    await this.approvalButtons.locator('[data-testid="approve-button"]').click();
    await this.page.waitForSelector('[data-testid="approval-success"]');
  }

  async rejectTimesheet(reason: string) {
    await this.approvalButtons.locator('[data-testid="reject-button"]').click();
    await this.page.locator('[data-testid="rejection-reason"]').fill(reason);
    await this.page.locator('[data-testid="confirm-reject"]').click();
  }
  //, timesheetId?: string
  async getTimesheetStatus(weekStart: string): Promise<string> {
    function formatWeekStart(isoDate: string) {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const weekLabel = `Week of ${formatWeekStart(weekStart)}`;
    const weekHeading = this.page.locator('h3', { hasText: weekLabel });
    await expect(weekHeading).toBeVisible({ timeout: 10000 });
    
    // Find the parent timesheet card
    const timesheetCard = weekHeading.locator('..').locator('..').locator('..');
    await expect(timesheetCard).toBeVisible();
    const statusLocator = timesheetCard.locator('span.ml-2.capitalize');
    const text = await statusLocator.textContent();
    return text?.trim() ?? '';
    // const locator = timesheetId 
    //   ? this.page.locator(`[data-testid="timesheet-${timesheetId}"] [data-testid="status"]`)
    //   : this.statusBadge.first();
    // const text = await locator.textContent();
    // return text ?? '';
  }

  async clickCalendarDay(date: string) {
    await this.page.locator(`[data-testid="calendar-day-${date}"]`).click();
  }

  async validateEntryInCalendar(date: string, hours: number) {
    const targetDate = new Date(date);
    const targetMonth = targetDate.toLocaleString('en-US', { month: 'long' });
    const targetYear = targetDate.getFullYear();

    // Step 1: Navigate to correct month/year
    while (true) {
      const currentMonthYear = await this.page.locator('[data-testid="calendar-title"]').textContent();
      if (!currentMonthYear) throw new Error('Could not find calendar title');

      if (currentMonthYear.includes(targetMonth) && currentMonthYear.includes(targetYear.toString())) {
        break; // already on correct month
      }

      // Decide direction
      const currentDate = new Date(currentMonthYear);
      if (currentDate > targetDate) {
        await this.page.getByTitle('Previous Month').click();
      } else {
        await this.page.getByTitle('Next Month').click();
      }

      await this.page.waitForTimeout(300); // small buffer for re-render
    }

    // Step 2: Validate entry in correct month
    const dayCell = this.page.locator(`[data-testid="calendar-day-${date}"]`);
    await expect(dayCell.locator(`text=${hours}h`)).toBeVisible();
  }

  async getCurrentTimesheetId(weekStart: string): Promise<string> {
    function formatWeekStart(isoDate: string) {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const weekLabel = `Week of ${formatWeekStart(weekStart)}`;
    const weekHeading = this.page.locator('h3', { hasText: weekLabel });
    await expect(weekHeading).toBeVisible({ timeout: 10000 });
    
    // Find the parent timesheet card
    const timesheetCard = weekHeading.locator('..').locator('..').locator('..').locator('..');
    await expect(timesheetCard).toBeVisible();
    // Assumes the details view exposes a data-testid with the id
    const el = timesheetCard.locator('[data-testid="timesheet-id"]');
    await el.waitFor();
    const id = (await el.textContent())?.trim() || '';
    const cleanId = id?.replace(/^ID:\s*/, '').trim();
    return cleanId;
    // return id;
  }
}
