const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testCorrectBillingParams() {
  console.log("🔍 TESTING BILLING WITH CORRECT PARAMETERS\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Test with correct parameter names
    console.log("🔧 TESTING PROJECT BILLING (Correct params):");
    try {
      const billingTest = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Project billing endpoint response:");
      console.log(JSON.stringify(billingTest.data, null, 2));
    } catch (billingError) {
      console.log("❌ Project billing error:", billingError.response?.status);
      console.log(
        "Error details:",
        billingError.response?.data || billingError.message
      );
    }

    // Test task billing with correct params
    console.log("\n\n🔧 TESTING TASK BILLING (Correct params):");
    try {
      const taskBillingTest = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=2024-10-01&endDate=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Task billing endpoint response:");
      console.log(JSON.stringify(taskBillingTest.data, null, 2));
    } catch (taskBillingError) {
      console.log("❌ Task billing error:", taskBillingError.response?.status);
      console.log(
        "Error details:",
        taskBillingError.response?.data || taskBillingError.message
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testCorrectBillingParams();
