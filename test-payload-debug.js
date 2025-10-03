/**
 * Test the report generation payload to identify the 400 error
 */

import axios from "axios";

const BASE_URL = "http://localhost:3001";

async function testReportPayload() {
  console.log("🧪 Testing report generation payload structure...\n");

  // Get a token (try to use an existing one from localStorage in browser)
  const testPayloads = [
    // Test 1: Correct structure based on backend controller
    {
      name: "Backend Expected Structure",
      payload: {
        template_id: "employee-payslip", // Based on our seeded templates
        date_range: {
          start: new Date("2024-09-01").toISOString(),
          end: new Date("2024-10-03").toISOString(),
        },
        format: "pdf",
        filters: {},
      },
    },
    // Test 2: Alternative structure that frontend might be using
    {
      name: "Alternative Structure",
      payload: {
        templateId: "employee-payslip",
        dateRange: {
          start: "2024-09-01",
          end: "2024-10-03",
        },
        format: "pdf",
        filters: {},
      },
    },
    // Test 3: Check what validation errors we get
    {
      name: "Invalid Structure (for error checking)",
      payload: {
        template: "employee-payslip", // Wrong field name
        dates: {
          from: "2024-09-01",
          to: "2024-10-03",
        },
        format: "pdf",
      },
    },
  ];

  for (const test of testPayloads) {
    console.log(`📋 Testing: ${test.name}`);
    console.log("Payload:", JSON.stringify(test.payload, null, 2));

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/reports/generate`,
        test.payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token-for-debugging", // This will fail but show us validation errors
          },
          timeout: 5000,
        }
      );

      console.log("✅ Success:", response.status);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}:`, error.response.data);

        // Check for validation errors specifically
        if (error.response.status === 400) {
          console.log(
            "   📝 This is likely a validation error (400 Bad Request)"
          );
          if (error.response.data.message || error.response.data.error) {
            console.log(
              "   💡 Error details:",
              error.response.data.message || error.response.data.error
            );
          }
        } else if (error.response.status === 401) {
          console.log(
            "   🔐 This is an auth error (expected without valid token)"
          );
        }
      } else {
        console.log("❌ Network Error:", error.message);
      }
    }
    console.log("");
  }

  console.log("🎯 Analysis:");
  console.log(
    "- If all tests show 401 (Unauthorized), the payload structure is likely correct"
  );
  console.log(
    "- If test 1 shows 401 but others show 400, the backend expects template_id format"
  );
  console.log(
    "- If all tests show 400, there might be a deeper validation issue"
  );
  console.log("");
  console.log("📋 Backend validation requirements (from controller):");
  console.log("- template_id: string (required)");
  console.log("- date_range.start: ISO8601 string (required)");
  console.log("- date_range.end: ISO8601 string (required)");
  console.log('- format: "pdf" | "excel" | "csv" (required)');
  console.log("- filters: object (optional)");
}

testReportPayload().catch(console.error);
