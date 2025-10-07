const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function seedEmployee1TimeEntries() {
  console.log("🌱 SEEDING EMPLOYEE1 TIME ENTRIES FOR BILLING TEST\n");

  try {
    // Login as employee1 to create/update data
    const employee1Response = await axios.post(`${API_BASE}/auth/login`, {
      email: "employee1@company.com",
      password: "admin123",
    });

    const employee1Token = employee1Response.data.tokens.accessToken;

    // Login as admin to approve data
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get projects to use
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const projects = projectsResponse.data.projects || [];
    console.log(`📊 Available projects: ${projects.length}`);

    if (projects.length === 0) {
      console.log("❌ No projects found - cannot create time entries");
      return;
    }

    const sampleProject = projects[0]; // Use first project
    console.log(
      `Using project: ${sampleProject.name} (ID: ${sampleProject.id})`
    );

    // Create a new timesheet for current week with time entries
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday

    const timesheetData = {
      week_start_date: startOfWeek.toISOString().split("T")[0],
      entries: [
        {
          date: new Date(startOfWeek.getTime() + 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Monday
          project_id: sampleProject.id,
          hours: 8,
          description: "Frontend development work",
          is_billable: true,
          entry_type: "project_task",
        },
        {
          date: new Date(startOfWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Tuesday
          project_id: sampleProject.id,
          hours: 7,
          description: "Backend API implementation",
          is_billable: true,
          entry_type: "project_task",
        },
        {
          date: new Date(startOfWeek.getTime() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Wednesday
          project_id: sampleProject.id,
          hours: 6,
          description: "Testing and debugging",
          is_billable: false,
          entry_type: "project_task",
        },
        {
          date: new Date(startOfWeek.getTime() + 4 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Thursday
          project_id: sampleProject.id,
          hours: 8,
          description: "Code review and refactoring",
          is_billable: true,
          entry_type: "project_task",
        },
        {
          date: new Date(startOfWeek.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Friday
          project_id: sampleProject.id,
          hours: 5,
          description: "Documentation and deployment",
          is_billable: true,
          entry_type: "project_task",
        },
      ],
    };

    console.log(
      `📅 Creating timesheet for week starting: ${timesheetData.week_start_date}`
    );
    console.log(
      `📋 With ${
        timesheetData.entries.length
      } entries totaling ${timesheetData.entries.reduce(
        (sum, e) => sum + e.hours,
        0
      )} hours`
    );

    try {
      // Create timesheet as employee1
      const createResponse = await axios.post(
        `${API_BASE}/timesheets`,
        timesheetData,
        {
          headers: { Authorization: `Bearer ${employee1Token}` },
        }
      );

      console.log(
        "✅ Created timesheet:",
        createResponse.data.timesheet?.id || createResponse.data.id
      );
      const timesheetId =
        createResponse.data.timesheet?.id || createResponse.data.id;

      if (timesheetId) {
        // Submit timesheet
        try {
          await axios.put(
            `${API_BASE}/timesheets/${timesheetId}/submit`,
            {},
            {
              headers: { Authorization: `Bearer ${employee1Token}` },
            }
          );
          console.log("✅ Submitted timesheet");

          // Approve as manager (admin)
          await axios.put(
            `${API_BASE}/timesheets/${timesheetId}/manager-approve`,
            {},
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );
          console.log("✅ Manager approved timesheet");

          // Freeze timesheet for billing
          await axios.put(
            `${API_BASE}/timesheets/${timesheetId}/freeze`,
            {},
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );
          console.log("✅ Frozen timesheet for billing");
        } catch (workflowError) {
          console.log(
            "⚠️ Workflow actions failed:",
            workflowError.response?.data?.message || workflowError.message
          );
          console.log("Timesheet created but may need manual approval");
        }
      }
    } catch (createError) {
      console.log(
        "❌ Failed to create timesheet:",
        createError.response?.data?.message || createError.message
      );
      console.log(
        "Full error:",
        createError.response?.data || createError.message
      );
    }

    // Test billing after seeding
    console.log("\n💰 TESTING BILLING AFTER SEEDING:");

    // Use a wide date range to catch our new timesheet
    const startDate = "2024-09-01";
    const endDate = "2024-12-31";

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log("✅ Project Billing Results:");
      console.log(
        `Projects: ${billingResponse.data.data.projects?.length || 0}`
      );
      console.log(
        `Total Hours: ${billingResponse.data.data.summary?.total_hours || 0}`
      );
      console.log(
        `Billable Hours: ${
          billingResponse.data.data.summary?.total_billable_hours || 0
        }`
      );
      console.log(
        `Total Amount: $${billingResponse.data.data.summary?.total_amount || 0}`
      );

      if (billingResponse.data.data.projects?.length > 0) {
        console.log("\nProject details:");
        billingResponse.data.data.projects.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(
              `- ${project.project_name}: ${project.total_hours}h, $${project.total_amount} (${project.billable_hours}h billable)`
            );
            if (project.resources?.length > 0) {
              project.resources.forEach((resource) => {
                console.log(
                  `  └─ ${resource.user_name}: ${resource.total_hours}h, $${resource.total_amount}`
                );
              });
            }
          }
        });

        if (billingResponse.data.data.summary?.total_hours > 0) {
          console.log(
            "\n🎉 SUCCESS! Billing data is now showing hours and amounts!"
          );
        } else {
          console.log(
            "\n❌ Still no billing data - aggregation may need more fixes"
          );
        }
      }
    } catch (billingError) {
      console.log(
        "❌ Billing test failed:",
        billingError.response?.data || billingError.message
      );
    }

    // Also test task billing
    try {
      const taskBillingResponse = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log("\n✅ Task Billing Results:");
      console.log(`Tasks: ${taskBillingResponse.data.data.tasks?.length || 0}`);
      console.log(
        `Total Hours: ${
          taskBillingResponse.data.data.summary?.total_hours || 0
        }`
      );
      console.log(
        `Total Amount: $${
          taskBillingResponse.data.data.summary?.total_amount || 0
        }`
      );

      if (taskBillingResponse.data.data.tasks?.length > 0) {
        console.log("\nTask details:");
        taskBillingResponse.data.data.tasks.slice(0, 5).forEach((task) => {
          console.log(
            `- ${task.task_name}: ${task.total_hours}h, $${task.total_amount}`
          );
        });
      }
    } catch (taskBillingError) {
      console.log(
        "❌ Task billing test failed:",
        taskBillingError.response?.data || taskBillingError.message
      );
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error.response?.data || error.message);
  }
}

seedEmployee1TimeEntries();
