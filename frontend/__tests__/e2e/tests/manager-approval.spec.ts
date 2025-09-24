import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TimesheetPage } from '../pages/TimesheetPage';
import { TeamReviewPage } from '../pages/TeamReviewPage';
import { TestDataFactory } from '../fixtures/testData';

test.describe('Manager Approval Workflow', () => {
  test('should approve employee timesheet', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const timesheetPage = new TimesheetPage(page);
    const teamReviewPage = new TeamReviewPage(page);
    const testData = TestDataFactory.createWeeklyTimesheet(-1);
    const employeeName = 'Software Developer';

    // Employee phase
    await page.goto('/');
    await loginPage.loginAsEmployee();
    await timesheetPage.navigateToCalendarView();
    await timesheetPage.createNewTimesheet(testData.weekStart);
    for (const entry of testData.entries) await timesheetPage.addTimeEntry(entry);
    await timesheetPage.saveTimesheet();
    await timesheetPage.navigateToListView();
    await timesheetPage.submitForApproval(testData.weekStart);
    // const timesheetId = await timesheetPage.getCurrentTimesheetId(testData.weekStart);
    // Manager phase
    await loginPage.signOut();
    await loginPage.loginAsManager();
    await teamReviewPage.navigateToTeamReview();
    // await teamReviewPage.selectQueueTab();
    const pending = await teamReviewPage.findTimesheetByWeekAndEmployee(testData.weekStart, employeeName);
    await teamReviewPage.approveTimesheet(pending);
    await expect(teamReviewPage.getTimesheetStatus(pending)).toContainText('MANAGER APPROVED');
  });

  test('should reject timesheet with reason', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const timesheetPage = new TimesheetPage(page);
    const teamReviewPage = new TeamReviewPage(page);
    const testData = TestDataFactory.createWeeklyTimesheet(-1);
    const employeeName = 'Software Developer';

    // Employee submits
    await page.goto('/');
    await loginPage.loginAsEmployee();
    await timesheetPage.navigateToCalendarView();
    await timesheetPage.createNewTimesheet(testData.weekStart);
    for (const entry of testData.entries) await timesheetPage.addTimeEntry(entry);
    await timesheetPage.saveTimesheet();
    await timesheetPage.navigateToListView();
    await timesheetPage.submitForApproval(testData.weekStart);
    // const timesheetId = await timesheetPage.getCurrentTimesheetId(testData.weekStart);

    // Manager rejects with reason
    await loginPage.signOut();
    await loginPage.loginAsManager();
    await teamReviewPage.navigateToTeamReview();
    // await teamReviewPage.selectQueueTab();
    const pending = await teamReviewPage.findTimesheetByWeekAndEmployee(testData.weekStart, employeeName);
    const reason = 'Hours seem excessive for the tasks completed';
    await teamReviewPage.rejectTimesheet(pending, reason);
    await expect(teamReviewPage.getTimesheetStatus(pending)).toContainText('MANAGER REJECTED');
    await teamReviewPage.viewTimesheetDetails(pending); 
  });
});
