// Frontend test for delete/restore functionality
// This simulates the frontend service calls

const axios = require("axios");

const FRONTEND_API_BASE = "http://localhost:3001/api/v1";

// Admin credentials
const adminCredentials = {
  email: "admin@company.com",
  password: "admin123",
};

let accessToken = "";

// Simulate frontend UserService methods
class UserService {
  static async login(credentials) {
    try {
      console.log("🔐 Frontend: Logging in as admin...");
      const response = await axios.post(
        `${FRONTEND_API_BASE}/auth/login`,
        credentials
      );

      if (response.data.success && response.data.tokens) {
        accessToken = response.data.tokens.accessToken;
        console.log("✅ Frontend: Login successful");
        console.log("📝 Access token set for subsequent requests");
        // Store token like frontend would
        localStorage = { tokens: response.data.tokens }; // Simulated
        return { success: true, tokens: response.data.tokens };
      }
      console.log("❌ Login response missing tokens:", response.data);
      return { success: false, error: "Login failed" };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  static async getDeletedUsers() {
    try {
      console.log("📋 Frontend: Calling UserService.getDeletedUsers()...");
      const response = await axios.get(`${FRONTEND_API_BASE}/users/deleted`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log("✅ Frontend: getDeletedUsers response:", response.data);
      return { users: response.data.users || [], error: null };
    } catch (error) {
      console.log(
        "❌ Frontend: getDeletedUsers error:",
        error.response?.data || error.message
      );
      return { users: [], error: error.response?.data?.error || error.message };
    }
  }

  static async restoreUser(userId) {
    try {
      console.log(`🔄 Frontend: Calling UserService.restoreUser(${userId})...`);
      const response = await axios.post(
        `${FRONTEND_API_BASE}/users/${userId}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("✅ Frontend: restoreUser response:", response.data);
      return { success: response.data.success || true, error: null };
    } catch (error) {
      console.log(
        "❌ Frontend: restoreUser error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  static async hardDeleteUser(userId) {
    try {
      console.log(
        `🗑️ Frontend: Calling UserService.hardDeleteUser(${userId})...`
      );
      const response = await axios.post(
        `${FRONTEND_API_BASE}/users/${userId}/hard-delete`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("✅ Frontend: hardDeleteUser response:", response.data);
      return { success: response.data.success || true, error: null };
    } catch (error) {
      console.log(
        "❌ Frontend: hardDeleteUser error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

// Simulate frontend TimesheetService methods
class TimesheetService {
  static async getDeletedTimesheets() {
    try {
      console.log(
        "📋 Frontend: Calling TimesheetService.getDeletedTimesheets()..."
      );
      const response = await axios.get(
        `${FRONTEND_API_BASE}/timesheets/deleted`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("✅ Frontend: getDeletedTimesheets response:", response.data);
      return { timesheets: response.data.data || [], error: null };
    } catch (error) {
      console.log(
        "❌ Frontend: getDeletedTimesheets error:",
        error.response?.data || error.message
      );
      return {
        timesheets: [],
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

// Simulate DeletedItemsView component logic
async function simulateDeletedItemsView() {
  console.log("🖥️ Simulating DeletedItemsView Component...\n");

  // 1. Component mounts - check user role (assume admin)
  const currentUserRole = "super_admin";
  const canViewDeleted = ["management", "super_admin"].includes(
    currentUserRole
  );
  const canHardDelete = currentUserRole === "super_admin";

  console.log(`👤 Current user role: ${currentUserRole}`);
  console.log(`🔍 Can view deleted: ${canViewDeleted}`);
  console.log(`🗑️ Can hard delete: ${canHardDelete}`);

  if (!canViewDeleted) {
    console.log("❌ Access denied - insufficient permissions");
    return;
  }

  // 2. Component loads deleted users (default tab)
  console.log("\n📂 Loading deleted users tab...");
  const deletedUsersResult = await UserService.getDeletedUsers();

  if (deletedUsersResult.error) {
    console.log(`❌ Error loading deleted users: ${deletedUsersResult.error}`);
    return;
  }

  console.log(`📊 Found ${deletedUsersResult.users.length} deleted users`);

  // 3. Test restore functionality if users exist
  if (deletedUsersResult.users.length > 0) {
    const testUser = deletedUsersResult.users[0];
    console.log(
      `\n🎯 Testing restore with user: ${testUser.full_name} (${
        testUser.id || testUser._id
      })`
    );

    const restoreResult = await UserService.restoreUser(
      testUser.id || testUser._id
    );
    if (restoreResult.success) {
      console.log("✅ User restored successfully");

      // Reload to verify
      const updatedResult = await UserService.getDeletedUsers();
      console.log(
        `📊 Deleted users after restore: ${updatedResult.users.length}`
      );
    } else {
      console.log(`❌ Restore failed: ${restoreResult.error}`);
    }
  }

  // 4. Load deleted timesheets tab
  console.log("\n📂 Loading deleted timesheets tab...");
  const deletedTimesheetsResult = await TimesheetService.getDeletedTimesheets();

  if (deletedTimesheetsResult.error) {
    console.log(
      `❌ Error loading deleted timesheets: ${deletedTimesheetsResult.error}`
    );
  } else {
    console.log(
      `📊 Found ${deletedTimesheetsResult.timesheets.length} deleted timesheets`
    );
  }
}

async function runFrontendTests() {
  console.log("🧪 Starting Frontend Service Tests...\n");

  // 1. Login like frontend would
  const loginResult = await UserService.login(adminCredentials);
  if (!loginResult.success) {
    console.log("❌ Cannot proceed without login:", loginResult.error);
    return;
  }

  console.log("✅ Frontend: Proceeding with authenticated requests...");

  // 2. Simulate component behavior
  await simulateDeletedItemsView();

  console.log("\n🏁 Frontend tests completed!");
}

runFrontendTests().catch(console.error);
