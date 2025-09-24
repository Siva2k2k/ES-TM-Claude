import { Page, Locator} from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  // readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email Address');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /sign in/i });
    // this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async loginAsEmployee() {
    await this.login(process.env.E2E_EMPLOYEE_EMAIL!, process.env.E2E_EMPLOYEE_PASSWORD!);
  }

  async loginAsManager() {
    await this.login(process.env.E2E_MANAGER_EMAIL!, process.env.E2E_MANAGER_PASSWORD!);
  }

  async loginAsManagement() {
    await this.login(process.env.E2E_MANAGEMENT_EMAIL!, process.env.E2E_MANAGEMENT_PASSWORD!);
  }
}
