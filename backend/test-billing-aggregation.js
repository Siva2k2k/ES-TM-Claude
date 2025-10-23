/**
 * Test Script: Verify Billing Aggregation Logic
 * 
 * Scenario:
 * - Management verified "Timesheet Management" project for Oct 6-12 and Oct 13-19
 * - Management did NOT verify "Project Management" project
 * - Expected: Only Timesheet Management data in billing
 * 
 * Expected Data:
 * - Total Worked: 288h
 * - Total Adjustment: +4h (only John Developer H)
 * - Total Billable: 292h
 * 
 * Breakdown:
 * - John Developer H: 64h worked + 4h adjustment = 68h billable
 * - John Developer AB: 64h worked + 0h adjustment = 64h billable
 * - Jane Designer: 80h worked + 0h adjustment = 80h billable
 * - Manager (Siva): 80h worked + 0h adjustment = 80h billable
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
require('./dist/models/TimesheetProjectApproval');
require('./dist/models/Timesheet');
require('./dist/models/Project');
require('./dist/models/User');

async function testBillingAggregation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/es-tm');
    console.log('Connected to MongoDB\n');

    const TimesheetProjectApproval = mongoose.model('TimesheetProjectApproval');
    const Timesheet = mongoose.model('Timesheet');
    const Project = mongoose.model('Project');

    // Date range for testing (2025, not 2024!)
    const startDate = new Date('2025-10-06');
    const endDate = new Date('2025-10-19');

    console.log('=== TESTING BILLING AGGREGATION ===');
    console.log('Date Range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    console.log('');

    // Step 1: Find all projects
    const projects = await Project.find({}).select('name');
    console.log('=== ALL PROJECTS ===');
    projects.forEach(p => console.log(`  - ${p.name} (${p._id})`));
    console.log('');

    // Step 2: Find timesheets in date range
    const timesheets = await Timesheet.find({
      week_start_date: { $gte: startDate, $lte: endDate },
      deleted_at: null
    }).populate('user_id', 'full_name').select('user_id week_start_date status');

    console.log('=== TIMESHEETS IN DATE RANGE ===');
    console.log(`Found ${timesheets.length} timesheets`);
    timesheets.forEach(ts => {
      console.log(`  - ${ts.user_id?.full_name || 'Unknown'}: Week ${ts.week_start_date.toISOString().split('T')[0]} - Status: ${ts.status}`);
    });
    console.log('');

    // Step 3: Find all TimesheetProjectApproval records
    const allApprovals = await TimesheetProjectApproval.find({
      timesheet_id: { $in: timesheets.map(ts => ts._id) }
    })
    .populate('project_id', 'name')
    .populate({
      path: 'timesheet_id',
      select: 'user_id week_start_date status',
      populate: { path: 'user_id', select: 'full_name' }
    })
    .lean();

    console.log('=== ALL PROJECT APPROVALS (Before Filter) ===');
    console.log(`Found ${allApprovals.length} approval records`);
    
    const groupedByProject = {};
    allApprovals.forEach(approval => {
      const projectName = approval.project_id?.name || 'Unknown Project';
      if (!groupedByProject[projectName]) {
        groupedByProject[projectName] = [];
      }
      groupedByProject[projectName].push(approval);
    });

    Object.keys(groupedByProject).forEach(projectName => {
      console.log(`\n  Project: ${projectName}`);
      groupedByProject[projectName].forEach(approval => {
        const userName = approval.timesheet_id?.user_id?.full_name || 'Unknown';
        const weekStart = approval.timesheet_id?.week_start_date?.toISOString().split('T')[0] || 'N/A';
        const timesheetStatus = approval.timesheet_id?.status || 'N/A';
        console.log(`    - ${userName} (Week ${weekStart})`);
        console.log(`      Timesheet Status: ${timesheetStatus}`);
        console.log(`      Management Status: ${approval.management_status}`);
        console.log(`      Worked: ${approval.worked_hours}h, Adjustment: ${approval.billable_adjustment}h, Billable: ${approval.billable_hours}h`);
      });
    });
    console.log('');

    // Step 4: Filter for management_status='approved' ONLY
    const approvedApprovals = allApprovals.filter(approval => 
      approval.management_status === 'approved' &&
      approval.timesheet_id?.status &&
      ['frozen', 'billed'].includes(approval.timesheet_id.status)
    );

    console.log('=== MANAGEMENT-APPROVED APPROVALS ONLY ===');
    console.log(`Found ${approvedApprovals.length} management-approved records`);
    
    const approvedGrouped = {};
    approvedApprovals.forEach(approval => {
      const projectName = approval.project_id?.name || 'Unknown Project';
      if (!approvedGrouped[projectName]) {
        approvedGrouped[projectName] = {
          users: {},
          totalWorked: 0,
          totalAdjustment: 0,
          totalBillable: 0
        };
      }
      
      const userName = approval.timesheet_id?.user_id?.full_name || 'Unknown';
      if (!approvedGrouped[projectName].users[userName]) {
        approvedGrouped[projectName].users[userName] = {
          worked: 0,
          adjustment: 0,
          billable: 0
        };
      }
      
      approvedGrouped[projectName].users[userName].worked += approval.worked_hours || 0;
      approvedGrouped[projectName].users[userName].adjustment += approval.billable_adjustment || 0;
      approvedGrouped[projectName].users[userName].billable += approval.billable_hours || 0;
      
      approvedGrouped[projectName].totalWorked += approval.worked_hours || 0;
      approvedGrouped[projectName].totalAdjustment += approval.billable_adjustment || 0;
      approvedGrouped[projectName].totalBillable += approval.billable_hours || 0;
    });

    Object.keys(approvedGrouped).forEach(projectName => {
      console.log(`\n  ✓ Project: ${projectName} (MANAGEMENT APPROVED)`);
      const projectData = approvedGrouped[projectName];
      
      Object.keys(projectData.users).forEach(userName => {
        const userData = projectData.users[userName];
        console.log(`    - ${userName}:`);
        console.log(`      Worked: ${userData.worked}h`);
        console.log(`      Adjustment: ${userData.adjustment > 0 ? '+' : ''}${userData.adjustment}h`);
        console.log(`      Billable: ${userData.billable}h`);
      });
      
      console.log(`    ─────────────────────────────`);
      console.log(`    TOTAL Worked: ${projectData.totalWorked}h`);
      console.log(`    TOTAL Adjustment: ${projectData.totalAdjustment > 0 ? '+' : ''}${projectData.totalAdjustment}h`);
      console.log(`    TOTAL Billable: ${projectData.totalBillable}h`);
    });
    console.log('');

    // Step 5: Verification
    console.log('=== VERIFICATION ===');
    const expectedProject = 'Timesheet Management';
    if (approvedGrouped[expectedProject]) {
      const data = approvedGrouped[expectedProject];
      console.log('✓ Timesheet Management project found in approved data');
      console.log(`  Expected Worked: 288h, Actual: ${data.totalWorked}h ${data.totalWorked === 288 ? '✓' : '✗'}`);
      console.log(`  Expected Adjustment: +4h, Actual: ${data.totalAdjustment > 0 ? '+' : ''}${data.totalAdjustment}h ${data.totalAdjustment === 4 ? '✓' : '✗'}`);
      console.log(`  Expected Billable: 292h, Actual: ${data.totalBillable}h ${data.totalBillable === 292 ? '✓' : '✗'}`);
      
      // Check individual users
      console.log('\n  Individual Verification:');
      const expectations = {
        'John Developer H': { worked: 64, adjustment: 4, billable: 68 },
        'John Developer AB': { worked: 64, adjustment: 0, billable: 64 },
        'Jane Designer': { worked: 80, adjustment: 0, billable: 80 },
        'Siva Kumar V': { worked: 80, adjustment: 0, billable: 80 }
      };
      
      Object.keys(expectations).forEach(userName => {
        if (data.users[userName]) {
          const actual = data.users[userName];
          const expected = expectations[userName];
          const match = actual.worked === expected.worked && 
                       actual.adjustment === expected.adjustment && 
                       actual.billable === expected.billable;
          console.log(`    ${userName}: ${match ? '✓' : '✗'}`);
          if (!match) {
            console.log(`      Expected: ${expected.worked}h + ${expected.adjustment}h = ${expected.billable}h`);
            console.log(`      Actual:   ${actual.worked}h + ${actual.adjustment}h = ${actual.billable}h`);
          }
        } else {
          console.log(`    ${userName}: ✗ NOT FOUND`);
        }
      });
    } else {
      console.log('✗ Timesheet Management project NOT FOUND in approved data!');
    }

    // Check that Project Management is NOT included
    if (!approvedGrouped['Project Management']) {
      console.log('\n✓ Project Management correctly EXCLUDED (not management-approved)');
    } else {
      console.log('\n✗ Project Management incorrectly INCLUDED (should be excluded)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testBillingAggregation();
