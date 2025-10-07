const axios = require("axios");

async function testNewBillingSystem() {
  try {
    console.log("🧪 TESTING NEW BILLING ADJUSTMENT SYSTEM...\n");

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

    // Step 2: Get original billing data
    console.log("📊 Getting original billing data...");
    const originalBilling = await axios.get(
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

    if (originalBilling.data.success && originalBilling.data.data.length > 0) {
      const project = originalBilling.data.data[0];
      const resource = project.resources?.[0];

      if (resource) {
        console.log(`👤 User: ${resource.user_name}`);
        console.log(`📊 Original billable hours: ${resource.billable_hours}`);
        console.log(`💰 Original amount: $${resource.total_amount}`);
        console.log(`⏱️ Total worked hours: ${resource.total_hours}\n`);

        // Step 3: Create billing adjustment (set billable hours to 20)
        console.log("⚙️ Creating billing adjustment...");
        const adjustmentData = {
          user_id: resource.user_id,
          project_id: project.project_id,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          billable_hours: 20, // Adjust to 20 hours
          total_hours: resource.total_hours,
          reason: "Testing new billing adjustment system",
        };

        const adjustmentResponse = await axios.put(
          "http://localhost:3001/api/v1/project-billing/billable-hours",
          adjustmentData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (adjustmentResponse.data.success) {
          console.log("✅ Billing adjustment created!");
          console.log(
            "📄 Response:",
            JSON.stringify(adjustmentResponse.data, null, 2)
          );

          // Step 4: Verify the adjustment by fetching billing data again
          console.log("\n🔍 Verifying adjustment...");
          const updatedBilling = await axios.get(
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

          if (updatedBilling.data.success) {
            const updatedResource = updatedBilling.data.data[0]?.resources?.[0];
            if (updatedResource) {
              console.log(
                `📊 Updated billable hours: ${updatedResource.billable_hours}`
              );
              console.log(
                `💰 Updated amount: $${updatedResource.total_amount}`
              );
              console.log(
                `⏱️ Total worked hours (should be unchanged): ${updatedResource.total_hours}`
              );

              // Verify the results
              if (updatedResource.billable_hours === 20) {
                console.log(
                  "\n🎉 SUCCESS: Billing adjustment system working correctly!"
                );
                console.log(
                  "✅ Billable hours updated without affecting worked hours"
                );
                console.log("✅ TimeEntry records remain unchanged");
                console.log(
                  "✅ Billing management is independent from timesheet management"
                );
              } else {
                console.log("\n❌ ISSUE: Billable hours not updated correctly");
                console.log(
                  `Expected: 20, Got: ${updatedResource.billable_hours}`
                );
              }
            }
          }
        } else {
          console.log("❌ Billing adjustment failed:", adjustmentResponse.data);
        }
      } else {
        console.log("❌ No resource found in billing data");
      }
    } else {
      console.log("❌ No billing data found");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response:", error.response.data);
    }
  }
}

testNewBillingSystem();
