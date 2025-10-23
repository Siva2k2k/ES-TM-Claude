/**
 * Fix: Delete incorrect BillingAdjustment for John Developer H
 */

const mongoose = require('mongoose');
require('dotenv').config();

require('./dist/models/BillingAdjustment');
require('./dist/models/User');
require('./dist/models/Project');

async function fixJohnDeveloperHAdjustment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/es-tm');
    console.log('Connected to MongoDB\n');

    const BillingAdjustment = mongoose.model('BillingAdjustment');
    const User = mongoose.model('User');
    const Project = mongoose.model('Project');

    const johnDevH = await User.findOne({ full_name: 'John Developer H' });
    const timesheetMgmt = await Project.findOne({ name: 'Timesheet Management' });

    if (!johnDevH || !timesheetMgmt) {
      console.log('User or Project not found');
      return;
    }

    console.log('=== FIXING John Developer H Billing Adjustment ===\n');

    const adj = await BillingAdjustment.findOne({
      user_id: johnDevH._id,
      project_id: timesheetMgmt._id,
      billing_period_start: { $lte: new Date('2025-10-19') },
      billing_period_end: { $gte: new Date('2025-10-06') },
      deleted_at: null
    });

    if (!adj) {
      console.log('No adjustment found - nothing to fix!');
      return;
    }

    console.log('Current Adjustment Record:');
    console.log(`  Original Billable: ${adj.original_billable_hours}h`);
    console.log(`  Adjustment: ${adj.adjustment_hours}h`);
    console.log(`  Final: ${adj.total_billable_hours}h`);
    console.log('');

    console.log('Issue: This was created using worked_hours (64h) instead of billable_hours (68h)');
    console.log('');

    console.log('Option 1: DELETE the adjustment (John Dev H will show 68h - correct base)');
    console.log('Option 2: UPDATE the adjustment to use correct base (68h)');
    console.log('');

    // For now, let's soft delete it
    adj.deleted_at = new Date();
    adj.deleted_by = johnDevH._id; // Or use management user
    await adj.save();

    console.log('✓ Adjustment record soft-deleted');
    console.log('');
    console.log('Now John Developer H should show:');
    console.log('  Base: 68h (from TimesheetProjectApproval)');
    console.log('  Management Adj: 0h (no BillingAdjustment)');
    console.log('  Final: 68h ✓');
    console.log('');
    console.log('Total should now be: 68 + 80 + 64 + 80 = 292h ✓');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixJohnDeveloperHAdjustment();
