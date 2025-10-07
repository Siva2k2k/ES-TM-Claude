const axios = require("axios");

async function quickTest() {
  try {
    // Test if backend is responding
    console.log("🔍 Testing backend connection...");

    const response = await axios.get("http://localhost:3001/api/v1/health", {
      timeout: 5000,
    });

    console.log("✅ Backend is responding");
    console.log("Response:", response.data);
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.log("❌ Backend is not running on port 3001");
    } else if (error.response?.status === 404) {
      console.log("⚠️ Backend running but /health endpoint not found");
      console.log("Trying root endpoint...");

      try {
        const rootResponse = await axios.get("http://localhost:3001/");
        console.log("✅ Root endpoint works:", rootResponse.data);
      } catch (rootError) {
        console.log("❌ Root endpoint also failed");
      }
    } else {
      console.log("❌ Other error:", error.message);
    }
  }
}

quickTest();
