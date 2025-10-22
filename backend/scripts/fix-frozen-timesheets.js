/**
 * Fix frozen timesheets to have management_status='approved'
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/timesheet-management"
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const TimesheetSchema = new mongoose.Schema(
  {
    user_id: mongoose.Schema.Types.ObjectId,
    week_start_date: Date,
    status: String,
    is_frozen: Boolean,
  },
  { collection: "timesheets" }
);

const TimesheetProjectApprovalSchema = new mongoose.Schema(
  {
    timesheet_id: mongoose.Schema.Types.ObjectId,
    project_id: mongoose.Schema.Types.ObjectId,
    management_status: String,
    management_approved_at: Date,
  },
  { collection: "timesheetprojectapprovals" }
);

const Timesheet = mongoose.model("Timesheet", TimesheetSchema);
const TimesheetProjectApproval = mongoose.model(
  "TimesheetProjectApproval",
  TimesheetProjectApprovalSchema
);

async function fixFrozenTimesheets() {
  try {
    console.log("\n=== Fixing Frozen Timesheets ===\n");

    // Find all frozen timesheets
    const frozenTimesheets = await Timesheet.find({
      status: "frozen",
      is_frozen: true,
    });

    console.log(`Found ${frozenTimesheets.length} frozen timesheets\n`);

    let fixedCount = 0;

    for (const ts of frozenTimesheets) {
      console.log(
        `Processing timesheet ${ts._id} (Week: ${
          ts.week_start_date?.toISOString().split("T")[0]
        })`
      );

      // Find all approval records for this timesheet
      const approvals = await TimesheetProjectApproval.find({
        timesheet_id: ts._id,
      });

      for (const approval of approvals) {
        if (approval.management_status !== "approved") {
          console.log(`  Fixing approval record: ${approval._id}`);
          console.log(
            `    Before: management_status=${approval.management_status}`
          );

          await TimesheetProjectApproval.updateOne(
            { _id: approval._id },
            {
              $set: {
                management_status: "approved",
                management_approved_at:
                  approval.management_approved_at || new Date(),
              },
            }
          );

          console.log(`    After: management_status=approved`);
          fixedCount++;
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed ${fixedCount} approval records`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

(async () => {
  try {
    await connectDB();
    await fixFrozenTimesheets();
    await mongoose.connection.close();
    console.log("\nDone!");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
