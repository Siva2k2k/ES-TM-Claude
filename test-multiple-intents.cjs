#!/usr/bin/env node

const fetch = require("node-fetch");

// Add fetch to global if not available
if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = fetch;
}

const TEST_CONFIG = {
  backendUrl: "http://localhost:3001",
  credentials: {
    email: "admin@company.com",
    password: "admin123",
  },
};

class QuickVoiceIntentTester {
  constructor() {
    this.token = null;
  }

  async authenticate() {
    const loginData = {
      email: TEST_CONFIG.credentials.email,
      password: TEST_CONFIG.credentials.password,
    };

    const authResponse = await this.makeRequest(
      "/api/v1/auth/login",
      "POST",
      loginData
    );

    if (authResponse.success && authResponse.tokens?.accessToken) {
      this.token = authResponse.tokens.accessToken;
      return true;
    }
    return false;
  }

  async testMultipleIntents() {
    console.log("🎯 TESTING MULTIPLE VOICE INTENTS");
    console.log("=".repeat(60));

    if (!(await this.authenticate())) {
      console.log("❌ Authentication failed");
      return;
    }

    const testCommands = [
      {
        category: "Project Management",
        commands: [
          "Create a project named AI Dashboard for client TechCorp managed by John Smith starting January 15th with budget $75000",
          "Add Sarah Johnson as Lead to the AI Dashboard project",
          "Update AI Dashboard status to InProgress and change manager to Mike Wilson",
          "Add a task called Database Design to AI Dashboard and assign it to Sarah Johnson with 16 hours estimated",
        ],
      },
      {
        category: "User Management",
        commands: [
          "Create a new user Alice Developer with email alice@company.com as Employee with hourly rate $80",
          "Update Sarah Johnson role to Manager and hourly rate to $95",
        ],
      },
      {
        category: "Timesheet Management",
        commands: [
          "Create timesheet for this week starting Monday December 9th 2024",
          "Log 8 hours for AI Dashboard on Database Design task for today as Project work",
          "Update my timesheet entry for AI Dashboard on December 5th to 7 hours",
        ],
      },
      {
        category: "Client Management",
        commands: [
          "Create a new client called Innovation Labs with email contact@innovationlabs.com and contact person Robert Brown",
          "Update Innovation Labs client email to newemail@innovationlabs.com",
        ],
      },
    ];

    for (const category of testCommands) {
      console.log(`\n📂 ${category.category}`);
      console.log("-".repeat(40));

      for (let i = 0; i < category.commands.length; i++) {
        const command = category.commands[i];
        console.log(`\n  ${i + 1}. Testing: "${command}"`);

        try {
          const response = await this.processVoiceCommand(command);

          if (
            response.success &&
            response.actions &&
            response.actions.length > 0
          ) {
            const action = response.actions[0];
            console.log(`     ✅ Intent: ${action.intent}`);
            console.log(
              `     ✅ Fields: ${action.fields?.length || 0} extracted`
            );

            // Show key field values
            if (action.fields && action.fields.length > 0) {
              const keyFields = action.fields.filter(
                (f) => f.value && f.value.trim() !== ""
              );
              if (keyFields.length > 0) {
                console.log(`     📝 Key values:`);
                keyFields.slice(0, 3).forEach((field) => {
                  console.log(`        ${field.name}: "${field.value}"`);
                });
                if (keyFields.length > 3) {
                  console.log(`        ... and ${keyFields.length - 3} more`);
                }
              }
            }
          } else {
            console.log(`     ❌ No actions returned`);
          }
        } catch (error) {
          console.log(`     ❌ Error: ${error.message}`);
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`\n🎉 MULTI-INTENT TESTING COMPLETED`);
    console.log("=".repeat(60));
  }

  async processVoiceCommand(transcript) {
    const requestBody = {
      transcript: transcript,
      context: {
        user_id: "admin",
        current_page: "test",
      },
    };

    return await this.makeRequest(
      "/api/v1/voice/process-command",
      "POST",
      requestBody
    );
  }

  async makeRequest(endpoint, method = "GET", body = null) {
    const url = `${TEST_CONFIG.backendUrl}${endpoint}`;
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (this.token) {
      options.headers.Authorization = `Bearer ${this.token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
}

// Run the test
const tester = new QuickVoiceIntentTester();
tester.testMultipleIntents().catch(console.error);
