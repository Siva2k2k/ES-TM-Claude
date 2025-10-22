/**
 * Check if manager timesheets have approval records for ProjectChecker
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

const ProjectSchema = new mongoose.Schema(
  {
    name: String,
  },
  { collection: "projects" }
);

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

const TimeEntrySchema = new mongoose.Schema(
  {
    timesheet_id: mongoose.Schema.Types.ObjectId,
    project_id: mongoose.Schema.Types.ObjectId,
    date: Date,
    hours: Number,
  },
  { collection: "timeentries" }
);

const Project = mongoose.model("Project", ProjectSchema);
const User = mongoose.model("User", UserSchema);
const Timesheet = mongoose.model("Timesheet", TimesheetSchema);
const TimesheetProjectApproval = mongoose.model(
  "TimesheetProjectApproval",
  TimesheetProjectApprovalSchema
);
const TimeEntry = mongoose.model("TimeEntry", TimeEntrySchema);

async function checkManagerApprovalRecords() {
  try {
    console.log("\n=== Checking Manager Timesheet Approval Records ===\n");

    // Find ProjectChecker
    const projectChecker = await Project.findOne({ name: /ProjectChecker/i });
    if (!projectChecker) {
      console.log("ProjectChecker not found");
      return;
    }
    console.log(`Project: ${projectChecker.name} (${projectChecker._id})\n`);

    // Find managers
    const managers = await User.find({ role: "manager" });

    for (const manager of managers) {
      console.log(`Manager: ${manager.email}`);

      // Find manager's recent timesheets
      const timesheets = await Timesheet.find({
        user_id: manager._id,
        status: "management_pending",
      })
        .sort({ week_start_date: -1 })
        .limit(3);

      if (timesheets.length === 0) {
        console.log("  No management_pending timesheets found\n");
        continue;
      }

      for (const ts of timesheets) {
        console.log(`\n  Timesheet: ${ts._id}`);
        console.log(
          `  Week: ${
            ts.week_start_date?.toISOString().split("T")[0]
          } | Status: ${ts.status}`
        );

        // Check if there are time entries for ProjectChecker
        const entries = await TimeEntry.find({
          timesheet_id: ts._id,
          project_id: projectChecker._id,
        });
        console.log(`  Time entries for ProjectChecker: ${entries.length}`);

        if (entries.length > 0) {
          const totalHours = entries.reduce(
            (sum, e) => sum + (e.hours || 0),
            0
          );
          console.log(`  Total hours: ${totalHours}`);
        }

        // Check if there's an approval record for ProjectChecker
        const approval = await TimesheetProjectApproval.findOne({
          timesheet_id: ts._id,
          project_id: projectChecker._id,
        });

        if (approval) {
          console.log(`  ✓ Approval record EXISTS for ProjectChecker`);
          console.log(
            `    Lead: ${approval.lead_status}, Manager: ${approval.manager_status}, Management: ${approval.management_status}`
          );
        } else {
          console.log(`  ✗ NO approval record for ProjectChecker`);
          console.log(
            `    This is why the timesheet is not showing in Management view!`
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
    await checkManagerApprovalRecords();
    await mongoose.connection.close();
    console.log("\nDone!");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();
