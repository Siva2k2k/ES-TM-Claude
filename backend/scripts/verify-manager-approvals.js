/**
 * Verify Manager Timesheet Approval Records
 *
 * This script verifies that manager's timesheet approval records have correct statuses
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/timesheet-management"
    );
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define schemas
const UserSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    role: String,
  },
  { collection: "users" }
);

const TimesheetSchema = new mongoose.Schema(
  {
    user_id: mongoose.Schema.Types.ObjectId,
    week_start_date: Date,
    status: String,
  },
  { collection: "timesheets" }
);

const TimesheetProjectApprovalSchema = new mongoose.Schema(
  {
    timesheet_id: mongoose.Schema.Types.ObjectId,
    project_id: mongoose.Schema.Types.ObjectId,
    project_name: String,
    lead_status: String,
    manager_status: String,
    management_status: String,
  },
  { collection: "timesheetprojectapprovals" }
);

const User = mongoose.model("User", UserSchema);
const Timesheet = mongoose.model("Timesheet", TimesheetSchema);
const TimesheetProjectApproval = mongoose.model(
  "TimesheetProjectApproval",
  TimesheetProjectApprovalSchema
);

async function verifyManagerApprovals() {
  try {
    console.log("\n=== Verifying Manager Timesheet Approvals ===\n");

    const managers = await User.find({ role: "manager" });

    for (const manager of managers) {
      const timesheets = await Timesheet.find({
        user_id: manager._id,
        status: { $in: ["submitted", "management_pending"] },
      });

      if (timesheets.length > 0) {
        console.log(`Manager: ${manager.email}`);

        for (const timesheet of timesheets) {
          console.log(
            `  Week: ${
              timesheet.week_start_date.toISOString().split("T")[0]
            } | Status: ${timesheet.status}`
          );

          const approvals = await TimesheetProjectApproval.find({
            timesheet_id: timesheet._id,
          });

          for (const approval of approvals) {
            const status =
              approval.lead_status === "not_required" &&
              approval.manager_status === "not_required" &&
              approval.management_status === "pending"
                ? "✓"
                : "✗";

            console.log(
              `    ${status} Project: ${approval.project_name || "N/A"}`
            );
            console.log(
              `       Lead: ${approval.lead_status} | Manager: ${approval.manager_status} | Management: ${approval.management_status}`
            );
          }
        }
        console.log("");
      }
    }

    console.log("Verification complete!");
  } catch (error) {
    console.error("Error verifying approvals:", error);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    await connectDB();
    await verifyManagerApprovals();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
