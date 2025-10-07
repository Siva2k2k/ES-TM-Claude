// Test to debug the exact query being executed
const mongoose = require("mongoose");

async function debugBillableHoursQuery() {
  try {
    console.log("🔍 Debugging billable hours query...");

    await mongoose.connect("mongodb://localhost:27017/timesheet-management");
    console.log("✅ Connected to MongoDB");

    // Define TimeEntry schema to match backend
    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );

    // Test data from network payload
    const user_id = "68df77ec2ba674aa3c8cd2bd";
    const project_id = "68df77ec2ba674aa3c8cd2c7";
    const start_date = "2024-09-30";
    const end_date = "2025-10-30";

    console.log("\n📋 Testing with frontend payload:");
    console.log(`user_id: ${user_id}`);
    console.log(`project_id: ${project_id}`);
    console.log(`start_date: ${start_date}`);
    console.log(`end_date: ${end_date}`);

    // Build query exactly like backend does
    const query = {
      user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
      project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
      date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      },
    };

    console.log("\n🔍 Executing query:");
    console.log(JSON.stringify(query, null, 2));

    const timeEntries = await TimeEntry.find(query);

    console.log(`\n📊 Found ${timeEntries.length} matching time entries:`);

    if (timeEntries.length > 0) {
      timeEntries.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`- _id: ${entry._id}`);
        console.log(`- user_id: ${entry.user_id}`);
        console.log(`- project_id: ${entry.project_id}`);
        console.log(`- date: ${entry.date}`);
        console.log(`- hours: ${entry.hours}`);
        console.log(`- is_billable: ${entry.is_billable}`);
      });
    } else {
      console.log(
        "\n❌ No entries found. Let's check what entries exist for this user..."
      );

      // Check entries for this user
      const userEntries = await TimeEntry.find({
        user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
      });

      console.log(
        `\n👤 Found ${userEntries.length} total entries for user ${user_id}:`
      );
      userEntries.forEach((entry, index) => {
        console.log(
          `Entry ${index + 1}: project=${entry.project_id}, date=${
            entry.date
          }, hours=${entry.hours}`
        );
      });

      // Check entries for this project
      const projectEntries = await TimeEntry.find({
        project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
      });

      console.log(
        `\n📁 Found ${projectEntries.length} total entries for project ${project_id}:`
      );
      projectEntries.forEach((entry, index) => {
        console.log(
          `Entry ${index + 1}: user=${entry.user_id}, date=${
            entry.date
          }, hours=${entry.hours}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

debugBillableHoursQuery();
