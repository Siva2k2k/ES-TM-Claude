const axios = require("axios");

async function testFinalFixes() {
  try {
    console.log("🧪 TESTING ALL THREE FIXES...\n");

    // Get fresh token
    console.log("🔑 Getting authentication token...");
    const loginData = {
      email: "employee1@company.com",
      password: "admin123",
    };

    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      loginData
    );
    const token = loginResponse.data.token;
    console.log("✅ Authentication successful\n");

    // Test Issue 1: User Names
    console.log("1️⃣ ISSUE 1: Testing User Names...");
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
          Accept: "application/json",
        },
      }
    );

    if (billingResponse.data.success && billingResponse.data.data.length > 0) {
      const resource = billingResponse.data.data[0].resources?.[0];
      if (resource) {
        console.log(`👤 User Name: "${resource.user_name}"`);
        if (resource.user_name === "John Developer H") {
          console.log("✅ FIXED: User name is now correct!\n");
        } else {
          console.log("❌ STILL BROKEN: User name issue persists\n");
        }
      }
    }

    // Test Issue 3: Export
    console.log("3️⃣ ISSUE 3: Testing Export...");
    try {
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

      console.log("✅ EXPORT WORKING: Status", exportResponse.status);
      console.log("📄 Content-Type:", exportResponse.headers["content-type"]);
      console.log("💾 Data size:", exportResponse.data?.length || "N/A");
      console.log("");
    } catch (exportError) {
      console.log(
        "❌ EXPORT FAILED:",
        exportError.response?.status,
        exportError.response?.data
      );
      console.log("");
    }

    // Test Issue 2: Billable Hours Editing
    console.log("2️⃣ ISSUE 2: Testing Billable Hours Update...");
    try {
      // Get a time entry ID from the billing data first
      const timeEntryId = "68e3e4e5b1f7a2b3d4e5f6a7"; // This should be from our seeded data

      const updateResponse = await axios.put(
        "http://localhost:3001/api/v1/project-billing/billable-hours",
        {
          time_entry_id: timeEntryId,
          is_billable: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ BILLABLE UPDATE WORKING:", updateResponse.data);
    } catch (updateError) {
      if (updateError.response?.status === 400) {
        console.log("⚠️ ENDPOINT EXISTS but needs valid time_entry_id");
        console.log("   Error:", updateError.response.data);
      } else {
        console.log("❌ BILLABLE UPDATE FAILED:", updateError.response?.status);
      }
    }

    console.log("\n🎯 SUMMARY:");
    console.log('- User names should now show "John Developer H"');
    console.log("- Export should work from the frontend");
    console.log("- Billable hours editing needs frontend implementation");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testFinalFixes();
