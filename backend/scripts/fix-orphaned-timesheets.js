/**
 * Fix Orphaned Timesheets Script
 * 1. Delete timesheets with undefined/deleted users
 * 2. Create missing TimesheetProjectApproval records for valid submitted timesheets
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin';

async function fixOrphanedTimesheets() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;

    // Step 1: Find and delete orphaned timesheets (users don't exist)
    console.log('=== STEP 1: Cleaning Orphaned Timesheets ===\n');
    const submittedTimesheets = await db.collection('timesheets').find({
      status: 'submitted'
    }).toArray();

    let deletedCount = 0;
    let orphanedIds = [];

    for (const ts of submittedTimesheets) {
      const user = await db.collection('users').findOne({ _id: ts.user_id });
      if (!user) {
        console.log(`❌ Orphaned timesheet: ${ts._id} (user ${ts.user_id} not found)`);
        orphanedIds.push(ts._id);
      }
    }

    if (orphanedIds.length > 0) {
      // Delete orphaned timesheets
      const deleteResult = await db.collection('timesheets').deleteMany({
        _id: { $in: orphanedIds }
      });

      // Delete their time entries
      const entriesDeleteResult = await db.collection('timeentries').deleteMany({
        timesheet_id: { $in: orphanedIds }
      });

      // Delete their approval records
      const approvalsDeleteResult = await db.collection('timesheetprojectapprovals').deleteMany({
        timesheet_id: { $in: orphanedIds }
      });

      deletedCount = deleteResult.deletedCount;
      console.log(`\n✓ Deleted ${deletedCount} orphaned timesheets`);
      console.log(`✓ Deleted ${entriesDeleteResult.deletedCount} orphaned time entries`);
      console.log(`✓ Deleted ${approvalsDeleteResult.deletedCount} orphaned approval records\n`);
    } else {
      console.log('✓ No orphaned timesheets found\n');
    }

    // Step 2: Create missing approval records for valid submitted timesheets
    console.log('=== STEP 2: Creating Missing Approval Records ===\n');

    const validSubmittedTimesheets = await db.collection('timesheets').find({
      status: 'submitted'
    }).toArray();

    console.log(`Found ${validSubmittedTimesheets.length} submitted timesheets\n`);

    let createdCount = 0;

    for (const timesheet of validSubmittedTimesheets) {
      const user = await db.collection('users').findOne({ _id: timesheet.user_id });
      if (!user) {
        console.log(`⚠️  Skipping timesheet ${timesheet._id} - user not found`);
        continue;
      }

      console.log(`Processing timesheet ${timesheet._id} for ${user.full_name}`);

      // Get time entries for this timesheet
      const entries = await db.collection('timeentries').find({
        timesheet_id: timesheet._id,
        deleted_at: null
      }).toArray();

      // Group by project
      const projectMap = new Map();
      for (const entry of entries) {
        if (!entry.project_id) continue;

        const projectId = entry.project_id.toString();
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId: entry.project_id,
            entries: [],
            totalHours: 0
          });
        }

        const projectData = projectMap.get(projectId);
        projectData.entries.push(entry);
        projectData.totalHours += entry.hours || 0;
      }

      console.log(`  Found ${projectMap.size} projects`);

      // Create approval records for each project
      for (const [projectIdStr, projectData] of projectMap.entries()) {
        // Check if approval already exists
        const existingApproval = await db.collection('timesheetprojectapprovals').findOne({
          timesheet_id: timesheet._id,
          project_id: projectData.projectId
        });

        if (existingApproval) {
          console.log(`  ℹ️  Approval already exists for project ${projectIdStr}`);
          continue;
        }

        // Get project details
        const project = await db.collection('projects').findOne({ _id: projectData.projectId });
        if (!project) {
          console.log(`  ⚠️  Project ${projectIdStr} not found`);
          continue;
        }

        // Find lead for this project
        const leadMember = await db.collection('projectmembers').findOne({
          project_id: projectData.projectId,
          project_role: 'lead',
          deleted_at: null,
          removed_at: null
        });

        // Create approval record
        const approvalData = {
          timesheet_id: timesheet._id,
          project_id: projectData.projectId,
          lead_id: leadMember ? leadMember.user_id : null,
          lead_status: leadMember ? 'pending' : 'not_required',
          manager_id: project.primary_manager_id,
          manager_status: 'pending',
          entries_count: projectData.entries.length,
          total_hours: projectData.totalHours,
          created_at: new Date(),
          updated_at: new Date()
        };

        await db.collection('timesheetprojectapprovals').insertOne(approvalData);

        console.log(`  ✓ Created approval record for project "${project.name}"`);
        console.log(`    Manager: ${project.primary_manager_id}`);
        console.log(`    Lead: ${leadMember ? leadMember.user_id : 'N/A'}`);
        console.log(`    Hours: ${projectData.totalHours}, Entries: ${projectData.entries.length}`);

        createdCount++;
      }

      console.log('');
    }

    console.log(`\n✅ Created ${createdCount} approval records`);

    // Step 3: Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✓ Deleted ${deletedCount} orphaned timesheets`);
    console.log(`✓ Created ${createdCount} approval records`);
    console.log(`✓ ${validSubmittedTimesheets.length} submitted timesheets now have proper approval tracking\n`);

    await mongoose.connection.close();
    console.log('✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixOrphanedTimesheets();
