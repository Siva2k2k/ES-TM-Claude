/**
 * Database Schema Cleanup Script
 * Removes unnecessary collections identified in SCHEMA_CLEANUP_ANALYSIS.md
 *
 * Usage: node scripts/cleanup-schema.js
 *
 * Actions:
 * 1. Remove auth_test collection (test collection)
 * 2. Verify all user credentials are maintained
 * 3. Optionally seed systemsettings with defaults
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin';

// Test users that must exist
const REQUIRED_USERS = [
  'admin@company.com',
  'management@company.com',
  'manager@company.com',
  'employee1@company.com',
  'employee2@company.com'
];

async function cleanupSchema() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // ==========================================
    // STEP 1: Verify User Credentials
    // ==========================================
    console.log('👥 Verifying required user accounts...');
    const usersCollection = db.collection('users');

    for (const email of REQUIRED_USERS) {
      const user = await usersCollection.findOne({ email });
      if (user) {
        console.log(`  ✓ ${email} (${user.role})`);
      } else {
        console.log(`  ❌ ${email} - NOT FOUND!`);
        throw new Error(`Required user ${email} not found in database!`);
      }
    }
    console.log('✅ All 5 test users verified\n');

    // ==========================================
    // STEP 2: Remove Test Collection
    // ==========================================
    console.log('🗑️  Removing unnecessary collections...');

    // Check if auth_test exists
    const collections = await db.listCollections({ name: 'auth_test' }).toArray();

    if (collections.length > 0) {
      const count = await db.collection('auth_test').countDocuments();
      console.log(`  Found auth_test collection (${count} documents)`);

      await db.collection('auth_test').drop();
      console.log('  ✓ Removed auth_test collection');
    } else {
      console.log('  ℹ️  auth_test collection not found (already clean)');
    }
    console.log('');

    // ==========================================
    // STEP 3: Seed System Settings (Optional)
    // ==========================================
    console.log('⚙️  Checking system settings...');
    const settingsCollection = db.collection('systemsettings');
    const settingsCount = await settingsCollection.countDocuments();

    if (settingsCount === 0) {
      console.log('  Creating default system settings...');
      await settingsCollection.insertOne({
        email_enabled: true,
        smtp_configured: true,
        max_timesheet_hours_per_week: 60,
        max_timesheet_hours_per_day: 24,
        require_task_comments: false,
        auto_submit_timesheets: false,
        timesheet_submission_deadline: 'sunday',
        allow_retroactive_entries: true,
        retroactive_entry_days_limit: 30,
        features: {
          billing_enabled: true,
          reports_enabled: true,
          notifications_enabled: true,
          audit_logs_enabled: true
        },
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('  ✓ Default system settings created');
    } else {
      console.log(`  ℹ️  System settings already configured (${settingsCount} documents)`);
    }
    console.log('');

    // ==========================================
    // STEP 4: Summary Report
    // ==========================================
    console.log('📊 Final Collection Summary:');
    const allCollections = await db.listCollections().toArray();

    for (const col of allCollections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(col.name).countDocuments();
      const status = count === 0 ? '(empty)' : `(${count} docs)`;
      console.log(`  • ${col.name.padEnd(30)} ${status}`);
    }

    console.log(`\n✅ Schema cleanup completed successfully!`);
    console.log(`📁 Total collections: ${allCollections.length}`);

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Schema cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run cleanup
cleanupSchema();
