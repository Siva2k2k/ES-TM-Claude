// Test script to verify divide by zero fix
const mongoose = require("mongoose");

async function testDivideByZeroFix() {
  try {
    console.log("🔧 Testing Divide by Zero Fix for User Tracking");

    const baseUrl = "http://localhost:3001/api/v1/user-tracking";
    const token = process.env.TEST_TOKEN || "your-test-token-here";

    const endpoints = [
      { name: "Dashboard Overview", url: `${baseUrl}/dashboard?weeks=4` },
      { name: "Team Ranking", url: `${baseUrl}/team/ranking?weeks=4` },
      {
        name: "Project Performance",
        url: `${baseUrl}/projects/performance?weeks=4`,
      },
      { name: "User List", url: `${baseUrl}/users?weeks=4&page=1&limit=10` },
    ];

    console.log(
      "Testing endpoints with potential divide by zero operations...\n"
    );

    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Testing: ${endpoint.name}`);
        console.log(`   URL: ${endpoint.url}`);

        const response = await fetch(endpoint.url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success - Data received:`, Object.keys(data));

          // Check for any division by zero indicators
          if (data.data) {
            const hasInfinity = JSON.stringify(data.data).includes("Infinity");
            const hasNaN = JSON.stringify(data.data).includes("NaN");

            if (hasInfinity || hasNaN) {
              console.log(
                `   ⚠️  Warning: Found Infinity or NaN values in response`
              );
            } else {
              console.log(`   ✅ No divide by zero issues detected`);
            }
          }
        } else {
          const errorData = await response.json();
          console.log(`   ❌ Error:`, errorData.error || errorData.message);
        }

        console.log(""); // Empty line for readability

        // Wait a bit between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`   ❌ Request failed:`, error.message);
        console.log("");
      }
    }

    console.log("🎯 Test Summary:");
    console.log("The fixed aggregation pipelines should now handle:");
    console.log("- Zero total_hours in utilization_rate calculation");
    console.log("- Zero weeks_count in avg_hours_per_week calculation");
    console.log("- Using $cond operator to check for zero before division");
    console.log(
      "- Returning 0 as fallback value instead of causing MongoServerError"
    );
  } catch (error) {
    console.error("Test script error:", error);
  }
}

// Instructions for running the test
console.log(`
🔧 Divide by Zero Fix Test Script
=====================================

This script tests the User Tracking API endpoints that were causing
"PlanExecutor error during aggregation :: caused by :: can't $divide by zero"

To run this test:
1. Make sure your backend server is running on localhost:3001
2. Set a valid JWT token in TEST_TOKEN environment variable, or
3. Manually replace 'your-test-token-here' with a valid token
4. Run: node test-divide-by-zero-fix.js

The fix adds conditional checks before division operations:
- avg_hours_per_week: checks if weeks_count > 0
- utilization_rate: checks if total_hours > 0
- Returns 0 instead of attempting division by zero

Press Ctrl+C to exit, or continue to run the test...
`);

// Auto-run test after 3 seconds if this is the main module
if (require.main === module) {
  setTimeout(() => {
    testDivideByZeroFix();
  }, 3000);
}

module.exports = { testDivideByZeroFix };
