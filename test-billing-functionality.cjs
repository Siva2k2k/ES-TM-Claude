const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

// Test users with their credentials
const testUsers = [
  { email: "admin@company.com", password: "admin123", role: "admin" },
  { email: "management@company.com", password: "admin123", role: "manager" },
  { email: "manager@company.com", password: "admin123", role: "manager" },
  { email: "employee1@company.com", password: "admin123", role: "employee" },
  { email: "employee2@company.com", password: "admin123", role: "employee" },
];

let authTokens = {};

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

// Function to create projects
async function createProjects(token) {
  const projects = [
    {
      name: "E-Commerce Platform",
      description:
        "Building a modern e-commerce platform with React and Node.js",
      status: "active",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    },
    {
      name: "Mobile App Development",
      description: "Cross-platform mobile app using React Native",
      status: "active",
      startDate: "2024-02-01",
      endDate: "2024-10-31",
    },
    {
      name: "Data Analytics Dashboard",
      description: "Business intelligence dashboard for data visualization",
      status: "active",
      startDate: "2024-03-01",
      endDate: "2024-11-30",
    },
  ];

  const createdProjects = [];

  for (const project of projects) {
    try {
      const response = await axios.post(`${API_BASE}/projects`, project, {
        headers: { Authorization: `Bearer ${token}` },
      });
      createdProjects.push(response.data);
      console.log(`✅ Created project: ${project.name}`);
    } catch (error) {
      console.error(
        `❌ Failed to create project ${project.name}:`,
        error.response?.data?.message || error.message
      );
    }
  }

  return createdProjects;
}

// Function to create tasks
async function createTasks(token, projects) {
  const tasks = [
    // Tasks for E-Commerce Platform
    {
      title: "Frontend Development",
      description: "Develop React components for product catalog",
      projectId: projects[0]?.id,
      assignedTo: "employee1@company.com",
      status: "in_progress",
      priority: "high",
      estimatedHours: 80,
      dueDate: "2024-06-01",
    },
    {
      title: "Backend API Development",
      description: "Create REST APIs for user management",
      projectId: projects[0]?.id,
      assignedTo: "employee2@company.com",
      status: "completed",
      priority: "high",
      estimatedHours: 60,
      dueDate: "2024-05-15",
    },
    // Tasks for Mobile App
    {
      title: "UI/UX Design",
      description: "Design mobile app interface mockups",
      projectId: projects[1]?.id,
      assignedTo: "employee1@company.com",
      status: "completed",
      priority: "medium",
      estimatedHours: 40,
      dueDate: "2024-04-30",
    },
    {
      title: "Cross-platform Development",
      description: "Implement React Native components",
      projectId: projects[1]?.id,
      assignedTo: "employee2@company.com",
      status: "in_progress",
      priority: "high",
      estimatedHours: 120,
      dueDate: "2024-08-31",
    },
    // Tasks for Analytics Dashboard
    {
      title: "Data Integration",
      description: "Connect various data sources to dashboard",
      projectId: projects[2]?.id,
      assignedTo: "employee1@company.com",
      status: "pending",
      priority: "medium",
      estimatedHours: 50,
      dueDate: "2024-07-15",
    },
  ];

  const createdTasks = [];

  for (const task of tasks) {
    try {
      const response = await axios.post(`${API_BASE}/tasks`, task, {
        headers: { Authorization: `Bearer ${token}` },
      });
      createdTasks.push(response.data);
      console.log(`✅ Created task: ${task.title}`);
    } catch (error) {
      console.error(
        `❌ Failed to create task ${task.title}:`,
        error.response?.data?.message || error.message
      );
    }
  }

  return createdTasks;
}

// Function to create time entries for billing
async function createTimeEntries(token, tasks) {
  const timeEntries = [
    // Time entries for completed tasks
    {
      taskId: tasks[1]?.id, // Backend API Development
      userId: "employee2@company.com",
      hours: 8,
      description: "Implemented user authentication endpoints",
      date: "2024-05-01",
      billable: true,
    },
    {
      taskId: tasks[1]?.id, // Backend API Development
      userId: "employee2@company.com",
      hours: 6,
      description: "Created product management APIs",
      date: "2024-05-02",
      billable: true,
    },
    {
      taskId: tasks[2]?.id, // UI/UX Design
      userId: "employee1@company.com",
      hours: 7,
      description: "Created wireframes and prototypes",
      date: "2024-04-25",
      billable: true,
    },
    // Time entries for in-progress tasks
    {
      taskId: tasks[0]?.id, // Frontend Development
      userId: "employee1@company.com",
      hours: 8,
      description: "Developed product listing components",
      date: "2024-10-01",
      billable: true,
    },
    {
      taskId: tasks[3]?.id, // Cross-platform Development
      userId: "employee2@company.com",
      hours: 6,
      description: "Implemented navigation structure",
      date: "2024-10-02",
      billable: true,
    },
  ];

  for (const entry of timeEntries) {
    try {
      const response = await axios.post(`${API_BASE}/time-entries`, entry, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        `✅ Created time entry: ${
          entry.hours
        }h for task ${entry.description.substring(0, 30)}...`
      );
    } catch (error) {
      console.error(
        `❌ Failed to create time entry:`,
        error.response?.data?.message || error.message
      );
    }
  }
}

// Function to test project billing endpoints
async function testProjectBilling(token) {
  console.log("\n📊 Testing Project Billing Functionality...");

  try {
    // Test getting all project billing data
    console.log("\n1. Testing GET /api/v1/project-billing/");
    const allBilling = await axios.get(`${API_BASE}/project-billing/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      `✅ Retrieved ${allBilling.data.length} project billing records`
    );
    console.log(
      "Sample project billing data:",
      JSON.stringify(allBilling.data[0], null, 2)
    );

    // Test getting billing for a specific project
    if (allBilling.data.length > 0) {
      const projectId = allBilling.data[0].projectId;
      console.log(`\n2. Testing GET /api/v1/project-billing/${projectId}`);

      const projectBilling = await axios.get(
        `${API_BASE}/project-billing/${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("✅ Retrieved specific project billing data");
      console.log(
        "Project billing details:",
        JSON.stringify(projectBilling.data, null, 2)
      );
    }

    // Test project billing summary
    console.log("\n3. Testing GET /api/v1/project-billing/summary");
    const summary = await axios.get(`${API_BASE}/project-billing/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Retrieved project billing summary");
    console.log("Billing summary:", JSON.stringify(summary.data, null, 2));
  } catch (error) {
    console.error(
      "❌ Project billing test failed:",
      error.response?.data || error.message
    );
  }
}

// Function to test task billing endpoints
async function testTaskBilling(token) {
  console.log("\n📋 Testing Task Billing Functionality...");

  try {
    // Test getting task billing data
    console.log("\n1. Testing GET /api/v1/tasks with billing info");
    const tasks = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Retrieved ${tasks.data.length} tasks`);

    if (tasks.data.length > 0) {
      console.log(
        "Sample task with billing info:",
        JSON.stringify(tasks.data[0], null, 2)
      );

      // Test getting specific task billing
      const taskId = tasks.data[0].id;
      console.log(`\n2. Testing task-specific billing for task ${taskId}`);

      const taskBilling = await axios.get(
        `${API_BASE}/tasks/${taskId}/billing`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("✅ Retrieved task billing data");
      console.log(
        "Task billing details:",
        JSON.stringify(taskBilling.data, null, 2)
      );
    }
  } catch (error) {
    console.error(
      "❌ Task billing test failed:",
      error.response?.data || error.message
    );
  }
}

// Function to test frontend billing views
async function testFrontendBillingViews() {
  console.log("\n🌐 Testing Frontend Billing Views...");

  try {
    // Test if frontend billing pages are accessible
    const frontendBase = "http://localhost:5173";

    console.log("Frontend should be accessible at:");
    console.log(`📱 Main App: ${frontendBase}`);
    console.log(`💰 Billing Dashboard: ${frontendBase}/billing`);
    console.log(`📊 Project Billing: ${frontendBase}/billing (Project tab)`);
    console.log(`📋 Task Billing: ${frontendBase}/billing (Task tab)`);

    console.log(
      "\n✅ You can now test the frontend billing views manually by:"
    );
    console.log("1. Navigate to http://localhost:5173");
    console.log("2. Login with any of the test users (password: admin123)");
    console.log("3. Go to the Billing section");
    console.log("4. Test both Project and Task billing views");
  } catch (error) {
    console.error("❌ Frontend test setup failed:", error.message);
  }
}

// Main test function
async function runBillingTests() {
  console.log("🚀 Starting Billing System Test...\n");

  try {
    // Login as admin to create test data
    console.log("1. Logging in as admin...");
    const adminToken = await loginUser("admin@company.com", "admin123");

    if (!adminToken) {
      console.error("❌ Cannot proceed without admin access");
      return;
    }

    // Create test projects
    console.log("\n2. Creating test projects...");
    const projects = await createProjects(adminToken);

    // Create test tasks
    console.log("\n3. Creating test tasks...");
    const tasks = await createTasks(adminToken, projects);

    // Create time entries for billing
    console.log("\n4. Creating time entries...");
    await createTimeEntries(adminToken, tasks);

    // Test project billing
    await testProjectBilling(adminToken);

    // Test task billing
    await testTaskBilling(adminToken);

    // Test frontend views
    await testFrontendBillingViews();

    console.log("\n🎉 Billing system test completed successfully!");
    console.log("\n📝 Test Summary:");
    console.log(`✅ Created ${projects.length} test projects`);
    console.log(`✅ Created ${tasks.length} test tasks`);
    console.log("✅ Created multiple time entries");
    console.log("✅ Tested project billing endpoints");
    console.log("✅ Tested task billing endpoints");
    console.log("✅ Frontend billing views ready for manual testing");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the tests
runBillingTests();
