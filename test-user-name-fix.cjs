const axios = require("axios");

async function testUserNameFix() {
  try {
    console.log("🔍 Testing user name fix after backend update...");

    // Login to get JWT token
    console.log("🔑 Logging in...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.token;
    console.log("✅ Login successful");

    // Test billing endpoint with date range that has data (2024)
    console.log("📊 Fetching billing data...");
    const billingResponse = await axios.get(
      "http://localhost:3001/api/v1/project-billing",
      {
        params: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          view: "summary",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (billingResponse.data.success && billingResponse.data.data.length > 0) {
      const project = billingResponse.data.data[0];
      if (project.resources && project.resources.length > 0) {
        const user = project.resources[0];
        console.log("\n✅ USER NAME FIX RESULTS:");
        console.log("👤 User Name:", user.user_name);

        if (user.user_name === "John Developer H") {
          console.log("🎉 SUCCESS: User name is now correct!");
        } else if (user.user_name.includes("undefined")) {
          console.log("❌ STILL BROKEN: User name still shows undefined");
        } else {
          console.log(
            "⚠️ DIFFERENT: User name shows something else:",
            user.user_name
          );
        }

        console.log("\n📋 Full resource data:");
        console.log(JSON.stringify(user, null, 2));
      } else {
        console.log("❌ No resources found in billing data");
      }
    } else {
      console.log("❌ No billing data found");
      console.log("Response:", billingResponse.data);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
  }
}

testUserNameFix();
