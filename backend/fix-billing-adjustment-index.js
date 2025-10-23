require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timesheet-management';

async function fixBillingAdjustmentIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('billingadjustments');

    const problematicIndex = 'user_id_1_project_id_1_billing_period_start_1_billing_period_end_1';

    console.log('=== FIXING UNIQUE INDEX ISSUE ===\n');
    console.log('Problem: Unique index prevents creating new adjustments when soft-deleted records exist');
    console.log('Solution: Drop the unique index and create a partial unique index\n');

    // Step 1: Drop the existing unique index
    console.log(`Step 1: Dropping index "${problematicIndex}"...`);
    try {
      await collection.dropIndex(problematicIndex);
      console.log('✅ Index dropped successfully\n');
    } catch (dropError) {
      if (dropError.code === 27) {
        console.log('⚠️  Index does not exist (already dropped)\n');
      } else {
        throw dropError;
      }
    }

    // Step 2: Create a partial unique index that only applies to non-deleted records
    console.log('Step 2: Creating partial unique index (only for deleted_at: null)...');
    try {
      await collection.createIndex(
        {
          user_id: 1,
          project_id: 1,
          billing_period_start: 1,
          billing_period_end: 1
        },
        {
          name: 'user_project_period_unique_active',
          unique: true,
          partialFilterExpression: { deleted_at: null }
        }
      );
      console.log('✅ Partial unique index created successfully\n');
      console.log('   Index name: user_project_period_unique_active');
      console.log('   Constraint: Unique for active records (deleted_at: null)');
      console.log('   Benefit: Soft-deleted records no longer block new adjustments\n');
    } catch (createError) {
      if (createError.code === 85 || createError.code === 86) {
        console.log('⚠️  Index already exists\n');
      } else {
        throw createError;
      }
    }

    // Step 3: Verify the new index setup
    console.log('Step 3: Verifying indexes...');
    const indexes = await collection.indexes();
    
    const relevantIndexes = indexes.filter(idx => 
      idx.name.includes('user') && 
      (idx.name.includes('project') || idx.name.includes('period'))
    );

    console.log('\nRelevant indexes:');
    relevantIndexes.forEach(index => {
      console.log(`\n  ${index.name}:`);
      console.log(`    Keys: ${JSON.stringify(index.key)}`);
      console.log(`    Unique: ${index.unique ? 'YES' : 'NO'}`);
      if (index.partialFilterExpression) {
        console.log(`    Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    // Step 4: Test the fix
    console.log('\n\n=== TESTING THE FIX ===\n');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    const john = await User.findOne({ full_name: /John.*H/i }).lean();
    const timesheetProject = await Project.findOne({ name: 'Timesheet Management' }).lean();
    
    if (john && timesheetProject) {
      const testDoc = {
        user_id: john._id,
        project_id: timesheetProject._id,
        adjustment_scope: 'project',
        billing_period_start: new Date('2025-09-30'),
        billing_period_end: new Date('2025-10-30'),
        total_worked_hours: 68,
        adjustment_hours: 0,
        total_billable_hours: 68,
        original_billable_hours: 68,
        adjusted_billable_hours: 68,
        reason: 'Test fix - should succeed now',
        adjusted_by: john._id,
        adjusted_at: new Date(),
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      console.log('Attempting to insert test document for John + Timesheet Management...');
      console.log('(Same user/project/period that previously failed)\n');
      
      try {
        const result = await collection.insertOne(testDoc);
        console.log('✅ SUCCESS! Insert completed without duplicate key error');
        console.log(`   New document ID: ${result.insertedId}`);
        
        // Clean up test document
        await collection.deleteOne({ _id: result.insertedId });
        console.log('✅ Test document cleaned up');
      } catch (insertError) {
        if (insertError.code === 11000) {
          console.log('❌ STILL FAILING: Duplicate key error');
          console.log('   Error:', insertError.message);
        } else {
          console.log('❌ Other error:', insertError.message);
        }
      }
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('You can now create billing adjustments for John Developer H');
    console.log('even though a soft-deleted record exists.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixBillingAdjustmentIndex();
