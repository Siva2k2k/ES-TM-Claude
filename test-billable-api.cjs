const axios = require("axios");

async function testBillableHoursAPI() {
  try {
    console.log(
      "🧪 TESTING BILLABLE HOURS UPDATE WITH CORRECT PARAMETERS...\n"
    );

    // Step 1: Login
    console.log("🔑 Logging in...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.token;
    console.log("✅ Login successful\n");

    // Step 2: Get billing data with CORRECT parameter names
    console.log("📊 Getting billing data with correct parameters...");
    const billingResponse = await axios.get(
      "http://localhost:3001/api/v1/project-billing",
      {
        params: {
          startDate: "2024-01-01", // camelCase, not snake_case
          endDate: "2024-12-31", // camelCase, not snake_case
          view: "summary",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (billingResponse.data.success && billingResponse.data.data.length > 0) {
      const project = billingResponse.data.data[0];
      const resource = project.resources[0];

      console.log("📋 Found data:");
      console.log(`- User: ${resource.user_name} (ID: ${resource.user_id})`);
      console.log(
        `- Project: ${project.project_name} (ID: ${project.project_id})`
      );
      console.log(`- Current billable hours: ${resource.billable_hours}`);
      console.log(`- Total hours: ${resource.total_hours}\n`);

      // Step 3: Test the update with correct parameters
      console.log("🔧 Testing billable hours update...");

      const updateData = {
        user_id: resource.user_id,
        project_id: project.project_id,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        billable_hours: 0, // Set to 0 for testing
        total_hours: resource.total_hours,
      };

      console.log("📤 Sending update with:", updateData);

      const updateResponse = await axios.put(
        "http://localhost:3001/api/v1/project-billing/billable-hours",
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Update response:", updateResponse.data);
    } else {
      console.log("❌ No billing data found");
      console.log("Response:", billingResponse.data);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response:", error.response.data);
    }
  }
}

testBillableHoursAPI();
