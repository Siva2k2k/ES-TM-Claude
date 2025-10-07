const axios = require("axios");

async function comprehensiveTest() {
  try {
    console.log("🔍 COMPREHENSIVE BACKEND TESTING...\n");

    // Test 1: Login and get fresh token
    console.log("1️⃣ Testing Authentication...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    if (loginResponse.data.success) {
      console.log("✅ Login successful");
      const token = loginResponse.data.token;

      // Test 2: Billing data with user names
      console.log("\n2️⃣ Testing User Names in Billing Data...");
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
            "Content-Type": "application/json",
          },
        }
      );

      if (billingResponse.data.success) {
        console.log("✅ Billing API call successful");

        if (billingResponse.data.data.length > 0) {
          const project = billingResponse.data.data[0];
          const user = project.resources?.[0];

          if (user) {
            console.log(`👤 User Name: "${user.user_name}"`);

            if (user.user_name === "John Developer H") {
              console.log("🎉 SUCCESS: User name fixed!");
            } else if (user.user_name.includes("undefined")) {
              console.log("❌ STILL BROKEN: Contains undefined");
            } else {
              console.log("⚠️ UNEXPECTED:", user.user_name);
            }
          } else {
            console.log("❌ No user resource found");
          }
        } else {
          console.log("❌ No billing data found for date range");
        }
      } else {
        console.log("❌ Billing API failed:", billingResponse.data.message);
      }

      // Test 3: Export functionality
      console.log("\n3️⃣ Testing Export Functionality...");
      const exportResponse = await axios.get(
        "http://localhost:3001/api/v1/billing/export",
        {
          params: {
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            format: "csv",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (exportResponse.status === 200) {
        console.log("✅ Export endpoint accessible");
        console.log(
          "📄 Response type:",
          exportResponse.headers["content-type"]
        );
        console.log(
          "📊 Response size:",
          exportResponse.data.length || "Unknown"
        );

        if (exportResponse.headers["content-type"]?.includes("csv")) {
          console.log("🎉 CSV export working!");
        } else {
          console.log("⚠️ Export format might be different");
        }
      } else {
        console.log("❌ Export failed with status:", exportResponse.status);
      }
    } else {
      console.log("❌ Login failed:", loginResponse.data.message);
    }
  } catch (error) {
    console.error("\n❌ Error occurred:", error.message);

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response:", error.response.data);
    }
  }
}

comprehensiveTest();
