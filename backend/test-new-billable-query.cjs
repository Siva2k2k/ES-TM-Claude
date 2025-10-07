const mongoose = require("mongoose");

async function testNewBillableQuery() {
  try {
    console.log("🔍 Testing new billable hours update logic...");

    // Connect to MongoDB
    await mongoose.connect(
      "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
    );
    console.log("✅ Connected to MongoDB\n");

    // Test parameters from the frontend request
    const user_id = "68df77ec2ba674aa3c8cd2bd";
    const project_id = "68df77ec2ba674aa3c8cd2c7";
    const start_date = "2024-09-30";
    const end_date = "2025-10-30";

    console.log("📋 Test Parameters:");
    console.log(`  User ID: ${user_id}`);
    console.log(`  Project ID: ${project_id}`);
    console.log(`  Date Range: ${start_date} to ${end_date}\n`);

    // Step 1: Find timesheets for the user
    console.log("📊 Step 1: Finding user timesheets...");
    const Timesheet = mongoose.model(
      "Timesheet",
      new mongoose.Schema({}, { strict: false })
    );

    const timesheetQuery = {
      user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
      week_start_date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      },
    };

    console.log("Timesheet query:", JSON.stringify(timesheetQuery, null, 2));
    const userTimesheets = await Timesheet.find(timesheetQuery).select(
      "_id week_start_date"
    );

    console.log(`Found ${userTimesheets.length} timesheets for user:`);
    userTimesheets.forEach((ts, i) => {
      console.log(
        `  ${i + 1}. Timesheet ID: ${ts._id}, Week: ${ts.week_start_date}`
      );
    });

    if (userTimesheets.length === 0) {
      console.log(
        "❌ No timesheets found - this explains why billable update fails!"
      );

      // Let's check what timesheets actually exist for this user
      console.log("\n🔍 Checking ALL timesheets for this user...");
      const allUserTimesheets = await Timesheet.find({
        user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
      }).select("_id week_start_date");

      console.log(
        `Found ${allUserTimesheets.length} total timesheets for user:`
      );
      allUserTimesheets.forEach((ts, i) => {
        console.log(
          `  ${i + 1}. Timesheet ID: ${ts._id}, Week: ${ts.week_start_date}`
        );
      });

      await mongoose.connection.close();
      return;
    }

    // Step 2: Find time entries for those timesheets and project
    console.log("\n📊 Step 2: Finding time entries...");
    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );

    const timesheetIds = userTimesheets.map((ts) => ts._id);

    const timeEntryQuery = {
      timesheet_id: { $in: timesheetIds },
      project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
    };

    console.log("TimeEntry query:", JSON.stringify(timeEntryQuery, null, 2));
    const timeEntries = await TimeEntry.find(timeEntryQuery);

    console.log(
      `\n✅ Found ${timeEntries.length} time entries that match criteria!`
    );

    if (timeEntries.length > 0) {
      console.log("\n📊 Time Entries Details:");
      timeEntries.forEach((entry, i) => {
        console.log(`  ${i + 1}. Entry ID: ${entry._id}`);
        console.log(`     Timesheet: ${entry.timesheet_id}`);
        console.log(`     Date: ${entry.date}`);
        console.log(`     Hours: ${entry.hours}`);
        console.log(`     Billable: ${entry.is_billable}`);
      });

      console.log("\n🎉 SUCCESS: The new query logic should work!");
    } else {
      console.log("❌ Still no matching time entries found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

testNewBillableQuery();
