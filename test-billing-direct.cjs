const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testBillingDirect() {
  console.log("🧪 DIRECT BILLING TEST (Assuming TimeEntries Exist)\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get available data for context
    console.log("📊 Getting system data...");

    const [projectsResponse, usersResponse, timesheetsResponse] =
      await Promise.all([
        axios.get(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE}/timesheets?limit=10`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

    const projects = projectsResponse.data.projects || [];
    const users = usersResponse.data.users || [];
    const timesheets = timesheetsResponse.data.data || [];

    console.log(`Projects: ${projects.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Timesheets: ${timesheets.length}`);

    // Find employee1 and approved timesheets
    const employee1 = users.find((u) => u.email === "employee1@company.com");
    const approvedTimesheets = timesheets.filter(
      (ts) =>
        (ts.user_id?._id === employee1?.id || ts.user_id === employee1?.id) &&
        [
          "frozen",
          "approved",
          "manager_approved",
          "management_approved",
        ].includes(ts.status)
    );

    console.log(`Employee1 ID: ${employee1?.id}`);
    console.log(`Employee1 approved timesheets: ${approvedTimesheets.length}`);

    if (projects.length > 0 && approvedTimesheets.length > 0) {
      console.log("\n💡 Data structure looks correct for billing aggregation");
      console.log(
        "Projects available:",
        projects.map((p) => `${p.name} (${p.id})`).join(", ")
      );
      console.log(
        "Approved timesheet IDs:",
        approvedTimesheets.map((ts) => ts._id).join(", ")
      );
    }

    // Test billing with different date ranges
    const testRanges = [
      {
        name: "Wide Range 2024",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
      { name: "October 2024", startDate: "2024-10-01", endDate: "2024-10-31" },
      {
        name: "September 2025",
        startDate: "2025-09-01",
        endDate: "2025-09-30",
      },
      { name: "Current Range", startDate: "2024-09-01", endDate: "2025-12-31" },
    ];

    for (const range of testRanges) {
      console.log(
        `\n💰 TESTING BILLING: ${range.name} (${range.startDate} to ${range.endDate})`
      );

      try {
        const billingResponse = await axios.get(
          `${API_BASE}/project-billing/projects?startDate=${range.startDate}&endDate=${range.endDate}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        const data = billingResponse.data.data;
        const projectsWithData =
          data.projects?.filter((p) => p.total_hours > 0) || [];

        console.log(
          `✅ Response: ${data.projects?.length || 0} projects, ${
            projectsWithData.length
          } with data`
        );
        console.log(`   Total Hours: ${data.summary?.total_hours || 0}`);
        console.log(
          `   Billable Hours: ${data.summary?.total_billable_hours || 0}`
        );
        console.log(`   Total Amount: $${data.summary?.total_amount || 0}`);

        if (projectsWithData.length > 0) {
          console.log("   🎉 FOUND DATA!");
          projectsWithData.forEach((project) => {
            console.log(
              `   📊 ${project.project_name}: ${project.total_hours}h, $${project.total_amount}`
            );
            if (project.resources?.length > 0) {
              project.resources.forEach((resource) => {
                console.log(
                  `      └─ ${resource.user_name}: ${resource.total_hours}h, $${resource.total_amount}`
                );
              });
            }
          });
          break; // Stop testing if we found data
        }
      } catch (billingError) {
        console.log(
          `❌ Error: ${
            billingError.response?.data?.message || billingError.message
          }`
        );
      }
    }

    // Also test task billing with the successful range
    console.log(`\n📋 TESTING TASK BILLING:`);

    try {
      const taskBillingResponse = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=2024-01-01&endDate=2025-12-31`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const taskData = taskBillingResponse.data.data;
      console.log(`✅ Task Results: ${taskData.tasks?.length || 0} tasks`);
      console.log(`   Total Hours: ${taskData.summary?.total_hours || 0}`);
      console.log(`   Total Amount: $${taskData.summary?.total_amount || 0}`);

      if (taskData.tasks?.length > 0) {
        console.log("   Task details:");
        taskData.tasks.slice(0, 5).forEach((task) => {
          console.log(
            `   - ${task.task_name}: ${task.total_hours}h, $${task.total_amount}`
          );
        });
      }
    } catch (taskBillingError) {
      console.log(
        `❌ Task billing error: ${
          taskBillingError.response?.data?.message || taskBillingError.message
        }`
      );
    }

    // Debug: Check what the aggregation is actually finding
    console.log("\n🔍 DEBUGGING AGGREGATION:");
    console.log("The aggregation should be looking for:");
    console.log('1. TimeEntry documents in "timeentries" collection');
    console.log("2. With project_id matching existing project IDs");
    console.log("3. Linked to timesheets with approved/frozen status");
    console.log("4. Where timesheet.user_id is not null");
    console.log("5. Within the specified date range");

    console.log("\nAvailable project IDs for matching:");
    projects.forEach((p) => console.log(`   - ${p.id} (${p.name})`));

    console.log("\nApproved timesheet IDs for linking:");
    approvedTimesheets.forEach((ts) =>
      console.log(
        `   - ${ts._id} (Week: ${ts.week_start_date?.split("T")[0]}, User: ${
          ts.user_id?._id || "Unknown"
        })`
      )
    );

    console.log("\n💡 If billing still shows 0:");
    console.log(
      '   - TimeEntry documents may not exist in "timeentries" collection'
    );
    console.log(
      "   - project_id in TimeEntries may not match existing project IDs"
    );
    console.log("   - Timesheet linking may be broken (timesheet_id mismatch)");
    console.log("   - Date range may not include the TimeEntry dates");
    console.log("   - deleted_at field may not be null");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testBillingDirect();
