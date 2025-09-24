import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly mainContent: Locator;
  // readonly notifications: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.sidebar = page.locator('nav');
    this.mainContent = page.locator('main');
    // this.notifications = page.locator('[data-testid="notifications"]');
  }

  async navigate(section: string, subSection?: string) {
    await this.page.getByRole('button', { name: section }).first().click();
    if (subSection) {
      await this.page.getByRole('button', { name: subSection }).first().click();
    }
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async signOut() {
    await this.page.getByTitle(/sign out/i).click();
    await this.waitForPageLoad();
  }
}
