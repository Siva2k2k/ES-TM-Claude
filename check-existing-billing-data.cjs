const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function checkExistingTimesheets() {
  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Get all timesheets
    console.log("📊 Checking existing timesheets...\n");

    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Total timesheets found:", timesheets.data.timesheets.length);

    let totalHours = 0;
    let totalBillableAmount = 0;

    timesheets.data.timesheets.forEach((timesheet, index) => {
      console.log(`\n${index + 1}. Timesheet ID: ${timesheet.id}`);
      console.log(
        `   User: ${timesheet.user_id.full_name} (${timesheet.user_id.email})`
      );
      console.log(`   Week: ${timesheet.week_start_date.split("T")[0]}`);
      console.log(`   Status: ${timesheet.status}`);
      console.log(`   Entries: ${timesheet.entries.length}`);

      let timesheetHours = 0;
      let timesheetAmount = 0;

      timesheet.entries.forEach((entry) => {
        timesheetHours += entry.hours;
        if (entry.is_billable) {
          // Estimate billing amount (we don't have rates in entries, so using average)
          const estimatedRate = 75; // Average rate
          timesheetAmount += entry.hours * estimatedRate;
        }
      });

      totalHours += timesheetHours;
      totalBillableAmount += timesheetAmount;

      console.log(`   Total Hours: ${timesheetHours}`);
      console.log(`   Estimated Amount: $${timesheetAmount.toFixed(2)}`);
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Hours: ${totalHours}`);
    console.log(`Estimated Total Amount: $${totalBillableAmount.toFixed(2)}`);

    // Now test the billing views
    console.log("\n🔍 Testing Billing Views...\n");

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

    console.log("\n   📋 Project Breakdown:");
    projectData.projects.forEach((project, index) => {
      console.log(
        `   ${index + 1}. ${project.project_name} (${project.client_name})`
      );
      console.log(
        `      Hours: ${project.total_hours} | Billable: ${project.billable_hours} | Amount: $${project.total_amount}`
      );

      if (project.resources && project.resources.length > 0) {
        console.log(`      Resources:`);
        project.resources.forEach((resource) => {
          console.log(
            `        - ${resource.user_name}: ${resource.hours}h, $${resource.amount}`
          );
        });
      }
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

    if (taskData.tasks && taskData.tasks.length > 0) {
      console.log("\n   📋 Task Breakdown:");
      taskData.tasks.forEach((task, index) => {
        console.log(
          `   ${index + 1}. ${task.task_name || "Task " + task.task_id}`
        );
        console.log(`      Project: ${task.project_name}`);
        console.log(
          `      Hours: ${task.total_hours} | Billable: ${
            task.billable_hours
          } | Amount: $${task.total_amount || 0}`
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
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

checkExistingTimesheets();
