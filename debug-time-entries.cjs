const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugTimeEntries() {
  console.log("🔍 DEBUG: Time Entries vs Timesheets Data Model\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Test the correct billing endpoint
    console.log("🔧 TESTING CORRECT BILLING ENDPOINT:");
    try {
      const billingTest = await axios.get(
        `${API_BASE}/project-billing/projects?start_date=2024-10-01&end_date=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Project billing endpoint response:");
      console.log(`Projects: ${billingTest.data.projects?.length || 0}`);
      console.log(`Total Hours: ${billingTest.data.summary?.totalHours || 0}`);
      console.log(
        `Billable Hours: ${billingTest.data.summary?.billableHours || 0}`
      );
      console.log(
        `Total Amount: ${billingTest.data.summary?.totalAmount || 0}`
      );

      if (billingTest.data.projects && billingTest.data.projects.length > 0) {
        console.log("\n📊 First project billing:");
        const firstProject = billingTest.data.projects[0];
        console.log(`Project: ${firstProject.project_name}`);
        console.log(`Hours: ${firstProject.total_hours}`);
        console.log(`Amount: ${firstProject.total_amount}`);

        if (firstProject.resources && firstProject.resources.length > 0) {
          console.log("\n👤 First resource:");
          const firstResource = firstProject.resources[0];
          console.log(`User: ${firstResource.user_name}`);
          console.log(`Hours: ${firstResource.total_hours}`);
          console.log(`Amount: ${firstResource.total_amount}`);
        }
      } else {
        console.log("\n❌ No projects found in billing response");
        console.log(
          "Full response:",
          JSON.stringify(billingTest.data, null, 2)
        );
      }
    } catch (billingError) {
      console.log(
        "❌ Project billing endpoint error:",
        billingError.response?.status
      );
      console.log(
        "Error details:",
        billingError.response?.data || billingError.message
      );
    }

    // Also test task billing
    console.log("\n\n🔧 TESTING TASK BILLING ENDPOINT:");
    try {
      const taskBillingTest = await axios.get(
        `${API_BASE}/project-billing/tasks?start_date=2024-10-01&end_date=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Task billing endpoint response:");
      console.log(`Tasks: ${taskBillingTest.data.tasks?.length || 0}`);
      console.log(
        `Total Hours: ${taskBillingTest.data.summary?.totalHours || 0}`
      );
      console.log(
        `Total Amount: ${taskBillingTest.data.summary?.totalAmount || 0}`
      );
    } catch (taskBillingError) {
      console.log(
        "❌ Task billing endpoint error:",
        taskBillingError.response?.status
      );
      console.log(
        "Error details:",
        taskBillingError.response?.data || taskBillingError.message
      );
    }

    // Get some timesheets to see their structure with populated data
    console.log("\n\n📋 ANALYZING TIMESHEET STRUCTURE:");
    const timesheets = await axios.get(
      `${API_BASE}/timesheets?populate=user_id&limit=2`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const approvedTimesheets = timesheets.data.data.filter((t) =>
      [
        "frozen",
        "approved",
        "manager_approved",
        "management_approved",
      ].includes(t.status)
    );

    if (approvedTimesheets.length > 0) {
      const sample = approvedTimesheets[0];
      console.log(`\n📄 Sample approved timesheet:`);
      console.log(`ID: ${sample._id}`);
      console.log(`User: ${sample.user_id?.full_name || "Unknown"}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Hours: ${sample.total_hours}`);
      console.log(`Week: ${sample.week_start_date}`);

      // Now try to find TimeEntry documents for this timesheet
      console.log(
        `\n🔍 Looking for TimeEntry documents for timesheet ${sample._id}...`
      );

      // The TimeEntry model suggests there might be a separate endpoint or they're stored separately
      // Let's check if there's a time-entries endpoint
      try {
        const entries = await axios.get(
          `${API_BASE}/time-entries?timesheet_id=${sample._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log(
          `✅ Found ${entries.data.length || 0} time entries for this timesheet`
        );

        if (entries.data.length > 0) {
          const firstEntry = entries.data[0];
          console.log("\n📝 Sample time entry:");
          console.log(`Date: ${firstEntry.date}`);
          console.log(`Hours: ${firstEntry.hours}`);
          console.log(`Project ID: ${firstEntry.project_id}`);
          console.log(`Task ID: ${firstEntry.task_id}`);
          console.log(`Billable: ${firstEntry.is_billable}`);
          console.log(`Entry type: ${firstEntry.entry_type}`);
        }
      } catch (entriesError) {
        console.log(
          `❌ Cannot get time entries: ${entriesError.response?.status} - ${
            entriesError.response?.data?.message || entriesError.message
          }`
        );

        // Try alternative endpoints
        console.log("\n🔄 Trying alternative time entry endpoints...");

        const endpoints = [
          "timeentries",
          "entries",
          "time-entry",
          "timesheet-entries",
        ];

        for (const endpoint of endpoints) {
          try {
            const alt = await axios.get(`${API_BASE}/${endpoint}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log(
              `✅ Found endpoint /${endpoint} with ${
                alt.data.length || 0
              } items`
            );
            break;
          } catch (e) {
            console.log(`❌ /${endpoint} not found`);
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugTimeEntries();
