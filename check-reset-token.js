import { MongoClient } from "mongodb";
import axios from "axios";

async function checkResetToken() {
  const mongoUrl =
    "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin";

  let client;

  try {
    console.log("🔐 Testing Password Reset Token Flow...\n");

    // Step 1: Request password reset
    console.log("1️⃣ Requesting password reset for admin@company.com...");
    const resetResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/forgot-password",
      {
        email: "admin@company.com",
      }
    );
    console.log("✅ Response:", resetResponse.data);

    // Step 2: Connect to database and check for token
    console.log("\n2️⃣ Connecting to MongoDB...");
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("timesheet-management");
    const users = db.collection("users");

    // Step 3: Find the user and their reset token
    console.log("\n3️⃣ Looking for reset token in database...");
    const user = await users.findOne(
      {
        email: "admin@company.com",
      },
      {
        projection: {
          email: 1,
          password_reset_token: 1,
          password_reset_expires: 1,
          reset_token: 1,
          resetToken: 1,
          passwordResetToken: 1,
          _id: 1,
        },
      }
    );

    if (user) {
      console.log("✅ User found:", JSON.stringify(user, null, 2));

      // Check all possible token field names
      const tokenFields = [
        "password_reset_token",
        "reset_token",
        "resetToken",
        "passwordResetToken",
      ];
      let tokenFound = false;

      for (const field of tokenFields) {
        if (user[field]) {
          console.log(
            `🎯 Reset token found in field '${field}': ${user[field]}`
          );
          console.log(
            `🔗 Reset URL: http://localhost:5173/reset-password?token=${user[field]}`
          );
          tokenFound = true;
          break;
        }
      }

      if (!tokenFound) {
        console.log("❌ No reset token found in any expected fields");
        console.log("🔍 Available fields:", Object.keys(user));
      }
    } else {
      console.log("❌ User not found in database");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔒 MongoDB connection closed");
    }
  }
}

checkResetToken();
