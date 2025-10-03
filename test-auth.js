// Simple Node.js test to check what's happening with the authentication
const token = process.argv[2];

if (!token) {
  console.log("Usage: node test-auth.js <token>");
  console.log("Get token from browser localStorage");
  process.exit(1);
}

const testTemplates = async () => {
  try {
    const response = await fetch(
      "http://localhost:3001/api/v1/reports/templates",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Templates response status:", response.status);
    const data = await response.text();
    console.log("Templates response:", data);

    if (response.ok) {
      const parsed = JSON.parse(data);
      console.log("\nAvailable templates:");
      parsed.templates?.forEach((t) => {
        console.log(`- ${t.template_id}: ${t.name} (${t.category})`);
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

testTemplates();
