const axios = require("axios");

async function testEmployeeProjectAccess() {
  try {
    // Login as employee1
    console.log("Testing employee project access...");
    const loginResponse = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.tokens.accessToken;
    console.log("Employee logged in successfully");

    // Test get projects endpoint
    console.log("\nTesting GET /projects...");
    const projectsResponse = await axios.get(
      "http://localhost:3001/api/v1/projects",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(
      "Projects response:",
      JSON.stringify(projectsResponse.data, null, 2)
    );
  } catch (error) {
    console.error("Error details:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);
  }
}

testEmployeeProjectAccess();
