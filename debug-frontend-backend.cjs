const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugFrontendBackendConnection() {
  console.log("🔍 DEBUGGING FRONTEND-BACKEND CONNECTION\n");

  try {
    // Test the exact API call the frontend should be making
    console.log("📡 Testing backend API directly...");

    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Test with the date range shown in the UI (30-09-2025 to 30-10-2025)
    const startDate = "2025-09-30";
    const endDate = "2025-10-30";

    console.log(`📅 Testing with UI date range: ${startDate} to ${endDate}`);

    try {
      const billingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log("\n✅ Backend Response (UI date range):");
      const data = billingResponse.data.data;
      console.log(`   Total Hours: ${data.summary?.total_hours || 0}`);
      console.log(
        `   Billable Hours: ${data.summary?.total_billable_hours || 0}`
      );
      console.log(`   Total Amount: $${data.summary?.total_amount || 0}`);

      if (data.summary?.total_hours === 0) {
        console.log("\n❌ ISSUE FOUND: UI date range has no data!");
        console.log("Our time entries are for 2024-10-16 to 2024-10-20");
        console.log("But UI is querying 2025-09-30 to 2025-10-30");
      }
    } catch (error) {
      console.log(
        "❌ Backend API error:",
        error.response?.data || error.message
      );
    }

    // Test with our correct date range (where we have data)
    console.log("\n📅 Testing with correct date range (where we have data)...");
    const correctStartDate = "2024-10-01";
    const correctEndDate = "2024-10-31";

    try {
      const correctBillingResponse = await axios.get(
        `${API_BASE}/project-billing/projects?startDate=${correctStartDate}&endDate=${correctEndDate}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      console.log(
        `\n✅ Backend Response (correct date range ${correctStartDate} to ${correctEndDate}):`
      );
      const correctData = correctBillingResponse.data.data;
      console.log(`   Total Hours: ${correctData.summary?.total_hours || 0}`);
      console.log(
        `   Billable Hours: ${correctData.summary?.total_billable_hours || 0}`
      );
      console.log(
        `   Total Amount: $${correctData.summary?.total_amount || 0}`
      );

      if (correctData.summary?.total_hours > 0) {
        console.log("\n🎯 SOLUTION FOUND!");
        console.log(
          "The backend has data for October 2024, but the UI is querying October 2025"
        );
        console.log("\n📋 To fix this:");
        console.log("1. Change the UI date range to October 2024");
        console.log(
          "2. OR create time entries for the current date range (October 2025)"
        );

        console.log("\n📊 Available data breakdown:");
        correctData.projects?.forEach((project) => {
          if (project.total_hours > 0) {
            console.log(
              `   ${project.project_name}: ${project.total_hours}h, $${project.total_amount}`
            );
          }
        });
      }
    } catch (error) {
      console.log(
        "❌ Correct date range error:",
        error.response?.data || error.message
      );
    }

    // Check CORS and frontend connection
    console.log("\n🌐 Checking CORS and frontend setup...");
    console.log("Backend is running on: http://localhost:3001");
    console.log("Frontend should be on: http://localhost:5173");
    console.log("CORS origin from .env: http://localhost:5173");

    // Test if frontend can reach backend
    console.log("\n🔧 Testing cross-origin request...");
    try {
      const corsTestResponse = await axios.get(`${API_BASE}/health`, {
        headers: {
          Origin: "http://localhost:5173",
          Authorization: `Bearer ${adminToken}`,
        },
      });
      console.log("✅ CORS appears to be working");
    } catch (corsError) {
      console.log(
        "❌ CORS issue:",
        corsError.response?.data || corsError.message
      );
    }

    console.log("\n💡 RECOMMENDATIONS:");
    console.log("1. 📅 In the frontend UI, change the date range to:");
    console.log(`   Start Date: ${correctStartDate} (2024-10-01)`);
    console.log(`   End Date: ${correctEndDate} (2024-10-31)`);
    console.log("2. 🔄 Refresh the page after changing dates");
    console.log("3. 🔍 Check browser dev tools for any API errors");
    console.log(
      "4. ✅ Verify frontend is making calls to http://localhost:3001/api/v1/project-billing/projects"
    );
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugFrontendBackendConnection();
