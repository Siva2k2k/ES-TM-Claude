const axios = require("axios");

async function testBillableHoursUpdateFinal() {
  try {
    console.log("🧪 TESTING FIXED BILLABLE HOURS UPDATE...\n");

    // Step 1: Login
    console.log("🔑 Logging in...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    if (!loginResponse.data.success) {
      console.log("❌ Login failed");
      return;
    }

    const token = loginResponse.data.token;
    console.log("✅ Login successful\n");

    // Step 2: Test the exact payload from the frontend
    console.log("⚙️ Testing with exact frontend payload...");

    const updateData = {
      billable_hours: 0, // Set to non-billable for test
      end_date: "2025-10-30",
      project_id: "68df77ec2ba674aa3c8cd2c7",
      reason: "Manual adjustment from project billing view",
      start_date: "2024-09-30",
      total_hours: 31,
      user_id: "68df77ec2ba674aa3c8cd2bd",
    };

    console.log("📤 Sending update request...");

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

    if (updateResponse.data.success) {
      console.log("🎉 UPDATE SUCCESSFUL!");
      console.log("📊 Result:", JSON.stringify(updateResponse.data, null, 2));

      // Step 3: Verify by getting fresh billing data
      console.log("\n🔍 Verifying the change...");
      const verifyResponse = await axios.get(
        "http://localhost:3001/api/v1/project-billing",
        {
          params: {
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            view: "summary",
          },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (verifyResponse.data.success && verifyResponse.data.data.length > 0) {
        const project = verifyResponse.data.data[0];
        const resource = project.resources?.[0];

        if (resource) {
          console.log(`📊 Updated billable hours: ${resource.billable_hours}`);
          console.log(`📊 Updated total amount: $${resource.total_amount}`);
          console.log(`📊 User name: ${resource.user_name}`);

          if (resource.billable_hours === 0) {
            console.log("🎉 SUCCESS: All hours set to non-billable!");
          } else {
            console.log(
              `⚠️ PARTIAL: Still showing ${resource.billable_hours} billable hours`
            );
          }
        }
      }
    } else {
      console.log("❌ UPDATE FAILED:", updateResponse.data);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response:", error.response.data);
    }
  }
}

testBillableHoursUpdateFinal();
