const mongoose = require("mongoose");

async function getTimeEntryIds() {
  try {
    console.log("🔍 Connecting to MongoDB to find actual time entry IDs...");
    await mongoose.connect("mongodb://localhost:27017/timesheet-management");

    // Get the TimeEntry schema
    const TimeEntrySchema = new mongoose.Schema(
      {
        timesheet_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Timesheet",
          required: true,
        },
        project_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
          required: true,
        },
        task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        date: { type: Date, required: true },
        hours: { type: Number, required: true },
        description: { type: String },
        is_billable: { type: Boolean, default: true },
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
      },
      { timestamps: true }
    );

    const TimeEntry = mongoose.model("TimeEntry", TimeEntrySchema);

    console.log("📊 Finding all time entries...");
    const entries = await TimeEntry.find({})
      .populate("project_id", "name")
      .populate("timesheet_id", "user_id status");

    console.log(`\n📋 Found ${entries.length} time entries:`);

    entries.forEach((entry, index) => {
      console.log(`\n${index + 1}. Time Entry ID: ${entry._id}`);
      console.log(`   Project: ${entry.project_id?.name || "Unknown"}`);
      console.log(`   Date: ${entry.date}`);
      console.log(`   Hours: ${entry.hours}`);
      console.log(`   Billable: ${entry.is_billable}`);
      console.log(
        `   Timesheet Status: ${entry.timesheet_id?.status || "Unknown"}`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

getTimeEntryIds();
