import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TimesheetPage } from '../pages/TimesheetPage';
import { TeamReviewPage } from '../pages/TeamReviewPage';
import { TestDataFactory } from '../fixtures/testData';
import { DatabaseHelpers } from '../helpers/databaseHelpers';

test.describe('Complete Timesheet Approval Workflow', () => {
  test.beforeEach(async () => {
      console.log('=== PRE-TEST CLEANUP ===');
      
      try {
          // Authenticate for cleanup
          await DatabaseHelpers.authenticateAsUser(
              process.env.E2E_EMPLOYEE_EMAIL!,
              process.env.E2E_EMPLOYEE_PASSWORD!
          );
          
          // Clean up any timesheets created in the last hour
          const cleanupResult = await DatabaseHelpers.cleanupRecentTestTimesheets(
              process.env.E2E_EMPLOYEE_USER_ID!,
              1 // Last 1 hour
          );
          
          console.log('Cleanup completed:', cleanupResult);
          
      } catch (error) {
          console.error('Cleanup error:', error);
      }
    });

  test.afterEach(async () => {
    // const userId = process.env.E2E_EMPLOYEE_USER_ID!;
    // await DatabaseHelpers.cleanupTestData(userId);

    console.log('=== POST-TEST CLEANUP ===');
    
    try {
        // Authenticate for cleanup
        await DatabaseHelpers.authenticateAsUser(
            process.env.E2E_EMPLOYEE_EMAIL!,
            process.env.E2E_EMPLOYEE_PASSWORD!
        );
        
        // Clean up any timesheets created in the last hour
        const cleanupResult = await DatabaseHelpers.cleanupRecentTestTimesheets(
            process.env.E2E_EMPLOYEE_USER_ID!,
            1 // Last 1 hour
        );
        
        console.log('Cleanup completed:', cleanupResult);
        
    } catch (error) {
        console.error('Cleanup error:', error);
    }
  });
  
  test('should complete full employee → manager → management flow', async ({ page }) => {
    const testData = TestDataFactory.createWeeklyTimesheet(-1);
    const employeeName = 'Software Developer';

    // Employee phase
    const loginPage = new LoginPage(page);
    const timesheetPage = new TimesheetPage(page);
    await page.goto('/');
    await loginPage.loginAsEmployee();
    await timesheetPage.navigateToCalendarView();
    await timesheetPage.createNewTimesheet(testData.weekStart);
    for (const entry of testData.entries) await timesheetPage.addTimeEntry(entry);
    await timesheetPage.saveTimesheet();
    await timesheetPage.navigateToListView();
    await timesheetPage.submitForApproval(testData.weekStart);
    const timesheetId = await timesheetPage.getCurrentTimesheetId(testData.weekStart);
    // Manager phase
    await loginPage.signOut();
    await loginPage.loginAsManager();
    const teamReviewPage = new TeamReviewPage(page);
    await teamReviewPage.navigateToTeamReview();
    // await teamReviewPage.selectQueueTab();
    const pending = await teamReviewPage.findTimesheetByWeekAndEmployee(testData.weekStart, employeeName);
    await teamReviewPage.approveTimesheet(pending);
    await expect(teamReviewPage.getTimesheetStatus(pending)).toContainText('MANAGER APPROVED');

    // Management phase
    await loginPage.signOut();
    await loginPage.loginAsManagement();
    await teamReviewPage.navigateToTeamReview();
    // await teamReviewPage.selectManagementPendingTab();
    const managementTs = await teamReviewPage.findTimesheetByWeekAndEmployee(testData.weekStart, employeeName);
    await teamReviewPage.finalApproveTimesheet(managementTs);
    await expect(teamReviewPage.getTimesheetStatus(managementTs)).toContainText('FROZEN');

    // Verify in DB
    const finalTs = await DatabaseHelpers.getTimesheetById(timesheetId);
    expect(finalTs.status).toBe('frozen');
    expect(finalTs.approved_by_manager_at).toBeTruthy();
    expect(finalTs.approved_by_management_at).toBeTruthy();
    expect(finalTs.is_frozen).toBe(true);
  });
});
