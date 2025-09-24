import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimesheetApprovalService, TimeEntryInput } from '../../src/services/TimesheetApprovalService';
import { TimesheetService } from '../../src/services/TimesheetService';
import type { TimesheetStatus, UserRole, Timesheet } from '../../src/types';

// Mock TimesheetService
vi.mock('../../src/services/TimesheetService');

const mockTimesheetService = vi.mocked(TimesheetService);

describe('TimesheetApprovalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getStatusFlow', () => {
    it('should return correct permissions for draft status and employee role', () => {
      const result = TimesheetApprovalService.getStatusFlow('draft', 'employee');
      
      expect(result.canEdit).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.canApprove).toBe(false);
      expect(result.canReject).toBe(false);
      expect(result.nextAction).toBe('Submit for approval');
    });

    it('should return correct permissions for submitted status and manager role', () => {
      const result = TimesheetApprovalService.getStatusFlow('submitted', 'manager');
      
      expect(result.canEdit).toBe(false);
      expect(result.canSubmit).toBe(false);
      expect(result.canApprove).toBe(true);
      expect(result.canReject).toBe(true);
      expect(result.nextAction).toBe('Awaiting manager approval');
    });

    it('should return correct permissions for management_pending status and management role', () => {
      const result = TimesheetApprovalService.getStatusFlow('management_pending', 'management');
      
      expect(result.canEdit).toBe(false);
      expect(result.canSubmit).toBe(false);
      expect(result.canApprove).toBe(true);
      expect(result.canReject).toBe(true);
      expect(result.nextAction).toBe('Awaiting management approval');
    });

    it('should return correct permissions for manager_rejected status', () => {
      const result = TimesheetApprovalService.getStatusFlow('manager_rejected', 'employee');
      
      expect(result.canEdit).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.canApprove).toBe(false);
      expect(result.canReject).toBe(false);
      expect(result.nextAction).toBe('Rejected - needs revision');
    });

    it('should return correct permissions for frozen status', () => {
      const result = TimesheetApprovalService.getStatusFlow('frozen', 'employee');
      
      expect(result.canEdit).toBe(false);
      expect(result.canSubmit).toBe(false);
      expect(result.canApprove).toBe(false);
      expect(result.canReject).toBe(false);
      expect(result.nextAction).toBe('Approved & Frozen - included in billing');
    });

    it('should handle lead role permissions (same as employee)', () => {
      const leadResult = TimesheetApprovalService.getStatusFlow('draft', 'lead');
      const employeeResult = TimesheetApprovalService.getStatusFlow('draft', 'employee');
      
      expect(leadResult).toEqual(employeeResult);
    });

    it('should handle super_admin role (no timesheet permissions)', () => {
      const result = TimesheetApprovalService.getStatusFlow('draft', 'super_admin');
      
      expect(result.canEdit).toBe(false);
      expect(result.canSubmit).toBe(false);
      expect(result.canApprove).toBe(false);
      expect(result.canReject).toBe(false);
    });
  });

  describe('createTimesheet', () => {
    const userId = 'user-123';
    const weekStartDate = '2024-01-01';

    it('should create timesheet successfully', async () => {
      const mockTimesheet: Timesheet = {
        id: 'timesheet-123',
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: '2024-01-07',
        status: 'draft',
        total_hours: 0,
        is_verified: false,
        is_frozen: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockTimesheetService.createTimesheet.mockResolvedValue({
        timesheet: mockTimesheet
      });

      const result = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);

      expect(result).toEqual(mockTimesheet);
      expect(mockTimesheetService.createTimesheet).toHaveBeenCalledWith(userId, weekStartDate);
    });

    it('should return null when creation fails', async () => {
      mockTimesheetService.createTimesheet.mockResolvedValue({
        error: 'Creation failed'
      });

      const result = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      mockTimesheetService.createTimesheet.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);

      expect(result).toBeNull();
    });
  });

  describe('submitTimesheet', () => {
    const timesheetId = 'timesheet-123';
    const userId = 'user-123';

    it('should submit timesheet successfully', async () => {
      mockTimesheetService.submitTimesheet.mockResolvedValue({
        success: true
      });

      const result = await TimesheetApprovalService.submitTimesheet(timesheetId, userId);

      expect(result).toBe(true);
      expect(mockTimesheetService.submitTimesheet).toHaveBeenCalledWith(timesheetId);
    });

    it('should return false when submission fails', async () => {
      mockTimesheetService.submitTimesheet.mockResolvedValue({
        success: false,
        error: 'Submission failed'
      });

      const result = await TimesheetApprovalService.submitTimesheet(timesheetId, userId);

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockTimesheetService.submitTimesheet.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.submitTimesheet(timesheetId, userId);

      expect(result).toBe(false);
    });
  });

  describe('addTimeEntry', () => {
    const timesheetId = 'timesheet-123';

    it('should add time entry successfully', async () => {
      const entryData: TimeEntryInput = {
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 8,
        description: 'Work description',
        is_billable: true,
        entry_type: 'project_task'
      };

      const mockEntry = {
        id: 'entry-123',
        timesheet_id: timesheetId,
        ...entryData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockTimesheetService.addTimeEntry.mockResolvedValue({
        entry: mockEntry
      });

      const result = await TimesheetApprovalService.addTimeEntry(timesheetId, entryData);

      expect(result).toEqual(mockEntry);
      expect(mockTimesheetService.addTimeEntry).toHaveBeenCalledWith(timesheetId, expect.objectContaining(entryData));
    });

    it('should return null when adding fails', async () => {
      const entryData: TimeEntryInput = {
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      };

      mockTimesheetService.addTimeEntry.mockResolvedValue({
        error: 'Entry creation failed'
      });

      const result = await TimesheetApprovalService.addTimeEntry(timesheetId, entryData);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      const entryData: TimeEntryInput = {
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      };

      mockTimesheetService.addTimeEntry.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.addTimeEntry(timesheetId, entryData);

      expect(result).toBeNull();
    });
  });

  describe('updateTimesheetEntries', () => {
    const timesheetId = 'timesheet-123';

    it('should update entries successfully', async () => {
      const entries: TimeEntryInput[] = [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }];

      mockTimesheetService.updateTimesheetEntries.mockResolvedValue({
        success: true
      });

      const result = await TimesheetApprovalService.updateTimesheetEntries(timesheetId, entries);

      expect(result).toBe(true);
      expect(mockTimesheetService.updateTimesheetEntries).toHaveBeenCalledWith(timesheetId, entries);
    });

    it('should return false when update fails', async () => {
      const entries: TimeEntryInput[] = [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }];

      mockTimesheetService.updateTimesheetEntries.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });

      const result = await TimesheetApprovalService.updateTimesheetEntries(timesheetId, entries);

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const entries: TimeEntryInput[] = [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }];

      mockTimesheetService.updateTimesheetEntries.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.updateTimesheetEntries(timesheetId, entries);

      expect(result).toBe(false);
    });
  });

  describe('getTimesheetByUserAndWeek', () => {
    const userId = 'user-123';
    const weekStartDate = '2024-01-01';

    it('should get timesheet successfully', async () => {
      const mockTimesheet = {
        id: 'timesheet-123',
        user_id: userId,
        week_start_date: weekStartDate,
        status: 'draft' as TimesheetStatus,
        time_entries: [],
        user_name: 'John Doe',
        can_edit: true,
        can_submit: true,
        can_approve: false,
        can_reject: false,
        next_action: 'Submit for approval',
        billableHours: 0,
        nonBillableHours: 0
      };

      mockTimesheetService.getTimesheetByUserAndWeek.mockResolvedValue({
        timesheet: mockTimesheet
      });

      const result = await TimesheetApprovalService.getTimesheetByUserAndWeek(userId, weekStartDate);

      expect(result).toEqual(mockTimesheet);
      expect(mockTimesheetService.getTimesheetByUserAndWeek).toHaveBeenCalledWith(userId, weekStartDate);
    });

    it('should return null when timesheet not found', async () => {
      mockTimesheetService.getTimesheetByUserAndWeek.mockResolvedValue({
        error: 'Timesheet not found'
      });

      const result = await TimesheetApprovalService.getTimesheetByUserAndWeek(userId, weekStartDate);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      mockTimesheetService.getTimesheetByUserAndWeek.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.getTimesheetByUserAndWeek(userId, weekStartDate);

      expect(result).toBeNull();
    });
  });

  describe('addMultipleEntries', () => {
    const timesheetId = 'timesheet-123';

    it('should add multiple entries successfully', async () => {
      const entries: TimeEntryInput[] = [
        {
          date: '2024-01-01',
          hours: 8,
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          date: '2024-01-02',
          hours: 6,
          is_billable: false,
          entry_type: 'custom_task',
          custom_task_description: 'Admin work'
        }
      ];

      const mockResult = entries.map((entry, index) => ({
        id: `entry-${index + 1}`,
        timesheet_id: timesheetId,
        ...entry,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      mockTimesheetService.updateTimesheetEntries.mockResolvedValue({
        success: true,
        updatedEntries: mockResult
      });

      const result = await TimesheetApprovalService.addMultipleEntries(timesheetId, entries);

      expect(result).toEqual(mockResult);
      expect(mockTimesheetService.updateTimesheetEntries).toHaveBeenCalledWith(timesheetId, entries);
    });

    it('should return null when no entries provided', async () => {
      mockTimesheetService.updateTimesheetEntries.mockResolvedValue({ success: false });
      const result = await TimesheetApprovalService.addMultipleEntries(timesheetId, []);

      expect(result).toBeNull();
      expect(mockTimesheetService.updateTimesheetEntries).toHaveBeenCalledWith(timesheetId, []);
    });

    it('should handle service failures', async () => {
      const entries: TimeEntryInput[] = [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }];

      mockTimesheetService.updateTimesheetEntries.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });

      const result = await TimesheetApprovalService.addMultipleEntries(timesheetId, entries);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      const entries: TimeEntryInput[] = [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }];

      mockTimesheetService.updateTimesheetEntries.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.addMultipleEntries(timesheetId, entries);

      expect(result).toBeNull();
    });
  });

  describe('managerAction', () => {
    const timesheetId = 'timesheet-123';
    const managerId = 'manager-123';

    it('should approve timesheet successfully', async () => {
      mockTimesheetService.managerApproveRejectTimesheet.mockResolvedValue({
        success: true
      });

      const result = await TimesheetApprovalService.managerAction(timesheetId, managerId, 'approve');

      expect(result).toBe(true);
      expect(mockTimesheetService.managerApproveRejectTimesheet).toHaveBeenCalledWith(timesheetId, 'approve', undefined);
    });

    it('should reject timesheet with reason', async () => {
      const reason = 'Insufficient documentation';
      
      mockTimesheetService.managerApproveRejectTimesheet.mockResolvedValue({
        success: true
      });

      const result = await TimesheetApprovalService.managerAction(timesheetId, managerId, 'reject', reason);

      expect(result).toBe(true);
      expect(mockTimesheetService.managerApproveRejectTimesheet).toHaveBeenCalledWith(timesheetId, 'reject', reason);
    });

    it('should handle action failure', async () => {
      mockTimesheetService.managerApproveRejectTimesheet.mockResolvedValue({
        success: false,
        error: 'Action failed'
      });

      const result = await TimesheetApprovalService.managerAction(timesheetId, managerId, 'approve');

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockTimesheetService.managerApproveRejectTimesheet.mockRejectedValue(new Error('Database error'));

      const result = await TimesheetApprovalService.managerAction(timesheetId, managerId, 'approve');

      expect(result).toBe(false);
    });
  });
});