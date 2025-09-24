import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase environment variables not configured. Using default values for development.');
  console.warn('Please update your .env file with proper Supabase credentials for production.');
}

// Custom storage implementation to ensure persistence
const customStorage = {
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      console.log(`📥 Storage GET: ${key} - ${item ? 'FOUND' : 'NOT_FOUND'}${item ? ` (${item.length} chars)` : ''}`);
      return item;
    } catch (error) {
      console.error(`❌ Storage GET error for ${key}:`, error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      console.log(`📤 Storage SET: ${key} - SUCCESS (${value.length} chars)`);
    } catch (error) {
      console.error(`❌ Storage SET error for ${key}:`, error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Storage REMOVE: ${key} - SUCCESS`);
    } catch (error) {
      console.error(`❌ Storage REMOVE error for ${key}:`, error);
    }
  }
};

// Use fallback values for development if environment variables are not set
const fallbackUrl = supabaseUrl || 'https://placeholder.supabase.co';
const fallbackKey = supabaseAnonKey || 'placeholder-anon-key';

// Check if we're in a test environment and use mock if available
const testMock = (globalThis as unknown as { __mockSupabase?: unknown }).__mockSupabase as unknown as SupabaseClient | undefined;
export const supabase: SupabaseClient = testMock ?? createClient(fallbackUrl, fallbackKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'sb-auth-token', // Ensure this is consistent
    flowType: 'pkce' // Use PKCE flow for better security and session handling
  }
});

// Database types (keep your existing types)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
          hourly_rate: number;
          is_active: boolean;
          is_approved_by_super_admin: boolean;
          manager_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
          hourly_rate?: number;
          is_active?: boolean;
          is_approved_by_super_admin?: boolean;
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
          hourly_rate?: number;
          is_active?: boolean;
          is_approved_by_super_admin?: boolean;
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      timesheets: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          total_hours: number;
          status: 'draft' | 'submitted' | 'manager_approved' | 'manager_rejected' | 'management_pending' | 'management_rejected' | 'frozen' | 'billed';
          approved_by_manager_id: string | null;
          approved_by_manager_at: string | null;
          manager_rejection_reason: string | null;
          manager_rejected_at: string | null;
          approved_by_management_id: string | null;
          approved_by_management_at: string | null;
          management_rejection_reason: string | null;
          management_rejected_at: string | null;
          verified_by_id: string | null;
          verified_at: string | null;
          is_verified: boolean;
          is_frozen: boolean;
          billing_snapshot_id: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          total_hours?: number;
          status?: 'draft' | 'submitted' | 'manager_approved' | 'manager_rejected' | 'management_pending' | 'management_rejected' | 'frozen' | 'billed';
          approved_by_manager_id?: string | null;
          approved_by_manager_at?: string | null;
          manager_rejection_reason?: string | null;
          manager_rejected_at?: string | null;
          approved_by_management_id?: string | null;
          approved_by_management_at?: string | null;
          management_rejection_reason?: string | null;
          management_rejected_at?: string | null;
          verified_by_id?: string | null;
          verified_at?: string | null;
          is_verified?: boolean;
          is_frozen?: boolean;
          billing_snapshot_id?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start_date?: string;
          week_end_date?: string;
          total_hours?: number;
          status?: 'draft' | 'submitted' | 'manager_approved' | 'manager_rejected' | 'management_pending' | 'management_rejected' | 'frozen' | 'billed';
          approved_by_manager_id?: string | null;
          approved_by_manager_at?: string | null;
          manager_rejection_reason?: string | null;
          manager_rejected_at?: string | null;
          approved_by_management_id?: string | null;
          approved_by_management_at?: string | null;
          management_rejection_reason?: string | null;
          management_rejected_at?: string | null;
          verified_by_id?: string | null;
          verified_at?: string | null;
          is_verified?: boolean;
          is_frozen?: boolean;
          billing_snapshot_id?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      time_entries: {
        Row: {
          id: string;
          timesheet_id: string;
          project_id: string | null;
          task_id: string | null;
          date: string;
          hours: number;
          description: string | null;
          is_billable: boolean;
          custom_task_description: string | null;
          entry_type: 'project_task' | 'custom_task';
          hourly_rate: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          timesheet_id: string;
          project_id?: string | null;
          task_id?: string | null;
          date: string;
          hours: number;
          description?: string | null;
          is_billable?: boolean;
          custom_task_description?: string | null;
          entry_type?: 'project_task' | 'custom_task';
          hourly_rate?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          timesheet_id?: string;
          project_id?: string | null;
          task_id?: string | null;
          date?: string;
          hours?: number;
          description?: string | null;
          is_billable?: boolean;
          custom_task_description?: string | null;
          entry_type?: 'project_task' | 'custom_task';
          hourly_rate?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          client_id: string;
          primary_manager_id: string;
          status: 'active' | 'completed' | 'archived';
          start_date: string;
          end_date: string | null;
          budget: number | null;
          description: string | null;
          is_billable: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          client_id: string;
          primary_manager_id: string;
          status?: 'active' | 'completed' | 'archived';
          start_date: string;
          end_date?: string | null;
          budget?: number | null;
          description?: string | null;
          is_billable?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          client_id?: string;
          primary_manager_id?: string;
          status?: 'active' | 'completed' | 'archived';
          start_date?: string;
          end_date?: string | null;
          budget?: number | null;
          description?: string | null;
          is_billable?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          assigned_to_user_id: string | null;
          status: string;
          estimated_hours: number | null;
          is_billable: boolean;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          assigned_to_user_id?: string | null;
          status?: string;
          estimated_hours?: number | null;
          is_billable?: boolean;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          assigned_to_user_id?: string | null;
          status?: string;
          estimated_hours?: number | null;
          is_billable?: boolean;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      billing_snapshots: {
        Row: {
          id: string;
          timesheet_id: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          total_hours: number;
          billable_hours: number;
          hourly_rate: number;
          total_amount: number;
          billable_amount: number;
          snapshot_data: any;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          timesheet_id: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          total_hours: number;
          billable_hours: number;
          hourly_rate: number;
          total_amount: number;
          billable_amount: number;
          snapshot_data?: any;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          timesheet_id?: string;
          user_id?: string;
          week_start_date?: string;
          week_end_date?: string;
          total_hours?: number;
          billable_hours?: number;
          hourly_rate?: number;
          total_amount?: number;
          billable_amount?: number;
          snapshot_data?: any;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          actor_id: string | null;
          actor_name: string;
          timestamp: string;
          details: any;
          metadata: any;
          old_data: any;
          new_data: any;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          actor_id?: string | null;
          actor_name: string;
          timestamp?: string;
          details?: any;
          metadata?: any;
          old_data?: any;
          new_data?: any;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: string;
          actor_id?: string | null;
          actor_name?: string;
          timestamp?: string;
          details?: any;
          metadata?: any;
          old_data?: any;
          new_data?: any;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
      };
      submit_timesheet: {
        Args: { timesheet_uuid: string };
        Returns: void;
      };
      manager_approve_reject_timesheet: {
        Args: { 
          timesheet_uuid: string; 
          action: string; 
          reason?: string 
        };
        Returns: void;
      };
      management_approve_reject_timesheet: {
        Args: { 
          timesheet_uuid: string; 
          action: string; 
          reason?: string 
        };
        Returns: void;
      };
      api_get_user_timesheets: {
        Args: {
          target_user_id?: string;
          status_filter?: string[];
          week_start_filter?: string;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: any;
      };
    };
  };
}