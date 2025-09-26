const axios = require("axios");

const BASE_URL = "http://localhost:3001/api/v1";
let tokens = {};

// Test credentials from seed data
const testUsers = {
  admin: {
    email: "admin@company.com",
    password: "admin123",
    role: "super_admin",
  },
  manager: {
    email: "manager@company.com",
    password: "admin123",
    role: "manager",
  },
  employee1: {
    email: "employee1@company.com",
    password: "admin123",
    role: "employee",
  },
  employee2: {
    email: "employee2@company.com",
    password: "admin123",
    role: "employee",
  },
};

// Helper function to make authenticated requests
async function makeRequest(method, url, data = null, userType = "admin") {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: tokens[userType]
        ? { Authorization: `Bearer ${tokens[userType]}` }
        : {},
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
    };
  }
}

// Login all test users
async function loginAllUsers() {
  console.log("\n🔐 Logging in all test users...");

  for (const [userType, credentials] of Object.entries(testUsers)) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      });

      tokens[userType] = response.data.tokens.accessToken;
      console.log(
        `✅ ${userType} (${credentials.role}) logged in successfully`
      );
    } catch (error) {
      console.log(
        `❌ ${userType} login failed: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }
}

// Test Authentication Service
async function testAuthService() {
  console.log("\n🔐 Testing Authentication Service...");

  // Test login with correct credentials
  const loginResult = await makeRequest("POST", "/auth/login", {
    email: "admin@company.com",
    password: "admin123",
  });

  if (loginResult.success) {
    console.log("✅ Login successful");
    // tokens.test_admin = loginResult.data.token; // Not needed, admin already logged in above
  } else {
    console.log("❌ Login failed:", loginResult.error);
  }

  // Test token verification
  const verifyResult = await makeRequest("GET", "/auth/profile", null, "admin");
  if (verifyResult.success) {
    console.log("✅ Token verification successful");
    console.log(
      `   User: ${verifyResult.data.user.full_name} (${verifyResult.data.user.role})`
    );
  } else {
    console.log("❌ Token verification failed:", verifyResult.error);
  }
}

// Test User Service
async function testUserService() {
  console.log("\n👥 Testing User Service...");

  // Test get all users (admin)
  const allUsersResult = await makeRequest("GET", "/users", null, "admin");
  if (allUsersResult.success) {
    console.log(
      `✅ Get all users successful (${allUsersResult.data.users?.length} users found)`
    );
  } else {
    console.log("❌ Get all users failed:", allUsersResult.error);
  }

  // Test get all users as employee (should fail)
  const employeeUsersResult = await makeRequest(
    "GET",
    "/users",
    null,
    "employee1"
  );
  if (!employeeUsersResult.success && employeeUsersResult.status === 403) {
    console.log("✅ Employee access to all users properly denied");
  } else {
    console.log("❌ Employee should not access all users");
  }
}

// Test Project Service
async function testProjectService() {
  console.log("\n📋 Testing Project Service...");

  let userId = null;

  // Get current user ID for employee1
  const meResult = await makeRequest("GET", "/auth/profile", null, "employee1");
  if (meResult.success) {
    userId = meResult.data.user.id;
    console.log(`📝 Employee1 ID: ${userId}`);
  }

  // Test get all projects
  const allProjectsResult = await makeRequest(
    "GET",
    "/projects",
    null,
    "employee1"
  );
  if (allProjectsResult.success) {
    console.log(
      `✅ Get all projects successful (${allProjectsResult.data.projects?.length} projects found)`
    );
  } else {
    console.log("❌ Get all projects failed:", allProjectsResult.error);
  }

  // Test get user projects (employee1's own projects)
  if (userId) {
    const userProjectsResult = await makeRequest(
      "GET",
      `/projects/user/${userId}`,
      null,
      "employee1"
    );
    if (userProjectsResult.success) {
      console.log(
        `✅ Get user projects successful (${userProjectsResult.data.projects?.length} projects found)`
      );
    } else {
      console.log("❌ Get user projects failed:", userProjectsResult.error);
    }
  }

  // Test get project tasks
  const projectsResult = await makeRequest("GET", "/projects", null, "manager");
  if (projectsResult.success && projectsResult.data.projects?.length > 0) {
    const projectId =
      projectsResult.data.projects[0].id || projectsResult.data.projects[0]._id;
    const tasksResult = await makeRequest(
      "GET",
      `/projects/${projectId}/tasks`,
      null,
      "employee1"
    );
    if (tasksResult.success) {
      console.log(
        `✅ Get project tasks successful (${tasksResult.data.tasks?.length} tasks found)`
      );
    } else {
      console.log("❌ Get project tasks failed:", tasksResult.error);
    }
  }

  return { userId }; // Return userId for use in other tests
}

// Test Timesheet Service
async function testTimesheetService(userId) {
  console.log("\n⏰ Testing Timesheet Service...");

  // Test get timesheets
  const timesheetsResult = await makeRequest(
    "GET",
    "/timesheets",
    null,
    "employee1"
  );
  if (timesheetsResult.success) {
    console.log(
      `✅ Get timesheets successful (${timesheetsResult.data.timesheets?.length} timesheets found)`
    );
  } else {
    console.log("❌ Get timesheets failed:", timesheetsResult.error);
  }

  // Test create timesheet (basic test)
  const today = new Date().toISOString().split("T")[0];
  // Get start of the week (Monday)
  const date = new Date(today);
  const day = date.getDay() || 7; // Sunday = 7
  date.setDate(date.getDate() - (day - 1));
  const weekStart = date.toISOString().split("T")[0];

  if (userId) {
    const createTimesheetResult = await makeRequest(
      "POST",
      "/timesheets",
      {
        userId: userId,
        weekStartDate: weekStart,
      },
      "employee1"
    );

    if (createTimesheetResult.success) {
      console.log("✅ Create timesheet successful");
    } else {
      console.log("❌ Create timesheet failed:", createTimesheetResult.error);
    }
  } else {
    console.log("❌ Cannot create timesheet - no userId available");
  }
}

// Test Billing Service
async function testBillingService() {
  console.log("\n💰 Testing Billing Service...");

  // Test get billing dashboard (admin access - should work)
  const adminBillingResult = await makeRequest(
    "GET",
    "/billing/dashboard",
    null,
    "admin"
  );
  if (adminBillingResult.success) {
    console.log("✅ Get billing dashboard successful (admin)");
  } else {
    console.log(
      "❌ Get billing dashboard failed (admin):",
      adminBillingResult.error
    );
  }

  // Test get billing data (manager access - currently requires Management+, so should fail)
  const managerBillingResult = await makeRequest(
    "GET",
    "/billing/dashboard",
    null,
    "manager"
  );
  if (!managerBillingResult.success && managerBillingResult.status === 403) {
    console.log("⚠️ Manager access to billing denied (requires Management+)");
  } else if (managerBillingResult.success) {
    console.log("✅ Manager access to billing successful");
  } else {
    console.log("❌ Manager billing access error:", managerBillingResult.error);
  }

  // Test get billing data (employee access - should be denied)
  const employeeBillingResult = await makeRequest(
    "GET",
    "/billing/dashboard",
    null,
    "employee1"
  );
  if (!employeeBillingResult.success && employeeBillingResult.status === 403) {
    console.log("✅ Employee access to billing properly denied");
  } else {
    console.log("❌ Employee should not access billing");
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting Service Migration Verification Tests");
  console.log("=" * 50);

  try {
    await loginAllUsers();
    await testAuthService();
    await testUserService();
    const projectResult = await testProjectService();
    await testTimesheetService(projectResult.userId);
    await testBillingService();

    console.log("\n✅ Service verification tests completed!");
  } catch (error) {
    console.log("\n❌ Test runner error:", error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
