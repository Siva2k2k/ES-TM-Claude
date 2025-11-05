/**
 * Test script to verify Azure OpenAI configuration
 * Run this after updating the .env file to check if the service works
 */

require("dotenv").config();
const { AzureOpenAI } = require("openai");

async function testAzureOpenAI() {
  console.log("Testing Azure OpenAI Configuration...\n");

  // Display configuration (without exposing API key)
  console.log("Configuration:");
  console.log(`- Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
  console.log(`- Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`);
  console.log(`- API Version: ${process.env.AZURE_OPENAI_API_VERSION}`);
  console.log(
    `- API Key: ${
      process.env.AZURE_OPENAI_API_KEY
        ? "***" + process.env.AZURE_OPENAI_API_KEY.slice(-4)
        : "Not set"
    }\n`
  );

  if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
    console.error("❌ Missing required environment variables");
    return;
  }

  try {
    // Initialize client
    const client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, ""),
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    console.log("✅ Azure OpenAI client initialized successfully");

    // Test simple completion
    console.log("🔄 Testing simple completion...");

    const result = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content:
            'Respond with a JSON object: {"status": "working", "message": "Azure OpenAI is configured correctly"}',
        },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    console.log("✅ Response received:", content);

    try {
      const parsed = JSON.parse(content);
      if (parsed.status === "working") {
        console.log("🎉 Azure OpenAI test completed successfully!");
        console.log(`💰 Token usage: ${result.usage?.total_tokens} tokens`);
      } else {
        console.log("⚠️  Unexpected response format");
      }
    } catch (parseError) {
      console.log("⚠️  Response is not valid JSON:", content);
    }
  } catch (error) {
    console.error("❌ Azure OpenAI test failed:");
    console.error(`Status: ${error.status || "Unknown"}`);
    console.error(`Message: ${error.message}`);

    if (error.status === 404) {
      console.error("\n🔍 Troubleshooting 404 error:");
      console.error(
        "1. Check if deployment name exists in your Azure OpenAI resource"
      );
      console.error("2. Verify the deployment is active and available");
      console.error("3. Confirm the endpoint URL is correct");
      console.error(
        `4. Current deployment name: ${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`
      );
    } else if (error.status === 401 || error.status === 403) {
      console.error("\n🔍 Authentication issue:");
      console.error("1. Check if API key is correct and active");
      console.error("2. Verify API key has access to the deployment");
    }
  }
}

testAzureOpenAI();
