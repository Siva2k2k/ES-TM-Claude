const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function investigateBillingDataIssue() {
  console.log("🔍 INVESTIGATING BILLING DATA DISPLAY ISSUE\n");
  console.log("=".repeat(60));

  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // 1. Check timesheet data structure
    console.log("1. 📊 Checking Timesheet Data Structure...\n");

    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Found ${timesheets.data.data.length} timesheets`);

    // Look at a few specific timesheets with data
    const timesheetsWithData = timesheets.data.data.filter(
      (t) => t.total_hours > 0
    );
    console.log(`Timesheets with hours: ${timesheetsWithData.length}`);

    if (timesheetsWithData.length > 0) {
      const sampleTimesheet = timesheetsWithData[0];
      console.log("\n📋 Sample Timesheet:");
      console.log(`ID: ${sampleTimesheet._id}`);
      console.log(
        `User: ${sampleTimesheet.user_id?.full_name || "NULL"} (${
          sampleTimesheet.user_id?.email || "No Email"
        })`
      );
      console.log(`Week: ${sampleTimesheet.week_start_date.split("T")[0]}`);
      console.log(`Hours: ${sampleTimesheet.total_hours}`);
      console.log(`Status: ${sampleTimesheet.status}`);
      console.log(`Frozen: ${sampleTimesheet.is_frozen}`);

      // Try to get entries for this timesheet
      try {
        const entries = await axios.get(
          `${API_BASE}/timesheets/${sampleTimesheet._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log(
          `\n📝 Timesheet entries found: ${
            entries.data.timesheet?.entries?.length || 0
          }`
        );

        if (entries.data.timesheet?.entries?.length > 0) {
          const sampleEntry = entries.data.timesheet.entries[0];
          console.log("\n📄 Sample Entry:");
          console.log(`Date: ${sampleEntry.date}`);
          console.log(`Hours: ${sampleEntry.hours}`);
          console.log(`Billable: ${sampleEntry.is_billable}`);
          console.log(`Project ID: ${sampleEntry.project_id || "None"}`);
          console.log(`Task ID: ${sampleEntry.task_id || "None"}`);
          console.log(
            `Description: ${
              sampleEntry.description ||
              sampleEntry.custom_task_description ||
              "None"
            }`
          );
        }
      } catch (entryError) {
        console.log(
          `❌ Failed to get entries: ${
            entryError.response?.data?.message || entryError.message
          }`
        );
      }
    }

    // 2. Check project billing logic
    console.log("\n\n2. 🏗️ Testing Project Billing Logic...\n");

    try {
      // Test with different date ranges
      const dateRanges = [
        { start: "2024-01-01", end: "2024-12-31", label: "2024 Full Year" },
        { start: "2025-08-01", end: "2025-10-31", label: "2025 Recent Months" },
        {
          start: "2025-09-01",
          end: "2025-10-06",
          label: "2025 September-October",
        },
      ];

      for (const range of dateRanges) {
        console.log(
          `\n📅 Testing date range: ${range.label} (${range.start} to ${range.end})`
        );

        const projectBilling = await axios.get(
          `${API_BASE}/project-billing/projects?startDate=${range.start}&endDate=${range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = projectBilling.data.data;
        console.log(`   Projects: ${data.summary.total_projects}`);
        console.log(`   Total Hours: ${data.summary.total_hours}`);
        console.log(`   Billable Hours: ${data.summary.total_billable_hours}`);
        console.log(`   Total Amount: $${data.summary.total_amount}`);

        // Check individual projects
        data.projects.forEach((project, index) => {
          if (project.total_hours > 0) {
            console.log(
              `   ${index + 1}. ${project.project_name}: ${
                project.total_hours
              }h, $${project.total_amount}`
            );
          }
        });
      }
    } catch (projectError) {
      console.log(
        `❌ Project billing failed: ${
          projectError.response?.data?.message || projectError.message
        }`
      );
    }

    // 3. Check task billing
    console.log("\n\n3. 📋 Testing Task Billing...\n");

    try {
      const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const taskData = taskBilling.data.data;
      console.log(`Tasks found: ${taskData.summary.total_tasks}`);
      console.log(`Total Hours: ${taskData.summary.total_hours}`);
      console.log(`Total Amount: $${taskData.summary.total_amount}`);

      if (taskData.tasks && taskData.tasks.length > 0) {
        taskData.tasks.forEach((task, index) => {
          console.log(`${index + 1}. ${task.task_name || task.task_id}`);
          console.log(`   Project: ${task.project_name || "N/A"}`);
          console.log(
            `   Hours: ${task.total_hours} | Amount: $${task.total_amount || 0}`
          );
        });
      }
    } catch (taskError) {
      console.log(
        `❌ Task billing failed: ${
          taskError.response?.data?.message || taskError.message
        }`
      );
    }

    // 4. Check if timesheet entries have proper project links
    console.log("\n\n4. 🔗 Checking Project-Timesheet Links...\n");

    const projects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Available projects: ${projects.data.projects?.length || 0}`);

    if (projects.data.projects?.length > 0) {
      projects.data.projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
      });

      // Check if any timesheet entries reference these projects
      let linkedEntries = 0;
      for (const timesheet of timesheetsWithData.slice(0, 5)) {
        // Check first 5
        try {
          const details = await axios.get(
            `${API_BASE}/timesheets/${timesheet._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (details.data.timesheet?.entries) {
            const projectLinked = details.data.timesheet.entries.filter(
              (entry) =>
                entry.project_id &&
                projects.data.projects.some((p) => p.id === entry.project_id)
            );
            linkedEntries += projectLinked.length;
          }
        } catch (detailError) {
          console.log(
            `   ⚠️  Could not get details for timesheet ${timesheet._id}`
          );
        }
      }

      console.log(`\nTimesheet entries linked to projects: ${linkedEntries}`);
    }

    // 5. Summary and diagnosis
    console.log("\n\n5. 🎯 DIAGNOSIS SUMMARY\n");
    console.log("=".repeat(40));

    if (timesheetsWithData.length === 0) {
      console.log("❌ ISSUE: No timesheets with hours found");
      console.log("   All timesheets appear to have 0 hours");
    } else {
      console.log(
        `✅ Found ${timesheetsWithData.length} timesheets with hours`
      );
    }

    console.log("\n🔍 POSSIBLE ISSUES:");
    console.log(
      "1. Date range mismatch (timesheet dates vs billing query dates)"
    );
    console.log(
      "2. Project linking missing (timesheet entries not linked to projects)"
    );
    console.log(
      "3. Status filtering (only certain statuses included in billing)"
    );
    console.log("4. Billable flag issues (entries not marked as billable)");
    console.log(
      "5. User permissions (billing only showing data for certain users)"
    );

    console.log("\n💡 RECOMMENDATIONS:");
    console.log("- Check timesheet entry project_id mappings");
    console.log("- Verify date ranges match timesheet data");
    console.log("- Confirm billable status on timesheet entries");
    console.log("- Review billing calculation logic in backend");
  } catch (error) {
    console.error(
      "❌ Investigation failed:",
      error.response?.data || error.message
    );
  }
}

investigateBillingDataIssue();
