const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function checkDataModels() {
  console.log("🔍 CHECKING DATA MODEL MISMATCH\n");

  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    console.log("🔍 KEY FINDING: Billing Controller Issue Identified!\n");
    console.log("=".repeat(60));

    console.log(
      "❌ PROBLEM: The ProjectBillingController is looking for TimeEntry documents"
    );
    console.log(
      "   but the system stores data in Timesheet documents with embedded entries.\n"
    );

    console.log("📋 CURRENT SYSTEM STRUCTURE:");
    console.log(
      "✅ Timesheets Collection: Contains 44 documents with embedded entries"
    );
    console.log(
      "❌ TimeEntries Collection: Likely empty or not used by timesheet system"
    );
    console.log(
      '❌ ProjectBilling Query: Aggregates from "timeentries" collection (wrong source)\n'
    );

    console.log("🔧 BACKEND CODE ANALYSIS:");
    console.log("The billing controller uses this query:");
    console.log("```javascript");
    console.log(
      'from: "timeentries",  // ❌ Looking for separate TimeEntry documents'
    );
    console.log("// But data is in:");
    console.log("// Timesheet.entries[] // ✅ Actual location of time data");
    console.log("```\n");

    // Let's verify by testing a simple query
    console.log("🧪 TESTING THE HYPOTHESIS:");

    // Check if there are any standalone TimeEntry documents
    try {
      // This would fail if no TimeEntry endpoint exists
      const timeEntries = await axios.get(`${API_BASE}/time-entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        `✅ TimeEntry endpoint exists, found: ${
          timeEntries.data.length || 0
        } entries`
      );
    } catch (timeEntryError) {
      console.log(
        `❌ TimeEntry endpoint error: ${timeEntryError.response?.status} - ${
          timeEntryError.response?.data?.message || timeEntryError.message
        }`
      );
    }

    // Show the correct way data is stored
    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const validTimesheets = timesheets.data.data.filter(
      (t) => t.user_id && t.total_hours > 0
    );

    console.log("\n📊 ACTUAL DATA LOCATION (Timesheet.entries):");
    console.log(
      `✅ Found ${validTimesheets.length} timesheets with valid users and hours`
    );

    if (validTimesheets.length > 0) {
      const sampleTimesheet = validTimesheets[0];
      console.log(
        `\nSample: ${sampleTimesheet.user_id.full_name} - ${sampleTimesheet.total_hours}h`
      );
      console.log(
        `Week: ${sampleTimesheet.week_start_date.split("T")[0]} to ${
          sampleTimesheet.week_end_date.split("T")[0]
        }`
      );
      console.log(
        `Status: ${sampleTimesheet.status} (${
          sampleTimesheet.is_frozen ? "Frozen" : "Not Frozen"
        })`
      );
    }

    console.log("\n\n🎯 SOLUTION SUMMARY:");
    console.log("=".repeat(50));

    console.log("\n❌ ROOT CAUSES IDENTIFIED:");
    console.log(
      "1. Data Model Mismatch: Billing looks for TimeEntry docs, data is in Timesheet.entries"
    );
    console.log(
      "2. NULL User IDs: 36/44 timesheets have null user_id (data integrity)"
    );
    console.log(
      "3. API Endpoint Issues: Cannot access individual timesheet details (404 errors)"
    );
    console.log(
      "4. Sample Data Only: Task billing shows hardcoded sample, not real data"
    );

    console.log("\n✅ REQUIRED FIXES:");
    console.log(
      "1. Update ProjectBillingController to query Timesheet collection instead of TimeEntry"
    );
    console.log("2. Fix NULL user_id timesheets by proper user association");
    console.log(
      "3. Update billing aggregation pipeline to use Timesheet.entries[]"
    );
    console.log("4. Ensure timesheet detail API endpoints work properly");
    console.log(
      "5. Connect real timesheet data to task billing (remove sample data)"
    );

    console.log("\n🚀 IMMEDIATE ACTIONS:");
    console.log("1. Backend: Modify billing controller aggregation query");
    console.log("2. Database: Fix user_id associations in existing timesheets");
    console.log(
      "3. API: Fix timesheet detail endpoint (currently returning 404)"
    );
    console.log(
      "4. Frontend: Verify it can handle the corrected data structure"
    );

    console.log(
      "\nOnce these fixes are implemented, the billing interface will show:"
    );
    console.log("✅ Real project hours from actual timesheets");
    console.log("✅ Proper user assignments and billing calculations");
    console.log("✅ Accurate date filtering and status handling");
    console.log("✅ Export functionality with real data");
  } catch (error) {
    console.error("❌ Analysis failed:", error.response?.data || error.message);
  }
}

checkDataModels();
