const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testAllThreeIssues() {
  console.log("🔧 TESTING ALL THREE ISSUES AFTER FIXES\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // 1. TEST USER NAME FIX
    console.log("👤 ISSUE 1: Testing User Name Display...");

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const data = billingResponse.data.data;
      const websiteProject = data.projects?.find((p) => p.total_hours > 0);

      if (websiteProject && websiteProject.resources?.length > 0) {
        const resource = websiteProject.resources[0];
        console.log(`✅ User Name: "${resource.user_name}"`);

        if (
          resource.user_name &&
          resource.user_name !== "undefined undefined"
        ) {
          console.log(
            "🎉 ISSUE 1 FIXED: User name is now displaying correctly!"
          );
        } else {
          console.log("❌ ISSUE 1 STILL EXISTS: User name is still undefined");
        }
      } else {
        console.log("❌ No resource data found to check user name");
      }
    } catch (error) {
      console.log(
        "❌ User name test failed:",
        error.response?.data || error.message
      );
    }

    // 2. TEST BILLABLE HOURS EDITING
    console.log("\n✏️ ISSUE 2: Testing Billable Hours Editing...");

    try {
      // First, let's check what the updateBillableHours endpoint expects
      console.log("📋 Checking billable hours update endpoint...");

      // We need to find a timesheet entry to test with
      const timesheetsResponse = await axios.get(
        `${API_BASE}/timesheets?limit=10`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const employee1Timesheet = timesheetsResponse.data.data.find(
        (ts) =>
          ts.user_id?._id === "68df77ec2ba674aa3c8cd2bd" ||
          ts.user_id === "68df77ec2ba674aa3c8cd2bd"
      );

      if (employee1Timesheet) {
        console.log(`Found timesheet: ${employee1Timesheet._id}`);

        // Try to get entries for this timesheet
        try {
          const entriesResponse = await axios.get(
            `${API_BASE}/timesheets/${employee1Timesheet._id}/entries`,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );

          const entries = entriesResponse.data.entries || [];
          console.log(`Found ${entries.length} entries in timesheet`);

          if (entries.length > 0) {
            const testEntry = entries[0];
            console.log(
              `Testing with entry: ${testEntry._id} (current billable: ${testEntry.is_billable})`
            );

            // Test the PUT endpoint for updating billable hours
            const updateData = {
              time_entry_id: testEntry._id,
              is_billable: !testEntry.is_billable, // Toggle the billable status
              hours: testEntry.hours,
            };

            try {
              const updateResponse = await axios.put(
                `${API_BASE}/project-billing/billable-hours`,
                updateData,
                {
                  headers: { Authorization: `Bearer ${adminToken}` },
                }
              );

              console.log("✅ Billable hours update successful");
              console.log(
                `Changed from ${
                  testEntry.is_billable
                } to ${!testEntry.is_billable}`
              );
              console.log(
                "🎉 ISSUE 2 FIXED: Billable hours editing is working!"
              );
            } catch (updateError) {
              console.log(
                "❌ Billable hours update failed:",
                updateError.response?.data?.message || updateError.message
              );
              console.log(
                "❌ ISSUE 2 STILL EXISTS: Cannot edit billable hours"
              );
            }
          } else {
            console.log("❌ No entries found to test billable hours editing");
          }
        } catch (entriesError) {
          console.log(
            "❌ Cannot get timesheet entries:",
            entriesError.response?.data?.message || entriesError.message
          );
        }
      } else {
        console.log("❌ No employee1 timesheet found for testing");
      }
    } catch (error) {
      console.log(
        "❌ Billable hours test failed:",
        error.response?.data || error.message
      );
    }

    // 3. TEST DATA EXPORT
    console.log("\n📤 ISSUE 3: Testing Data Export...");

    try {
      // Test the billing export endpoint
      console.log("Testing billing export endpoint...");

      const exportData = {
        start_date: "2024-10-01",
        end_date: "2024-10-31",
        format: "excel", // or 'csv'
        include_projects: true,
        include_resources: true,
      };

      try {
        // Try GET method first
        const exportResponse = await axios.get(
          `${API_BASE}/billing/export?start_date=2024-10-01&end_date=2024-10-31&format=excel`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        console.log("✅ Billing export (GET) successful");
        console.log("Response type:", exportResponse.headers["content-type"]);
        console.log("🎉 ISSUE 3 FIXED: Data export is working!");
      } catch (getError) {
        console.log(
          "❌ GET export failed:",
          getError.response?.data?.message || getError.message
        );

        // Try POST method
        try {
          const postExportResponse = await axios.post(
            `${API_BASE}/billing/export`,
            exportData,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );

          console.log("✅ Billing export (POST) successful");
          console.log(
            "Response type:",
            postExportResponse.headers["content-type"]
          );
          console.log("🎉 ISSUE 3 FIXED: Data export is working!");
        } catch (postError) {
          console.log(
            "❌ POST export failed:",
            postError.response?.data?.message || postError.message
          );
          console.log("❌ ISSUE 3 STILL EXISTS: Cannot export data");
        }
      }
    } catch (error) {
      console.log(
        "❌ Export test failed:",
        error.response?.data || error.message
      );
    }

    // SUMMARY
    console.log("\n📊 SUMMARY OF FIXES NEEDED:");
    console.log(
      '1. 👤 User Name: Check if "John Developer H" appears instead of "undefined undefined"'
    );
    console.log(
      "2. ✏️ Billable Hours: Check if the frontend can call the PUT endpoint"
    );
    console.log(
      "3. 📤 Export: Check if export button works and downloads data"
    );

    console.log("\n💡 RECOMMENDATIONS:");
    console.log("- Refresh the frontend page to see user name fix");
    console.log(
      "- Try clicking on billable hours in the UI to see if editing works"
    );
    console.log("- Click the Export button to test download functionality");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testAllThreeIssues();
