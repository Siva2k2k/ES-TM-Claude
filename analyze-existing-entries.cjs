const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function analyzeExistingTimeEntries() {
  console.log("🔍 ANALYZING EXISTING TIME ENTRIES FOR BILLING\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get employee1 ID
    console.log("👤 Getting employee1 info...");
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const employee1 = usersResponse.data.users.find(
      (u) => u.email === "employee1@company.com"
    );
    console.log(`✅ Employee1 ID: ${employee1.id}`);

    // Get employee1's timesheets
    console.log("\n📋 Getting employee1 timesheets...");
    const timesheetsResponse = await axios.get(
      `${API_BASE}/timesheets?limit=50`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const allTimesheets = timesheetsResponse.data.data || [];
    const employee1Timesheets = allTimesheets.filter(
      (ts) => ts.user_id?._id === employee1.id || ts.user_id === employee1.id
    );

    console.log(`Found ${employee1Timesheets.length} timesheets for employee1`);

    // Find approved/frozen timesheets
    const approvedTimesheets = employee1Timesheets.filter((ts) =>
      [
        "frozen",
        "approved",
        "manager_approved",
        "management_approved",
      ].includes(ts.status)
    );

    console.log(`Approved/frozen timesheets: ${approvedTimesheets.length}`);

    if (approvedTimesheets.length > 0) {
      // Get entries for each approved timesheet
      console.log("\n📝 Checking entries in approved timesheets:");

      let totalEntriesFound = 0;
      let entriesWithProjects = 0;

      for (let i = 0; i < Math.min(3, approvedTimesheets.length); i++) {
        const timesheet = approvedTimesheets[i];
        console.log(
          `\n📄 Timesheet ${i + 1}: Week ${
            timesheet.week_start_date?.split("T")[0]
          } (${timesheet.status})`
        );

        try {
          const entriesResponse = await axios.get(
            `${API_BASE}/timesheets/${timesheet._id}/entries`,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );

          const entries = entriesResponse.data.entries || [];
          console.log(`  Found ${entries.length} entries`);
          totalEntriesFound += entries.length;

          if (entries.length > 0) {
            console.log("  Sample entries:");
            entries.slice(0, 3).forEach((entry, idx) => {
              const hasProject = !!entry.project_id;
              if (hasProject) entriesWithProjects++;

              console.log(
                `    ${idx + 1}. Date: ${entry.date?.split("T")[0]} - Hours: ${
                  entry.hours
                } - Project: ${entry.project_id || "NONE"} - Billable: ${
                  entry.is_billable
                }`
              );
            });
          }
        } catch (entriesError) {
          console.log(
            `  ❌ Cannot get entries: ${
              entriesError.response?.data?.message || entriesError.message
            }`
          );
        }
      }

      console.log(`\n📊 SUMMARY:`);
      console.log(`Total entries found: ${totalEntriesFound}`);
      console.log(`Entries with project IDs: ${entriesWithProjects}`);

      if (entriesWithProjects > 0) {
        console.log(
          "\n✅ Found entries with project associations - should show in billing"
        );

        // Test billing with a wide date range
        const startDate = "2024-09-01";
        const endDate = "2024-12-31";

        console.log(
          `\n💰 Testing billing for date range: ${startDate} to ${endDate}`
        );

        try {
          const billingResponse = await axios.get(
            `${API_BASE}/project-billing/projects?startDate=${startDate}&endDate=${endDate}`,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );

          console.log("\n✅ PROJECT BILLING RESULTS:");
          const data = billingResponse.data.data;
          console.log(
            `Projects with data: ${
              data.projects?.filter((p) => p.total_hours > 0).length || 0
            }/${data.projects?.length || 0}`
          );
          console.log(`Total Hours: ${data.summary?.total_hours || 0}`);
          console.log(
            `Billable Hours: ${data.summary?.total_billable_hours || 0}`
          );
          console.log(`Total Amount: $${data.summary?.total_amount || 0}`);

          if (data.projects?.length > 0) {
            console.log("\nProject breakdown:");
            data.projects.forEach((project) => {
              if (project.total_hours > 0) {
                console.log(`📊 ${project.project_name}:`);
                console.log(
                  `   Hours: ${project.total_hours} (${project.billable_hours} billable)`
                );
                console.log(`   Amount: $${project.total_amount}`);
                console.log(`   Resources: ${project.resources?.length || 0}`);

                if (project.resources?.length > 0) {
                  project.resources.forEach((resource) => {
                    console.log(
                      `   └─ ${resource.user_name}: ${resource.total_hours}h = $${resource.total_amount}`
                    );
                  });
                }
              } else {
                console.log(`❌ ${project.project_name}: No data (0 hours)`);
              }
            });

            if (data.summary?.total_hours > 0) {
              console.log("\n🎉 SUCCESS: Billing aggregation is working!");
            } else {
              console.log(
                "\n❌ ISSUE: Projects exist but aggregation returns 0 hours"
              );
            }
          }
        } catch (billingError) {
          console.log(
            "❌ Billing test failed:",
            billingError.response?.data || billingError.message
          );
        }
      } else {
        console.log(
          "\n❌ No entries have project IDs - this explains why billing shows $0"
        );
        console.log("💡 Need to either:");
        console.log("   1. Add project_id to existing entries");
        console.log("   2. Create new entries with valid project associations");
      }
    } else {
      console.log("\n❌ No approved/frozen timesheets found");
      console.log("💡 Need to approve or freeze some timesheets first");
    }
  } catch (error) {
    console.error("❌ Analysis failed:", error.response?.data || error.message);
  }
}

analyzeExistingTimeEntries();
