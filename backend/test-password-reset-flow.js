// Complete test of password reset flow
const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testCompletePasswordResetFlow() {
  try {
    console.log("🧪 Testing Complete Password Reset Flow...\n");

    // Step 1: Request password reset for admin user
    console.log("1️⃣ Requesting password reset...");
    const forgotResponse = await axios.post(
      `${API_BASE}/auth/forgot-password`,
      {
        email: "admin@company.com",
      }
    );

    console.log("✅ Forgot password response:", forgotResponse.data);

    if (forgotResponse.data.success) {
      console.log("\n📧 Password reset email would be sent in production");
      console.log(
        "📝 In development, we need to get the token from the database...\n"
      );

      // Step 2: Get the reset token from database (simulate email click)
      const { MongoClient } = require("mongodb");
      const client = new MongoClient(
        "mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin"
      );
      await client.connect();

      const db = client.db("timesheet-management");
      const users = db.collection("users");

      // Find admin user with reset token
      const adminUser = await users.findOne({
        email: "admin@company.com",
        reset_token: { $exists: true, $ne: null },
      });

      if (adminUser && adminUser.reset_token) {
        console.log("2️⃣ Found reset token in database");
        console.log(
          `📋 Reset URL would be: http://localhost:5173/reset-password?token=${adminUser.reset_token}`
        );

        // Step 3: Test the reset password endpoint
        console.log("\n3️⃣ Testing password reset with token...");
        const resetResponse = await axios.post(
          `${API_BASE}/auth/reset-password`,
          {
            token: adminUser.reset_token,
            newPassword: "newadmin123",
          }
        );

        console.log("✅ Reset password response:", resetResponse.data);

        if (resetResponse.data.success) {
          console.log("\n4️⃣ Testing login with new password...");
          const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: "admin@company.com",
            password: "newadmin123",
          });

          if (loginResponse.data.success) {
            console.log("✅ Login with new password: SUCCESS");
            console.log("\n5️⃣ Restoring original password...");

            // Restore original password
            const restoreResponse = await axios.post(
              `${API_BASE}/auth/forgot-password`,
              {
                email: "admin@company.com",
              }
            );

            if (restoreResponse.data.success) {
              const updatedUser = await users.findOne({
                email: "admin@company.com",
                reset_token: { $exists: true, $ne: null },
              });

              if (updatedUser && updatedUser.reset_token) {
                await axios.post(`${API_BASE}/auth/reset-password`, {
                  token: updatedUser.reset_token,
                  newPassword: "admin123",
                });
                console.log("✅ Original password restored");
              }
            }
          } else {
            console.log("❌ Login with new password failed");
          }
        } else {
          console.log("❌ Password reset failed:", resetResponse.data.error);
        }
      } else {
        console.log("❌ No reset token found in database");
      }

      await client.close();
    } else {
      console.log("❌ Forgot password failed:", forgotResponse.data.error);
    }

    console.log("\n🎯 Frontend Test Instructions:");
    console.log("1. Go to http://localhost:5173");
    console.log('2. Click "Forgot Password?" on login form');
    console.log("3. Enter admin@company.com");
    console.log("4. Check email (or use token from backend logs)");
    console.log("5. Visit the reset password URL");
    console.log("6. Set new password");
    console.log("7. Login with new password");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testCompletePasswordResetFlow();
