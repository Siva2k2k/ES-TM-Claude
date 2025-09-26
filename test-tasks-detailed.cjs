const axios = require("axios");

async function testFrontendTaskFixes() {
  try {
    console.log("Testing frontend task fixes...\n");

    // Step 1: Login as employee1
    console.log("🔐 Logging in as employee1...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    if (!loginResponse.data.success) {
      throw new Error("Login failed: " + loginResponse.data.message);
    }

    const token = loginResponse.data.tokens.accessToken;
    const userId = loginResponse.data.user.id;
    console.log(
      `✅ Login successful for: ${loginResponse.data.user.full_name}`
    );
    console.log(`   User ID: ${userId}`);

    // Step 2: Get user projects (this should work)
    console.log("\n📁 Getting user projects...");
    const projectsResponse = await axios.get(
      `http://localhost:3001/api/v1/projects/user/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Projects Response Structure:");
    console.log(`  success: ${projectsResponse.data.success}`);
    console.log(
      `  has 'projects' property: ${!!projectsResponse.data.projects}`
    );
    console.log(`  has 'data' property: ${!!projectsResponse.data.data}`);
    console.log(
      `  projects count: ${projectsResponse.data.projects?.length || 0}`
    );

    if (projectsResponse.data.projects?.length > 0) {
      const project = projectsResponse.data.projects[0];
      console.log(`  first project: ${project.name} (ID: ${project.id})`);
      console.log(`  project has tasks: ${!!project.tasks}`);
      if (project.tasks) {
        console.log(`  embedded tasks count: ${project.tasks.length}`);
        project.tasks.forEach((task) => {
          console.log(
            `    - ${task.name} (assigned to: ${task.assigned_to_user_id})`
          );
        });
      }
    }

    // Step 3: Test getUserTasks logic simulation
    console.log("\n🎯 Simulating getUserTasks frontend logic...");
    if (projectsResponse.data.success && projectsResponse.data.projects) {
      const allTasks = [];
      for (const project of projectsResponse.data.projects) {
        if (project.tasks && Array.isArray(project.tasks)) {
          const userTasks = project.tasks.filter(
            (task) => task.assigned_to_user_id === userId
          );
          allTasks.push(...userTasks);
        }
      }

      console.log(
        `✅ Found ${allTasks.length} task(s) assigned to current user:`
      );
      allTasks.forEach((task) => {
        console.log(`  - ${task.name} (Status: ${task.status})`);
      });

      if (allTasks.length === 0) {
        console.log("❌ No tasks found assigned to current user");
        console.log("   This explains why frontend shows empty task list");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Response data:", error.response.data);
    }
  }
}

testFrontendTaskFixes();
