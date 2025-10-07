const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function findRootCause() {
  console.log("🎯 ROOT CAUSE ANALYSIS\n");

  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Issue 1: Many timesheets have user_id: null
    console.log("1. 🚨 CRITICAL ISSUE FOUND: NULL USER IDs\n");

    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const nullUserTimesheets = timesheets.data.data.filter((t) => !t.user_id);
    const validUserTimesheets = timesheets.data.data.filter((t) => t.user_id);

    console.log(
      `❌ Timesheets with NULL user_id: ${nullUserTimesheets.length}`
    );
    console.log(
      `✅ Timesheets with valid user_id: ${validUserTimesheets.length}`
    );

    if (validUserTimesheets.length > 0) {
      console.log("\n✅ Valid timesheets found:");
      validUserTimesheets.forEach((ts) => {
        console.log(
          `   ${ts.user_id.full_name} (${ts.user_id.email}) - ${ts.total_hours}h - ${ts.status}`
        );
      });

      // Try to get details of a valid timesheet
      const validTimesheet = validUserTimesheets[0];
      console.log(`\n🔍 Checking valid timesheet: ${validTimesheet._id}`);

      try {
        const details = await axios.get(
          `${API_BASE}/timesheets/${validTimesheet._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const entries = details.data.timesheet?.entries || [];
        console.log(`📝 Entries in this timesheet: ${entries.length}`);

        if (entries.length > 0) {
          console.log("\n📄 Sample entries:");
          entries.slice(0, 3).forEach((entry, index) => {
            console.log(`   ${index + 1}. ${entry.date}: ${entry.hours}h`);
            console.log(`      Billable: ${entry.is_billable}`);
            console.log(`      Project: ${entry.project_id || "None"}`);
            console.log(
              `      Description: ${
                entry.description || entry.custom_task_description || "None"
              }`
            );
          });

          // Check if entries are linked to real projects
          const projects = await axios.get(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const projectIds = projects.data.projects.map((p) => p.id);
          const linkedEntries = entries.filter(
            (entry) => entry.project_id && projectIds.includes(entry.project_id)
          );

          console.log(
            `\n🔗 Entries linked to real projects: ${linkedEntries.length}/${entries.length}`
          );

          if (linkedEntries.length === 0) {
            console.log(
              "❌ ISSUE: No timesheet entries are linked to actual projects!"
            );
            console.log("   This explains why project billing shows $0");

            // Show what project IDs are in entries vs what's available
            const entryProjectIds = entries
              .filter((e) => e.project_id)
              .map((e) => e.project_id);
            console.log(
              "\n📋 Project IDs in timesheet entries:",
              entryProjectIds
            );
            console.log("📋 Actual project IDs:", projectIds);
          }
        }
      } catch (detailError) {
        console.log(
          `❌ Could not get timesheet details: ${
            detailError.response?.data?.message || detailError.message
          }`
        );
      }
    }

    // Issue 2: Check if billing service is looking at the right data
    console.log("\n\n2. 🔍 CHECKING BILLING SERVICE LOGIC\n");

    // Let's check what the project billing service actually queries
    console.log("Testing different approaches to get billing data...");

    // Try to understand what makes the task billing work vs project billing
    const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Task billing works and returns:");
    console.log(`- ${taskBilling.data.data.summary.total_tasks} tasks`);
    console.log(`- ${taskBilling.data.data.summary.total_hours} hours`);
    console.log(`- $${taskBilling.data.data.summary.total_amount} amount`);

    if (taskBilling.data.data.tasks.length > 0) {
      const sampleTask = taskBilling.data.data.tasks[0];
      console.log("\nSample task structure:");
      console.log(JSON.stringify(sampleTask, null, 2));
    }

    // Issue 3: Check the billing calculation logic by looking at backend
    console.log("\n\n3. 💡 SOLUTION RECOMMENDATIONS\n");
    console.log("Based on the analysis, here are the issues:");
    console.log("\n❌ PRIMARY ISSUES:");
    console.log(
      `1. ${nullUserTimesheets.length} timesheets have NULL user_id (data integrity issue)`
    );
    console.log("2. Timesheet entries may not be properly linked to projects");
    console.log(
      "3. Project billing logic may be filtering out the available data"
    );
    console.log("4. Task billing shows sample data, not real timesheet data");

    console.log("\n✅ SOLUTIONS:");
    console.log(
      "1. Fix NULL user_id timesheets by linking them to proper users"
    );
    console.log("2. Ensure timesheet entries reference correct project IDs");
    console.log("3. Verify billing date ranges match timesheet dates");
    console.log("4. Check billing service status/billable filtering logic");
  } catch (error) {
    console.error(
      "❌ Root cause analysis failed:",
      error.response?.data || error.message
    );
  }
}

findRootCause();
