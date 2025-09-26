const axios = require("axios");

async function testEmployeeTaskAccess() {
  try {
    // Login as employee1
    console.log("Testing employee task access...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.tokens.accessToken;
    console.log("Employee logged in successfully");

    // First, get the employee's projects
    console.log("\nGetting employee projects...");
    const projectsResponse = await axios.get(
      "http://localhost:3001/api/v1/projects",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (
      projectsResponse.data.projects &&
      projectsResponse.data.projects.length > 0
    ) {
      const project = projectsResponse.data.projects[0];
      console.log(`Found project: ${project.name} (ID: ${project.id})`);

      // Test get project tasks
      console.log("\nTesting GET /projects/:projectId/tasks...");
      const tasksResponse = await axios.get(
        `http://localhost:3001/api/v1/projects/${project.id}/tasks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(
        "Tasks response:",
        JSON.stringify(tasksResponse.data, null, 2)
      );
    } else {
      console.log("No projects found for employee");
    }
  } catch (error) {
    console.error("Error details:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);
  }
}

testEmployeeTaskAccess();
