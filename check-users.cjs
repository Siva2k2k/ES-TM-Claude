const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./backend/.env" });

async function checkUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("timesheet-management");
    const users = await db.collection("users").find({}).toArray();

    console.log("Users in database:");
    users.forEach((user) => {
      console.log(
        `- Email: ${user.email}, Role: ${user.role}, Active: ${
          user.is_active
        }, Approved: ${
          user.is_approved_by_super_admin
        }, Has Password: ${!!user.password_hash}`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkUsers();
