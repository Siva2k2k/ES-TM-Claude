require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timesheet-management';

async function checkJohnAdjustments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const BillingAdjustment = mongoose.model('BillingAdjustment', new mongoose.Schema({}, { strict: false, collection: 'billingadjustments' }));

    // Find John Developer H
    const john = await User.findOne({ full_name: /John.*H/i }).lean();
    if (!john) {
      console.log('❌ John Developer H not found');
      return;
    }

    console.log(`✓ Found: ${john.full_name} (${john._id})\n`);

    // Find ALL adjustments for John (including soft-deleted)
    const adjustments = await BillingAdjustment.find({ user_id: john._id })
      .sort({ created_at: -1 })
      .lean();

    console.log(`=== ALL BILLING ADJUSTMENTS FOR JOHN DEVELOPER H ===`);
    console.log(`Total: ${adjustments.length} records\n`);

    adjustments.forEach((adj, idx) => {
      console.log(`${idx + 1}. Adjustment ${adj._id}`);
      console.log(`   Project ID: ${adj.project_id}`);
      console.log(`   Period: ${new Date(adj.billing_period_start).toISOString().split('T')[0]} to ${new Date(adj.billing_period_end).toISOString().split('T')[0]}`);
      console.log(`   Worked: ${adj.total_worked_hours}h`);
      console.log(`   Adjustment: ${adj.adjustment_hours > 0 ? '+' : ''}${adj.adjustment_hours}h`);
      console.log(`   Billable: ${adj.total_billable_hours}h`);
      console.log(`   Status: ${adj.deleted_at ? '🗑️  SOFT-DELETED' : '✅ ACTIVE'}`);
      if (adj.deleted_at) {
        console.log(`   Deleted At: ${new Date(adj.deleted_at).toISOString()}`);
      }
      console.log(`   Created: ${new Date(adj.created_at).toISOString()}`);
      console.log(`   Updated: ${new Date(adj.updated_at).toISOString()}`);
      console.log('');
    });

    // Check for potential duplicates (same project + period)
    const grouped = new Map();
    adjustments.forEach(adj => {
      const key = `${adj.project_id}_${adj.billing_period_start.toISOString()}_${adj.billing_period_end.toISOString()}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(adj);
    });

    console.log(`\n=== DUPLICATE CHECK ===`);
    let hasDuplicates = false;
    for (const [key, records] of grouped.entries()) {
      if (records.length > 1) {
        hasDuplicates = true;
        const activeCount = records.filter(r => !r.deleted_at).length;
        const deletedCount = records.filter(r => r.deleted_at).length;
        
        console.log(`\n⚠️  DUPLICATE FOUND for key: ${key}`);
        console.log(`   Total records: ${records.length}`);
        console.log(`   Active: ${activeCount}`);
        console.log(`   Soft-deleted: ${deletedCount}`);
        
        if (activeCount > 1) {
          console.log(`   ❌ PROBLEM: Multiple active records for same project+period!`);
        }
        
        records.forEach(r => {
          console.log(`   - ${r._id} (${r.deleted_at ? 'DELETED' : 'ACTIVE'})`);
        });
      }
    }

    if (!hasDuplicates) {
      console.log('✓ No duplicates found');
    }

    // Check for unique index
    console.log(`\n=== UNIQUE INDEX CHECK ===`);
    const indexes = await BillingAdjustment.collection.getIndexes();
    console.log('Indexes on billingadjustments collection:');
    Object.keys(indexes).forEach(name => {
      const index = indexes[name];
      const isUnique = index.unique === true;
      console.log(`  ${name}: ${JSON.stringify(index.key)} ${isUnique ? '(UNIQUE)' : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkJohnAdjustments();
