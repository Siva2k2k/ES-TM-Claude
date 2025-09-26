const axios = require("axios");

const BASE_URL = "http://localhost:3001/api/v1";

async function testFrontendFixes() {
  console.log("Testing frontend fixes...");

  try {
    // Login as employee (using actual database credentials)
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "employee1@company.com",
      password: "employee123",
    });

    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log("Employee logged in successfully");
    console.log("User ID:", userId);

    const headers = { Authorization: `Bearer ${token}` };

    // Test getUserProjects endpoint (should return {success: true, projects: []})
    console.log("\nTesting getUserProjects response format...");
    const projectsResponse = await axios.get(
      `${BASE_URL}/projects/user/${userId}`,
      { headers }
    );
    console.log("Projects response structure:", {
      success: projectsResponse.data.success,
      hasProjects: !!projectsResponse.data.projects,
      hasData: !!projectsResponse.data.data, // This should be undefined
      projectsLength: projectsResponse.data.projects?.length || 0,
    });

    if (projectsResponse.data.projects?.length > 0) {
      const firstProject = projectsResponse.data.projects[0];
      console.log("First project ID:", firstProject.id);

      // Test getProjectTasks endpoint (should return {success: true, tasks: []})
      console.log("\nTesting getProjectTasks response format...");
      const tasksResponse = await axios.get(
        `${BASE_URL}/projects/${firstProject.id}/tasks`,
        { headers }
      );
      console.log("Tasks response structure:", {
        success: tasksResponse.data.success,
        hasTasks: !!tasksResponse.data.tasks,
        hasData: !!tasksResponse.data.data, // This should be undefined
        tasksLength: tasksResponse.data.tasks?.length || 0,
      });
    }

    console.log("\n✅ Response format verification complete");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testFrontendFixes();
