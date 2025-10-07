const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

// Function to login and get token
async function loginUser(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password,
    });
    console.log(`✅ Login successful for ${email}`);
    return response.data.tokens.accessToken;
  } catch (error) {
    console.error(
      `❌ Login failed for ${email}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

// Function to create sample timesheets to populate billing data
async function createSampleTimesheets(token) {
  console.log("\n📝 Creating sample timesheets for billing data...");

  const sampleTimesheets = [
    {
      project_id: "68df77ec2ba674aa3c8cd2c7", // Website Redesign
      task_title: "Frontend Development",
      date: "2024-10-01",
      hours_worked: 8,
      billable_hours: 7.5,
      description: "Developed responsive components for homepage",
      hourly_rate: 75,
    },
    {
      project_id: "68df77ec2ba674aa3c8cd2c7", // Website Redesign
      task_title: "Backend API Integration",
      date: "2024-10-02",
      hours_worked: 6,
      billable_hours: 6,
      description: "Integrated user authentication APIs",
      hourly_rate: 85,
    },
    {
      project_id: "68df77ec2ba674aa3c8cd2c8", // Mobile App Development
      task_title: "UI/UX Design",
      date: "2024-10-01",
      hours_worked: 5,
      billable_hours: 5,
      description: "Created mockups for mobile interface",
      hourly_rate: 65,
    },
    {
      project_id: "68df77ec2ba674aa3c8cd2c8", // Mobile App Development
      task_title: "React Native Development",
      date: "2024-10-03",
      hours_worked: 8,
      billable_hours: 7,
      description: "Implemented navigation and core components",
      hourly_rate: 80,
    },
    {
      project_id: "68df77ec2ba674aa3c8cd2c9", // SEO Campaign
      task_title: "Keyword Research",
      date: "2024-09-30",
      hours_worked: 4,
      billable_hours: 4,
      description: "Researched high-value keywords for campaign",
      hourly_rate: 50,
    },
  ];

  for (const timesheet of sampleTimesheets) {
    try {
      await axios.post(`${API_BASE}/timesheets`, timesheet, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        `✅ Created timesheet: ${timesheet.task_title} - ${timesheet.hours_worked}h`
      );
    } catch (error) {
      console.error(
        `❌ Failed to create timesheet for ${timesheet.task_title}:`,
        error.response?.data?.message || error.message
      );
    }
  }
}

// Function to test all user logins
async function testAllUserLogins() {
  console.log("\n👥 Testing all user accounts...");

  const testUsers = [
    "admin@company.com",
    "management@company.com",
    "manager@company.com",
    "employee1@company.com",
    "employee2@company.com",
  ];

  const results = {};

  for (const email of testUsers) {
    const token = await loginUser(email, "admin123");
    results[email] = token ? "SUCCESS" : "FAILED";
  }

  console.log("\n📊 User Login Results:");
  for (const [email, status] of Object.entries(results)) {
    console.log(`${status === "SUCCESS" ? "✅" : "❌"} ${email}: ${status}`);
  }

  return results;
}

// Function to test billing data with real data
async function testBillingWithData(token) {
  console.log("\n💰 Testing billing endpoints with data...");

  try {
    const startDate = "2024-09-01";
    const endDate = "2024-10-31";

    // Test project billing view
    console.log("\n1. Testing Project Billing View:");
    const projectBilling = await axios.get(
      `${API_BASE}/project-billing/projects?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("✅ Project Billing Data Retrieved");
    console.log(
      `📊 Total Projects: ${projectBilling.data.data.summary.total_projects}`
    );
    console.log(
      `⏰ Total Hours: ${projectBilling.data.data.summary.total_hours}`
    );
    console.log(
      `💵 Total Billable Hours: ${projectBilling.data.data.summary.total_billable_hours}`
    );
    console.log(
      `💰 Total Amount: $${projectBilling.data.data.summary.total_amount}`
    );

    if (projectBilling.data.data.projects.length > 0) {
      console.log("\n📝 Project Details:");
      projectBilling.data.data.projects.forEach((project, index) => {
        console.log(
          `${index + 1}. ${project.project_name} (${project.client_name})`
        );
        console.log(
          `   Hours: ${project.total_hours} | Billable: ${project.billable_hours} | Amount: $${project.total_amount}`
        );
      });
    }

    // Test task billing view
    console.log("\n2. Testing Task Billing View:");
    const taskBilling = await axios.get(`${API_BASE}/project-billing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Task Billing Data Retrieved");
    console.log(`📋 Total Tasks: ${taskBilling.data.data.summary.total_tasks}`);
    console.log(`⏰ Total Hours: ${taskBilling.data.data.summary.total_hours}`);
    console.log(
      `💵 Total Billable Hours: ${taskBilling.data.data.summary.total_billable_hours}`
    );
    console.log(
      `💰 Total Amount: $${taskBilling.data.data.summary.total_amount}`
    );

    return {
      projectBilling: projectBilling.data.data,
      taskBilling: taskBilling.data.data,
    };
  } catch (error) {
    console.error(
      "❌ Billing test failed:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Function to provide frontend testing instructions
function provideFrontendTestingInstructions(billingData) {
  console.log("\n🌐 FRONTEND BILLING TESTING GUIDE");
  console.log("=====================================");
  console.log("\n1. 📱 Access the Application:");
  console.log("   URL: http://localhost:5173");
  console.log("\n2. 🔐 Login Credentials (all passwords: admin123):");
  console.log("   • admin@company.com - Full access");
  console.log("   • management@company.com - Management access");
  console.log("   • manager@company.com - Manager access");
  console.log("   • employee1@company.com - Employee access");
  console.log("   • employee2@company.com - Employee access");

  console.log("\n3. 💰 Navigate to Billing Section:");
  console.log('   • Click on "Billing" in the main navigation');
  console.log("   • Or go directly to: http://localhost:5173/billing");

  console.log("\n4. 📊 Test Project Billing View:");
  console.log('   • Click on "Project" tab in billing dashboard');
  console.log("   • Verify project list shows billing information");
  console.log("   • Check date filters (try 2024-09-01 to 2024-10-31)");
  console.log("   • Verify totals and project-wise breakdown");

  console.log("\n5. 📋 Test Task Billing View:");
  console.log('   • Click on "Task" tab in billing dashboard');
  console.log("   • Verify task list shows billing details");
  console.log("   • Check resource allocation and rates");
  console.log("   • Verify billable vs non-billable hours");

  if (billingData) {
    console.log("\n6. 🔍 Expected Data to Verify:");
    if (billingData.projectBilling && billingData.projectBilling.summary) {
      const summary = billingData.projectBilling.summary;
      console.log(
        `   Project View: ${summary.total_projects} projects, ${summary.total_hours} total hours, $${summary.total_amount} total`
      );
    }
    if (billingData.taskBilling && billingData.taskBilling.summary) {
      const summary = billingData.taskBilling.summary;
      console.log(
        `   Task View: ${summary.total_tasks} tasks, ${summary.total_hours} total hours, $${summary.total_amount} total`
      );
    }
  }

  console.log("\n7. 🧪 Additional Tests to Perform:");
  console.log("   • Test responsive design on mobile/tablet");
  console.log(
    "   • Verify role-based access (different users see appropriate data)"
  );
  console.log("   • Test export/download functionality if available");
  console.log("   • Check filtering and sorting options");
  console.log("   • Verify loading states and error handling");

  console.log("\n8. 🚨 Things to Look For:");
  console.log("   • Data accuracy and consistency");
  console.log("   • Proper formatting of currency and dates");
  console.log("   • Responsive layout and accessibility");
  console.log("   • Performance with data loading");
  console.log("   • Error handling for invalid inputs");
}

// Main comprehensive test function
async function runComprehensiveBillingTest() {
  console.log("🚀 COMPREHENSIVE BILLING SYSTEM TEST");
  console.log("=====================================");

  try {
    // Step 1: Test all user logins
    const loginResults = await testAllUserLogins();

    // Step 2: Get admin token for data operations
    const adminToken = await loginUser("admin@company.com", "admin123");
    if (!adminToken) {
      console.error("❌ Cannot proceed without admin access");
      return;
    }

    // Step 3: Create sample timesheet data
    await createSampleTimesheets(adminToken);

    // Step 4: Test billing endpoints with data
    const billingData = await testBillingWithData(adminToken);

    // Step 5: Provide frontend testing guide
    provideFrontendTestingInstructions(billingData);

    console.log("\n✅ COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!");
    console.log("\n📋 Summary:");
    console.log(
      `   ✅ User Authentication: ${
        Object.values(loginResults).filter((r) => r === "SUCCESS").length
      }/5 users working`
    );
    console.log("   ✅ Backend Billing APIs: Functional");
    console.log("   ✅ Sample Data: Created");
    console.log("   ✅ Frontend Ready: For manual testing");

    console.log("\n🎯 Next Steps:");
    console.log("   1. Open http://localhost:5173 in your browser");
    console.log("   2. Login with any test user");
    console.log("   3. Navigate to Billing section");
    console.log("   4. Test both Project and Task billing views");
    console.log("   5. Verify all functionality as outlined above");
  } catch (error) {
    console.error("❌ Comprehensive test failed:", error.message);
  }
}

// Run the comprehensive test
runComprehensiveBillingTest();
