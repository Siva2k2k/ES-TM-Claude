require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timesheet-management';

async function getDetailedIndexInfo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('billingadjustments');

    console.log('=== RAW INDEX INFORMATION ===\n');
    const indexes = await collection.indexes();
    
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      console.log(`   Key: ${JSON.stringify(index.key)}`);
      console.log(`   Unique: ${index.unique === true ? 'YES ⚠️' : 'NO'}`);
      console.log(`   Sparse: ${index.sparse === true ? 'YES' : 'NO'}`);
      if (index.partialFilterExpression) {
        console.log(`   Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
      console.log('');
    });

    // Try to replicate the duplicate key error
    console.log('\n=== TESTING DUPLICATE INSERT ===');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    const john = await User.findOne({ full_name: /John.*H/i }).lean();
    const timesheetProject = await Project.findOne({ name: 'Timesheet Management' }).lean();
    
    if (john && timesheetProject) {
      console.log(`John Developer H ID: ${john._id}`);
      console.log(`Timesheet Management ID: ${timesheetProject._id}`);
      
      // Check existing records
      const existing = await collection.find({
        user_id: john._id,
        project_id: timesheetProject._id
      }).toArray();
      
      console.log(`\nExisting adjustments for John + Timesheet Management: ${existing.length}`);
      existing.forEach(adj => {
        console.log(`  - ${adj._id} | ${adj.deleted_at ? 'DELETED' : 'ACTIVE'} | ${new Date(adj.billing_period_start).toISOString().split('T')[0]} to ${new Date(adj.billing_period_end).toISOString().split('T')[0]}`);
      });
      
      // Try to insert a test record
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
        reason: 'Test duplicate detection',
        adjusted_by: john._id,
        adjusted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      console.log('\nAttempting to insert test document...');
      try {
        await collection.insertOne(testDoc);
        console.log('✅ Insert succeeded - No duplicate key constraint');
        
        // Clean up test document
        await collection.deleteOne({ _id: testDoc._id });
        console.log('✅ Test document cleaned up');
      } catch (insertError) {
        if (insertError.code === 11000) {
          console.log('❌ DUPLICATE KEY ERROR DETECTED');
          console.log('Error message:', insertError.message);
          console.log('Error details:', JSON.stringify(insertError.keyPattern));
          console.log('Error value:', JSON.stringify(insertError.keyValue));
        } else {
          console.log('❌ Other error:', insertError.message);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

getDetailedIndexInfo();
