const { MongoClient } = require("mongodb");

async function debugDatabase() {
  const client = new MongoClient(
    "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
  );
  await client.connect();

  const db = client.db("timesheet-management");
  const users = db.collection("users");

  // Check all users
  console.log("🔍 All users in database:");
  const allUsers = await users.find({}).toArray();
  console.log(`Total users: ${allUsers.length}`);

  // Check deleted users specifically
  console.log("\n🗑️ Deleted users:");
  const deletedUsers = await users
    .find({ deleted_at: { $exists: true } })
    .toArray();
  console.log(`Deleted users: ${deletedUsers.length}`);

  deletedUsers.forEach((user) => {
    console.log(
      `- ${user.full_name} (${user.email}) - Deleted: ${user.deleted_at}, Hard deleted: ${user.is_hard_deleted}`
    );
  });

  // Check for hard deleted users
  console.log("\n💀 Hard deleted users:");
  const hardDeletedUsers = await users
    .find({ is_hard_deleted: true })
    .toArray();
  console.log(`Hard deleted users: ${hardDeletedUsers.length}`);

  await client.close();
}

debugDatabase().catch(console.error);
