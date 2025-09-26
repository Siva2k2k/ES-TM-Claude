const { MongoClient } = require("mongodb");

async function checkTasks() {
  // Use the same connection string as the backend
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/timesheet-management";
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const db = client.db("timesheet-management");

    console.log("\n=== Current Tasks in Database ===");
    const tasks = await db.collection("tasks").find({}).toArray();

    tasks.forEach((task) => {
      console.log(`Task: ${task.name}`);
      console.log(`  ID: ${task._id}`);
      console.log(`  Project ID: ${task.project_id}`);
      console.log(
        `  Assigned To User ID: ${task.assigned_to_user_id || "NOT ASSIGNED"}`
      );
      console.log(`  Status: ${task.status}`);
      console.log("---");
    });

    console.log(`\nTotal tasks: ${tasks.length}`);

    // Also check users for reference
    console.log("\n=== Available Users ===");
    const users = await db
      .collection("users")
      .find({}, { projection: { email: 1, full_name: 1, role: 1 } })
      .toArray();
    users.forEach((user) => {
      console.log(
        `${user.full_name} (${user.role}): ${user.email} - ID: ${user._id}`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkTasks();
