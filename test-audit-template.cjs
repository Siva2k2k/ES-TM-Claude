const axios = require("axios");

async function testAuditReportTemplate() {
  try {
    console.log("🔍 Testing admin-system-audit template...\n");

    // Login as super admin
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "admin@company.com", // Super admin user
        password: "admin123",
      }
    );

    const token = loginResponse.data.tokens.accessToken;
    console.log("✅ Authenticated as super admin\n");

    // Test preview endpoint for admin-system-audit
    const previewResponse = await axios.post(
      "http://localhost:3001/api/v1/reports/preview",
      {
        template_id: "admin-system-audit",
        date_range: {
          start: "2025-09-01",
          end: "2025-10-03",
        },
        filters: {},
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📋 Preview Response Status:", previewResponse.status);

    if (previewResponse.data.success) {
      const report = previewResponse.data.report;
      console.log("✅ Template works successfully!");
      console.log("📊 Data records found:", report.data?.length || 0);
      console.log("📝 Template name:", report.template?.name);

      if (report.data && report.data.length > 0) {
        console.log("🔍 Sample record keys:", Object.keys(report.data[0]));
        console.log(
          "📄 Sample record:",
          JSON.stringify(report.data[0], null, 2)
        );
      } else {
        console.log("ℹ️  No audit log data found in date range");
      }
    } else {
      console.log("❌ Preview failed:", previewResponse.data);
    }
  } catch (error) {
    if (error.response) {
      console.log("❌ Error Status:", error.response.status);
      console.log(
        "❌ Error Response:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.log("❌ Network Error:", error.message);
    }
  }
}

testAuditReportTemplate();
