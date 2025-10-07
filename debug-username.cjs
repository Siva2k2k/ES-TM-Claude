const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";

async function debugUserNameIssue() {
  console.log("🔍 DEBUGGING USER NAME ISSUE\n");

  try {
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@company.com",
      password: "admin123",
    });

    const adminToken = adminResponse.data.tokens.accessToken;

    // Get a fresh billing response
    const billingResponse = await axios.get(
      `${API_BASE}/project-billing/projects?startDate=2024-10-01&endDate=2024-10-31`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    console.log("📊 Raw billing response structure:");
    const data = billingResponse.data.data;
    const websiteProject = data.projects?.find((p) => p.total_hours > 0);

    if (websiteProject) {
      console.log("Project:", websiteProject.project_name);
      console.log("Resources count:", websiteProject.resources?.length);

      if (websiteProject.resources?.length > 0) {
        const resource = websiteProject.resources[0];
        console.log("\n🔍 Resource details:");
        console.log("- user_name:", resource.user_name);
        console.log("- user_id:", resource.user_id);
        console.log("- role:", resource.role);

        // Check if we can get user details directly
        if (resource.user_id) {
          try {
            const userResponse = await axios.get(`${API_BASE}/users`, {
              headers: { Authorization: `Bearer ${adminToken}` },
            });

            const user = userResponse.data.users.find(
              (u) => u.id === resource.user_id
            );
            if (user) {
              console.log("\n✅ Found user in database:");
              console.log("- full_name:", user.full_name);
              console.log("- email:", user.email);
              console.log("- id:", user.id);
            } else {
              console.log("\n❌ User not found in database");
            }
          } catch (userError) {
            console.log(
              "❌ Error getting user:",
              userError.response?.data || userError.message
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

debugUserNameIssue();
