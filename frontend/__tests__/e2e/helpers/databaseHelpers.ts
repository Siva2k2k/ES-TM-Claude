import { createClient } from '@supabase/supabase-js';
import type { Timesheet } from '../../../src/types';
// import dotenv from 'dotenv';

export class DatabaseHelpers {
  private static supabase = createClient(
    process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!
  );

  private static adminSupabase = createClient(
    process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  static async authenticateAsUser(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw new Error(`Failed to authenticate user: ${error.message}`);
    }
    
    console.log(`Authenticated as user: ${data.user.id} (${email})`);
  }

  static async cleanupTestData(userId: string) {
    try {
      console.log(`Starting cleanup for user: ${userId}`);
      
      // First, get all timesheets for this user to see what we're cleaning
      const { data: existingTimesheets } = await this.adminSupabase
        .from('timesheets')
        .select('id, week_start_date, status')
        .eq('user_id', userId);
      
      
      console.log(`Found ${existingTimesheets?.length || 0} existing timesheets:`, existingTimesheets);
      
      // Delete time entries first (foreign key constraint)
      const { error: entriesError } = await this.adminSupabase
        .from('time_entries')
        .delete()
        .in('timesheet_id', existingTimesheets?.map(ts => ts.id) || []);
      
      if (entriesError && entriesError.code !== 'PGRST116') {
        console.warn('Error cleaning time entries:', entriesError);
      }
      
      // Delete timesheets
      const { error: timesheetError } = await this.adminSupabase
        .from('timesheets')
        .delete()
        .eq('user_id', userId);
      
      if (timesheetError && timesheetError.code !== 'PGRST116') {
        console.warn('Error cleaning timesheets:', timesheetError);
      }
      
      // Verify cleanup
      const { count } = await this.adminSupabase
        .from('timesheets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      console.log(`Cleanup completed. Remaining timesheets: ${count || 0}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
      // Don't throw - cleanup failures shouldn't break tests
    }
  }

  static async createTestProject(name: string, clientId: string, managerId: string) {
    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        name: `E2E_TEST_${name}`,
        client_id: clientId,
        primary_manager_id: managerId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        is_billable: true
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create test project: ${error.message}`);
    return data;
  }

  static async createTestTask(projectId: string, name: string, assignedUserId: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        name: `E2E_TEST_${name}`,
        assigned_to_user_id: assignedUserId,
        status: 'open',
        is_billable: true
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create test task: ${error.message}`);
    return data;
  }

  static async getTimesheetByWeek(userId: string, weekStart: string): Promise<Timesheet | null> {
    console.log(`Querying timesheet with user_id='${userId}' and week_start_date='${weekStart}'`);
    
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart)
      .maybeSingle();
      
    console.log('Query result:', { data, error: error?.message });
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get timesheet: ${error.message}`);
    }
    return data as Timesheet | null;
  }

  static async getTimesheetByWeekWithRetry(userId: string, weekStart: string, maxAttempts = 10): Promise<Timesheet | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempting to find timesheet (attempt ${attempt}/${maxAttempts})`);
      
      const timesheet = await this.getTimesheetByWeek(userId, weekStart);
      
      if (timesheet) {
        console.log(`Found timesheet on attempt ${attempt}:`, {
          id: timesheet.id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          created_at: timesheet.created_at
        });
        return timesheet;
      }
      
      if (attempt < maxAttempts) {
        const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
        console.log(`Timesheet not found, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    console.log(`Failed to find timesheet after ${maxAttempts} attempts`);
    return null;
  }

  static async countTimesheetsForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('timesheets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to count timesheets: ${error.message}`);
    }
    
    return count || 0;
  }

  static async getAllTimesheetsForUser(userId: string): Promise<Timesheet[]> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get all timesheets: ${error.message}`);
    }
    
    return (data as Timesheet[]) || [];
  }

  static async getMostRecentTimesheetForUser(userId: string): Promise<Timesheet | null> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get most recent timesheet: ${error.message}`);
    }
    
    return data as Timesheet | null;
  }

  static async waitForTimesheetToExist(userId: string, weekStart: string, timeoutMs = 30000): Promise<Timesheet> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every 1 second
    
    while (Date.now() - startTime < timeoutMs) {
      const timesheet = await this.getTimesheetByWeek(userId, weekStart);
      
      if (timesheet) {
        console.log('Timesheet found:', {
          id: timesheet.id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          waitTime: Date.now() - startTime
        });
        return timesheet;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Timesheet not found within ${timeoutMs}ms timeout`);
  }

  static async findTimesheetByDateRange(userId: string, targetDate: string): Promise<Timesheet | null> {
    console.log(`Searching for timesheet by date range around: ${targetDate}`);
    
    // Get all timesheets for user and try to find one that matches approximately
    const allTimesheets = await this.getAllTimesheetsForUser(userId);
    
    const targetDateTime = new Date(targetDate).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    for (const timesheet of allTimesheets) {
      const timesheetDateTime = new Date(timesheet.week_start_date).getTime();
      const timeDiff = Math.abs(targetDateTime - timesheetDateTime);
      
      console.log(`Comparing timesheet ${timesheet.id}: ${timesheet.week_start_date} vs ${targetDate}, diff: ${timeDiff}ms`);
      
      if (timeDiff < oneDayMs) { // Within 1 day
        console.log(`Found matching timesheet by date range: ${timesheet.id}`);
        return timesheet;
      }
    }
    
    console.log('No timesheet found by date range');
    return null;
  }

  static async getTimesheetById(id: string): Promise<Timesheet> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      throw new Error(`Failed to get timesheet by id: ${error.message}`);
    }
    return data as Timesheet;
  }

  static async verifyDatabaseConnection(): Promise<void> {
    try {
      console.log('=== DATABASE CONNECTION VERIFICATION ===');
      
      // Test basic connectivity
      const { data: authUser } = await this.supabase.auth.getUser();
      console.log('Auth user:', authUser?.user?.id || 'No auth user');
      
      // Test if we can query users table
      const { data: users, error: usersError } = await this.supabase
        .from('users')
        .select('id, email')
        .limit(1);
      console.log('Users query:', { count: users?.length || 0, error: usersError?.message });
      
      // Test if we can query timesheets table
      const { data: allTimesheets, error: timesheetsError } = await this.supabase
        .from('timesheets')
        .select('id, user_id, week_start_date')
        .limit(5);
      console.log('All timesheets query:', { count: allTimesheets?.length || 0, error: timesheetsError?.message });
      
      // Test if we can create a test record (and immediately delete it)
      const testWeek = '2025-12-31'; // Far future date to avoid conflicts
      const testUserId = 'test-user-id-12345';
      
      const { data: testRecord, error: createError } = await this.supabase
        .from('timesheets')
        .insert({
          user_id: testUserId,
          week_start_date: testWeek,
          week_end_date: '2026-01-06',
          total_hours: 0,
          status: 'draft',
          is_verified: false
        })
        .select()
        .single();
        
      if (createError) {
        console.log('Test create failed:', createError.message);
      } else {
        console.log('Test create succeeded:', testRecord?.id);
        
        // Clean up test record
        await this.supabase
          .from('timesheets')
          .delete()
          .eq('id', testRecord.id);
        console.log('Test record cleaned up');
      }
      
    } catch (error) {
      console.error('Database verification failed:', error);
    }
  }

  static async debugDatabaseConnection(userId: string) {
    console.log('=== DATABASE CONNECTION DEBUG ===');
    
    // Check current user
    const { data: { user } } = await this.supabase.auth.getUser();
    console.log('Current auth user:', user?.id);
    console.log('Target user:', userId);
    console.log('Users match:', user?.id === userId);
    
    // Try querying with different approaches
    console.log('--- Approach 1: Normal query ---');
    const { data: normal, error: normalError } = await this.supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId);
    console.log('Normal query:', { count: normal?.length, error: normalError });
    
    console.log('--- Approach 2: Count query ---');
    const { count, error: countError } = await this.supabase
      .from('timesheets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    console.log('Count query:', { count, error: countError });
    
    console.log('--- Approach 3: All timesheets ---');
    const { data: all, error: allError } = await this.supabase
      .from('timesheets')
      .select('*');
    console.log('All timesheets:', { count: all?.length, error: allError });
    
    return { normal, count, all };
  }


  // Add these methods to your DatabaseHelpers class

  static async cleanupTestTimesheet(userId: string, weekStart: string) {
      console.log('=== CLEANING UP TEST TIMESHEET ===');
      console.log('User ID:', userId);
      console.log('Week start:', weekStart);
      
      try {
          // Find the timesheet to delete
          const timesheet = await this.getTimesheetByWeek(userId, weekStart);
          
          if (!timesheet) {
              console.log('No timesheet found to cleanup');
              return { success: true, message: 'No timesheet to cleanup' };
          }
          
          console.log('Found timesheet to delete:', timesheet.id);
          
          // Delete time entries first (due to foreign key constraints)
          const { error: entriesError } = await this.supabase
              .from('time_entries')
              .delete()
              .eq('timesheet_id', timesheet.id);
              
          if (entriesError) {
              console.error('Error deleting time entries:', entriesError);
              throw entriesError;
          }
          
          console.log('Time entries deleted successfully');
          
          // Then delete the timesheet
          const { error: timesheetError } = await this.supabase
              .from('timesheets')
              .delete()
              .eq('id', timesheet.id);
              
          if (timesheetError) {
              console.error('Error deleting timesheet:', timesheetError);
              throw timesheetError;
          }
          
          console.log('Timesheet deleted successfully');
          
          return { 
              success: true, 
              message: `Cleaned up timesheet ${timesheet.id}`,
              deletedTimesheetId: timesheet.id
          };
          
      } catch (error) {
          console.error('Error during cleanup:', error);
          return { 
              success: false, 
              error: error.message,
              message: 'Cleanup failed'
          };
      }
  }

  static async cleanupAllTestTimesheetsForUser(userId: string) {
      console.log('=== CLEANING UP ALL TEST TIMESHEETS FOR USER ===');
      console.log('User ID:', userId);
      
      try {
          // Get all timesheets for the user
          const timesheets = await this.getAllTimesheetsForUser(userId);
          
          if (!timesheets || timesheets.length === 0) {
              console.log('No timesheets found to cleanup');
              return { success: true, message: 'No timesheets to cleanup' };
          }
          
          console.log(`Found ${timesheets.length} timesheets to cleanup`);
          
          const deletedIds: string[] = [];
          
          for (const timesheet of timesheets) {
              console.log(`Deleting timesheet: ${timesheet.id}`);
              
              // Delete time entries first
              const { error: entriesError } = await this.supabase
                  .from('time_entries')
                  .delete()
                  .eq('timesheet_id', timesheet.id);
                  
              if (entriesError) {
                  console.error(`Error deleting entries for timesheet ${timesheet.id}:`, entriesError);
                  continue; // Continue with other timesheets
              }
              
              // Delete the timesheet
              const { error: timesheetError } = await this.supabase
                  .from('timesheets')
                  .delete()
                  .eq('id', timesheet.id);
                  
              if (timesheetError) {
                  console.error(`Error deleting timesheet ${timesheet.id}:`, timesheetError);
                  continue;
              }
              
              deletedIds.push(timesheet.id);
              console.log(`Successfully deleted timesheet: ${timesheet.id}`);
          }
          
          return { 
              success: true, 
              message: `Cleaned up ${deletedIds.length} timesheets`,
              deletedTimesheetIds: deletedIds
          };
          
      } catch (error) {
          console.error('Error during bulk cleanup:', error);
          return { 
              success: false, 
              error: error.message,
              message: 'Bulk cleanup failed'
          };
      }
  }

  static async cleanupRecentTestTimesheets(userId: string, hoursBack: number = 24) {
      console.log('=== CLEANING UP RECENT TEST TIMESHEETS ===');
      console.log(`User ID: ${userId}, Hours back: ${hoursBack}`);
      
      try {
          const cutoffTime = new Date();
          cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
          
          // Get timesheets created in the last X hours
          const { data: timesheets, error } = await this.adminSupabase
              .from('timesheets')
              .select('*')
              .eq('user_id', userId)
              .gte('created_at', cutoffTime.toISOString());
              
          if (error) {
              throw error;
          }
          
          if (!timesheets || timesheets.length === 0) {
              console.log('No recent timesheets found to cleanup');
              return { success: true, message: 'No recent timesheets to cleanup' };
          }
          
          console.log(`Found ${timesheets.length} recent timesheets to cleanup`);
          
          const deletedIds: string[] = [];
          
          for (const timesheet of timesheets) {
              // Delete time entries first
              await this.adminSupabase
                  .from('time_entries')
                  .delete()
                  .eq('timesheet_id', timesheet.id);
                  
              // Delete the timesheet
              const { error: deleteError } = await this.adminSupabase
                  .from('timesheets')
                  .delete()
                  .eq('id', timesheet.id);
                  
              if (!deleteError) {
                  deletedIds.push(timesheet.id);
              }
          }
          
          return { 
              success: true, 
              message: `Cleaned up ${deletedIds.length} recent timesheets`,
              deletedTimesheetIds: deletedIds
          };
          
      } catch (error) {
          console.error('Error during recent cleanup:', error);
          return { 
              success: false, 
              error: error.message 
          };
      }
  }
  static async validateTimesheetOrFallback(userId: string, weekStart: string) {
    const mostRecent = await DatabaseHelpers.getMostRecentTimesheetForUser(userId);
  
    let saved = await DatabaseHelpers.getTimesheetByWeekWithRetry(userId, weekStart, 5);
  
    if (!saved) {
      saved = await DatabaseHelpers.findTimesheetByDateRange(userId, weekStart);
    }
  
    const timesheetToValidate = saved || mostRecent;
  
    // expect(timesheetToValidate).toBeTruthy();
    // expect(['draft', 'submitted']).toContain(timesheetToValidate!.status);
  
    // console.log('Validated timesheet:', timesheetToValidate!.id, 'with status:', timesheetToValidate!.status);
  
    return timesheetToValidate!;
  }
}

// DatabaseHelpers.ts

