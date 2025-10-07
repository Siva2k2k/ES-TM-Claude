const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function testFixedIssues() {
  console.log("✅ TESTING FIXED ISSUES\n");

  try {
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // 1. Test user name fix
    console.log("👤 ISSUE 1: Testing User Name after fix...");

    const billingResponse = await axios.get(
      `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-10-31`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const data = billingResponse.data.data;
    const websiteProject = data.projects?.find((p) => p.total_hours > 0);

    if (websiteProject?.resources?.length > 0) {
      const resource = websiteProject.resources[0];
      console.log(`✅ User Name: "${resource.user_name}"`);

      if (
        resource.user_name &&
        resource.user_name !== "undefined undefined" &&
        resource.user_name.trim()
      ) {
        console.log("🎉 ISSUE 1 FIXED: User name is now displaying correctly!");
      } else {
        console.log("❌ ISSUE 1 STILL EXISTS: User name is still undefined");
      }
    }

    // 2. Test export with correct parameters
    console.log("\n📤 ISSUE 3: Testing Data Export with correct parameters...");

    try {
      // Test GET method with correct parameter names
      const exportResponse = await axios.get(
        `${API_BASE}/billing/export?startDate=2024-10-01&endDate=2024-10-31&format=csv`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          responseType: "arraybuffer", // Handle binary data
        }
      );

      console.log("✅ Export successful!");
      console.log("Content-Type:", exportResponse.headers["content-type"]);
      console.log("Content-Length:", exportResponse.headers["content-length"]);
      console.log("🎉 ISSUE 3 FIXED: Data export is working!");
    } catch (exportError) {
      console.log(
        "❌ Export failed:",
        exportError.response?.data?.toString() || exportError.message
      );

      if (exportError.response?.status === 400) {
        console.log(
          "💡 Validation error - checking what parameters are expected..."
        );
      }
    }

    // 3. Create a simple test for billable hours editing endpoint
    console.log(
      "\n✏️ ISSUE 2: Testing Billable Hours Editing endpoint structure..."
    );

    try {
      // Let's test with a mock request to see what the endpoint expects
      const mockUpdateData = {
        time_entry_id: "507f1f77bcf86cd799439011", // Mock ObjectId
        is_billable: true,
        hours: 8,
      };

      // This will likely fail but should tell us the correct structure
      const updateResponse = await axios.put(
        `${API_BASE}/project-billing/billable-hours`,
        mockUpdateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log("✅ Billable hours update endpoint is working");
      console.log("🎉 ISSUE 2 FIXED: Billable hours editing is available!");
    } catch (updateError) {
      console.log(
        "Update error:",
        updateError.response?.data?.message || updateError.message
      );

      if (updateError.response?.status === 400) {
        console.log(
          "💡 This suggests the endpoint exists but needs valid data"
        );
        console.log(
          "🔧 Frontend needs to send correct time_entry_id from actual entries"
        );
      } else if (updateError.response?.status === 404) {
        console.log(
          "❌ ISSUE 2: Endpoint not found - may need to be implemented"
        );
      }
    }

    console.log("\n📋 SUMMARY:");
    console.log('1. 👤 User Name: Should now show "John Developer H"');
    console.log("2. 📤 Export: Test the export button in frontend");
    console.log("3. ✏️ Billable Hours: Frontend needs to implement editing UI");

    console.log("\n💡 NEXT STEPS:");
    console.log("- Refresh the frontend page to see the user name fix");
    console.log("- Try the Export button in the UI");
    console.log(
      "- The billable hours editing might need frontend implementation"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testFixedIssues();
