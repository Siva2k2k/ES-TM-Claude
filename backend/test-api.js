// Test script for backend delete/restore functionality
const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

// Admin credentials
const adminCredentials = {
  email: "admin@company.com",
  password: "admin123",
};

let accessToken = "";

async function login() {
  try {
    console.log("🔐 Testing admin login...");
    const response = await axios.post(
      `${API_BASE}/auth/login`,
      adminCredentials
    );

    if (
      response.data.success &&
      response.data.tokens &&
      response.data.tokens.accessToken
    ) {
      accessToken = response.data.tokens.accessToken;
      console.log("✅ Login successful");
      console.log(
        "📝 Access token obtained:",
        accessToken.substring(0, 50) + "..."
      );
      return true;
    } else {
      console.log("❌ Login failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ Login error:", error.response?.data || error.message);
    return false;
  }
}

async function testGetDeletedUsers() {
  try {
    console.log("\n📋 Testing GET /users/deleted...");
    const response = await axios.get(`${API_BASE}/users/deleted`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log("✅ Deleted users response:", response.data);
    return response.data.users || [];
  } catch (error) {
    console.log(
      "❌ Get deleted users error:",
      error.response?.data || error.message
    );
    return [];
  }
}

async function testGetDeletedTimesheets() {
  try {
    console.log("\n📋 Testing GET /timesheets/deleted...");
    const response = await axios.get(`${API_BASE}/timesheets/deleted`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log("✅ Deleted timesheets response:", response.data);
    return response.data.timesheets || [];
  } catch (error) {
    console.log(
      "❌ Get deleted timesheets error:",
      error.response?.data || error.message
    );
    return [];
  }
}

async function testRestoreUser(userId) {
  try {
    console.log(`\n🔄 Testing POST /users/${userId}/restore...`);
    const response = await axios.post(
      `${API_BASE}/users/${userId}/restore`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log("✅ Restore user response:", response.data);
    return response.data.success;
  } catch (error) {
    console.log(
      "❌ Restore user error:",
      error.response?.data || error.message
    );
    return false;
  }
}

async function testHardDeleteUser(userId) {
  try {
    console.log(`\n🗑️ Testing POST /users/${userId}/hard-delete...`);
    const response = await axios.post(
      `${API_BASE}/users/${userId}/hard-delete`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log("✅ Hard delete user response:", response.data);
    return response.data.success;
  } catch (error) {
    console.log(
      "❌ Hard delete user error:",
      error.response?.data || error.message
    );
    return false;
  }
}

async function runTests() {
  console.log("🧪 Starting Backend API Tests...\n");

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log("❌ Cannot proceed without valid access token");
    return;
  }

  // Step 2: Get deleted users
  const deletedUsers = await testGetDeletedUsers();
  console.log(`📊 Found ${deletedUsers.length} deleted users`);

  // Step 3: Get deleted timesheets
  const deletedTimesheets = await testGetDeletedTimesheets();
  console.log(`📊 Found ${deletedTimesheets.length} deleted timesheets`);

  // Step 4: Test restore functionality (if we have deleted users)
  if (deletedUsers.length > 0) {
    const testUserId = deletedUsers[0].id || deletedUsers[0]._id;
    console.log(
      `\n🎯 Testing restore functionality with user ID: ${testUserId}`
    );

    const restoreSuccess = await testRestoreUser(testUserId);
    if (restoreSuccess) {
      console.log("✅ User restore test successful");

      // Check if user is no longer in deleted list
      const updatedDeletedUsers = await testGetDeletedUsers();
      console.log(
        `📊 Deleted users after restore: ${updatedDeletedUsers.length}`
      );
    }
  } else {
    console.log("⚠️ No deleted users available for restore testing");
  }

  console.log("\n🏁 Backend API tests completed!");
}

runTests().catch(console.error);
