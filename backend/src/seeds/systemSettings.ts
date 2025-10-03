import { SystemSettings } from '../models/SystemSettings';
import { User } from '../models/User';

/**
 * Seed default system settings
 * Run this to populate initial system configuration
 */
export async function seedSystemSettings() {
  console.log('🌱 Seeding system settings...');

  try {
    // Find a super admin to set as the creator
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      console.log('❌ No super admin found. Create a super admin user first.');
      return;
    }

    const defaultSettings = [
      // General Settings
      {
        setting_key: 'app_name',
        setting_value: 'Enterprise Timesheet Management',
        description: 'Application name displayed in the interface',
        category: 'general',
        data_type: 'string',
        is_public: true,
        requires_restart: false,
        updated_by: superAdmin._id
      },
      {
        setting_key: 'company_logo_url',
        setting_value: '/assets/logo.png',
        description: 'URL or path to the company logo',
        category: 'appearance',
        data_type: 'string',
        is_public: true,
        requires_restart: false,
        updated_by: superAdmin._id
      },
      {
        setting_key: 'default_theme',
        setting_value: 'light',
        description: 'Default theme for new users',
        category: 'appearance',
        data_type: 'string',
        is_public: true,
        requires_restart: false,
        validation_rules: {
          enum: ['light', 'dark', 'system']
        },
        updated_by: superAdmin._id
      },

      // Security Settings
      {
        setting_key: 'password_min_length',
        setting_value: 12,
        description: 'Minimum password length requirement',
        category: 'security',
        data_type: 'number',
        is_public: false,
        requires_restart: false,
        validation_rules: {
          min: 8,
          max: 50
        },
        updated_by: superAdmin._id
      },
      {
        setting_key: 'session_timeout_minutes',
        setting_value: 480,
        description: 'Session timeout in minutes (8 hours default)',
        category: 'security',
        data_type: 'number',
        is_public: false,
        requires_restart: true,
        validation_rules: {
          min: 30,
          max: 1440
        },
        updated_by: superAdmin._id
      },
      {
        setting_key: 'enable_two_factor',
        setting_value: false,
        description: 'Enable two-factor authentication requirement',
        category: 'security',
        data_type: 'boolean',
        is_public: false,
        requires_restart: false,
        updated_by: superAdmin._id
      },

      // Notification Settings
      {
        setting_key: 'email_notifications_enabled',
        setting_value: true,
        description: 'Global email notifications toggle',
        category: 'notifications',
        data_type: 'boolean',
        is_public: false,
        requires_restart: false,
        updated_by: superAdmin._id
      },
      {
        setting_key: 'notification_email_from',
        setting_value: 'noreply@company.com',
        description: 'From email address for system notifications',
        category: 'notifications',
        data_type: 'string',
        is_public: false,
        requires_restart: true,
        updated_by: superAdmin._id
      },
      {
        setting_key: 'timesheet_reminder_time',
        setting_value: '09:00',
        description: 'Time to send daily timesheet reminders (HH:MM format)',
        category: 'notifications',
        data_type: 'string',
        is_public: false,
        requires_restart: false,
        validation_rules: {
          pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
        },
        updated_by: superAdmin._id
      },

      // Report Settings
      {
        setting_key: 'max_report_export_rows',
        setting_value: 10000,
        description: 'Maximum number of rows allowed in report exports',
        category: 'reports',
        data_type: 'number',
        is_public: false,
        requires_restart: false,
        validation_rules: {
          min: 100,
          max: 100000
        },
        updated_by: superAdmin._id
      },
      {
        setting_key: 'default_report_format',
        setting_value: 'pdf',
        description: 'Default format for report generation',
        category: 'reports',
        data_type: 'string',
        is_public: true,
        requires_restart: false,
        validation_rules: {
          enum: ['pdf', 'excel', 'csv']
        },
        updated_by: superAdmin._id
      },

      // Integration Settings
      {
        setting_key: 'api_rate_limit_per_hour',
        setting_value: 1000,
        description: 'API rate limit per user per hour',
        category: 'integration',
        data_type: 'number',
        is_public: false,
        requires_restart: true,
        validation_rules: {
          min: 100,
          max: 10000
        },
        updated_by: superAdmin._id
      },
      {
        setting_key: 'enable_api_access',
        setting_value: true,
        description: 'Enable external API access',
        category: 'integration',
        data_type: 'boolean',
        is_public: false,
        requires_restart: true,
        updated_by: superAdmin._id
      },

      // Appearance Settings
      {
        setting_key: 'sidebar_default_collapsed',
        setting_value: false,
        description: 'Default sidebar state for new users',
        category: 'appearance',
        data_type: 'boolean',
        is_public: true,
        requires_restart: false,
        updated_by: superAdmin._id
      },
      {
        setting_key: 'table_default_page_size',
        setting_value: 25,
        description: 'Default number of items per page in tables',
        category: 'appearance',
        data_type: 'number',
        is_public: true,
        requires_restart: false,
        validation_rules: {
          min: 5,
          max: 100
        },
        updated_by: superAdmin._id
      },
      {
        setting_key: 'enable_animations',
        setting_value: true,
        description: 'Enable UI animations by default',
        category: 'appearance',
        data_type: 'boolean',
        is_public: true,
        requires_restart: false,
        updated_by: superAdmin._id
      }
    ];

    // Use upsert to avoid duplicates
    for (const setting of defaultSettings) {
      await SystemSettings.findOneAndUpdate(
        { setting_key: setting.setting_key },
        setting,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Seeded ${defaultSettings.length} system settings successfully!`);
    
    // Display some key settings
    const publicSettings = await SystemSettings.find({ is_public: true }).select('setting_key setting_value category');
    console.log('\n📋 Public Settings:');
    publicSettings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value} (${setting.category})`);
    });

  } catch (error) {
    console.error('❌ Error seeding system settings:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoose = require('mongoose');
  
  async function run() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timesheet-management');
      await seedSystemSettings();
    } catch (error) {
      console.error('Failed to seed settings:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  }
  
  run();
}