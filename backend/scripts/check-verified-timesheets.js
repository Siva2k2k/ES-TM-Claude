/**
 * Check timesheet statuses after verification
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

async function checkVerifiedTimesheets() {
  try {
    console.log("\n=== Checking Verified Timesheets ===\n");

    // Find timesheets with manager_approved or management_pending status
    const timesheets = await Timesheet.find({
      status: { $in: ["manager_approved", "management_pending", "frozen"] },
    })
      .populate("user_id", "full_name email role")
      .sort({ week_start_date: -1 })
      .limit(10);

    console.log(`Found ${timesheets.length} timesheets\n`);

    for (const ts of timesheets) {
      const user = ts.user_id;
      console.log(`Timesheet: ${ts._id}`);
      console.log(
        `  User: ${user?.full_name || "Unknown"} (${user?.email}) - ${
          user?.role
        }`
      );
      console.log(`  Week: ${ts.week_start_date?.toISOString().split("T")[0]}`);
      console.log(`  Status: ${ts.status}`);
      console.log(`  Is Frozen: ${ts.is_frozen || false}`);

      // Check approval records
      const approvals = await TimesheetProjectApproval.find({
        timesheet_id: ts._id,
      });
      console.log(`  Approval records: ${approvals.length}`);

      for (const approval of approvals) {
        console.log(
          `    Management status: ${approval.management_status || "not set"}`
        );
        if (approval.management_approved_at) {
          console.log(
            `    Approved at: ${approval.management_approved_at.toISOString()}`
          );
        }
      }
      console.log("");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

(async () => {
  try {
    await connectDB();
    await checkVerifiedTimesheets();
    await mongoose.connection.close();
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
