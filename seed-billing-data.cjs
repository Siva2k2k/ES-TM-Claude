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

// Create focused timesheet entries for billing display
async function seedTimesheetData(token) {
  console.log("📊 Seeding focused timesheet data for billing display...\n");

  // Get existing projects to use their IDs
  const projects = await axios.get(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const projectList = projects.data.projects || [];

  if (projectList.length === 0) {
    console.log("❌ No projects found. Please ensure projects exist first.");
    return;
  }

  // Sample focused timesheet entries with real billing data
  const timesheetEntries = [
    // Website Redesign Project - High value entries
    {
      project_id: projectList[0].id,
      task_title: "Frontend Development - React Components",
      task_description:
        "Developed reusable UI components for the new website design",
      hours_worked: 8.5,
      date_worked: "2024-10-01",
      is_billable: true,
      hourly_rate: 85,
      user_id: "employee1@company.com",
      status: "submitted",
    },
    {
      project_id: projectList[0].id,
      task_title: "Backend API Integration",
      task_description:
        "Integrated payment gateway and user authentication APIs",
      hours_worked: 6.0,
      date_worked: "2024-10-02",
      is_billable: true,
      hourly_rate: 90,
      user_id: "employee2@company.com",
      status: "approved",
    },
    {
      project_id: projectList[0].id,
      task_title: "Database Optimization",
      task_description: "Optimized database queries and improved performance",
      hours_worked: 4.5,
      date_worked: "2024-10-03",
      is_billable: true,
      hourly_rate: 95,
      user_id: "manager@company.com",
      status: "approved",
    },
    // Mobile App Project - Medium value entries
    {
      project_id: projectList[1]?.id || projectList[0].id,
      task_title: "React Native Development",
      task_description: "Cross-platform mobile app development and testing",
      hours_worked: 7.0,
      date_worked: "2024-10-01",
      is_billable: true,
      hourly_rate: 80,
      user_id: "employee1@company.com",
      status: "approved",
    },
    {
      project_id: projectList[1]?.id || projectList[0].id,
      task_title: "UI/UX Design Implementation",
      task_description: "Implemented design mockups and user interface",
      hours_worked: 5.5,
      date_worked: "2024-10-04",
      is_billable: true,
      hourly_rate: 75,
      user_id: "employee2@company.com",
      status: "submitted",
    },
    // SEO Project - Lower rate but consistent hours
    {
      project_id: projectList[2]?.id || projectList[0].id,
      task_title: "Keyword Research & Analysis",
      task_description:
        "Comprehensive keyword research and competitor analysis",
      hours_worked: 6.0,
      date_worked: "2024-10-02",
      is_billable: true,
      hourly_rate: 65,
      user_id: "employee1@company.com",
      status: "approved",
    },
    {
      project_id: projectList[2]?.id || projectList[0].id,
      task_title: "Content Optimization",
      task_description: "SEO content optimization and meta tag implementation",
      hours_worked: 4.0,
      date_worked: "2024-10-05",
      is_billable: true,
      hourly_rate: 60,
      user_id: "employee2@company.com",
      status: "approved",
    },
    // Non-billable entries for comparison
    {
      project_id: projectList[0].id,
      task_title: "Team Meeting & Planning",
      task_description: "Weekly team standup and project planning session",
      hours_worked: 1.5,
      date_worked: "2024-10-03",
      is_billable: false,
      hourly_rate: 0,
      user_id: "manager@company.com",
      status: "approved",
    },
  ];

  let successCount = 0;
  let totalBillableAmount = 0;
  let totalHours = 0;

  console.log("Creating timesheet entries...\n");

  for (const entry of timesheetEntries) {
    try {
      await axios.post(`${API_BASE}/timesheets`, entry, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const amount = entry.is_billable
        ? entry.hours_worked * entry.hourly_rate
        : 0;
      totalBillableAmount += amount;
      totalHours += entry.hours_worked;

      console.log(`✅ ${entry.task_title}`);
      console.log(
        `   📅 ${entry.date_worked} | ⏰ ${
          entry.hours_worked
        }h | 💰 $${amount.toFixed(2)} | ${
          entry.is_billable ? "Billable" : "Non-billable"
        }`
      );

      successCount++;
    } catch (error) {
      console.log(`❌ Failed to create: ${entry.task_title}`);
      console.log(
        `   Error: ${error.response?.data?.message || error.message}`
      );
    }
  }

  console.log(`\n📊 Timesheet Seeding Summary:`);
  console.log(`✅ Created: ${successCount}/${timesheetEntries.length} entries`);
  console.log(`⏰ Total Hours: ${totalHours.toFixed(1)} hours`);
  console.log(`💰 Total Billable Amount: $${totalBillableAmount.toFixed(2)}`);

  return { successCount, totalHours, totalBillableAmount };
}

// Test billing views with new data
async function testBillingWithData(token) {
  console.log("\n🔍 Testing billing views with seeded data...\n");

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

    console.log("\n   Project Breakdown:");
    projectData.projects.forEach((project, index) => {
      console.log(
        `   ${index + 1}. ${project.project_name} (${project.client_name})`
      );
      console.log(
        `      Hours: ${project.total_hours} | Billable: ${project.billable_hours} | Amount: $${project.total_amount}`
      );
    });

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

    return { projectData, taskData };
  } catch (error) {
    console.error(
      "❌ Billing test failed:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Test export functionality
async function testExportFunctionality(token) {
  console.log("\n📤 Testing Export Functionality...\n");

  try {
    // Check if there are any export endpoints
    console.log("🔍 Checking available export options...");

    // Test potential export endpoints
    const exportTests = [
      { name: "Project Billing Export", endpoint: "/project-billing/export" },
      { name: "Timesheet Export", endpoint: "/timesheets/export" },
      { name: "Reports Export", endpoint: "/reports/export" },
    ];

    for (const test of exportTests) {
      try {
        await axios.get(`${API_BASE}${test.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`✅ ${test.name}: Available`);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ ${test.name}: Not found`);
        } else {
          console.log(
            `❓ ${test.name}: ${
              error.response?.data?.message || "Unknown error"
            }`
          );
        }
      }
    }

    console.log("\n💡 Frontend Export Testing:");
    console.log("   1. Login to frontend at http://localhost:5173");
    console.log("   2. Navigate to Billing section");
    console.log("   3. Look for Export/Download buttons in:");
    console.log("      - Project billing view");
    console.log("      - Task billing view");
    console.log("      - Summary sections");
    console.log("   4. Test CSV/Excel export if available");
  } catch (error) {
    console.log("❌ Export test failed:", error.message);
  }
}

// Main execution
async function main() {
  console.log("🚀 TIMESHEET DATA SEEDING & BILLING EXPORT TEST\n");
  console.log("=".repeat(50));

  const token = await loginAdmin();
  if (!token) {
    console.log("❌ Cannot proceed without admin token");
    return;
  }

  // Seed focused timesheet data
  await seedTimesheetData(token);

  // Test billing views with new data
  await testBillingWithData(token);

  // Test export functionality
  await testExportFunctionality(token);

  // Final summary
  console.log("\n🎯 TESTING SUMMARY");
  console.log("=".repeat(50));
  console.log("✅ Timesheet data seeded with realistic hours and amounts");
  console.log("✅ Project and Task billing views tested");
  console.log("✅ Export functionality checked");
  console.log("\n📱 Next Steps:");
  console.log("1. Open http://localhost:5173 in browser");
  console.log("2. Login with admin@company.com / admin123");
  console.log("3. Navigate to Billing section");
  console.log("4. Verify data shows realistic hours and amounts");
  console.log("5. Test export/download features in the UI");

  console.log("\n🎉 Ready for comprehensive billing testing with real data!");
}

main();
