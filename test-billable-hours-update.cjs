const axios = require("axios");

async function testBillableHoursUpdate() {
  try {
    console.log("🧪 TESTING BILLABLE HOURS UPDATE FIX...\n");

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

    // Step 2: Get current billing data
    console.log("📊 Getting current billing data...");
    const billingResponse = await axios.get(
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

    if (
      !billingResponse.data.success ||
      billingResponse.data.data.length === 0
    ) {
      console.log("❌ No billing data found");
      return;
    }

    const project = billingResponse.data.data[0];
    const resource = project.resources?.[0];

    if (!resource) {
      console.log("❌ No resources found in billing data");
      return;
    }

    console.log(`📋 Found user: ${resource.user_name}`);
    console.log(`📋 Current billable hours: ${resource.billable_hours}`);
    console.log(`📋 Total hours: ${resource.total_hours}\n`);

    // Step 3: Test billable hours update
    console.log("⚙️ Testing billable hours update...");

    const updateData = {
      user_id: resource.user_id,
      project_id: project.project_id,
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      billable_hours: 0, // Set all to non-billable for test
      total_hours: resource.total_hours,
      reason: "Test update from API",
    };

    console.log(
      "📤 Sending update request with data:",
      JSON.stringify(updateData, null, 2)
    );

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
      console.log("✅ UPDATE SUCCESSFUL!");
      console.log(
        "📊 Update result:",
        JSON.stringify(updateResponse.data, null, 2)
      );

      // Step 4: Verify the change
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

      if (verifyResponse.data.success) {
        const updatedResource = verifyResponse.data.data[0]?.resources?.[0];
        if (updatedResource) {
          console.log(
            `📊 New billable hours: ${updatedResource.billable_hours}`
          );
          console.log(`📊 New total amount: $${updatedResource.total_amount}`);

          if (updatedResource.billable_hours === 0) {
            console.log("🎉 SUCCESS: Billable hours correctly set to 0!");
          } else {
            console.log("⚠️ PARTIAL: Update may not have worked as expected");
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

testBillableHoursUpdate();
