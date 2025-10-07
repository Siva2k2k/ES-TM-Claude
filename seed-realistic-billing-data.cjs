const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

// Login and get token
async function loginAdmin() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });
    return response.data.tokens.accessToken;
  } catch (error) {
    console.error(
      "❌ Login failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

// Get user IDs for the test users
async function getUserIds(token) {
  try {
    const users = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userMap = {};
    users.data.users.forEach((user) => {
      userMap[user.email] = user.id;
    });

    return userMap;
  } catch (error) {
    console.error(
      "❌ Failed to get user IDs:",
      error.response?.data?.message || error.message
    );
    return {};
  }
}

// Get project IDs
async function getProjectIds(token) {
  try {
    const projects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return projects.data.projects || [];
  } catch (error) {
    console.error(
      "❌ Failed to get projects:",
      error.response?.data?.message || error.message
    );
    return [];
  }
}

// Create timesheet for a user and week
async function createTimesheet(token, userId, weekStartDate) {
  try {
    const response = await axios.post(
      `${API_BASE}/timesheets`,
      {
        userId,
        weekStartDate,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data.timesheet;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`   ℹ️  Timesheet already exists for this week`);
      // Try to get the existing timesheet
      try {
        const existing = await axios.get(
          `${API_BASE}/timesheets/${userId}/${weekStartDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return existing.data.timesheet;
      } catch (getError) {
        console.error(
          "   ❌ Failed to get existing timesheet:",
          getError.response?.data?.message || getError.message
        );
        return null;
      }
    } else {
      console.error(
        "   ❌ Failed to create timesheet:",
        error.response?.data?.message || error.message
      );
      return null;
    }
  }
}

// Add time entry to timesheet
async function addTimeEntry(token, timesheetId, entry) {
  try {
    await axios.post(`${API_BASE}/timesheets/${timesheetId}/entries`, entry, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to add entry: ${
        error.response?.data?.message || error.message
      }`
    );
    return false;
  }
}

// Main seeding function
async function seedBillingData(token) {
  console.log("📊 Seeding Timesheet Data for Billing...\n");

  // Get user and project data
  const userMap = await getUserIds(token);
  const projects = await getProjectIds(token);

  if (Object.keys(userMap).length === 0 || projects.length === 0) {
    console.log("❌ Missing users or projects. Cannot proceed.");
    return;
  }

  console.log(
    `✅ Found ${Object.keys(userMap).length} users and ${
      projects.length
    } projects`
  );

  // Week starting dates for October 2024 (used in time entries below)

  let totalBillableAmount = 0;
  let totalHours = 0;
  let entriesCreated = 0;

  // Time entries to create
  const timeEntries = [
    // Employee1 - Week 1
    {
      userEmail: "employee1@company.com",
      weekStart: "2024-09-30",
      entries: [
        {
          date: "2024-10-01",
          hours: 8,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[0].id,
          description: "Frontend development - React components for homepage",
          rate: 85,
        },
        {
          date: "2024-10-02",
          hours: 6.5,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[1].id,
          description: "Mobile app UI implementation",
          rate: 80,
        },
        {
          date: "2024-10-03",
          hours: 7,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[2].id,
          description: "SEO keyword research and analysis",
          rate: 65,
        },
      ],
    },
    // Employee2 - Week 1
    {
      userEmail: "employee2@company.com",
      weekStart: "2024-09-30",
      entries: [
        {
          date: "2024-10-01",
          hours: 8,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[0].id,
          description: "Backend API development and database integration",
          rate: 90,
        },
        {
          date: "2024-10-02",
          hours: 5.5,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[1].id,
          description: "React Native backend services",
          rate: 85,
        },
        {
          date: "2024-10-04",
          hours: 4,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[2].id,
          description: "Content management system optimization",
          rate: 70,
        },
      ],
    },
    // Manager - Week 1 (higher rates)
    {
      userEmail: "manager@company.com",
      weekStart: "2024-09-30",
      entries: [
        {
          date: "2024-10-01",
          hours: 4,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[0].id,
          description: "Technical architecture review and code review",
          rate: 120,
        },
        {
          date: "2024-10-03",
          hours: 3,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[1].id,
          description: "Project planning and team coordination",
          rate: 110,
        },
        {
          date: "2024-10-03",
          hours: 2,
          entry_type: "custom_task",
          is_billable: false,
          custom_task_description: "Team meeting and administrative work",
        },
      ],
    },
    // Employee1 - Week 2
    {
      userEmail: "employee1@company.com",
      weekStart: "2024-10-07",
      entries: [
        {
          date: "2024-10-07",
          hours: 8,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[0].id,
          description: "Advanced React components and state management",
          rate: 85,
        },
        {
          date: "2024-10-08",
          hours: 6,
          entry_type: "project_task",
          is_billable: true,
          project_id: projects[1].id,
          description: "Mobile app testing and debugging",
          rate: 80,
        },
      ],
    },
  ];

  // Process each user's time entries
  for (const userEntries of timeEntries) {
    const userId = userMap[userEntries.userEmail];
    if (!userId) {
      console.log(`❌ User ${userEntries.userEmail} not found`);
      continue;
    }

    console.log(`\n👤 Creating entries for ${userEntries.userEmail}:`);

    // Create timesheet for the week
    const timesheet = await createTimesheet(
      token,
      userId,
      userEntries.weekStart
    );
    if (!timesheet) {
      console.log(
        `   ❌ Failed to create/get timesheet for week ${userEntries.weekStart}`
      );
      continue;
    }

    console.log(`   ✅ Timesheet ready for week ${userEntries.weekStart}`);

    // Add time entries to the timesheet
    for (const entry of userEntries.entries) {
      const entryData = { ...entry };
      delete entryData.rate; // Remove rate as it's not part of the API

      const success = await addTimeEntry(token, timesheet.id, entryData);
      if (success) {
        const amount = entry.is_billable ? entry.hours * (entry.rate || 0) : 0;
        totalBillableAmount += amount;
        totalHours += entry.hours;
        entriesCreated++;

        console.log(
          `   ✅ ${entry.description.substring(0, 40)}... | ${
            entry.hours
          }h | $${amount.toFixed(2)}`
        );
      }
    }
  }

  console.log(`\n📊 Seeding Summary:`);
  console.log(`✅ Created: ${entriesCreated} time entries`);
  console.log(`⏰ Total Hours: ${totalHours.toFixed(1)} hours`);
  console.log(
    `💰 Estimated Billable Amount: $${totalBillableAmount.toFixed(2)}`
  );

  return { entriesCreated, totalHours, totalBillableAmount };
}

// Test billing data
async function testBillingData(token) {
  console.log("\n🔍 Testing Billing Views with New Data...\n");

  try {
    // Test Project Billing View
    console.log("1. 📊 Project Billing View:");
    const projectBilling = await axios.get(
      `${API_BASE}/project-billing/projects?startDate=2024-09-01&endDate=2024-10-31`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const projectData = projectBilling.data.data;
    console.log(`   Total Projects: ${projectData.summary.total_projects}`);
    console.log(`   Total Hours: ${projectData.summary.total_hours}`);
    console.log(
      `   Billable Hours: ${projectData.summary.total_billable_hours}`
    );
    console.log(`   Total Amount: $${projectData.summary.total_amount}`);

    // Test Task Billing View
    console.log("\n2. 📋 Task Billing View:");
    const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const taskData = taskBilling.data.data;
    console.log(`   Total Tasks: ${taskData.summary.total_tasks}`);
    console.log(`   Total Hours: ${taskData.summary.total_hours}`);
    console.log(`   Billable Hours: ${taskData.summary.total_billable_hours}`);
    console.log(`   Total Amount: $${taskData.summary.total_amount}`);
  } catch (error) {
    console.error(
      "❌ Billing test failed:",
      error.response?.data || error.message
    );
  }
}

// Main function
async function main() {
  console.log("🚀 TIMESHEET BILLING DATA SEEDING\n");
  console.log("=".repeat(50));

  const token = await loginAdmin();
  if (!token) {
    console.log("❌ Cannot proceed without admin token");
    return;
  }

  // Seed the timesheet data
  await seedBillingData(token);

  // Test the billing views
  await testBillingData(token);

  console.log("\n🎯 NEXT STEPS:");
  console.log("=".repeat(50));
  console.log("1. Open http://localhost:5173 in browser");
  console.log("2. Login with admin@company.com / admin123");
  console.log("3. Navigate to Billing section");
  console.log(
    "4. Check Project Billing View - should show actual hours and amounts"
  );
  console.log("5. Check Task Billing View - should show detailed breakdowns");
  console.log("6. Look for Export/Download buttons to test data export");
  console.log("7. Verify totals match the seeded data amounts");

  console.log("\n✅ Timesheet billing data seeding completed!");
}

main();
