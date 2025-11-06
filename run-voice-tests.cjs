#!/usr/bin/env node

/**
 * Simple Node.js test runner for voice intent testing
 * This file loads and executes the voice intent tests in a Node.js environment
 */

const fetch = require('node-fetch');

// Add fetch to global if not available
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = fetch;
}

const TEST_CONFIG = {
  backendUrl: "http://localhost:3001",
  frontendUrl: "http://localhost:5173",
  credentials: {
    email: "admin@company.com",
    password: "admin123",
  },
  timeout: 10000,
};

/**
 * Test data for all 27 intents organized by category
 */
const INTENT_TEST_DATA = {
  // PROJECT MANAGEMENT (7 intents)
  project: {
    create_project: {
      command: "Create a project named Test AI Platform for client Rootstockk managed by Project Manager starting January 1st with budget $50,000",
      expectedFields: ['projectName', 'description', 'clientName', 'managerName', 'startDate', 'budget'],
      referenceFields: ['clientName', 'managerName'],
      enumFields: ['status'],
      expectedDropdowns: ['client', 'manager'],
      category: 'project'
    },
    add_project_member: {
      command: "Add John AB as Employee to the Seek Dev",
      expectedFields: ['projectName', 'role', 'name'],
      referenceFields: ['projectName', 'name'],
      enumFields: ['role'],
      expectedDropdowns: ['project', 'user'],
      expectedEnumValues: { role: ['Employee', 'Lead'] },
      category: 'project'
    }
    // Add more intents as needed for testing
  }
  // Add other categories as needed
};

class VoiceIntentTester {
  constructor() {
    this.token = null;
    this.testResults = {
      authentication: null,
      intents: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        categories: {}
      }
    };
  }

  /**
   * Quick test of basic functionality
   */
  async runQuickTest() {
    console.log("🧪 STARTING QUICK VOICE INTENT TEST");
    console.log("=".repeat(80));

    try {
      // Step 1: Authentication
      await this.testAuthentication();
      if (!this.testResults.authentication?.success) {
        throw new Error("Authentication failed - cannot proceed with tests");
      }

      // Step 2: Test voice command processing
      await this.testVoiceCommandProcessing();

      // Step 3: Test context fetching
      await this.testContextFetching();

      console.log("\n✅ QUICK TEST COMPLETED SUCCESSFULLY");
      
    } catch (error) {
      console.error("❌ Quick test failed:", error.message);
    }
  }

  /**
   * Test authentication and basic connectivity
   */
  async testAuthentication() {
    console.log("\n🔐 TESTING AUTHENTICATION");
    console.log("-".repeat(40));

    try {
      // Test backend connectivity
      const healthResponse = await this.makeRequest('/health', 'GET');
      console.log("✅ Backend health check:", healthResponse.status);

      // Authenticate
      const loginData = {
        email: TEST_CONFIG.credentials.email,
        password: TEST_CONFIG.credentials.password
      };

      const authResponse = await this.makeRequest('/api/v1/auth/login', 'POST', loginData);
      
      if (authResponse.success && authResponse.tokens?.accessToken) {
        this.token = authResponse.tokens.accessToken;
        console.log("✅ Authentication successful");
        console.log("✅ User role:", authResponse.user.role);
        
        this.testResults.authentication = {
          success: true,
          user: authResponse.user,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error("Invalid authentication response");
      }

    } catch (error) {
      console.error("❌ Authentication failed:", error.message);
      this.testResults.authentication = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw error;
    }
  }

  /**
   * Test voice command processing
   */
  async testVoiceCommandProcessing() {
    console.log("\n🎯 TESTING VOICE COMMAND PROCESSING");
    console.log("-".repeat(40));

    const testCommand = "Create a project named Test Project for client Test Client";
    
    try {
      console.log(`📝 Testing command: "${testCommand}"`);
      
      const response = await this.processVoiceCommand(testCommand);
      
      if (response.success && response.actions && response.actions.length > 0) {
        const action = response.actions[0];
        console.log(`✅ Intent recognized: ${action.intent}`);
        console.log(`✅ Confidence: ${(action.confidence * 100).toFixed(1)}%`);
        console.log(`✅ Fields extracted: ${action.fields?.length || 0}`);
        
        // Log field details
        if (action.fields && action.fields.length > 0) {
          action.fields.forEach(field => {
            console.log(`   - ${field.name}: ${field.type}${field.value ? ` = "${field.value}"` : ''}`);
          });
        }
        
      } else {
        console.log(`❌ No actions returned for command`);
      }
      
    } catch (error) {
      console.error(`❌ Voice processing error: ${error.message}`);
    }
  }

  /**
   * Test context fetching for dropdowns
   */
  async testContextFetching() {
    console.log("\n📋 TESTING CONTEXT FETCHING");
    console.log("-".repeat(40));

    try {
      const contextResponse = await this.makeRequest('/api/v1/voice/context', 'GET');
      
      if (contextResponse.success && contextResponse.context) {
        const context = contextResponse.context;
        
        console.log("✅ Context fetched successfully");
        console.log(`✅ Users: ${context.entities?.users?.length || 0} items`);
        console.log(`✅ Clients: ${context.entities?.clients?.length || 0} items`);
        console.log(`✅ Projects: ${context.entities?.projects?.length || 0} items`);
        
        // Test specific data availability
        if (context.entities?.users?.length > 0) {
          const managers = context.entities.users.filter(u => u.role?.toLowerCase() === 'manager');
          console.log(`✅ Managers available: ${managers.length}`);
        }
        
      } else {
        console.log(`❌ Failed to fetch context: ${contextResponse.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error(`❌ Context fetching error: ${error.message}`);
    }
  }

  /**
   * Helper method to process voice command
   */
  async processVoiceCommand(transcript) {
    const requestBody = {
      transcript: transcript,
      context: {
        user_id: "admin",
        current_page: "test"
      }
    };

    return await this.makeRequest('/api/v1/voice/process-command', 'POST', requestBody);
  }

  /**
   * Helper method to make HTTP requests
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${TEST_CONFIG.backendUrl}${endpoint}`;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
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
const tester = new VoiceIntentTester();
tester.runQuickTest().catch(console.error);