const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

async function createTestUser() {
  const client = new MongoClient(
    "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
  );
  await client.connect();

  const db = client.db("timesheet-management");
  const users = db.collection("users");

  // Create and immediately soft delete a test user for frontend testing
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    full_name: "Test User for Delete/Restore",
    password_hash: await bcrypt.hash("testpass", 10),
    role: "employee",
    is_active: true,
    is_hard_deleted: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await users.insertOne(testUser);
  console.log("Test user created with ID:", result.insertedId);

  // Immediately soft delete for testing
  await users.updateOne(
    { _id: result.insertedId },
    {
      $set: {
        deleted_at: new Date(),
        deleted_by: "68df77ec2ba674aa3c8cd2bb", // Admin ID
        deleted_reason: "Created for frontend testing",
        updated_at: new Date(),
      },
    }
  );

  console.log("User soft deleted for frontend testing");

  await client.close();
}

createTestUser().catch(console.error);
