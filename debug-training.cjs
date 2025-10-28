// Debug script to test training API
const https = require("https");

async function testTrainingAPI() {
  try {
    console.log("Testing training API...");

    // Simple test without external dependencies
    const options = {
      hostname: "localhost",
      port: 3001,
      path: "/api/v1/projects/training",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("Response body:", data);
      });
    });

    req.on("error", (error) => {
      console.error("Request error:", error.message);
    });

    req.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testTrainingAPI();
