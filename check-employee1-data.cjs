const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function checkEmployee1Data() {
  console.log("🔍 CHECKING EMPLOYEE1 DATA SPECIFICALLY\n");

  try {
    // Login as admin to check data
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // 1. Verify employee1 exists
    console.log("👤 CHECKING EMPLOYEE1:");
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const employee1 = usersResponse.data.users.find(
      (u) => u.email === "employee1@company.com"
    );

    if (!employee1) {
      console.log("❌ Employee1 not found!");
      return;
    }

    console.log(
      `✅ Found employee1: ${employee1.full_name} (ID: ${employee1.id})`
    );
    console.log(`   Role: ${employee1.role}, Active: ${!employee1.deleted_at}`);

    // 2. Check timesheets for employee1
    console.log("\n📋 CHECKING EMPLOYEE1 TIMESHEETS:");
    const allTimesheetsResponse = await axios.get(
      `${API_BASE}/timesheets?limit=50`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const allTimesheets = allTimesheetsResponse.data.data || [];
    console.log(`Total timesheets in system: ${allTimesheets.length}`);

    // Filter timesheets for employee1 (by user_id)
    const employee1Timesheets = allTimesheets.filter(
      (ts) => ts.user_id?._id === employee1.id || ts.user_id === employee1.id
    );

    console.log(`Employee1's timesheets: ${employee1Timesheets.length}`);

    if (employee1Timesheets.length > 0) {
      console.log("\nEmployee1 timesheets:");
      employee1Timesheets.forEach((ts, index) => {
        console.log(
          `  ${index + 1}. Week: ${
            ts.week_start_date?.split("T")[0]
          } - Status: ${ts.status} - Hours: ${ts.total_hours} - ID: ${ts._id}`
        );
      });

      // Check for frozen/approved timesheets
      const approvedTimesheets = employee1Timesheets.filter((ts) =>
        [
          "frozen",
          "approved",
          "manager_approved",
          "management_approved",
        ].includes(ts.status)
      );

      console.log(
        `\n📊 Approved/Frozen timesheets for employee1: ${approvedTimesheets.length}`
      );

      if (approvedTimesheets.length > 0) {
        console.log("Approved timesheets:");
        approvedTimesheets.forEach((ts, index) => {
          console.log(
            `  ${index + 1}. Week: ${
              ts.week_start_date?.split("T")[0]
            } - Status: ${ts.status} - Hours: ${ts.total_hours} - ID: ${ts._id}`
          );
        });

        // 3. Try to get details of one approved timesheet to see if it has entries
        const sampleTimesheet = approvedTimesheets[0];
        console.log(
          `\n📝 CHECKING TIMESHEET DETAILS FOR: ${sampleTimesheet._id}`
        );

        try {
          const timesheetDetails = await axios.get(
            `${API_BASE}/timesheets/${sampleTimesheet._id}`,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );

          const timesheet = timesheetDetails.data.timesheet;
          console.log("✅ Got timesheet details");
          console.log(`User: ${timesheet.user_id?.full_name || "Unknown"}`);
          console.log(`Status: ${timesheet.status}`);
          console.log(`Total Hours: ${timesheet.total_hours}`);

          if (timesheet.entries && timesheet.entries.length > 0) {
            console.log(
              `\n📋 Found ${timesheet.entries.length} entries in timesheet:`
            );
            timesheet.entries.slice(0, 5).forEach((entry, index) => {
              console.log(
                `  ${index + 1}. Date: ${entry.date?.split("T")[0]} - Hours: ${
                  entry.hours
                } - Project: ${entry.project_id} - Billable: ${
                  entry.is_billable
                }`
              );
            });

            // Check if entries have valid project IDs
            const entriesWithProjects = timesheet.entries.filter(
              (e) => e.project_id
            );
            console.log(
              `\n🔗 Entries with project IDs: ${entriesWithProjects.length}`
            );

            if (entriesWithProjects.length > 0) {
              console.log("✅ DATA READY FOR BILLING TEST");

              // Test billing with this data
              console.log("\n💰 TESTING BILLING WITH EMPLOYEE1 DATA:");

              // Use a date range that includes this timesheet
              const timesheetDate = new Date(sampleTimesheet.week_start_date);
              const startDate = new Date(timesheetDate);
              startDate.setDate(startDate.getDate() - 30);
              const endDate = new Date(timesheetDate);
              endDate.setDate(endDate.getDate() + 30);

              const startStr = startDate.toISOString().split("T")[0];
              const endStr = endDate.toISOString().split("T")[0];

              console.log(`Using date range: ${startStr} to ${endStr}`);

              try {
                const billingResponse = await axios.get(
                  `${API_BASE}/project-billing/projects?startDate=${startStr}&endDate=${endStr}`,
                  {
                    headers: { Authorization: `Bearer ${adminToken}` },
                  }
                );

                console.log("\n✅ Project Billing Results:");
                console.log(
                  `Projects: ${billingResponse.data.data.projects?.length || 0}`
                );
                console.log(
                  `Total Hours: ${
                    billingResponse.data.data.summary?.total_hours || 0
                  }`
                );
                console.log(
                  `Billable Hours: ${
                    billingResponse.data.data.summary?.total_billable_hours || 0
                  }`
                );
                console.log(
                  `Total Amount: $${
                    billingResponse.data.data.summary?.total_amount || 0
                  }`
                );

                if (billingResponse.data.data.projects?.length > 0) {
                  console.log("\nProject details:");
                  billingResponse.data.data.projects.forEach((project) => {
                    if (project.total_hours > 0) {
                      console.log(
                        `- ${project.project_name}: ${project.total_hours}h, $${project.total_amount}`
                      );
                      if (project.resources?.length > 0) {
                        project.resources.forEach((resource) => {
                          console.log(
                            `  └─ ${resource.user_name}: ${resource.total_hours}h, $${resource.total_amount}`
                          );
                        });
                      }
                    }
                  });
                } else {
                  console.log(
                    "❌ No billing data found - aggregation may have issues"
                  );
                }
              } catch (billingError) {
                console.log(
                  "❌ Billing test failed:",
                  billingError.response?.data || billingError.message
                );
              }

              // Also test task billing
              try {
                const taskBillingResponse = await axios.get(
                  `${API_BASE}/project-billing/tasks?startDate=${startStr}&endDate=${endStr}`,
                  {
                    headers: { Authorization: `Bearer ${adminToken}` },
                  }
                );

                console.log("\n✅ Task Billing Results:");
                console.log(
                  `Tasks: ${taskBillingResponse.data.data.tasks?.length || 0}`
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
              } catch (taskBillingError) {
                console.log(
                  "❌ Task billing test failed:",
                  taskBillingError.response?.data || taskBillingError.message
                );
              }
            } else {
              console.log(
                "❌ No entries have project IDs - need to seed project associations"
              );
            }
          } else {
            console.log("❌ No entries found in timesheet");
          }
        } catch (detailError) {
          console.log(
            "❌ Cannot get timesheet details:",
            detailError.response?.data || detailError.message
          );
        }
      } else {
        console.log("❌ No approved/frozen timesheets found for employee1");
        console.log(
          "💡 Need to approve some timesheets or create new frozen ones"
        );
      }
    } else {
      console.log("❌ No timesheets found for employee1");
      console.log("💡 Need to create timesheets for employee1");
    }
  } catch (error) {
    console.error("❌ Check failed:", error.response?.data || error.message);
  }
}

checkEmployee1Data();
