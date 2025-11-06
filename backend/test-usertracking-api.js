/**
 * Test UserTracking API endpoints directly
 * Run this to test the API without the frontend
 */

require("dotenv").config();
const axios = require("axios");

// You'll need to replace this token with a valid JWT token from your login
const authToken = process.env.TEST_AUTH_TOKEN || "your-jwt-token-here";

const API_BASE = "http://localhost:3001/api/v1";

async function testUserTrackingAPI() {
  console.log("🧪 Testing UserTracking API Endpoints\n");

  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };

  try {
    // Test 1: Dashboard Overview
    console.log("1️⃣  Testing Dashboard Overview...");
    try {
      const dashboardResponse = await axios.get(
        `${API_BASE}/user-tracking/dashboard?weeks=4`,
        { headers }
      );
      console.log("✅ Dashboard Status:", dashboardResponse.status);
      console.log(
        "📊 Dashboard Data:",
        JSON.stringify(dashboardResponse.data, null, 2)
      );
    } catch (error) {
      console.log(
        "❌ Dashboard Error:",
        error.response?.status,
        error.response?.data || error.message
      );
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 2: User List
    console.log("2️⃣  Testing User List...");
    try {
      const usersResponse = await axios.get(
        `${API_BASE}/user-tracking/users?weeks=4&page=1&limit=10`,
        { headers }
      );
      console.log("✅ Users Status:", usersResponse.status);
      console.log(
        "👥 Users Data:",
        JSON.stringify(usersResponse.data, null, 2)
      );
    } catch (error) {
      console.log(
        "❌ Users Error:",
        error.response?.status,
        error.response?.data || error.message
      );
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 3: Aggregation Stats
    console.log("3️⃣  Testing Aggregation Stats...");
    try {
      const statsResponse = await axios.get(
        `${API_BASE}/user-tracking/stats?weeks=4`,
        { headers }
      );
      console.log("✅ Stats Status:", statsResponse.status);
      console.log(
        "📈 Stats Data:",
        JSON.stringify(statsResponse.data, null, 2)
      );
    } catch (error) {
      console.log(
        "❌ Stats Error:",
        error.response?.status,
        error.response?.data || error.message
      );
    }
  } catch (error) {
    console.error("💥 General Error:", error.message);
  }
}

// Instructions for getting auth token
console.log("🔑 To test with authentication:");
console.log("1. Open browser dev tools → Network tab");
console.log("2. Login to your app");
console.log(
  "3. Look for any API request and copy the Authorization header token"
);
console.log(
  "4. Set TEST_AUTH_TOKEN in your .env file or replace authToken variable above"
);
console.log("5. Make sure backend is running on port 3001\n");

if (authToken === "your-jwt-token-here") {
  console.log(
    "⚠️  No auth token provided. API calls will likely fail with 401."
  );
  console.log("   Set TEST_AUTH_TOKEN in .env file or update the script.\n");
}

testUserTrackingAPI();
