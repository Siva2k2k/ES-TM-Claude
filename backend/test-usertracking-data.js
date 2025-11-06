/**
 * Quick diagnostic script to check UserTracking data availability
 * Run this with: node test-usertracking-data.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function testUserTrackingData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/timesheet-management"
    );
    console.log("✅ Connected to MongoDB");

    // Check Users
    const User = mongoose.model(
      "User",
      new mongoose.Schema({}, { strict: false })
    );
    const userCount = await User.countDocuments({
      is_active: true,
      deleted_at: null,
    });
    console.log(`👥 Active Users: ${userCount}`);

    // Check Timesheets
    const Timesheet = mongoose.model(
      "Timesheet",
      new mongoose.Schema({}, { strict: false })
    );
    const timesheetCount = await Timesheet.countDocuments({ deleted_at: null });
    const submittedTimesheets = await Timesheet.countDocuments({
      status: { $nin: ["draft"] },
      deleted_at: null,
    });
    console.log(`📊 Total Timesheets: ${timesheetCount}`);
    console.log(`📈 Submitted Timesheets: ${submittedTimesheets}`);

    // Check TimeEntries
    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );
    const entryCount = await TimeEntry.countDocuments({ deleted_at: null });
    console.log(`⏰ Time Entries: ${entryCount}`);

    // Check UserWeekSummary (aggregated data)
    const UserWeekSummary = mongoose.model(
      "UserWeekSummary",
      new mongoose.Schema({}, { strict: false })
    );
    const summaryCount = await UserWeekSummary.countDocuments({});
    console.log(`📋 UserWeekSummary Records: ${summaryCount}`);

    // Check recent timesheets (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentTimesheets = await Timesheet.countDocuments({
      week_start_date: { $gte: fourWeeksAgo },
      status: { $nin: ["draft"] },
      deleted_at: null,
    });
    console.log(`📅 Recent Timesheets (4 weeks): ${recentTimesheets}`);

    // Check Projects
    const Project = mongoose.model(
      "Project",
      new mongoose.Schema({}, { strict: false })
    );
    const projectCount = await Project.countDocuments({ deleted_at: null });
    console.log(`🏗️ Active Projects: ${projectCount}`);

    // Check TimesheetProjectApproval
    const TimesheetProjectApproval = mongoose.model(
      "TimesheetProjectApproval",
      new mongoose.Schema({}, { strict: false })
    );
    const approvalCount = await TimesheetProjectApproval.countDocuments({});
    const managementApproved = await TimesheetProjectApproval.countDocuments({
      management_status: "approved",
    });
    console.log(`✅ Project Approvals: ${approvalCount}`);
    console.log(`🎯 Management Approved: ${managementApproved}`);

    // Sample some data
    if (userCount > 0) {
      const sampleUser = await User.findOne({ is_active: true }).select(
        "full_name email role"
      );
      console.log(
        `👤 Sample User: ${sampleUser?.full_name} (${sampleUser?.role})`
      );
    }

    if (summaryCount === 0 && timesheetCount > 0) {
      console.log(
        "\n⚠️  WARNING: You have timesheets but no UserWeekSummary data!"
      );
      console.log("💡 Solution: Run aggregation to populate UserWeekSummary");
      console.log('   Use the "Trigger Aggregation" button in the UI or call:');
      console.log("   POST /api/v1/user-tracking/aggregate");
    }

    if (summaryCount === 0 && timesheetCount === 0) {
      console.log(
        "\n❗ No timesheets found. Users need to create and submit timesheets first."
      );
    }

    if (summaryCount > 0) {
      console.log(
        "\n✅ UserWeekSummary data exists! The dashboard should work."
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

testUserTrackingData();
