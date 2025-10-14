/**
 * Debug Team Review Data
 * Checks why Team Review page shows no data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin';

async function debugTeamReview() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;

    // Find manager
    console.log('=== MANAGER DATA ===');
    const manager = await db.collection('users').findOne({ email: 'manager@company.com' });
    if (!manager) {
      console.log('❌ Manager not found!');
      return;
    }
    console.log('Manager:', {
      _id: manager._id,
      email: manager.email,
      role: manager.role
    });

    // Find projects managed
    console.log('\n=== PROJECTS MANAGED ===');
    const projects = await db.collection('projects').find({
      primary_manager_id: manager._id
    }).toArray();
    console.log('Projects as primary manager:', projects.length);
    projects.forEach(p => console.log(`  - ${p.name} (${p._id})`));

    // Find secondary manager projects
    const secondaryProjects = await db.collection('projectmembers').find({
      user_id: manager._id,
      is_secondary_manager: true
    }).toArray();
    console.log('Projects as secondary manager:', secondaryProjects.length);
    secondaryProjects.forEach(pm => console.log(`  - Project: ${pm.project_id}`));

    // All project IDs manager can see
    const allProjectIds = [
      ...projects.map(p => p._id),
      ...secondaryProjects.map(pm => pm.project_id)
    ];
    console.log('Total projects manager can approve:', allProjectIds.length);

    // Find team members
    console.log('\n=== PROJECT MEMBERS ===');
    const members = await db.collection('projectmembers').find({
      project_id: { $in: allProjectIds },
      user_id: { $ne: manager._id }
    }).toArray();
    console.log('Team members in managed projects:', members.length);
    for (const m of members) {
      const user = await db.collection('users').findOne({ _id: m.user_id });
      console.log(`  - ${user?.full_name || 'Unknown'} (${user?.email}) in project ${m.project_id}`);
    }

    // Find timesheets
    console.log('\n=== TIMESHEETS ===');
    const teamMemberIds = members.map(m => m.user_id);
    const allTimesheets = await db.collection('timesheets').find({
      user_id: { $in: teamMemberIds }
    }).toArray();
    console.log('Total timesheets from team:', allTimesheets.length);

    const submittedTimesheets = allTimesheets.filter(t =>
      t.status === 'submitted' || t.status === 'manager_approved'
    );
    console.log('Submitted/Approved timesheets:', submittedTimesheets.length);

    submittedTimesheets.forEach(t => {
      console.log(`  - User: ${t.user_id}, Week: ${t.week_start_date}, Status: ${t.status}`);
    });

    // Find time entries
    console.log('\n=== TIME ENTRIES ===');
    for (const timesheet of submittedTimesheets.slice(0, 3)) {
      const entries = await db.collection('timeentries').find({
        timesheet_id: timesheet._id
      }).toArray();
      console.log(`  Timesheet ${timesheet._id} has ${entries.length} entries`);
      entries.forEach(e => console.log(`    - Project: ${e.project_id}, Hours: ${e.hours}`));
    }

    // Find timesheet project approvals
    console.log('\n=== TIMESHEET PROJECT APPROVALS ===');
    const approvals = await db.collection('timesheetprojectapprovals').find({}).toArray();
    console.log('Total approvals in DB:', approvals.length);

    const managerApprovals = approvals.filter(a =>
      a.manager_id && a.manager_id.toString() === manager._id.toString()
    );
    console.log('Approvals for this manager:', managerApprovals.length);

    managerApprovals.forEach(a => {
      console.log(`  - Timesheet: ${a.timesheet_id}, Project: ${a.project_id}`);
      console.log(`    Manager Status: ${a.manager_status}, Lead Status: ${a.lead_status || 'N/A'}`);
    });

    // Check if approvals are created for submitted timesheets
    console.log('\n=== MISSING APPROVALS ===');
    for (const timesheet of submittedTimesheets) {
      const entries = await db.collection('timeentries').find({
        timesheet_id: timesheet._id
      }).toArray();

      const projectIds = [...new Set(entries.map(e => e.project_id.toString()))];

      for (const projectId of projectIds) {
        const approval = await db.collection('timesheetprojectapprovals').findOne({
          timesheet_id: timesheet._id,
          project_id: new mongoose.Types.ObjectId(projectId)
        });

        if (!approval) {
          console.log(`  ❌ Missing approval: Timesheet ${timesheet._id} x Project ${projectId}`);
        }
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugTeamReview();
