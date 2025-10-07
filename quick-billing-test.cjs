const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

// Quick debug test to check auth and basic endpoints
async function quickTest() {
  console.log("🔍 Quick Billing Test Debug...\n");

  try {
    // Test 1: Check if backend is responding
    console.log("1. Testing backend connection...");
    const healthCheck = await axios.get(`${API_BASE}/health`).catch(() => null);

    if (!healthCheck) {
      console.log(
        "❌ Backend not responding at /health, trying auth endpoint..."
      );
    } else {
      console.log("✅ Backend is responding");
    }

    // Test 2: Try login
    console.log("\n2. Testing login...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    console.log("✅ Login successful!");
    console.log("Response data:", JSON.stringify(loginResponse.data, null, 2));

    const token = loginResponse.data.tokens.accessToken;

    // Test 3: Check existing projects
    console.log("\n3. Checking existing projects...");
    const projects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Found ${projects.data.length || 0} existing projects`);

    if (projects.data && projects.data.length > 0) {
      console.log("Sample project:", projects.data[0]);
    }

    // Test 4: Check existing timesheets (since there's no direct tasks endpoint)
    console.log("\n4. Checking existing timesheets...");
    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Found ${timesheets.data.length || 0} existing timesheets`);

    // Test 5: Check project billing endpoints
    console.log("\n5. Testing project billing endpoints...");

    // Test the test endpoint first
    const billingTest = await axios.get(`${API_BASE}/project-billing/test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "✅ Project billing test endpoint works!",
      billingTest.data.message
    );

    // Test project billing view with date parameters
    const startDate = "2024-01-01";
    const endDate = "2024-12-31";

    const projectBilling = await axios.get(
      `${API_BASE}/project-billing/projects?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Project billing view endpoint works!");
    console.log(
      "Project billing data:",
      JSON.stringify(projectBilling.data, null, 2)
    );

    // Test task billing view
    const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Task billing view endpoint works!");
    console.log(
      "Task billing data:",
      JSON.stringify(taskBilling.data, null, 2)
    );

    // Test 6: Check if we can access frontend
    console.log("\n6. Frontend Access Information:");
    console.log("🌐 Frontend URL: http://localhost:5173");
    console.log("💰 Billing Page: http://localhost:5173/billing");
    console.log("👤 Login with: admin@company.com / admin123");

    console.log("\n✅ Quick test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log("💡 Authentication issue - check if user exists in database");
    }
  }
}

quickTest();
