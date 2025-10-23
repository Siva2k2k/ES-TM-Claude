/**
 * Check for BillingAdjustment records that might be affecting the UI display
 */

const mongoose = require('mongoose');
require('dotenv').config();

require('./dist/models/BillingAdjustment');
require('./dist/models/User');
require('./dist/models/Project');

async function checkBillingAdjustments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/es-tm');
    console.log('Connected to MongoDB\n');

    const BillingAdjustment = mongoose.model('BillingAdjustment');
    const User = mongoose.model('User');
    const Project = mongoose.model('Project');

    // Date range
    const startDate = new Date('2025-10-06');
    const endDate = new Date('2025-10-19');

    console.log('=== CHECKING BILLING ADJUSTMENTS ===');
    console.log('Date Range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    console.log('');

    // Find all BillingAdjustment records in date range
    const adjustments = await BillingAdjustment.find({
      $or: [
        {
          billing_period_start: { $lte: endDate },
          billing_period_end: { $gte: startDate }
        }
      ],
      deleted_at: null
    })
    .populate('user_id', 'full_name')
    .populate('project_id', 'name')
    .lean();

    console.log(`Found ${adjustments.length} billing adjustment records\n`);

    if (adjustments.length === 0) {
      console.log('No billing adjustments found in this date range.');
    } else {
      for (const adj of adjustments) {
        console.log('─────────────────────────────────');
        console.log(`User: ${adj.user_id?.full_name || 'Unknown'}`);
        console.log(`Project: ${adj.project_id?.name || 'Unknown'}`);
        console.log(`Period: ${adj.billing_period_start?.toISOString().split('T')[0]} to ${adj.billing_period_end?.toISOString().split('T')[0]}`);
        console.log(`Scope: ${adj.adjustment_scope}`);
        console.log('');
        console.log(`Total Worked Hours: ${adj.total_worked_hours}h`);
        console.log(`Adjustment Hours: ${adj.adjustment_hours > 0 ? '+' : ''}${adj.adjustment_hours}h`);
        console.log(`Total Billable Hours: ${adj.total_billable_hours}h`);
        console.log('');
        console.log(`Original Billable: ${adj.original_billable_hours}h`);
        console.log(`Adjusted Billable: ${adj.adjusted_billable_hours}h`);
        console.log(`Adjusted At: ${adj.adjusted_at?.toISOString().split('T')[0]}`);
        console.log(`Reason: ${adj.reason || 'N/A'}`);
        console.log('');
      }
    }

    // Check specifically for John Developer H
    const johnDevH = await User.findOne({ full_name: 'John Developer H' });
    const timesheetMgmt = await Project.findOne({ name: 'Timesheet Management' });

    if (johnDevH && timesheetMgmt) {
      console.log('\n=== SPECIFIC CHECK: John Developer H + Timesheet Management ===');
      const specificAdj = await BillingAdjustment.findOne({
        user_id: johnDevH._id,
        project_id: timesheetMgmt._id,
        billing_period_start: { $lte: endDate },
        billing_period_end: { $gte: startDate },
        deleted_at: null
      });

      if (specificAdj) {
        console.log('⚠️  FOUND ADJUSTMENT RECORD!');
        console.log(`  Worked: ${specificAdj.total_worked_hours}h`);
        console.log(`  Adjustment: ${specificAdj.adjustment_hours > 0 ? '+' : ''}${specificAdj.adjustment_hours}h`);
        console.log(`  Final Billable: ${specificAdj.total_billable_hours}h`);
        console.log(`  Original Billable: ${specificAdj.original_billable_hours}h`);
        console.log(`  Adjusted Billable: ${specificAdj.adjusted_billable_hours}h`);
        console.log('');
        console.log('This explains the UI discrepancy!');
        console.log(`Expected from TimesheetProjectApproval: 68h`);
        console.log(`Adjusted to: ${specificAdj.adjusted_billable_hours}h`);
        console.log(`Difference: ${68 - (specificAdj.adjusted_billable_hours || 0)}h`);
      } else {
        console.log('✓ No adjustment record found - this is odd!');
        console.log('UI should show 68h but shows 46h.');
        console.log('The issue may be in the frontend calculation.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkBillingAdjustments();
