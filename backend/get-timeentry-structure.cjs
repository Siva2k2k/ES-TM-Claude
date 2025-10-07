const mongoose = require("mongoose");

async function getTimeEntryStructure() {
  try {
    console.log("🔍 Connecting to check actual TimeEntry data...");
    await mongoose.connect("mongodb://localhost:27017/timesheet-management");

    console.log("📋 Getting TimeEntry structure...");
    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );

    // Get one time entry to see the structure
    const entry = await TimeEntry.findOne().lean();

    if (entry) {
      console.log("\n📊 TimeEntry Structure:");
      console.log(JSON.stringify(entry, null, 2));

      console.log("\n🎯 For updateBillableHours, frontend should send:");
      console.log({
        user_id: entry.user_id?.toString() || "REQUIRED",
        project_id: entry.project_id?.toString() || "REQUIRED",
        task_id: entry.task_id?.toString() || "OPTIONAL",
        date: entry.date || "REQUIRED (ISO format)",
        billable_hours:
          "NEW_VALUE (0 for non-billable, original hours for billable)",
      });
    } else {
      console.log("❌ No time entries found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

getTimeEntryStructure();
