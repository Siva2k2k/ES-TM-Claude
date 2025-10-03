const axios = require("axios");

async function testPreviewStructure() {
  try {
    // Login first
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.tokens.accessToken;

    // Test preview endpoint
    const previewResponse = await axios.post(
      "http://localhost:3001/api/v1/reports/preview",
      {
        template_id: "employee-timesheet-summary",
        date_range: {
          start: "2024-10-01",
          end: "2024-10-31",
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

    console.log("Preview Response Status:", previewResponse.status);
    console.log("Preview Response Data Structure:");
    console.log(JSON.stringify(previewResponse.data, null, 2));
  } catch (error) {
    console.log("Preview test failed:", error.response?.status);
    console.log("Error:", JSON.stringify(error.response?.data, null, 2));
  }
}

testPreviewStructure();
