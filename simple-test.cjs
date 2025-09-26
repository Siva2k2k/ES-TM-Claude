const axios = require("axios");

async function testLogin() {
  try {
    console.log("Testing login...");
    const response = await axios.post(
      "http://localhost:3001/api/v1/auth/login",
      {
        email: "admin@company.com",
        password: "admin123",
      }
    );

    console.log("Login successful!");
    console.log("Response:", JSON.stringify(response.data, null, 2));

    // Test the profile endpoint with the token
    const token = response.data.token || response.data.accessToken;
    if (token) {
      console.log("\nTesting profile endpoint...");
      const profileResponse = await axios.get(
        "http://localhost:3001/api/v1/auth/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(
        "Profile response:",
        JSON.stringify(profileResponse.data, null, 2)
      );
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testLogin();
