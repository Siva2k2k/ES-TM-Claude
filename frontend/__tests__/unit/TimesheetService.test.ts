import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimesheetService } from '../../src/services/TimesheetService';
import { supabase } from '../../src/lib/supabase';

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

describe('TimesheetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createTimesheet', () => {
    it('should create a new timesheet successfully', async () => {
      const userId = 'user-123';
      const weekStartDate = '2024-01-01';
      
      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      // Mock existing timesheet check (no existing)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      // Mock insert
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'timesheet-123',
          user_id: userId,
          week_start_date: weekStartDate,
          week_end_date: '2024-01-07',
          total_hours: 0,
          status: 'draft',
          is_verified: false,
          is_frozen: false
        },
        error: null
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'timesheets') {
          return {
            select: vi.fn(() => ({
              match: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: mockMaybeSingle
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockSingle
              }))
            }))
          };
        }
      });

      const result = await TimesheetService.createTimesheet(userId, weekStartDate);

      expect(result.timesheet).toBeDefined();
      expect(result.timesheet?.user_id).toBe(userId);
      expect(result.timesheet?.week_start_date).toBe(weekStartDate);
      expect(result.timesheet?.status).toBe('draft');
      expect(result.error).toBeUndefined();
    });

    it('should return error if timesheet already exists', async () => {
      const userId = 'user-123';
      const weekStartDate = '2024-01-01';
      
      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      // Mock existing timesheet
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'existing-123', status: 'draft' },
        error: null
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          match: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: mockMaybeSingle
            }))
          }))
        }))
      }));

      const result = await TimesheetService.createTimesheet(userId, weekStartDate);

      expect(result.timesheet).toBeUndefined();
      expect(result.error).toContain('A timesheet already exists');
    });

    it('should return error if user is not authenticated', async () => {
      const userId = 'user-123';
      const weekStartDate = '2024-01-01';
      
      // Mock no auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await TimesheetService.createTimesheet(userId, weekStartDate);

      expect(result.timesheet).toBeUndefined();
      expect(result.error).toBe('User not authenticated');
    });

    it('should return error if user ID mismatch', async () => {
      const userId = 'user-123';
      const authUserId = 'different-user';
      const weekStartDate = '2024-01-01';
      
      // Mock different auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: authUserId } },
        error: null
      });

      const result = await TimesheetService.createTimesheet(userId, weekStartDate);

      expect(result.timesheet).toBeUndefined();
      expect(result.error).toContain('User ID mismatch');
    });
  });

  describe('submitTimesheet', () => {
    it('should submit timesheet successfully', async () => {
      const timesheetId = 'timesheet-123';

      // Mock basic table access test
      const mockLimit = vi.fn().mockResolvedValue({
        data: [{ id: 'test' }],
        error: null
      });

      // Mock status update
      const mockEq = vi.fn().mockResolvedValue({
        error: null
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: mockLimit
        })),
        update: vi.fn(() => ({
          eq: mockEq
        }))
      }));

      const result = await TimesheetService.submitTimesheet(timesheetId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle database access error', async () => {
      const timesheetId = 'timesheet-123';

      // Mock table access failure
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: mockLimit
        }))
      }));

      const result = await TimesheetService.submitTimesheet(timesheetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('should handle update error', async () => {
      const timesheetId = 'timesheet-123';

      // Mock successful table access
      const mockLimit = vi.fn().mockResolvedValue({
        data: [{ id: 'test' }],
        error: null
      });

      // Mock update failure
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' }
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: mockLimit
        })),
        update: vi.fn(() => ({
          eq: mockEq
        }))
      }));

      const result = await TimesheetService.submitTimesheet(timesheetId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('addTimeEntry', () => {
    it('should add time entry successfully', async () => {
      const timesheetId = 'timesheet-123';
      const entryData = {
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 8,
        description: 'Work description',
        is_billable: true,
        entry_type: 'project_task' as const
      };

      const expectedEntry = {
        id: 'entry-123',
        timesheet_id: timesheetId,
        ...entryData
      };

      // Mock the validation method to return valid
      vi.spyOn(TimesheetService, 'validateTimeEntry').mockResolvedValue({
        valid: true,
        error: undefined
      });

      // Mock the updateTimesheetTotalHours method
      vi.spyOn(TimesheetService, 'updateTimesheetTotalHours').mockResolvedValue();

      // Mock the supabase chain for inserting time entry
      const mockSingle = vi.fn().mockResolvedValue({
        data: expectedEntry,
        error: null
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });

      (supabase.from as any) = mockFrom;

      const result = await TimesheetService.addTimeEntry(timesheetId, entryData);

      // Verify the method chain was called correctly
      expect(mockFrom).toHaveBeenCalledWith('time_entries');
      expect(mockInsert).toHaveBeenCalledWith({
        timesheet_id: timesheetId,
        project_id: entryData.project_id,
        task_id: entryData.task_id,
        date: entryData.date,
        hours: entryData.hours,
        description: entryData.description,
        is_billable: entryData.is_billable,
        custom_task_description: undefined,
        entry_type: entryData.entry_type
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();

      // Verify the result
      expect(result.entry).toBeDefined();
      expect(result.entry?.id).toBe('entry-123');
      expect(result.entry?.timesheet_id).toBe(timesheetId);
      expect(result.error).toBeUndefined();

      // Verify that validation and total hours update were called
      expect(TimesheetService.validateTimeEntry).toHaveBeenCalledWith(timesheetId, entryData);
      expect(TimesheetService.updateTimesheetTotalHours).toHaveBeenCalledWith(timesheetId);
    });

    it('should reject duplicate project/task entry', async () => {
      const timesheetId = 'timesheet-123';
      const entryData = {
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task' as const
      };

      // Mock existing entry data that would be returned by the validation query
      const existingEntries = [{
        id: 'existing-123',
        project_id: 'proj-123',
        task_id: 'task-123',
        hours: 8,
        entry_type: 'project_task',
        date: '2024-01-01'
      }];

      // Create the mock chain for the validation query
      const mockIs = vi.fn().mockResolvedValue({
        data: existingEntries,
        error: null
      });

      const mockEq2 = vi.fn().mockReturnValue({
        is: mockIs
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      const result = await TimesheetService.addTimeEntry(timesheetId, entryData);

      // Verify the query was made correctly
      expect(mockFrom).toHaveBeenCalledWith('time_entries');
      expect(mockSelect).toHaveBeenCalledWith('id, project_id, task_id, hours, entry_type, custom_task_description');
      expect(mockEq1).toHaveBeenCalledWith('timesheet_id', timesheetId);
      expect(mockEq2).toHaveBeenCalledWith('date', entryData.date);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);

      // Verify the result
      expect(result.entry).toBeUndefined();
      expect(result.error).toContain('already exists on this date');
    });

    it('should reject entry exceeding daily hours limit', async () => {
      const timesheetId = 'timesheet-123';
      const entryData = {
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        entry_type: 'project_task' as const
      };

      // Mock existing entries that already total 8 hours (8 existing + 8 new = 16 > 10 limit)
      const existingEntries = [{
        id: 'existing-123',
        project_id: 'different-proj',
        task_id: 'different-task',
        hours: 8,
        entry_type: 'project_task',
        custom_task_description: null
      }];

      // Create the mock chain for the validation query
      const mockIs = vi.fn().mockResolvedValue({
        data: existingEntries,
        error: null
      });

      const mockEq2 = vi.fn().mockReturnValue({
        is: mockIs
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      const result = await TimesheetService.addTimeEntry(timesheetId, entryData);

      // Verify the query was made correctly
      expect(mockFrom).toHaveBeenCalledWith('time_entries');
      expect(mockSelect).toHaveBeenCalledWith('id, project_id, task_id, hours, entry_type, custom_task_description');
      expect(mockEq1).toHaveBeenCalledWith('timesheet_id', timesheetId);
      expect(mockEq2).toHaveBeenCalledWith('date', entryData.date);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);

      // Verify the result
      expect(result.entry).toBeUndefined();
      expect(result.error).toContain('exceed the maximum limit');
      expect(result.error).toContain('current: 8');
      expect(result.error).toContain('adding: 8');
      expect(result.error).toContain('total: 16');
    });
  });

  describe('updateTimesheetEntries', () => {
    it('should update timesheet entries successfully', async () => {
      const timesheetId = 'timesheet-123';
      const entries = [{
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 8,
        description: 'Updated work',
        is_billable: true,
        entry_type: 'project_task' as const
      }];

      const expectedInsertedEntry = {
        id: 'new-entry-123',
        timesheet_id: timesheetId,
        ...entries[0]
      };

      // Mock the validation method to return valid for all entries
      vi.spyOn(TimesheetService, 'validateTimeEntry').mockResolvedValue({
        valid: true,
        error: undefined
      });

      // Mock the updateTimesheetTotalHours method
      vi.spyOn(TimesheetService, 'updateTimesheetTotalHours').mockResolvedValue();

      // Mock RPC call to fail (so it falls back to manual transaction)
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC not available' }
      });

      // Mock queries in order of execution:
      let queryCallCount = 0;
      
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        queryCallCount++;
        
        if (table === 'time_entries') {
          if (queryCallCount === 1) {
            // First call: Soft delete existing entries
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    error: null
                  })
                })
              })
            };
          } else if (queryCallCount === 2) {
            // Second call: Insert new entries
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [expectedInsertedEntry],
                  error: null
                })
              })
            };
          }
        }
        
        // Fallback return for any unexpected calls
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      // Set up supabase mocks
      (supabase.from as any) = mockFrom;
      (supabase.rpc as any) = mockRpc;

      const result = await TimesheetService.updateTimesheetEntries(timesheetId, entries);

      // Verify RPC was attempted first
      expect(mockRpc).toHaveBeenCalledWith('update_timesheet_entries_atomic', {
        timesheet_uuid: timesheetId,
        new_entries: [{
          timesheet_id: timesheetId,
          project_id: entries[0].project_id,
          task_id: entries[0].task_id,
          date: entries[0].date,
          hours: entries[0].hours,
          description: entries[0].description,
          is_billable: entries[0].is_billable,
          custom_task_description: null,
          entry_type: entries[0].entry_type
        }]
      });

      // Verify manual transaction calls were made
      expect(mockFrom).toHaveBeenCalledWith('time_entries');
      expect(queryCallCount).toBe(2); // soft delete, insert

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.updatedEntries).toEqual([expectedInsertedEntry]);
      expect(result.error).toBeUndefined();
    });

    it('should handle validation error', async () => {
      const timesheetId = 'timesheet-123';
      const entries = [{
        project_id: 'proj-123',
        task_id: 'task-123',
        date: '2024-01-01',
        hours: 15, // Exceeds limit when combined with existing 8 hours
        is_billable: true,
        entry_type: 'project_task' as const
      }];

      // Mock existing entries that already have 8 hours (8 + 15 = 23 > 10 limit)
      const existingEntries = [{
        id: 'existing-123',
        project_id: 'different-proj',
        task_id: 'different-task',
        hours: 8,
        entry_type: 'project_task',
        custom_task_description: null
      }];

      // Create the proper mock chain for the validation query
      const mockIs = vi.fn().mockResolvedValue({
        data: existingEntries,
        error: null
      });

      const mockEq2 = vi.fn().mockReturnValue({
        is: mockIs
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      const result = await TimesheetService.updateTimesheetEntries(timesheetId, entries);

      // Verify the validation query was made
      expect(mockFrom).toHaveBeenCalledWith('time_entries');
      expect(mockSelect).toHaveBeenCalledWith('id, project_id, task_id, hours, entry_type, custom_task_description');
      expect(mockEq1).toHaveBeenCalledWith('timesheet_id', timesheetId);
      expect(mockEq2).toHaveBeenCalledWith('date', entries[0].date);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed for entry on 2024-01-01');
      expect(result.error).toContain('exceed the maximum limit');
      expect(result.error).toContain('current: 8');
      expect(result.error).toContain('adding: 15');
      expect(result.error).toContain('total: 23');
    });
  });

  describe('getTimesheetById', () => {
    it('should get timesheet with details successfully', async () => {
      const timesheetId = 'timesheet-123';
      const mockTimesheet = {
        id: timesheetId,
        user_id: 'user-123',
        week_start_date: '2024-01-01',
        week_end_date: '2024-01-07',
        status: 'draft',
        total_hours: 40,
        is_verified: false,
        is_frozen: false
      };

      const mockUser = {
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'employee'
      };

      const mockEntries = [{
        id: 'entry-123',
        timesheet_id: timesheetId,
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        projects: { name: 'Test Project' },
        tasks: { name: 'Test Task' }
      }];

      // Track which query is being made based on call order
      let queryCallCount = 0;
      
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        queryCallCount++;
        
        if (table === 'timesheets' && queryCallCount === 1) {
          // First call: Get timesheet
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockTimesheet,
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'users' && queryCallCount === 2) {
          // Second call: Get user details
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUser,
                  error: null
                })
              })
            })
          };
        } else if (table === 'time_entries' && queryCallCount === 3) {
          // Third call: Get time entries with joins
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockEntries,
                    error: null
                  })
                })
              })
            })
          };
        }
        
        // Fallback for any unexpected calls
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          })
        };
      });

      (supabase.from as any) = mockFrom;

      const result = await TimesheetService.getTimesheetById(timesheetId);

      // Verify all three queries were made
      expect(mockFrom).toHaveBeenCalledTimes(3);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'timesheets');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'users');
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'time_entries');

      // Verify the result structure
      expect(result.timesheet).toBeDefined();
      expect(result.timesheet?.id).toBe(timesheetId);
      expect(result.timesheet?.user_name).toBe('John Doe');
      expect(result.timesheet?.user_email).toBe('john@example.com');
      expect(result.timesheet?.time_entries).toHaveLength(1);
      expect(result.timesheet?.entries).toHaveLength(1);
      expect(result.timesheet?.billableHours).toBe(8);
      expect(result.timesheet?.nonBillableHours).toBe(0);
      expect(result.timesheet?.can_edit).toBe(true); // status is 'draft'
      expect(result.timesheet?.can_submit).toBe(true); // status is 'draft' and total_hours > 0
      expect(result.error).toBeUndefined();

      // Verify the time entry details
      expect(result.timesheet?.time_entries[0]).toEqual({
        id: 'entry-123',
        timesheet_id: timesheetId,
        date: '2024-01-01',
        hours: 8,
        is_billable: true,
        projects: { name: 'Test Project' },
        tasks: { name: 'Test Task' }
      });
    });

    it('should handle timesheet not found', async () => {
      const timesheetId = 'non-existent';

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              single: mockSingle
            }))
          }))
        }))
      }));

      const result = await TimesheetService.getTimesheetById(timesheetId);

      expect(result.timesheet).toBeUndefined();
      expect(result.error).toBe('Timesheet not found');
    });
  });
});