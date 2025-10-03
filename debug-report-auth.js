/**
 * Debug report generation with proper authentication
 * This will help identify if the issue is auth, template ID, or payload structure
 */

import axios from "axios";

const BASE_URL = "http://localhost:3001";

async function debugReportWithAuth() {
  console.log("🔍 Debugging report generation with authentication...\n");

  try {
    // First, try to login to get a valid token
    console.log("1. Attempting login...");
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: "admin@company.com", // Use actual seeded admin user
      password: "admin123",
    });

    if (!loginResponse.data.token) {
      console.log("❌ Login failed - no token received");
      return;
    }

    const token = loginResponse.data.token;
    console.log("✅ Login successful, token received");

    // 2. Get available templates to see what IDs exist
    console.log("\n2. Fetching available templates...");
    const templatesResponse = await axios.get(
      `${BASE_URL}/api/v1/reports/templates`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (templatesResponse.data && Array.isArray(templatesResponse.data)) {
      console.log(`✅ Found ${templatesResponse.data.length} templates:`);
      templatesResponse.data.slice(0, 3).forEach((template) => {
        console.log(
          `   • ${template.template_id}: ${template.name} (${template.category})`
        );
      });
    } else {
      console.log("❌ No templates found or invalid response");
      return;
    }

    // 3. Try to generate report with first available template
    const firstTemplate = templatesResponse.data[0];
    console.log(
      `\n3. Testing report generation with template: ${firstTemplate.template_id}`
    );

    const reportPayload = {
      template_id: firstTemplate.template_id,
      date_range: {
        start: new Date("2024-09-01").toISOString(),
        end: new Date("2024-10-03").toISOString(),
      },
      format: "pdf",
      filters: {},
    };

    console.log("Payload:", JSON.stringify(reportPayload, null, 2));

    const reportResponse = await axios.post(
      `${BASE_URL}/api/v1/reports/generate`,
      reportPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        responseType: "arraybuffer", // For PDF response
        timeout: 30000, // 30 second timeout
      }
    );

    console.log(
      `✅ Report generation successful! Response size: ${reportResponse.data.byteLength} bytes`
    );
    console.log("Response headers:", reportResponse.headers);
  } catch (error) {
    if (error.response) {
      console.log(
        `❌ Error ${error.response.status}: ${error.response.statusText}`
      );

      // Try to parse error response
      if (error.response.data) {
        try {
          // If it's arraybuffer, convert to string
          let errorData = error.response.data;
          if (errorData instanceof ArrayBuffer) {
            errorData = new TextDecoder().decode(errorData);
          }

          if (typeof errorData === "string") {
            try {
              errorData = JSON.parse(errorData);
            } catch {
              console.log("Error response (text):", errorData);
              return;
            }
          }

          console.log("Error details:", errorData);

          // Check for validation errors
          if (error.response.status === 400) {
            console.log("\n💡 400 Bad Request Analysis:");
            console.log("- This suggests a validation error in the payload");
            console.log(
              "- Check if all required fields are present and correctly formatted"
            );
            console.log("- Verify template_id exists in database");
            console.log("- Ensure dates are valid ISO8601 format");
          }
        } catch (parseError) {
          console.log("Could not parse error response");
        }
      }
    } else {
      console.log("❌ Network error:", error.message);
    }
  }
}

debugReportWithAuth().catch(console.error);
