const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function setupBillingRatesAndTest() {
  console.log("💰 SETTING UP BILLING RATES FOR EMPLOYEE1\n");

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

    // Get projects
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const projects = projectsResponse.data.projects || [];
    const websiteProject = projects.find((p) => p.name === "Website Redesign");
    console.log(`📊 Website Redesign Project: ${websiteProject.id}`);

    // Check existing billing rates
    console.log("\n📋 Checking existing billing rates...");
    try {
      const ratesResponse = await axios.get(`${API_BASE}/billing/rates`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      console.log(
        `Found ${ratesResponse.data.rates?.length || 0} existing rates`
      );

      if (ratesResponse.data.rates?.length > 0) {
        console.log("Existing rates:");
        ratesResponse.data.rates.slice(0, 3).forEach((rate, index) => {
          console.log(
            `   ${index + 1}. User: ${rate.user_id} - Rate: $${
              rate.hourly_rate
            }`
          );
        });
      }
    } catch (ratesError) {
      console.log(
        "❌ Cannot get billing rates:",
        ratesError.response?.data?.message || ratesError.message
      );
    }

    // Create billing rate for employee1
    console.log("\n💲 Creating billing rate for employee1...");
    const rateData = {
      user_id: employee1.id,
      project_id: websiteProject.id,
      hourly_rate: 75.0, // $75/hour
      effective_from: "2024-10-01",
      is_active: true,
    };

    try {
      const createRateResponse = await axios.post(
        `${API_BASE}/billing/rates`,
        rateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log(
        "✅ Created billing rate:",
        createRateResponse.data.rate?.id || "Success"
      );
      console.log(
        `   Rate: $${rateData.hourly_rate}/hour for ${employee1.full_name} on ${websiteProject.name}`
      );
    } catch (rateError) {
      console.log(
        "❌ Failed to create billing rate:",
        rateError.response?.data?.message || rateError.message
      );
      console.log("Error details:", rateError.response?.data);

      // Try alternative rate creation approach
      console.log("\n🔄 Trying alternative billing rate setup...");

      const altRateData = {
        userId: employee1.id,
        projectId: websiteProject.id,
        rate: 75.0,
        effectiveDate: "2024-10-01",
      };

      try {
        const altCreateResponse = await axios.post(
          `${API_BASE}/billing-rates`,
          altRateData,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        console.log("✅ Created rate with alternative approach");
      } catch (altError) {
        console.log(
          "❌ Alternative approach also failed:",
          altError.response?.data?.message || altError.message
        );
      }
    }

    // Test billing again
    console.log("\n💰 TESTING BILLING AFTER RATE SETUP:");

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
        console.log("\n🎉 SUCCESS! Billing is working!");

        data.projects?.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(`\n📊 ${project.project_name}:`);
            console.log(`   Total Hours: ${project.total_hours}`);
            console.log(`   Billable Hours: ${project.billable_hours}`);
            console.log(`   Non-billable Hours: ${project.non_billable_hours}`);
            console.log(`   Total Amount: $${project.total_amount}`);

            if (project.resources?.length > 0) {
              console.log("   Resources:");
              project.resources.forEach((resource) => {
                console.log(`   └─ ${resource.user_name}:`);
                console.log(
                  `      Hours: ${resource.total_hours} (${resource.billable_hours} billable)`
                );
                console.log(`      Rate: $${resource.hourly_rate}/hr`);
                console.log(`      Amount: $${resource.total_amount}`);
              });
            }
          }
        });

        console.log("\n📊 CALCULATION VERIFICATION:");
        console.log(`Expected billable hours: 31 (8+7+0+8+8)`);
        console.log(`Expected amount: $2,325 (31 hours × $75/hr)`);
      } else {
        console.log("\n❌ Still no billing data");
        console.log(
          "💡 May need to setup billing rates differently or check aggregation"
        );
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
        console.log("\nTask breakdown:");
        taskData.tasks.forEach((task) => {
          console.log(
            `   - ${task.task_name}: ${task.total_hours}h, $${task.total_amount}`
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

setupBillingRatesAndTest();
