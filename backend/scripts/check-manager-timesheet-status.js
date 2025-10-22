/**
 * Check Manager Timesheet Status
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
    week_end_date: Date,
    status: String,
  },
  { collection: "timesheets" }
);

const TimesheetProjectApprovalSchema = new mongoose.Schema(
  {
    timesheet_id: mongoose.Schema.Types.ObjectId,
    project_id: mongoose.Schema.Types.ObjectId,
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

async function checkManagerTimesheets() {
  try {
    console.log("\n=== Manager Timesheet Status Check ===\n");

    const managers = await User.find({ role: "manager" });

    for (const manager of managers) {
      const timesheets = await Timesheet.find({
        user_id: manager._id,
      })
        .sort({ week_start_date: -1 })
        .limit(5);

      if (timesheets.length > 0) {
        console.log(`\nManager: ${manager.email}`);
        console.log("Recent timesheets:");

        for (const ts of timesheets) {
          console.log(
            `  Week: ${
              ts.week_start_date?.toISOString().split("T")[0]
            } | Status: ${ts.status}`
          );

          const approvals = await TimesheetProjectApproval.find({
            timesheet_id: ts._id,
          });
          if (approvals.length > 0) {
            approvals.forEach((a) => {
              console.log(
                `    Approval: lead=${a.lead_status}, manager=${a.manager_status}, management=${a.management_status}`
              );
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

(async () => {
  try {
    await connectDB();
    await checkManagerTimesheets();
    await mongoose.connection.close();
    console.log("\nDone!");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
