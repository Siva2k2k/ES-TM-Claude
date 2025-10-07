// Test script for reset password functionality
const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testResetPasswordFlow() {
  console.log("🧪 Testing Reset Password Flow...\n");

  try {
    // Step 1: Request password reset
    console.log("1️⃣ Testing forgot password request...");
    const forgotResponse = await axios.post(
      `${API_BASE}/auth/forgot-password`,
      {
        email: "admin@company.com",
      }
    );

    console.log("✅ Forgot password response:", forgotResponse.data);

    if (forgotResponse.data.success) {
      console.log(
        "📧 Password reset email would be sent (check server logs for token)"
      );

      // For testing, we need to simulate getting the token from the email
      // In a real scenario, user would click the link in their email
      console.log("\n⚠️ To complete testing:");
      console.log("1. Check the backend logs for the reset token");
      console.log(
        "2. Visit: http://localhost:5173/reset-password?token=YOUR_TOKEN"
      );
      console.log("3. The frontend should now show the reset password form");
      console.log("4. Enter a new password and submit");
    } else {
      console.log("❌ Forgot password failed:", forgotResponse.data.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testResetPasswordFlow();
