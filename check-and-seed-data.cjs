const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function checkAndSeedData() {
  console.log("🔍 CHECKING EXISTING DATA AND SEEDING IF NEEDED\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // 1. Check existing projects
    console.log("📊 CHECKING PROJECTS:");
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const projects = projectsResponse.data.projects || [];
    console.log(`Found ${projects.length} projects`);

    if (projects.length > 0) {
      console.log("Sample projects:");
      projects.slice(0, 3).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
      });
    }

    // 2. Check existing users
    console.log("\n👥 CHECKING USERS:");
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const users = usersResponse.data.users || [];
    console.log(`Found ${users.length} users`);

    const activeUsers = users.filter(
      (u) => u.email && !u.email.includes("deleted")
    );
    console.log("Active users:");
    activeUsers.slice(0, 5).forEach((user, index) => {
      console.log(
        `  ${index + 1}. ${user.full_name} (${user.email}) - ${user.role}`
      );
    });

    // 3. Check existing timesheets
    console.log("\n📋 CHECKING TIMESHEETS:");
    const timesheetsResponse = await axios.get(
      `${API_BASE}/timesheets?limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const timesheets = timesheetsResponse.data.data || [];
    console.log(`Found ${timesheets.length} timesheets (showing first 5)`);

    if (timesheets.length > 0) {
      console.log("Sample timesheets:");
      timesheets.forEach((timesheet, index) => {
        console.log(
          `  ${index + 1}. Week: ${
            timesheet.week_start_date?.split("T")[0]
          } - Status: ${timesheet.status} - Hours: ${
            timesheet.total_hours
          } - User: ${timesheet.user_id?.full_name || "Unknown"}`
        );
      });

      // Check for approved/frozen timesheets
      const approvedTimesheets = timesheets.filter((ts) =>
        [
          "frozen",
          "approved",
          "manager_approved",
          "management_approved",
        ].includes(ts.status)
      );
      console.log(
        `\n📊 Approved/Frozen timesheets in sample: ${approvedTimesheets.length}`
      );
    }

    // 4. Check if we can access timeentries through MongoDB or alternative endpoint
    console.log("\n📝 CHECKING TIME ENTRIES:");

    // Try to find any endpoint that gives us timeentries
    const timeentryEndpoints = [
      "time-entries",
      "timeentries",
      "entries",
      "timesheet-entries",
    ];

    let timeentriesFound = false;
    let timeentries = [];

    for (const endpoint of timeentryEndpoints) {
      try {
        const entriesResponse = await axios.get(
          `${API_BASE}/${endpoint}?limit=5`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log(
          `✅ Found time entries at /${endpoint}: ${
            entriesResponse.data.length ||
            entriesResponse.data.data?.length ||
            0
          } entries`
        );
        timeentries = entriesResponse.data.data || entriesResponse.data || [];
        timeentriesFound = true;

        if (timeentries.length > 0) {
          console.log("Sample time entries:");
          timeentries.slice(0, 3).forEach((entry, index) => {
            console.log(
              `  ${index + 1}. Date: ${entry.date?.split("T")[0]} - Hours: ${
                entry.hours
              } - Project: ${entry.project_id} - Billable: ${entry.is_billable}`
            );
          });
        }
        break;
      } catch (e) {
        console.log(`❌ /${endpoint} not accessible`);
      }
    }

    if (!timeentriesFound) {
      console.log("❌ No time entries endpoint found");
    }

    // 5. If we have the basic data but no timeentries, create some
    if (
      projects.length > 0 &&
      activeUsers.length > 0 &&
      timesheets.length > 0 &&
      !timeentriesFound
    ) {
      console.log(
        "\n🌱 DATA EXISTS BUT NO TIME ENTRIES FOUND - SEEDING TIME ENTRIES..."
      );

      // Try to create timeentries directly through timesheet endpoints
      const sampleProject = projects[0];
      const sampleUser =
        activeUsers.find((u) => u.role === "employee") || activeUsers[0];

      console.log(`Using project: ${sampleProject.name} (${sampleProject.id})`);
      console.log(`Using user: ${sampleUser.full_name} (${sampleUser.email})`);

      // Create a new timesheet with entries
      const newTimesheetData = {
        week_start_date: "2024-10-21",
        entries: [
          {
            date: "2024-10-21",
            project_id: sampleProject.id,
            hours: 8,
            description: "Website development work",
            is_billable: true,
            entry_type: "project_task",
          },
          {
            date: "2024-10-22",
            project_id: sampleProject.id,
            hours: 6,
            description: "Frontend implementation",
            is_billable: true,
            entry_type: "project_task",
          },
          {
            date: "2024-10-23",
            project_id: sampleProject.id,
            hours: 7,
            description: "Testing and debugging",
            is_billable: false,
            entry_type: "project_task",
          },
        ],
      };

      try {
        // First login as the target user
        const userLogin = await axios.post(`${API_BASE}/auth/login`, {
          email: sampleUser.email,
          password: "admin123", // assuming same password
        });

        const userToken = userLogin.data.tokens.accessToken;

        const createResponse = await axios.post(
          `${API_BASE}/timesheets`,
          newTimesheetData,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        console.log(
          "✅ Created new timesheet:",
          createResponse.data.timesheet?.id
        );

        // Try to submit it
        const timesheetId = createResponse.data.timesheet.id;
        await axios.put(
          `${API_BASE}/timesheets/${timesheetId}/submit`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        console.log("✅ Submitted timesheet");

        // Try to approve it (as admin)
        await axios.put(
          `${API_BASE}/timesheets/${timesheetId}/manager-approve`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("✅ Approved timesheet");
      } catch (createError) {
        console.log(
          "❌ Failed to create timesheet:",
          createError.response?.data?.message || createError.message
        );
      }
    }

    // 6. Test billing after potential seeding
    console.log("\n\n💰 TESTING BILLING AFTER DATA CHECK:");

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Project Billing Results:");
      console.log(
        `Total Projects: ${billingResponse.data.data.projects?.length || 0}`
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
          console.log(
            `- ${project.project_name}: ${project.total_hours}h, $${project.total_amount}`
          );
        });
      }
    } catch (billingError) {
      console.log(
        "❌ Billing test failed:",
        billingError.response?.data || billingError.message
      );
    }

    // 7. Test task billing
    try {
      const taskBillingResponse = await axios.get(
        `${API_BASE}/project-billing/tasks?startDate=2024-10-01&endDate=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("\n✅ Task Billing Results:");
      console.log(
        `Total Tasks: ${taskBillingResponse.data.data.tasks?.length || 0}`
      );
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
    console.error(
      "❌ Check and seed failed:",
      error.response?.data || error.message
    );
  }
}

checkAndSeedData();
