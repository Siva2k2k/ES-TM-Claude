// Check for time entries that might have user_id populated differently
const mongoose = require("mongoose");

async function findTimeEntriesWithUsers() {
  try {
    console.log("🔍 Looking for time entries with populated user_id...");

    await mongoose.connect(
      "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
    );
    console.log("✅ Connected to MongoDB");

    const TimeEntry = mongoose.model(
      "TimeEntry",
      new mongoose.Schema({}, { strict: false })
    );

    // Look for any entries that have user_id populated
    const entriesWithUser = await TimeEntry.find({
      user_id: { $exists: true, $ne: null },
    });

    console.log(
      `\n📊 Found ${entriesWithUser.length} entries with user_id populated`
    );

    if (entriesWithUser.length > 0) {
      entriesWithUser.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`- _id: ${entry._id}`);
        console.log(`- user_id: ${entry.user_id}`);
        console.log(`- project_id: ${entry.project_id}`);
        console.log(`- date: ${entry.date}`);
        console.log(`- hours: ${entry.hours}`);
      });
    } else {
      console.log("\n❌ No entries found with user_id populated");
      console.log(
        "💡 Need to update existing time entries to have the correct user_id"
      );

      // Let's check the user we need
      const User = mongoose.model(
        "User",
        new mongoose.Schema({}, { strict: false })
      );
      const user = await User.findOne({ email: "employee1@company.com" });

      if (user) {
        console.log(`\n👤 Found employee1 user:`);
        console.log(`- _id: ${user._id}`);
        console.log(`- email: ${user.email}`);
        console.log(`- full_name: ${user.full_name}`);

        // Check if there are any entries for the project we're working with
        const projectId = "68df77ec2ba674aa3c8cd2c7";
        const projectEntries = await TimeEntry.find({ project_id: projectId });

        console.log(
          `\n📁 Project ${projectId} has ${projectEntries.length} entries`
        );

        if (projectEntries.length > 0) {
          console.log(
            "\n🔧 These entries need to be updated with user_id:",
            user._id.toString()
          );

          // Show first few entries that need updating
          projectEntries.slice(0, 5).forEach((entry, index) => {
            console.log(
              `Entry ${index + 1}: _id=${entry._id}, date=${
                entry.date
              }, hours=${entry.hours}`
            );
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 Connection closed");
  }
}

findTimeEntriesWithUsers();
