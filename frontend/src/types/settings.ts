
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    timesheet_reminders: boolean;
    approval_notifications: boolean;
    team_updates: boolean;
    system_announcements: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  display_preferences: {
    sidebar_collapsed: boolean;
    table_page_size: number;
    dashboard_widgets: string[];
    chart_preferences: {
      default_period: '7d' | '30d' | '90d' | '1y';
      show_animations: boolean;
    };
  };
  privacy_settings: {
    profile_visibility: 'public' | 'team' | 'private';
    show_activity_status: boolean;
    share_analytics: boolean;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'timesheet' | 'project' | 'user' | 'analytics' | 'custom';
  template_data: {
    fields: string[];
    filters: Record<string, string | number | boolean>;
    format: 'pdf' | 'excel' | 'csv';
  };
  access_level: 'personal' | 'team' | 'organization' | 'system';
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  setting_key: string;
  setting_value: string | number | boolean | Record<string, unknown>;
  description?: string;
  category: 'general' | 'security' | 'notifications' | 'reports' | 'integration' | 'appearance';
  is_public: boolean;
  updated_by: string;
  updated_at: string;
}
