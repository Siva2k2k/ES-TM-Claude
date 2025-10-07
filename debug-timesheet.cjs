const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugTimesheetCreation() {
  try {
    // Login
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const token = response.data.tokens.accessToken;

    // Get users
    const users = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const employee1 = users.data.users.find(
      (u) => u.email === "employee1@company.com"
    );
    console.log("Employee1 found:", employee1 ? "YES" : "NO");
    if (employee1) {
      console.log("Employee1 ID:", employee1.id);

      // Try to create a timesheet
      try {
        const timesheetResponse = await axios.post(
          `${API_BASE}/timesheets`,
          {
            userId: employee1.id,
            weekStartDate: "2024-09-30",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log(
          "✅ Timesheet creation successful:",
          timesheetResponse.data
        );
      } catch (error) {
        console.log("❌ Timesheet creation failed:");
        console.log("Status:", error.response?.status);
        console.log("Error:", JSON.stringify(error.response?.data, null, 2));
      }
    }
  } catch (error) {
    console.error("Debug failed:", error.response?.data || error.message);
  }
}

debugTimesheetCreation();
