const axios = require("axios");

async function testLogin() {
  try {
    console.log("Testing login endpoint...");

    const response = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "employee1@company.com",
        password: "admin123",
      }
    );

    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("Login failed:", error.response?.status);
    console.log("Error data:", JSON.stringify(error.response?.data, null, 2));
  }
}

testLogin();
