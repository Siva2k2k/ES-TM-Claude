const { MongoClient } = require("mongodb");

async function checkAdminRole() {
  const client = new MongoClient(
    "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
  );
  await client.connect();

  const db = client.db("timesheet-management");
  const users = db.collection("users");

  // Find admin user
  const adminUser = await users.findOne({ email: "admin@company.com" });

  if (adminUser) {
    console.log("👤 Admin user found:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Full Name: ${adminUser.full_name}`);
    console.log(`   ID: ${adminUser._id}`);
  } else {
    console.log("❌ Admin user not found");
  }

  await client.close();
}

checkAdminRole().catch(console.error);
