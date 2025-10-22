/**
 * Fix Manager Timesheet Approval Records
 *
 * This script updates existing approval records for manager's own timesheets
 * to set lead_status and manager_status as 'not_required' and management_status as 'pending'
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

// Define schemas (simplified versions)
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
    lead_id: mongoose.Schema.Types.ObjectId,
    lead_status: String,
    manager_id: mongoose.Schema.Types.ObjectId,
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

async function fixManagerTimesheetApprovals() {
  try {
    console.log("\n=== Fixing Manager Timesheet Approvals ===\n");

    // Find all managers
    const managers = await User.find({ role: "manager" });
    console.log(`Found ${managers.length} managers\n`);

    let totalFixed = 0;

    for (const manager of managers) {
      console.log(
        `\nChecking timesheets for manager: ${manager.firstName} ${manager.lastName} (${manager.email})`
      );

      // Find all timesheets for this manager
      const timesheets = await Timesheet.find({
        user_id: manager._id,
        status: { $in: ["submitted", "management_pending"] },
      });

      console.log(
        `  Found ${timesheets.length} submitted/management_pending timesheets`
      );

      for (const timesheet of timesheets) {
        // Find all approval records for this timesheet
        const approvals = await TimesheetProjectApproval.find({
          timesheet_id: timesheet._id,
        });

        console.log(
          `  Timesheet ${timesheet._id} (Week: ${
            timesheet.week_start_date.toISOString().split("T")[0]
          }): ${approvals.length} approval records`
        );

        for (const approval of approvals) {
          // Check if this needs to be fixed
          const needsFix =
            approval.lead_status !== "not_required" ||
            approval.manager_status !== "not_required" ||
            approval.management_status !== "pending";

          if (needsFix) {
            console.log(`    Fixing approval record ${approval._id}`);
            console.log(
              `      Before: lead=${approval.lead_status}, manager=${approval.manager_status}, management=${approval.management_status}`
            );

            // Update the approval record
            await TimesheetProjectApproval.updateOne(
              { _id: approval._id },
              {
                $set: {
                  lead_status: "not_required",
                  manager_status: "not_required",
                  management_status: "pending",
                },
              }
            );

            console.log(
              `      After:  lead=not_required, manager=not_required, management=pending`
            );
            totalFixed++;
          }
        }

        // Update timesheet status to management_pending if it's submitted
        if (timesheet.status === "submitted") {
          await Timesheet.updateOne(
            { _id: timesheet._id },
            { $set: { status: "management_pending" } }
          );
          console.log(
            `  Updated timesheet status: submitted -> management_pending`
          );
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total approval records fixed: ${totalFixed}`);
    console.log(`\nDone!`);
  } catch (error) {
    console.error("Error fixing manager timesheet approvals:", error);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    await connectDB();
    await fixManagerTimesheetApprovals();
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
