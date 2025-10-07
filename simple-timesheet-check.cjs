const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function simpleCheck() {
  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Get all timesheets
    console.log("📊 Getting timesheets...\n");

    const timesheets = await axios.get(`${API_BASE}/timesheets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Timesheets response structure:");
    console.log(JSON.stringify(timesheets.data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

simpleCheck();
