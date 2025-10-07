const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugTimesheetProjectLinks() {
  console.log("🔍 DEBUG: Timesheet-Project Linking Issue\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Get timesheets with valid users
    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const validTimesheets = timesheets.data.data.filter(
      (t) => t.user_id && t.total_hours > 0
    );
    console.log(`📊 Valid timesheets found: ${validTimesheets.length}`);

    if (validTimesheets.length > 0) {
      const sample = validTimesheets[0];
      console.log(`\n📋 Sample Timesheet:`);
      console.log(
        `User: ${sample.user_id.full_name} (${sample.user_id.email})`
      );
      console.log(`Hours: ${sample.total_hours}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Week: ${sample.week_start_date.split("T")[0]}`);
      console.log(`Frozen: ${sample.is_frozen}`);

      // Try to get entries for this timesheet
      try {
        const details = await axios.get(
          `${API_BASE}/timesheets/${sample._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const entries = details.data.timesheet?.entries || [];
        console.log(`\n📝 Entries in timesheet: ${entries.length}`);

        if (entries.length > 0) {
          console.log("\n📄 Sample entries:");
          entries.slice(0, 3).forEach((entry, index) => {
            console.log(
              `   ${index + 1}. Date: ${entry.date}, Hours: ${entry.hours}`
            );
            console.log(`      Project ID: ${entry.project_id || "NONE"}`);
            console.log(`      Billable: ${entry.is_billable}`);
            console.log(
              `      Description: ${
                entry.description || entry.custom_task_description || "None"
              }`
            );
          });

          // Check if project IDs exist
          const projectIds = entries
            .filter((e) => e.project_id)
            .map((e) => e.project_id);
          console.log(
            `\n🔗 Unique project IDs in entries: ${
              [...new Set(projectIds)].length
            }`
          );
          console.log(
            `Project IDs: ${JSON.stringify([...new Set(projectIds)])}`
          );

          // Get actual projects
          const projects = await axios.get(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const realProjectIds = projects.data.projects.map((p) => p.id);
          console.log(`\n📂 Real project IDs: ${realProjectIds.length}`);
          console.log(`Real IDs: ${JSON.stringify(realProjectIds)}`);

          // Check matches
          const matches = projectIds.filter((id) =>
            realProjectIds.includes(id)
          );
          console.log(`\n🎯 Matching project IDs: ${matches.length}`);

          if (matches.length === 0) {
            console.log(
              "❌ ISSUE: No timesheet entries are linked to existing projects!"
            );
            console.log("   This explains why billing shows $0");

            // Show the mismatches
            console.log("\n🔍 MISMATCH ANALYSIS:");
            console.log("Entry project IDs that don't match real projects:");
            projectIds.forEach((id) => {
              if (!realProjectIds.includes(id)) {
                console.log(`   - ${id} (not found in projects)`);
              }
            });
          } else {
            console.log("✅ Some entries are properly linked to projects");
          }
        } else {
          console.log("❌ No entries found in timesheet");
        }
      } catch (detailError) {
        console.log(
          `❌ Cannot get timesheet details: ${detailError.response?.status} - ${
            detailError.response?.data?.message || detailError.message
          }`
        );
      }
    }

    // Check what status timesheets our query is looking for
    console.log("\n\n🔧 BILLING QUERY ANALYSIS:");
    console.log("Our billing query looks for timesheets with status:");
    console.log("- frozen");
    console.log("- approved");
    console.log("- manager_approved");
    console.log("- management_approved");

    console.log("\nActual timesheet statuses found:");
    const statusCounts = {};
    timesheets.data.data.forEach((ts) => {
      statusCounts[ts.status] = (statusCounts[ts.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      const included = [
        "frozen",
        "approved",
        "manager_approved",
        "management_approved",
      ].includes(status);
      console.log(
        `- ${status}: ${count} (${included ? "INCLUDED" : "EXCLUDED"})`
      );
    });

    console.log("\n💡 POTENTIAL SOLUTIONS:");
    console.log("1. Fix project_id linking in timesheet entries");
    console.log('2. Include more timesheet statuses (like "submitted")');
    console.log(
      "3. Create proper project associations for existing timesheet entries"
    );
    console.log("4. Ensure timesheet entries have correct project references");
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugTimesheetProjectLinks();
