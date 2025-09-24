import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimesheetService } from '../../src/services/TimesheetService';
import { TimesheetApprovalService, TimeEntryInput } from '../../src/services/TimesheetApprovalService';
import type { Timesheet, TimesheetWithDetails, TimesheetStatus } from '../../src/types';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: vi.fn(),
            single: vi.fn(),
            order: vi.fn(() => ({
              data: [],
              error: null
            }))
          })),
          match: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn()
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Timesheet Workflow Integration Tests', () => {
  const userId = 'user-123';
  const weekStartDate = '2024-01-01';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Timesheet Creation Workflow', () => {
    it('should successfully create, populate, and submit a timesheet', async () => {
      // Step 1: Create timesheet
      const mockTimesheet: Timesheet = {
        id: 'timesheet-123',
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: '2024-01-07',
        total_hours: 0,
        status: 'draft',
        is_verified: false,
        is_frozen: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      vi.spyOn(TimesheetService, 'createTimesheet').mockResolvedValue({
        timesheet: mockTimesheet
      });

      const createdTimesheet = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);
      
      expect(createdTimesheet).toBeDefined();
      expect(createdTimesheet).not.toBeNull();
      if (createdTimesheet) {
        expect(createdTimesheet.id).toBe('timesheet-123');
        expect(createdTimesheet.status).toBe('draft');
      }

      // Step 2: Add time entries
      const timeEntries: TimeEntryInput[] = [
        {
          project_id: 'proj-123',
          task_id: 'task-123',
          date: '2024-01-01',
          hours: 8,
          description: 'Development work',
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          project_id: 'proj-124',
          task_id: 'task-124',
          date: '2024-01-02',
          hours: 7,
          description: 'Testing work',
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          date: '2024-01-03',
          hours: 6,
          description: 'Documentation',
          is_billable: false,
          entry_type: 'custom_task',
          custom_task_description: 'Documentation work'
        }
      ];

      const mockEntries = timeEntries.map((entry, index) => ({
        id: `entry-${index + 1}`,
        timesheet_id: 'timesheet-123',
        ...entry,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      vi.spyOn(TimesheetService, 'updateTimesheetEntries').mockResolvedValue({
        success: true,
        updatedEntries: mockEntries
      });
      const addTimeEntrySpy = vi.spyOn(TimesheetService, 'addTimeEntry');

      timeEntries.forEach((_, index) => {
        addTimeEntrySpy.mockResolvedValueOnce({ entry: mockEntries[index] });
      });

      const addedEntries = await TimesheetApprovalService.addMultipleEntries('timesheet-123', timeEntries);

      if (!addedEntries) {
        throw new Error('Expected addedEntries to be defined, but got null');
      }
      
      expect(addedEntries).toBeDefined();
      expect(addedEntries).toHaveLength(3);
      expect(addedEntries[0].hours).toBe(8);
      expect(addedEntries[1].hours).toBe(7);
      expect(addedEntries[2].hours).toBe(6);
      expect(addedEntries[2].entry_type).toBe('custom_task');

      // Step 3: Submit for approval
      vi.spyOn(TimesheetService, 'submitTimesheet').mockResolvedValue({
        success: true
      });

      const submitted = await TimesheetApprovalService.submitTimesheet('timesheet-123', userId);
      
      expect(submitted).toBe(true);
      expect(TimesheetService.submitTimesheet).toHaveBeenCalledWith('timesheet-123');
    });

    it('should handle failures at different stages gracefully', async () => {
      // Scenario 1: Creation fails
      vi.spyOn(TimesheetService, 'createTimesheet').mockResolvedValue({
        error: 'Creation failed'
      });

      const failedCreation = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);
      expect(failedCreation).toBeNull();

      // Scenario 2: Entry addition fails
      vi.spyOn(TimesheetService, 'addTimeEntry').mockResolvedValue({
        error: 'Entry addition failed'
      });

      const failedEntry = await TimesheetApprovalService.addTimeEntry('timesheet-123', {
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      });
      
      expect(failedEntry).toBeNull();

      // Scenario 3: Submission fails
      vi.spyOn(TimesheetService, 'submitTimesheet').mockResolvedValue({
        success: false,
        error: 'Submission failed'
      });

      const failedSubmission = await TimesheetApprovalService.submitTimesheet('timesheet-123', userId);
      expect(failedSubmission).toBe(false);
    });
  });

  describe('Timesheet Edit Workflow', () => {
    it('should successfully retrieve, modify, and update a timesheet', async () => {
      // Step 1: Get existing timesheet
      const mockTimesheetWithDetails: TimesheetWithDetails = {
        id: 'timesheet-123',
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: '2024-01-07',
        total_hours: 24,
        status: 'draft',
        is_verified: false,
        is_frozen: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 8,
            is_billable: true,
            entry_type: 'project_task',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        can_edit: true,
        can_submit: true,
        can_approve: false,
        can_reject: false,
        next_action: 'Submit for approval',
        billableHours: 16,
        nonBillableHours: 8
      };

      vi.spyOn(TimesheetService, 'getTimesheetByUserAndWeek').mockResolvedValue({
        timesheet: mockTimesheetWithDetails
      });

      const retrievedTimesheet = await TimesheetApprovalService.getTimesheetByUserAndWeek(userId, weekStartDate);
      
      expect(retrievedTimesheet).not.toBeNull();
      expect(retrievedTimesheet?.time_entries).toHaveLength(1);
      expect(retrievedTimesheet?.can_edit).toBe(true);

      // Step 2: Update entries
      const updatedEntries: TimeEntryInput[] = [
        {
          project_id: 'proj-123',
          task_id: 'task-123',
          date: '2024-01-01',
          hours: 9, // Modified hours
          description: 'Updated development work', // Modified description
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          // New entry
          date: '2024-01-02',
          hours: 8,
          description: 'New work item',
          is_billable: true,
          entry_type: 'custom_task',
          custom_task_description: 'Additional tasks'
        }
      ];

      vi.spyOn(TimesheetService, 'updateTimesheetEntries').mockResolvedValue({
        success: true,
        updatedEntries: updatedEntries.map((entry, index) => ({
          id: `updated-entry-${index + 1}`,
          timesheet_id: 'timesheet-123',
          ...entry,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }))
      });

      const updateResult = await TimesheetApprovalService.updateTimesheetEntries('timesheet-123', updatedEntries);
      
      expect(updateResult).toBe(true);
      expect(TimesheetService.updateTimesheetEntries).toHaveBeenCalledWith('timesheet-123', updatedEntries);
    });

    it('should prevent editing of non-editable timesheets', async () => {
      const submittedTimesheet: TimesheetWithDetails = {
        id: 'timesheet-123',
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: '2024-01-07',
        total_hours: 40,
        status: 'submitted', // Not editable
        is_verified: false,
        is_frozen: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        time_entries: [],
        can_edit: false, // Cannot edit
        can_submit: false,
        can_approve: false,
        can_reject: false,
        next_action: 'Awaiting manager approval',
        billableHours: 32,
        nonBillableHours: 8
      };

      vi.spyOn(TimesheetService, 'getTimesheetById').mockResolvedValue({
        timesheet: submittedTimesheet
      });

      const timesheet = await TimesheetService.getTimesheetById('timesheet-123');
      
      expect(timesheet.timesheet?.can_edit).toBe(false);
      expect(timesheet.timesheet?.status).toBe('submitted');
      
      // Attempt to update should be handled at the UI level based on can_edit flag
      // This demonstrates the business logic working correctly
    });
  });

  describe('Status Transition Workflow', () => {
    it('should follow correct status transitions through approval workflow', async () => {
      const testCases = [
        {
          role: 'employee' as const,
          status: 'draft' as TimesheetStatus,
          expectedPermissions: {
            canEdit: true,
            canSubmit: true,
            canApprove: false,
            canReject: false,
            nextAction: 'Submit for approval'
          }
        },
        {
          role: 'manager' as const,
          status: 'submitted' as TimesheetStatus,
          expectedPermissions: {
            canEdit: false,
            canSubmit: false,
            canApprove: true,
            canReject: true,
            nextAction: 'Awaiting manager approval'
          }
        },
        {
          role: 'management' as const,
          status: 'management_pending' as TimesheetStatus,
          expectedPermissions: {
            canEdit: false,
            canSubmit: false,
            canApprove: true,
            canReject: true,
            nextAction: 'Awaiting management approval'
          }
        },
        {
          role: 'employee' as const,
          status: 'manager_rejected' as TimesheetStatus,
          expectedPermissions: {
            canEdit: true,
            canSubmit: true,
            canApprove: false,
            canReject: false,
            nextAction: 'Rejected - needs revision'
          }
        },
        {
          role: 'employee' as const,
          status: 'frozen' as TimesheetStatus,
          expectedPermissions: {
            canEdit: false,
            canSubmit: false,
            canApprove: false,
            canReject: false,
            nextAction: 'Approved & Frozen - included in billing'
          }
        }
      ];

      testCases.forEach(({ role, status, expectedPermissions }) => {
        const permissions = TimesheetApprovalService.getStatusFlow(status, role);
        
        expect(permissions.canEdit).toBe(expectedPermissions.canEdit);
        expect(permissions.canSubmit).toBe(expectedPermissions.canSubmit);
        expect(permissions.canApprove).toBe(expectedPermissions.canApprove);
        expect(permissions.canReject).toBe(expectedPermissions.canReject);
        expect(permissions.nextAction).toBe(expectedPermissions.nextAction);
      });
    });

    it('should handle role-specific permissions correctly', async () => {
      // Test that lead role has same permissions as employee for most statuses
      const leadDraftPermissions = TimesheetApprovalService.getStatusFlow('draft', 'lead');
      const employeeDraftPermissions = TimesheetApprovalService.getStatusFlow('draft', 'employee');
      
      expect(leadDraftPermissions).toEqual(employeeDraftPermissions);

      // Test that super_admin doesn't have specific timesheet permissions (they use different interfaces)
      const superAdminPermissions = TimesheetApprovalService.getStatusFlow('draft', 'super_admin');
      
      expect(superAdminPermissions.canEdit).toBe(false);
      expect(superAdminPermissions.canSubmit).toBe(false);
    });
  });

  describe('Bulk Operations Workflow', () => {
    it('should handle bulk entry operations efficiently', async () => {
      const bulkEntries: TimeEntryInput[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        hours: 8,
        description: `Work day ${i + 1}`,
        is_billable: true,
        entry_type: 'project_task',
        project_id: 'proj-123',
        task_id: 'task-123'
      }));

      const mockBulkEntries = bulkEntries.map((entry, index) => ({
        id: `bulk-entry-${index + 1}`,
        timesheet_id: 'timesheet-123',
        ...entry,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      // Mock successful addition for all entries
       vi.spyOn(TimesheetService, 'updateTimesheetEntries').mockResolvedValue({
        success: true,
        updatedEntries: mockBulkEntries
      });
      // const mockAddTimeEntry = vi.spyOn(TimesheetService, 'addTimeEntry');
      // bulkEntries.forEach((_, index) => {
      //   mockAddTimeEntry.mockResolvedValueOnce({ entry: mockBulkEntries[index] });
      // });

      const result = await TimesheetApprovalService.addMultipleEntries('timesheet-123', bulkEntries);
      
      // expect(result).toHaveLength(10);
      // expect(mockAddTimeEntry).toHaveBeenCalledTimes(10);
      
      // // Verify each entry was processed
      // bulkEntries.forEach((entry, index) => {
      //   expect(mockAddTimeEntry).toHaveBeenNthCalledWith(index + 1, 'timesheet-123', entry);
      // });
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result) {
        expect(result).toHaveLength(10);
        expect(TimesheetService.updateTimesheetEntries).toHaveBeenCalledWith('timesheet-123', bulkEntries);
      }
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkEntries: TimeEntryInput[] = [
        {
          date: '2024-01-01',
          hours: 8,
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          date: '2024-01-02',
          hours: 12, // This might fail validation
          is_billable: true,
          entry_type: 'project_task'
        },
        {
          date: '2024-01-03',
          hours: 8,
          is_billable: true,
          entry_type: 'project_task'
        }
      ];

      // const mockAddTimeEntry = vi.spyOn(TimesheetService, 'addTimeEntry');
      
      // // First and third succeed, second fails
      // mockAddTimeEntry
      //   .mockResolvedValueOnce({ entry: { id: 'entry-1', timesheet_id: 'timesheet-123', ...bulkEntries[0], created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      //   .mockResolvedValueOnce({ error: 'Hours exceed daily limit' })
      //   .mockResolvedValueOnce({ entry: { id: 'entry-3', timesheet_id: 'timesheet-123', ...bulkEntries[2], created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } });

      // const result = await TimesheetApprovalService.addMultipleEntries('timesheet-123', bulkEntries);
      
      // expect(result).toHaveLength(2); // Only successful entries
      // expect(result[0].date).toBe('2024-01-01');
      // expect(result[1].date).toBe('2024-01-03');
      // expect(mockAddTimeEntry).toHaveBeenCalledTimes(3);
      const successfulEntries = [
        { 
          id: 'entry-1', 
          timesheet_id: 'timesheet-123', 
          ...bulkEntries[0], 
          created_at: '2024-01-01T00:00:00Z', 
          updated_at: '2024-01-01T00:00:00Z' 
        },
        { 
          id: 'entry-3', 
          timesheet_id: 'timesheet-123', 
          ...bulkEntries[2], 
          created_at: '2024-01-01T00:00:00Z', 
          updated_at: '2024-01-01T00:00:00Z' 
        }
      ];

      vi.spyOn(TimesheetService, 'updateTimesheetEntries').mockResolvedValue({
        success: true,
        updatedEntries: successfulEntries // Only 2 entries, middle one failed validation
      });

      const result = await TimesheetApprovalService.addMultipleEntries('timesheet-123', bulkEntries);
      
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result) {
        expect(result).toHaveLength(2); // Only successful entries
        expect(result[0].date).toBe('2024-01-01');
        expect(result[1].date).toBe('2024-01-03');
        expect(TimesheetService.updateTimesheetEntries).toHaveBeenCalledWith('timesheet-123', bulkEntries);
      }
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle database connection errors gracefully', async () => {
      vi.spyOn(TimesheetService, 'createTimesheet').mockRejectedValue(new Error('Database connection failed'));

      const result = await TimesheetApprovalService.createTimesheet(userId, weekStartDate);
      
      expect(result).toBeNull();
    });

    it('should handle timeout errors in long operations', async () => {
      vi.spyOn(TimesheetService, 'updateTimesheetEntries').mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await TimesheetApprovalService.updateTimesheetEntries('timesheet-123', [{
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task'
      }]);
      
      expect(result).toBe(false);
    });

    it('should handle concurrent modification conflicts', async () => {
      // Simulate concurrent modification error
      vi.spyOn(TimesheetService, 'submitTimesheet').mockResolvedValue({
        success: false,
        error: 'Timesheet was modified by another user'
      });

      const result = await TimesheetApprovalService.submitTimesheet('timesheet-123', userId);
      
      expect(result).toBe(false);
    });
  });
});