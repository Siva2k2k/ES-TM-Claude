const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function checkProjectStructure() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    const projects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Projects response structure:");
    console.log(JSON.stringify(projects.data, null, 2));
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

checkProjectStructure();
