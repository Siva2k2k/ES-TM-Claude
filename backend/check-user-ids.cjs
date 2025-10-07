// Debug actual user IDs in time entries
const mongoose = require("mongoose");

async function checkUserIds() {
  try {
    console.log("🔍 Checking actual user IDs in time entries...");

    await mongoose.connect(
      "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
    );
    console.log("✅ Connected to MongoDB");

    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );

    // Get all time entries to see what user_ids exist
    const allEntries = await TimeEntry.find({}).limit(20);

    console.log(`\n📊 Found ${allEntries.length} time entries:`);

    const userIds = new Set();

    allEntries.forEach((entry, index) => {
      console.log(`\nEntry ${index + 1}:`);
      console.log(`- _id: ${entry._id}`);
      console.log(
        `- user_id: ${entry.user_id} (type: ${typeof entry.user_id})`
      );
      console.log(`- project_id: ${entry.project_id}`);
      console.log(`- date: ${entry.date}`);
      console.log(`- hours: ${entry.hours}`);
      console.log(`- is_billable: ${entry.is_billable}`);

      if (entry.user_id) {
        userIds.add(entry.user_id.toString());
      }
    });

    console.log(`\n👥 Unique user IDs found:`);
    [...userIds].forEach((userId, index) => {
      console.log(`${index + 1}. ${userId}`);
    });

    console.log(`\n🎯 Frontend is looking for user: 68df77ec2ba674aa3c8cd2bd`);
    const frontendUserId = "68df77ec2ba674aa3c8cd2bd";

    if (userIds.has(frontendUserId)) {
      console.log("✅ This user ID exists in time entries!");
    } else {
      console.log("❌ This user ID does NOT exist in time entries");
      console.log(
        "💡 The frontend might be using a different user ID than what's in the database"
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

checkUserIds();
