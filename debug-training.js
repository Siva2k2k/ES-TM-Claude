// Debug script to test training API
const fetch = require("node-fetch");

async function testTrainingAPI() {
  try {
    console.log("Testing training API...");

    // First, let's try to hit the health endpoint
    const healthResponse = await fetch("http://localhost:3001/health");
    const healthData = await healthResponse.json();
    console.log("Health check:", healthData);

    // Now try the training endpoint (this will fail without auth, but we can see the error)
    const trainingResponse = await fetch(
      "http://localhost:3001/api/v1/projects/training",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Training API status:", trainingResponse.status);
    const trainingData = await trainingResponse.text();
    console.log("Training API response:", trainingData);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testTrainingAPI();
