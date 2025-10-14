const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin';

async function checkSubmitted() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== SUBMITTED TIMESHEETS ===\n');
    const submitted = await db.collection('timesheets').find({ status: 'submitted' }).toArray();
    console.log('Total Count:', submitted.length, '\n');

    for (const ts of submitted) {
      const user = await db.collection('users').findOne({ _id: ts.user_id });
      console.log(`Timesheet ID: ${ts._id}`);
      console.log(`  User: ${user?.full_name} (${user?.email})`);
      console.log(`  Week: ${ts.week_start_date.toISOString().split('T')[0]} to ${ts.week_end_date.toISOString().split('T')[0]}`);
      console.log(`  Status: ${ts.status}`);

      // Check approvals
      const approvals = await db.collection('timesheetprojectapprovals').find({
        timesheet_id: ts._id
      }).toArray();

      console.log(`  Approvals: ${approvals.length}`);
      for (const a of approvals) {
        const project = await db.collection('projects').findOne({ _id: a.project_id });
        console.log(`    - Project: ${project?.name || 'Unknown'}`);
        console.log(`      Manager Status: ${a.manager_status}`);
        console.log(`      Lead Status: ${a.lead_status}`);
      }
      console.log('');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSubmitted();
