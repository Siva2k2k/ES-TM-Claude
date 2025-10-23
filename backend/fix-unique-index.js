require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timesheet-management';

async function fixUniqueIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const BillingAdjustment = mongoose.model('BillingAdjustment', new mongoose.Schema({}, { strict: false, collection: 'billingadjustments' }));

    console.log('=== CURRENT INDEXES ===');
    const indexes = await BillingAdjustment.collection.getIndexes();
    Object.keys(indexes).forEach(name => {
      const index = indexes[name];
      const isUnique = index.unique === true;
      console.log(`${name}:`);
      console.log(`  Keys: ${JSON.stringify(index.key)}`);
      console.log(`  Unique: ${isUnique}`);
      console.log(`  Sparse: ${index.sparse === true}`);
      console.log('');
    });

    // Check if problematic unique index exists
    const problematicIndex = 'user_id_1_project_id_1_billing_period_start_1_billing_period_end_1';
    if (indexes[problematicIndex]?.unique) {
      console.log(`\n⚠️  PROBLEM FOUND: Index "${problematicIndex}" is UNIQUE`);
      console.log('This prevents creating new adjustments when soft-deleted records exist.\n');
      
      console.log('SOLUTION OPTIONS:');
      console.log('1. Drop the unique index (recommended)');
      console.log('2. Create a partial unique index with { deleted_at: null } filter');
      console.log('3. Hard-delete the soft-deleted record\n');

      console.log('Executing Option 1: Dropping the unique index...');
      
      try {
        await BillingAdjustment.collection.dropIndex(problematicIndex);
        console.log(`✅ Successfully dropped index: ${problematicIndex}`);
        console.log('New adjustments for soft-deleted records can now be created.');
      } catch (dropError) {
        console.error(`❌ Failed to drop index:`, dropError.message);
      }

      console.log('\nVerifying indexes after drop...');
      const newIndexes = await BillingAdjustment.collection.getIndexes();
      if (!newIndexes[problematicIndex]) {
        console.log('✅ Index successfully removed');
      } else {
        console.log('❌ Index still exists');
      }
    } else {
      console.log('✓ No problematic unique index found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixUniqueIndex();
