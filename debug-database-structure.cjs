const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugDatabaseStructure() {
  console.log("🔍 DEBUG: Database Collections & Data Structure\n");

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Let's check what endpoints exist for timeentries or time entries
    console.log("🔧 TESTING TIME ENTRY RELATED ENDPOINTS:\n");

    const endpoints = [
      "time-entries",
      "timeentries",
      "entries",
      "time-entry",
      "timesheet-entries",
      "timesheet/entries",
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await axios.get(`${API_BASE}/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = result.data;
        const count = Array.isArray(data)
          ? data.length
          : data.data && Array.isArray(data.data)
          ? data.data.length
          : data.entries && Array.isArray(data.entries)
          ? data.entries.length
          : "unknown";

        console.log(`✅ /${endpoint} -> Found ${count} items`);

        if (
          (Array.isArray(data) && data.length > 0) ||
          (data.data && Array.isArray(data.data) && data.data.length > 0)
        ) {
          const sample = Array.isArray(data) ? data[0] : data.data[0];
          console.log(`   Sample item keys:`, Object.keys(sample));
          console.log(`   Sample:`, JSON.stringify(sample, null, 4));
        }
        break; // Found working endpoint
      } catch (e) {
        console.log(`❌ /${endpoint} -> ${e.response?.status || "Error"}`);
      }
    }

    // Also check if timesheets have embedded entries when we get individual timesheet
    console.log("\n📋 CHECKING INDIVIDUAL TIMESHEET STRUCTURE:\n");

    // Get list of timesheets first
    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (timesheets.data.data && timesheets.data.data.length > 0) {
      const sampleTimesheetId = timesheets.data.data[0]._id;
      console.log(`Testing individual timesheet: ${sampleTimesheetId}`);

      // Try different ways to get timesheet details
      const detailEndpoints = [
        `timesheets/${sampleTimesheetId}`,
        `timesheets/${sampleTimesheetId}/entries`,
        `timesheets/${sampleTimesheetId}?populate=entries`,
        `timesheet/${sampleTimesheetId}`,
      ];

      for (const endpoint of detailEndpoints) {
        try {
          const details = await axios.get(`${API_BASE}/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log(`✅ /${endpoint} works!`);

          const timesheet =
            details.data.timesheet || details.data.data || details.data;
          if (timesheet) {
            console.log(`   Available fields:`, Object.keys(timesheet));

            if (timesheet.entries) {
              console.log(`   📝 Has entries: ${timesheet.entries.length}`);
              if (timesheet.entries.length > 0) {
                console.log(
                  `   Sample entry:`,
                  JSON.stringify(timesheet.entries[0], null, 4)
                );
              }
            } else {
              console.log(`   ❌ No entries field found`);
            }
          }
          break; // Found working endpoint
        } catch (e) {
          console.log(`❌ /${endpoint} -> ${e.response?.status || "Error"}`);
        }
      }
    }

    // Check a sample approved timesheet to see if we can find its entries
    console.log("\n🎯 CHECKING APPROVED TIMESHEETS FOR ENTRIES:\n");

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
      console.log(`Approved timesheet sample:`);
      console.log(`  ID: ${sample._id}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Hours: ${sample.total_hours}`);
      console.log(`  User: ${sample.user_id || "No user_id"}`);
      console.log(`  Week: ${sample.week_start_date}`);

      // Try to find its entries in any endpoint
      console.log(`\n🔍 Searching for entries for timesheet ${sample._id}:`);

      const searchEndpoints = [
        `time-entries?timesheet_id=${sample._id}`,
        `timeentries?timesheet_id=${sample._id}`,
        `entries?timesheet=${sample._id}`,
        `timesheets/${sample._id}/entries`,
      ];

      for (const endpoint of searchEndpoints) {
        try {
          const entries = await axios.get(`${API_BASE}/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const entryData = entries.data;
          const count = Array.isArray(entryData)
            ? entryData.length
            : entryData.data
            ? entryData.data.length
            : 0;

          console.log(`   ✅ ${endpoint} -> Found ${count} entries`);

          if (count > 0) {
            const firstEntry = Array.isArray(entryData)
              ? entryData[0]
              : entryData.data[0];
            console.log(`   Entry structure:`, Object.keys(firstEntry));
            console.log(
              `   Sample entry:`,
              JSON.stringify(firstEntry, null, 4)
            );
          }
        } catch (e) {
          console.log(`   ❌ ${endpoint} -> ${e.response?.status || "Error"}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugDatabaseStructure();
