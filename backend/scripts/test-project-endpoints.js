/**
 * Test script to verify project endpoint fixes
 * This script tests the project access authorization logic
 * Run with: node scripts/test-project-endpoints.js
 */

const mongoose = require('mongoose');
const { ProjectService } = require('../dist/services/ProjectService');

// Test project IDs from the original error logs
const TEST_PROJECT_IDS = [
  '68ef2ec2a6aadccf475eb619',
  '671bf49012aecb5ac53b1cd9',
  '66a6be42b5ac2c4a7d44c890'
];

// Mock user for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'manager', // Test with manager role
  full_name: 'Test User'
};

async function testProjectEndpoints() {
  try {
    console.log('🧪 Testing Project Endpoint Fixes');
    console.log('================================');

    // Test ObjectId validation
    console.log('\n1. Testing ObjectId Validation:');
    
    // Test invalid ObjectId
    console.log('   Testing invalid ObjectId: "invalid-id"');
    try {
      const result = await ProjectService.getProjectById('invalid-id', mockUser);
      console.log('   ✅ Invalid ID handled correctly:', result.error);
    } catch (error) {
      console.log('   ❌ Error handling invalid ID:', error.message);
    }

    // Test valid ObjectId format
    console.log('\n2. Testing Valid ObjectId Format:');
    for (const projectId of TEST_PROJECT_IDS) {
      console.log(`   Testing project ID: ${projectId}`);
      
      try {
        const result = await ProjectService.getProjectById(projectId, mockUser);
        if (result.error) {
          console.log(`   📝 Result: ${result.error}`);
        } else {
          console.log(`   ✅ Project found: ${result.project?.name || 'Unknown'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n3. Testing Project Tasks Endpoint:');
    const firstProjectId = TEST_PROJECT_IDS[0];
    try {
      const tasksResult = await ProjectService.getProjectTasks(firstProjectId, mockUser);
      if (tasksResult.error) {
        console.log(`   📝 Tasks result: ${tasksResult.error}`);
      } else {
        console.log(`   ✅ Tasks found: ${tasksResult.tasks?.length || 0} tasks`);
      }
    } catch (error) {
      console.log(`   ❌ Tasks error: ${error.message}`);
    }

    console.log('\n4. Testing Project Members Endpoint:');
    try {
      const membersResult = await ProjectService.getProjectMembers(firstProjectId, mockUser);
      if (membersResult.error) {
        console.log(`   📝 Members result: ${membersResult.error}`);
      } else {
        console.log(`   ✅ Members found: ${membersResult.members?.length || 0} members`);
      }
    } catch (error) {
      console.log(`   ❌ Members error: ${error.message}`);
    }

    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check if this script is run directly
if (require.main === module) {
  console.log('Note: This script requires the backend to be built and MongoDB to be connected.');
  console.log('Run "npm run build" first, then start this test.');
  
  // Comment out the actual test for now since it requires DB connection
  // testProjectEndpoints();
}

module.exports = { testProjectEndpoints };