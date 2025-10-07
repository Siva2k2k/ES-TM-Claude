const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function createCorrectBillingRate() {
  console.log("💲 CREATING CORRECT BILLING RATE FOR EMPLOYEE1\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get employee1 info
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const employee1 = usersResponse.data.users.find(
      (u) => u.email === "employee1@company.com"
    );
    console.log(`👤 Employee1: ${employee1.full_name} (${employee1.id})`);

    // Create billing rate for employee1 (user-specific rate)
    console.log("\n💲 Creating user-specific billing rate...");
    const userRateData = {
      entity_type: "user",
      entity_id: employee1.id,
      standard_rate: 75.0,
      effective_from: "2024-10-01T00:00:00.000Z",
      is_active: true,
      minimum_increment: 15, // 15-minute increments
      rounding_rule: "up",
    };

    try {
      const createUserRateResponse = await axios.post(
        `${API_BASE}/billing/rates`,
        userRateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log("✅ Created user-specific billing rate");
      console.log(
        `   Rate: $${userRateData.standard_rate}/hour for ${employee1.full_name}`
      );
    } catch (userRateError) {
      console.log(
        "❌ User rate failed:",
        userRateError.response?.data?.message || userRateError.message
      );

      // Try creating a global rate as fallback
      console.log("\n🔄 Trying global billing rate as fallback...");
      const globalRateData = {
        entity_type: "global",
        standard_rate: 75.0,
        effective_from: "2024-10-01T00:00:00.000Z",
        is_active: true,
        minimum_increment: 15,
        rounding_rule: "up",
      };

      try {
        const createGlobalRateResponse = await axios.post(
          `${API_BASE}/billing/rates`,
          globalRateData,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        console.log("✅ Created global billing rate");
        console.log(
          `   Rate: $${globalRateData.standard_rate}/hour (global fallback)`
        );
      } catch (globalRateError) {
        console.log(
          "❌ Global rate also failed:",
          globalRateError.response?.data?.message || globalRateError.message
        );
        console.log("Error details:", globalRateError.response?.data);
      }
    }

    // Check what rates exist now
    console.log("\n📋 Checking current billing rates...");
    try {
      const ratesResponse = await axios.get(`${API_BASE}/billing/rates`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      console.log(
        `Found ${ratesResponse.data.rates?.length || 0} total rates:`
      );
      ratesResponse.data.rates?.forEach((rate, index) => {
        console.log(
          `   ${index + 1}. Type: ${rate.entity_type} - Rate: $${
            rate.standard_rate
          } - Active: ${rate.is_active}`
        );
        if (rate.entity_id) {
          console.log(`      Entity ID: ${rate.entity_id}`);
        }
      });
    } catch (ratesError) {
      console.log(
        "❌ Cannot get rates:",
        ratesError.response?.data?.message || ratesError.message
      );
    }

    // Test billing with rates
    console.log("\n💰 TESTING BILLING WITH RATES:");

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const data = billingResponse.data.data;
      console.log(`\n✅ PROJECT BILLING RESULTS:`);
      console.log(`   Projects: ${data.projects?.length || 0}`);
      console.log(`   Total Hours: ${data.summary?.total_hours || 0}`);
      console.log(
        `   Billable Hours: ${data.summary?.total_billable_hours || 0}`
      );
      console.log(`   Total Amount: $${data.summary?.total_amount || 0}`);

      if (data.summary?.total_hours > 0) {
        console.log("\n🎉 SUCCESS! Billing is now working with rates!");

        data.projects?.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(`\n📊 ${project.project_name}:`);
            console.log(`   Total Hours: ${project.total_hours}`);
            console.log(`   Billable Hours: ${project.billable_hours}`);
            console.log(`   Non-billable Hours: ${project.non_billable_hours}`);
            console.log(`   Total Amount: $${project.total_amount}`);

            if (project.resources?.length > 0) {
              console.log("   📋 Resources:");
              project.resources.forEach((resource) => {
                console.log(`   └─ ${resource.user_name}:`);
                console.log(`      Total Hours: ${resource.total_hours}`);
                console.log(`      Billable Hours: ${resource.billable_hours}`);
                console.log(`      Rate: $${resource.hourly_rate}/hr`);
                console.log(`      Amount: $${resource.total_amount}`);
              });
            }
          }
        });

        console.log("\n🧮 CALCULATION VERIFICATION:");
        console.log("Expected from our time entries:");
        console.log("- Total Hours: 37 (8+7+6+8+8)");
        console.log("- Billable Hours: 31 (8+7+0+8+8)");
        console.log("- Expected Amount: $2,325 (31 × $75)");
      } else {
        console.log("\n❌ Still no billing data");
      }
    } catch (billingError) {
      console.log(
        "❌ Billing test failed:",
        billingError.response?.data?.message || billingError.message
      );
      console.log("Full error:", billingError.response?.data);
    }

    // Test task billing
    try {
      const taskBillingResponse = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const taskData = taskBillingResponse.data.data;
      console.log(`\n✅ TASK BILLING RESULTS:`);
      console.log(`   Tasks: ${taskData.tasks?.length || 0}`);
      console.log(`   Total Hours: ${taskData.summary?.total_hours || 0}`);
      console.log(`   Total Amount: $${taskData.summary?.total_amount || 0}`);

      if (taskData.tasks?.length > 0) {
        console.log("\n📋 Task breakdown:");
        taskData.tasks.forEach((task) => {
          console.log(
            `   - ${task.task_name} (${task.project_name}): ${task.total_hours}h, $${task.total_amount}`
          );
        });
      }
    } catch (taskBillingError) {
      console.log(
        "❌ Task billing failed:",
        taskBillingError.response?.data?.message || taskBillingError.message
      );
    }
  } catch (error) {
    console.error("❌ Setup failed:", error.response?.data || error.message);
  }
}

createCorrectBillingRate();
