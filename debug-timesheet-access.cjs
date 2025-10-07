const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugTimesheetAccess() {
  console.log("🔍 DEBUG: Timesheet Access & Entry Structure\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Get timesheets
    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Find approved/frozen timesheets
    const approvedTimesheets = timesheets.data.data.filter((t) =>
      [
        "frozen",
        "approved",
        "manager_approved",
        "management_approved",
      ].includes(t.status)
    );

    console.log(`📊 Approved/Frozen timesheets: ${approvedTimesheets.length}`);

    if (approvedTimesheets.length > 0) {
      const sample = approvedTimesheets[0];
      console.log(`\n📋 Sample Approved Timesheet:`);
      console.log(`ID: ${sample._id}`);
      console.log(
        `User: ${sample.user_id?.full_name || "No Name"} (${
          sample.user_id?.email || "No Email"
        })`
      );
      console.log(`Hours: ${sample.total_hours}`);
      console.log(`Status: ${sample.status}`);
      console.log(
        `Week: ${sample.week_start_date?.split("T")[0] || "No Date"}`
      );

      // Check if entries are embedded in the response
      if (sample.entries) {
        console.log(
          `\n📝 Entries embedded in timesheet: ${sample.entries.length}`
        );

        if (sample.entries.length > 0) {
          console.log("\n📄 Sample entries:");
          sample.entries.slice(0, 3).forEach((entry, index) => {
            console.log(`   ${index + 1}. Date: ${entry.date}`);
            console.log(
              `      Hours: ${entry.hours || entry.total_hours || "No hours"}`
            );
            console.log(
              `      Project ID: ${entry.project_id || entry.project || "NONE"}`
            );
            console.log(
              `      Task ID: ${entry.task_id || entry.task || "NONE"}`
            );
            console.log(`      Billable: ${entry.is_billable}`);
            console.log(
              `      Description: ${
                entry.description || entry.custom_task_description || "None"
              }`
            );
          });

          // Analyze project IDs
          const projectIds = sample.entries
            .filter((e) => e.project_id || e.project)
            .map((e) => e.project_id || e.project);

          console.log(
            `\n🔗 Project IDs in entries: ${[...new Set(projectIds)].length}`
          );
          console.log(
            `Project IDs: ${JSON.stringify([...new Set(projectIds)])}`
          );

          // Get actual projects for comparison
          const projects = await axios.get(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log(
            `\n📂 Available projects: ${projects.data.projects.length}`
          );
          projects.data.projects.slice(0, 3).forEach((project, index) => {
            console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
          });

          // Check if entries have ObjectId format project IDs
          const entryProjectIds = [...new Set(projectIds)];
          const realProjectIds = projects.data.projects.map((p) => p.id);

          console.log(`\n🎯 Project ID matching:`);
          entryProjectIds.forEach((entryId) => {
            const match = realProjectIds.includes(entryId);
            console.log(
              `   ${entryId} → ${match ? "✅ MATCH" : "❌ NO MATCH"}`
            );
          });

          // Check billable hours calculation
          const billableEntries = sample.entries.filter((e) => e.is_billable);
          const totalBillableHours = billableEntries.reduce((sum, entry) => {
            return sum + (entry.hours || entry.total_hours || 0);
          }, 0);

          console.log(`\n💰 Billing calculation:`);
          console.log(`   Total entries: ${sample.entries.length}`);
          console.log(`   Billable entries: ${billableEntries.length}`);
          console.log(`   Total billable hours: ${totalBillableHours}`);

          if (totalBillableHours > 0) {
            console.log("✅ This timesheet should generate billing data!");
          } else {
            console.log("❌ No billable hours found");
          }
        }
      } else {
        console.log("\n❌ No entries field in timesheet response");
        console.log("Available fields:", Object.keys(sample));
      }
    }

    // Test the billing endpoint directly with a specific date
    console.log("\n\n🔧 TESTING BILLING ENDPOINT:");

    try {
      const billingTest = await axios.get(
        `${API_BASE}/billing/projects?start_date=2024-10-01&end_date=2024-11-30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Billing endpoint response:");
      console.log(`Projects: ${billingTest.data.projects?.length || 0}`);
      console.log(`Total Hours: ${billingTest.data.summary?.totalHours || 0}`);
      console.log(
        `Billable Hours: ${billingTest.data.summary?.billableHours || 0}`
      );
      console.log(
        `Total Amount: ${billingTest.data.summary?.totalAmount || 0}`
      );

      if (billingTest.data.projects && billingTest.data.projects.length > 0) {
        console.log(
          "\nFirst project:",
          JSON.stringify(billingTest.data.projects[0], null, 2)
        );
      }
    } catch (billingError) {
      console.log(
        "❌ Billing endpoint error:",
        billingError.response?.data || billingError.message
      );
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugTimesheetAccess();
