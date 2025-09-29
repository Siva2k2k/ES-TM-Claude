#!/usr/bin/env node

/**
 * Phase 1 API Testing Suite
 * Tests User Management and Project Management features
 */

const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';
let refreshToken = '';
let testUserId = '';
let testProjectId = '';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = require('http').request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test helper functions
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);

  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suite functions
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Features...\n');

  // Test 1: Login with invalid credentials
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@test.com',
      password: 'WrongPassword123!'
    });

    logTest('Login with invalid credentials should fail',
      response.status === 400 && response.body.success === false,
      `Status: ${response.status}, Message: ${response.body.error?.message}`
    );
  } catch (error) {
    logTest('Login with invalid credentials should fail', false, error.message);
  }

  // Test 2: Password reset request
  try {
    const response = await makeRequest('POST', '/auth/forgot-password', {
      email: 'test@example.com'
    });

    logTest('Password reset request (valid endpoint)',
      response.status === 200 || response.status === 404,
      `Status: ${response.status}, Response: ${JSON.stringify(response.body)}`
    );
  } catch (error) {
    logTest('Password reset request (valid endpoint)', false, error.message);
  }
}

async function testUserManagement() {
  console.log('\n👥 Testing User Management Features...\n');

  // First, we need to authenticate as a super admin or create one
  // For testing, let's try to create a super admin user
  try {
    const response = await makeRequest('POST', '/auth/register', {
      email: 'testadmin@company.com',
      password: 'TestAdmin123!',
      full_name: 'Test Administrator',
      role: 'super_admin'
    });

    logTest('Create super admin user',
      response.status === 201 || response.status === 409, // 409 if already exists
      `Status: ${response.status}, Response: ${response.body.message || JSON.stringify(response.body)}`
    );

    if (response.status === 201 && response.body.tokens) {
      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    }
  } catch (error) {
    logTest('Create super admin user', false, error.message);
  }

  // If we don't have a token, try to login
  if (!authToken) {
    try {
      const response = await makeRequest('POST', '/auth/login', {
        email: 'testadmin@company.com',
        password: 'TestAdmin123!'
      });

      if (response.status === 200 && response.body.tokens) {
        authToken = response.body.tokens.accessToken;
        refreshToken = response.body.tokens.refreshToken;
        logTest('Login with test admin', true, 'Successfully authenticated');
      } else {
        logTest('Login with test admin', false, `Status: ${response.status}, ${JSON.stringify(response.body)}`);
      }
    } catch (error) {
      logTest('Login with test admin', false, error.message);
    }
  }

  // Test creating a new user (if we have auth token)
  if (authToken) {
    try {
      const response = await makeRequest('POST', '/users', {
        email: `testuser${Date.now()}@company.com`,
        full_name: 'Test Employee',
        role: 'employee',
        hourly_rate: 50
      }, {
        'Authorization': `Bearer ${authToken}`
      });

      logTest('Create new user with secure credentials',
        response.status === 201,
        `Status: ${response.status}, Response: ${response.body.message || JSON.stringify(response.body)}`
      );

      if (response.status === 201 && response.body.user) {
        testUserId = response.body.user.id;
      }
    } catch (error) {
      logTest('Create new user with secure credentials', false, error.message);
    }

    // Test getting user profile
    try {
      const response = await makeRequest('GET', '/auth/profile', null, {
        'Authorization': `Bearer ${authToken}`
      });

      logTest('Get user profile',
        response.status === 200 && response.body.user,
        `Status: ${response.status}, User: ${response.body.user?.full_name}`
      );
    } catch (error) {
      logTest('Get user profile', false, error.message);
    }

    // Test updating user profile
    try {
      const response = await makeRequest('PUT', '/auth/profile', {
        full_name: 'Updated Test Administrator',
        hourly_rate: 75
      }, {
        'Authorization': `Bearer ${authToken}`
      });

      logTest('Update user profile',
        response.status === 200,
        `Status: ${response.status}, Response: ${response.body.message || JSON.stringify(response.body)}`
      );
    } catch (error) {
      logTest('Update user profile', false, error.message);
    }
  }
}

async function testProjectManagement() {
  console.log('\n📋 Testing Project Management Features...\n');

  if (!authToken) {
    logTest('Project management tests', false, 'No authentication token available');
    return;
  }

  // Test getting projects
  try {
    const response = await makeRequest('GET', '/projects', null, {
      'Authorization': `Bearer ${authToken}`
    });

    logTest('Get projects list',
      response.status === 200,
      `Status: ${response.status}, Projects count: ${response.body.projects?.length || 0}`
    );
  } catch (error) {
    logTest('Get projects list', false, error.message);
  }

  // Test creating a project
  try {
    const response = await makeRequest('POST', '/projects', {
      name: `Test Project ${Date.now()}`,
      description: 'A test project for Phase 1 verification',
      client_name: 'Test Client',
      start_date: new Date().toISOString(),
      is_billable: true,
      budget: 10000
    }, {
      'Authorization': `Bearer ${authToken}`
    });

    logTest('Create new project',
      response.status === 201,
      `Status: ${response.status}, Response: ${response.body.message || JSON.stringify(response.body)}`
    );

    if (response.status === 201 && response.body.project) {
      testProjectId = response.body.project.id;
    }
  } catch (error) {
    logTest('Create new project', false, error.message);
  }

  // Test project member management (if we have both project and user)
  if (testProjectId && testUserId) {
    try {
      const response = await makeRequest('POST', `/projects/${testProjectId}/members`, {
        userId: testUserId,
        projectRole: 'employee'
      }, {
        'Authorization': `Bearer ${authToken}`
      });

      logTest('Add member to project',
        response.status === 201,
        `Status: ${response.status}, Response: ${response.body.message || JSON.stringify(response.body)}`
      );
    } catch (error) {
      logTest('Add member to project', false, error.message);
    }

    // Test getting project members
    try {
      const response = await makeRequest('GET', `/projects/${testProjectId}/members`, null, {
        'Authorization': `Bearer ${authToken}`
      });

      logTest('Get project members',
        response.status === 200,
        `Status: ${response.status}, Members count: ${response.body.members?.length || 0}`
      );
    } catch (error) {
      logTest('Get project members', false, error.message);
    }
  }
}

async function testSecurityFeatures() {
  console.log('\n🔒 Testing Security Features...\n');

  // Test JWT token refresh
  if (refreshToken) {
    try {
      const response = await makeRequest('POST', '/auth/refresh', {
        refreshToken: refreshToken
      });

      logTest('JWT token refresh',
        response.status === 200 && response.body.tokens,
        `Status: ${response.status}, New token received: ${!!response.body.tokens}`
      );
    } catch (error) {
      logTest('JWT token refresh', false, error.message);
    }
  }

  // Test authorization (accessing protected route without token)
  try {
    const response = await makeRequest('GET', '/auth/profile');

    logTest('Protected route without token should fail',
      response.status === 401,
      `Status: ${response.status}, Should be 401 Unauthorized`
    );
  } catch (error) {
    logTest('Protected route without token should fail', false, error.message);
  }

  // Test invalid token
  try {
    const response = await makeRequest('GET', '/auth/profile', null, {
      'Authorization': 'Bearer invalid-token'
    });

    logTest('Protected route with invalid token should fail',
      response.status === 401,
      `Status: ${response.status}, Should be 401 Unauthorized`
    );
  } catch (error) {
    logTest('Protected route with invalid token should fail', false, error.message);
  }
}

async function testEmailService() {
  console.log('\n📧 Testing Email Service Integration...\n');

  // Test password reset email (should not reveal if user exists)
  try {
    const response = await makeRequest('POST', '/auth/forgot-password', {
      email: 'nonexistent@test.com'
    });

    logTest('Password reset for non-existent user',
      response.status === 200, // Should return 200 for security (don't reveal user existence)
      `Status: ${response.status}, Should return 200 regardless of user existence`
    );
  } catch (error) {
    logTest('Password reset for non-existent user', false, error.message);
  }

  // Test with valid email format
  try {
    const response = await makeRequest('POST', '/auth/forgot-password', {
      email: 'testadmin@company.com'
    });

    logTest('Password reset for valid email format',
      response.status === 200,
      `Status: ${response.status}, Email service should process request`
    );
  } catch (error) {
    logTest('Password reset for valid email format', false, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Phase 1 API Testing Suite...\n');
  console.log('Testing Backend URL:', BASE_URL);

  try {
    await testAuthentication();
    await testUserManagement();
    await testProjectManagement();
    await testSecurityFeatures();
    await testEmailService();

    // Print final results
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.tests
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }

    console.log('\n✅ Phase 1 API Testing Complete!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test suite
runAllTests().catch(console.error);