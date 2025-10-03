const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Test configuration
const BASE_URL = "http://localhost:3001";
const TEST_USER = {
  email: "employee1@company.com",
  password: "admin123",
};

// Test data for report generation (using employee-accessible templates)
const REPORT_CONFIGS = [
  {
    templateId: "employee-timesheet-summary",
    name: "Employee Timesheet Summary",
    expectedFields: [
      "Week Start",
      "Week End",
      "Total Hours",
      "Status",
      "Submitted At",
    ],
  },
  {
    templateId: "employee-performance",
    name: "Employee Performance Report",
    expectedFields: [
      "Period",
      "Total Hours",
      "Projects",
      "Tasks Completed",
      "Productivity Score",
    ],
  },
];

let authToken = "";

async function login() {
  try {
    console.log("🔑 Authenticating user...");
    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      TEST_USER
    );

    if (
      response.data &&
      response.data.tokens &&
      response.data.tokens.accessToken
    ) {
      authToken = response.data.tokens.accessToken;
      console.log("✅ Authentication successful");
      console.log(
        `User: ${response.data.user.full_name} (${response.data.user.role})`
      );
      return true;
    } else {
      console.log("❌ Authentication failed - no token received");
      return false;
    }
  } catch (error) {
    console.log(
      "❌ Authentication failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testReportGeneration(templateId, format, name) {
  try {
    console.log(`\n📊 Testing ${format.toUpperCase()} generation for: ${name}`);

    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer", // All file formats return binary data
    };

    const payload = {
      template_id: templateId,
      format: format,
      date_range: {
        start: "2024-10-01",
        end: "2024-10-31",
      },
      filters: {},
    };

    const response = await axios.post(
      `${BASE_URL}/api/v1/reports/generate`,
      payload,
      config
    );

    const fileSize = response.data.byteLength;
    console.log(
      `✅ ${format.toUpperCase()} generated successfully (${fileSize} bytes)`
    );

    // Save file for manual inspection with proper extension
    const extensionMap = {
      excel: "xlsx",
      csv: "csv",
      pdf: "pdf",
    };
    const fileExtension = extensionMap[format] || format;
    const fileName = `test-${templateId}-${Date.now()}.${fileExtension}`;
    fs.writeFileSync(fileName, Buffer.from(response.data));
    console.log(`📄 ${format.toUpperCase()} saved as: ${fileName}`);

    // Check if it's a valid file (not HTML error page)
    const buffer = Buffer.from(response.data);
    const isValidFile =
      format === "pdf"
        ? buffer.toString("ascii", 0, 5) === "%PDF-"
        : format === "csv"
        ? !buffer.toString().includes("<html>")
        : fileSize > 1000; // Excel files should be reasonably sized

    return {
      success: true,
      size: fileSize,
      isValidFile: isValidFile,
      fileName: fileName,
    };
  } catch (error) {
    console.log(
      `❌ ${format.toUpperCase()} generation failed:`,
      error.response?.data?.message || error.message
    );
    if (error.response?.status) {
      console.log(`Status: ${error.response.status}`);
    }
    return { success: false, error: error.message };
  }
}

async function testPreviewVsDownload(templateId, name) {
  try {
    console.log(`\n🔍 Testing Preview vs Download consistency for: ${name}`);

    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    };

    const payload = {
      template_id: templateId,
      date_range: {
        start: "2024-10-01",
        end: "2024-10-31",
      },
      filters: {},
    };

    // Test preview
    const previewResponse = await axios.post(
      `${BASE_URL}/api/v1/reports/preview`,
      payload,
      config
    );

    // Test download (CSV format for data comparison) - use JSON response for preview comparison
    const downloadPayload = { ...payload, format: "csv" };
    const downloadConfig = {
      ...config,
      responseType: "json", // We want to compare data structure, not binary
    };
    const downloadResponse = await axios.post(
      `${BASE_URL}/api/v1/reports/generate`,
      downloadPayload,
      downloadConfig
    );

    console.log(
      "📋 Preview data structure:",
      Object.keys(previewResponse.data)
    );
    console.log(
      "📋 Download data structure:",
      Object.keys(downloadResponse.data)
    );

    if (previewResponse.data.data && downloadResponse.data.data) {
      const previewHeaders = Object.keys(previewResponse.data.data[0] || {});
      const downloadHeaders = Object.keys(downloadResponse.data.data[0] || {});

      console.log(`📊 Preview headers: ${previewHeaders.join(", ")}`);
      console.log(`📊 Download headers: ${downloadHeaders.join(", ")}`);

      const headersMatch =
        JSON.stringify(previewHeaders.sort()) ===
        JSON.stringify(downloadHeaders.sort());
      console.log(
        `🎯 Headers consistency: ${headersMatch ? "✅ MATCH" : "❌ DIFFERENT"}`
      );

      return {
        success: true,
        previewCount: previewResponse.data.data.length,
        downloadCount: downloadResponse.data.data.length,
        headersMatch: headersMatch,
        previewHeaders: previewHeaders,
        downloadHeaders: downloadHeaders,
      };
    } else {
      console.log("⚠️ Missing data in preview or download response");
      return { success: false, error: "Missing data arrays" };
    }
  } catch (error) {
    console.log(
      "❌ Preview vs Download test failed:",
      error.response?.data?.message || error.message
    );
    return { success: false, error: error.message };
  }
}

async function runConsistencyTests() {
  console.log("🚀 Starting Report Format Consistency Tests\n");
  console.log("Testing Issues:");
  console.log("1. Preview and Downloads are totally different");
  console.log("2. CSV has not populated with all data as in PDF");
  console.log(
    "3. Excel format is wrong, it didn't even try to open in excel\n"
  );

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log("❌ Cannot proceed without authentication");
    return;
  }

  const results = {
    pdf: {},
    csv: {},
    excel: {},
    preview: {},
  };

  // Test each report configuration
  for (const config of REPORT_CONFIGS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🧪 Testing Report: ${config.name}`);
    console.log(`Template ID: ${config.templateId}`);
    console.log(`Expected Fields: ${config.expectedFields.join(", ")}`);

    // Test all formats
    results.pdf[config.templateId] = await testReportGeneration(
      config.templateId,
      "pdf",
      config.name
    );
    results.csv[config.templateId] = await testReportGeneration(
      config.templateId,
      "csv",
      config.name
    );
    results.excel[config.templateId] = await testReportGeneration(
      config.templateId,
      "excel",
      config.name
    );

    // Test preview vs download consistency
    results.preview[config.templateId] = await testPreviewVsDownload(
      config.templateId,
      config.name
    );
  }

  // Summary Report
  console.log("\n" + "=".repeat(60));
  console.log("📈 CONSISTENCY TEST SUMMARY");
  console.log("=".repeat(60));

  let allPassed = true;

  for (const config of REPORT_CONFIGS) {
    const templateId = config.templateId;
    console.log(`\n📊 ${config.name} (${templateId}):`);

    // Format generation success
    const pdfSuccess = results.pdf[templateId]?.success;
    const csvSuccess = results.csv[templateId]?.success;
    const excelSuccess = results.excel[templateId]?.success;
    const previewSuccess = results.preview[templateId]?.success;

    console.log(`  PDF Generation: ${pdfSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`  CSV Generation: ${csvSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(
      `  Excel Generation: ${excelSuccess ? "✅ SUCCESS" : "❌ FAILED"}`
    );
    console.log(
      `  Preview Consistency: ${previewSuccess ? "✅ SUCCESS" : "❌ FAILED"}`
    );

    if (results.preview[templateId]?.headersMatch !== undefined) {
      console.log(
        `  Headers Match: ${
          results.preview[templateId].headersMatch ? "✅ MATCH" : "❌ DIFFERENT"
        }`
      );
    }

    // Check if all formats succeeded
    const allFormatsWorking =
      pdfSuccess && csvSuccess && excelSuccess && previewSuccess;
    if (!allFormatsWorking) {
      allPassed = false;
    }

    // Data consistency check
    if (csvSuccess && results.csv[templateId].recordCount > 0) {
      console.log(`  CSV Record Count: ${results.csv[templateId].recordCount}`);
      console.log(
        `  CSV Headers: ${results.csv[templateId].headers.join(", ")}`
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    `🎯 OVERALL STATUS: ${
      allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"
    }`
  );
  console.log("=".repeat(60));

  // Specific issue analysis
  console.log("\n📋 ISSUE RESOLUTION STATUS:");
  console.log(
    "1. Preview vs Download consistency: Check individual test results above"
  );
  console.log("2. CSV data population: Check CSV record counts and headers");
  console.log(
    "3. Excel file corruption: Check Excel generation success status"
  );

  return allPassed;
}

// Run the tests
runConsistencyTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Test execution failed:", error);
    process.exit(1);
  });
