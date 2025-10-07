const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testBillingFixes() {
  console.log("🚀 TESTING BILLING FIXES\n");
  console.log("=".repeat(50));

  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;
    console.log("✅ Login successful\n");

    // Test Project Billing View (should now show real data)
    console.log("1. 📊 Testing Project Billing View (After Fix):\n");

    try {
      const projectBilling = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-01-01&endDate=2025-12-31`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = projectBilling.data.data;
      console.log(`✅ Project Billing Response:`);
      console.log(`   Total Projects: ${data.summary.total_projects}`);
      console.log(`   Total Hours: ${data.summary.total_hours}`);
      console.log(`   Billable Hours: ${data.summary.total_billable_hours}`);
      console.log(`   Total Amount: $${data.summary.total_amount}`);

      console.log("\n📋 Project Details:");
      data.projects.forEach((project, index) => {
        console.log(
          `   ${index + 1}. ${project.project_name} (${
            project.client_name || "No Client"
          })`
        );
        console.log(
          `      Hours: ${project.total_hours} | Billable: ${project.billable_hours} | Amount: $${project.total_amount}`
        );

        if (project.resources && project.resources.length > 0) {
          console.log(`      Resources:`);
          project.resources.forEach((resource) => {
            console.log(
              `        - ${resource.user_name}: ${resource.total_hours}h, $${resource.total_amount}`
            );
          });
        }
      });
    } catch (error) {
      console.log(
        `❌ Project billing failed: ${
          error.response?.data?.message || error.message
        }`
      );
      console.log("Full error:", JSON.stringify(error.response?.data, null, 2));
    }

    // Test Task Billing View (should now show real data instead of sample)
    console.log("\n\n2. 📋 Testing Task Billing View (After Fix):\n");

    try {
      const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const taskData = taskBilling.data.data;
      console.log(`✅ Task Billing Response:`);
      console.log(`   Total Tasks: ${taskData.summary.total_tasks}`);
      console.log(`   Total Hours: ${taskData.summary.total_hours}`);
      console.log(
        `   Billable Hours: ${taskData.summary.total_billable_hours}`
      );
      console.log(`   Total Amount: $${taskData.summary.total_amount}`);

      if (taskData.tasks && taskData.tasks.length > 0) {
        console.log("\n📋 Task Details:");
        taskData.tasks.slice(0, 5).forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.task_name}`);
          console.log(`      Project: ${task.project_name}`);
          console.log(
            `      Hours: ${task.total_hours} | Billable: ${task.billable_hours}`
          );

          if (task.resources && task.resources.length > 0) {
            console.log(`      Resources:`);
            task.resources.forEach((resource) => {
              console.log(
                `        - ${resource.user_name}: ${resource.hours}h @ $${resource.rate}/h = $${resource.amount}`
              );
            });
          }
        });

        if (taskData.tasks.length > 5) {
          console.log(`   ... and ${taskData.tasks.length - 5} more tasks`);
        }
      } else {
        console.log("   No tasks found in the date range");
      }
    } catch (error) {
      console.log(
        `❌ Task billing failed: ${
          error.response?.data?.message || error.message
        }`
      );
      console.log("Full error:", JSON.stringify(error.response?.data, null, 2));
    }

    // Test different date ranges to see if data appears
    console.log("\n\n3. 📅 Testing Different Date Ranges:\n");

    const dateRanges = [
      { start: "2024-09-01", end: "2024-10-31", label: "Sep-Oct 2024" },
      { start: "2024-10-01", end: "2024-10-31", label: "October 2024" },
      { start: "2025-08-01", end: "2025-10-31", label: "Aug-Oct 2025" },
    ];

    for (const range of dateRanges) {
      try {
        const result = await axios.get(
          `${API_BASE}/project-billing/projects?startDate=${range.start}&endDate=${range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const summary = result.data.data.summary;
        console.log(
          `   ${range.label}: ${summary.total_hours}h, $${summary.total_amount}`
        );
      } catch (error) {
        console.log(
          `   ${range.label}: Error - ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }

    // Compare before and after
    console.log("\n\n4. 📈 COMPARISON SUMMARY:\n");
    console.log("=".repeat(40));

    console.log("🔍 WHAT WE FIXED:");
    console.log(
      '✅ Changed aggregation from "timeentries" to "timesheets" collection'
    );
    console.log("✅ Added $unwind to process timesheet.entries[] arrays");
    console.log("✅ Filtered for approved/frozen timesheets only");
    console.log("✅ Excluded timesheets with null user_id");
    console.log("✅ Removed hardcoded sample data from task billing");
    console.log("✅ Made task billing dates optional with default range");

    console.log("\n🎯 EXPECTED RESULTS:");
    console.log(
      "📊 Project Billing should now show real hours from timesheets"
    );
    console.log(
      "📋 Task Billing should show actual timesheet entries, not sample data"
    );
    console.log("💰 Billing amounts should be calculated from real user hours");
    console.log(
      "👤 User assignments should show actual employees (John Developer H, etc.)"
    );

    console.log("\n🌐 FRONTEND TESTING:");
    console.log("1. Open http://localhost:5173/billing");
    console.log("2. Login with admin@company.com / admin123");
    console.log("3. Check Project tab - should show real project hours");
    console.log("4. Check Task tab - should show real task breakdowns");
    console.log("5. Look for export functionality to test data download");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testBillingFixes();
