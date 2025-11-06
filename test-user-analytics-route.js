// Test script to verify the user analytics route works
const mongoose = require("mongoose");

async function testUserAnalyticsRoute() {
  try {
    // Test if we can reach the analytics endpoint
    const testUserId = "68df77ec2ba674aa3c8cd2be"; // The user ID from the URL
    const apiUrl = `http://localhost:3001/api/v1/user-tracking/users/${testUserId}/analytics`;

    console.log("Testing User Analytics Route:");
    console.log("URL:", apiUrl);
    console.log("User ID:", testUserId);

    // Check if the user ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(testUserId)) {
      console.error("❌ Invalid ObjectId format");
      return;
    }

    console.log("✅ Valid ObjectId format");

    // Test with a simple fetch (no auth for now, just to see route structure)
    try {
      const response = await fetch(apiUrl);
      console.log("Response status:", response.status);

      if (response.status === 401) {
        console.log("✅ Route exists but requires authentication (expected)");
      } else if (response.status === 404) {
        console.log("❌ Route not found - check routing configuration");
      } else {
        const data = await response.text();
        console.log("Response:", data);
      }
    } catch (fetchError) {
      console.log(
        "Fetch error (might be expected if server not running):",
        fetchError.message
      );
    }
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testUserAnalyticsRoute();
}
