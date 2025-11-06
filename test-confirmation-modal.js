/**
 * Test script to verify VoiceConfirmationModal dropdown population
 * This script tests the complete flow from voice command to modal display
 */

const TEST_CONFIG = {
  backendUrl: "http://localhost:3001",
  credentials: {
    email: "admin@company.com",
    password: "admin123",
  },
  sampleCommand:
    "Create a project named Internal Project 3.0 with Manager, Project Manager with budget $12,000 and client root stock. For the period. 12/12/2025 to 30/01/2026.",
};

class VoiceConfirmationTester {
  constructor() {
    this.token = null;
    this.results = {
      authentication: null,
      backendData: {},
      voiceProcessing: null,
      modalData: null,
    };
  }

  async runCompleteTest() {
    console.log("🧪 Starting VoiceConfirmationModal Dropdown Test...\n");

    try {
      // Step 1: Authentication
      await this.testAuthentication();

      // Step 2: Verify backend data sources
      await this.testBackendDataSources();

      // Step 3: Process voice command
      await this.testVoiceProcessing();

      // Step 4: Analyze dropdown requirements
      await this.analyzeDropdownRequirements();

      // Step 5: Generate summary report
      this.generateReport();
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
  }

  async testAuthentication() {
    console.log("🔐 Testing Authentication...");

    try {
      const response = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(TEST_CONFIG.credentials),
        }
      );

      const data = await response.json();

      if (data.success) {
        this.token = data.tokens.accessToken;
        this.results.authentication = { success: true, user: data.user };
        console.log("✅ Authentication successful");
        console.log(`   User: ${data.user.full_name} (${data.user.role})\n`);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      this.results.authentication = { success: false, error: error.message };
      throw error;
    }
  }

  async testBackendDataSources() {
    console.log("📊 Testing Backend Data Sources...");

    // Test clients endpoint
    try {
      const clientsResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/clients`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );
      const clientsData = await clientsResponse.json();

      this.results.backendData.clients = {
        success: clientsData.success,
        count: clientsData.data?.length || 0,
        items:
          clientsData.data?.map((c) => ({ id: c._id, name: c.name })) || [],
      };

      console.log(
        `✅ Clients API: ${this.results.backendData.clients.count} clients found`
      );
      this.results.backendData.clients.items.forEach((client) => {
        console.log(`   - ${client.name} (${client.id})`);
      });
    } catch (error) {
      this.results.backendData.clients = {
        success: false,
        error: error.message,
      };
      console.log("❌ Clients API failed");
    }

    // Test users endpoint
    try {
      const usersResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/users`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );
      const usersData = await usersResponse.json();

      const managers =
        usersData.users?.filter(
          (u) => u.role?.toLowerCase() === "manager" // Only actual managers, not management/lead/super_admin
        ) || [];

      this.results.backendData.managers = {
        success: usersData.success,
        count: managers.length,
        items: managers.map((u) => ({
          id: u.id,
          name: u.full_name,
          role: u.role,
        })),
      };

      console.log(
        `✅ Users API: ${this.results.backendData.managers.count} managers found`
      );
      this.results.backendData.managers.items.forEach((manager) => {
        console.log(`   - ${manager.name} (${manager.role}) [${manager.id}]`);
      });
    } catch (error) {
      this.results.backendData.managers = {
        success: false,
        error: error.message,
      };
      console.log("❌ Users API failed");
    }

    console.log("");
  }

  async testVoiceProcessing() {
    console.log("🎤 Testing Voice Command Processing...");

    try {
      const response = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/voice/process-command`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: TEST_CONFIG.sampleCommand,
            context: {
              user_id: "admin",
              current_page: "projects",
            },
          }),
        }
      );

      const data = await response.json();
      this.results.voiceProcessing = data;

      console.log(`✅ Voice processing successful`);
      console.log(`   Intent: ${data.actions[0].intent}`);
      console.log(
        `   Confidence: ${Math.round(data.actions[0].confidence * 100)}%`
      );
      console.log(`   Fields detected: ${data.actions[0].fields?.length || 0}`);

      // Show reference fields specifically
      const referenceFields =
        data.actions[0].fields?.filter((f) => f.type === "reference") || [];
      if (referenceFields.length > 0) {
        console.log("   Reference fields:");
        referenceFields.forEach((field) => {
          console.log(
            `     - ${field.name}: ${field.referenceType} (required: ${field.required})`
          );
        });
      }
    } catch (error) {
      this.results.voiceProcessing = { success: false, error: error.message };
      console.log("❌ Voice processing failed");
    }

    console.log("");
  }

  async analyzeDropdownRequirements() {
    console.log("🔍 Analyzing Modal Dropdown Requirements...");

    if (
      !this.results.voiceProcessing ||
      !this.results.voiceProcessing.actions
    ) {
      console.log("❌ Cannot analyze - no voice processing data");
      return;
    }

    const action = this.results.voiceProcessing.actions[0];
    const fields = action.fields || [];

    console.log("📋 Expected Modal Behavior:");
    console.log("");

    // Analyze each field for dropdown requirements
    fields.forEach((field) => {
      console.log(`Field: ${field.name}`);
      console.log(`  Type: ${field.type}`);
      console.log(`  Reference Type: ${field.referenceType || "N/A"}`);
      console.log(`  Required: ${field.required}`);

      if (field.type === "reference") {
        console.log(
          `  ✅ Should use dropdown with ${field.referenceType} options`
        );

        // Check if we have the data for this dropdown
        if (
          field.referenceType === "client" &&
          this.results.backendData.clients
        ) {
          console.log(
            `     Available options: ${this.results.backendData.clients.count} clients`
          );
        } else if (
          field.referenceType === "manager" &&
          this.results.backendData.managers
        ) {
          console.log(
            `     Available options: ${this.results.backendData.managers.count} managers`
          );
        } else {
          console.log(`     ⚠️  Data not tested for ${field.referenceType}`);
        }
      } else if (field.type === "enum" && field.enumValues) {
        console.log(
          `  ✅ Should use dropdown with enum values: [${field.enumValues.join(
            ", "
          )}]`
        );
      } else {
        console.log(`  ℹ️  Should use ${field.type} input (no dropdown)`);
      }
      console.log("");
    });

    // Summary of expected dropdowns
    const referenceFields = fields.filter((f) => f.type === "reference");
    const enumFields = fields.filter((f) => f.type === "enum" && f.enumValues);

    console.log("📊 Summary of Expected Dropdowns:");
    console.log(`   Reference dropdowns: ${referenceFields.length}`);
    referenceFields.forEach((f) => {
      console.log(`     - ${f.name} → ${f.referenceType} options`);
    });

    console.log(`   Enum dropdowns: ${enumFields.length}`);
    enumFields.forEach((f) => {
      console.log(`     - ${f.name} → [${f.enumValues.join(", ")}]`);
    });

    console.log("");
  }

  generateReport() {
    console.log("📝 COMPLETE TEST REPORT");
    console.log("=".repeat(50));

    // Authentication Status
    console.log("\n🔐 Authentication:");
    if (this.results.authentication?.success) {
      console.log("   ✅ PASSED - User authenticated successfully");
    } else {
      console.log("   ❌ FAILED - Authentication failed");
    }

    // Backend Data Sources
    console.log("\n📊 Backend Data Sources:");
    if (this.results.backendData.clients?.success) {
      console.log(
        `   ✅ Clients API: ${this.results.backendData.clients.count} items`
      );
    } else {
      console.log("   ❌ Clients API: Failed");
    }

    if (this.results.backendData.managers?.success) {
      console.log(
        `   ✅ Managers API: ${this.results.backendData.managers.count} items`
      );
    } else {
      console.log("   ❌ Managers API: Failed");
    }

    // Voice Processing
    console.log("\n🎤 Voice Processing:");
    if (this.results.voiceProcessing?.actions) {
      console.log("   ✅ PASSED - Voice command processed");
      console.log(
        `      Intent: ${this.results.voiceProcessing.actions[0].intent}`
      );
      console.log(
        `      Fields: ${
          this.results.voiceProcessing.actions[0].fields?.length || 0
        }`
      );
    } else {
      console.log("   ❌ FAILED - Voice processing failed");
    }

    // Modal Expected Behavior
    if (this.results.voiceProcessing?.actions) {
      const action = this.results.voiceProcessing.actions[0];
      const referenceFields =
        action.fields?.filter((f) => f.type === "reference") || [];
      const enumFields = action.fields?.filter((f) => f.type === "enum") || [];

      console.log("\n📋 VoiceConfirmationModal Expected Behavior:");
      console.log(`   Expected Reference Dropdowns: ${referenceFields.length}`);
      console.log(`   Expected Enum Dropdowns: ${enumFields.length}`);

      referenceFields.forEach((field) => {
        console.log(
          `     - ${field.name}: Should populate from ${field.referenceType} API`
        );

        if (
          field.referenceType === "client" &&
          this.results.backendData.clients?.success
        ) {
          console.log(
            `       ✅ Data available: ${this.results.backendData.clients.count} options`
          );
        } else if (
          field.referenceType === "manager" &&
          this.results.backendData.managers?.success
        ) {
          console.log(
            `       ✅ Data available: ${this.results.backendData.managers.count} options`
          );
        } else {
          console.log(`       ⚠️  Data source not verified`);
        }
      });

      enumFields.forEach((field) => {
        console.log(
          `     - ${field.name}: Should populate from enumValues [${
            field.enumValues?.join(", ") || "none"
          }]`
        );
      });
    }

    console.log("\n🎯 CONCLUSION:");
    const hasRequiredData =
      this.results.backendData.clients?.success &&
      this.results.backendData.managers?.success;
    const hasVoiceProcessing = this.results.voiceProcessing?.actions;

    if (hasRequiredData && hasVoiceProcessing) {
      console.log(
        "   ✅ ALL SYSTEMS READY for VoiceConfirmationModal dropdown testing"
      );
      console.log(
        "   📱 Frontend modal should display dropdowns populated with backend data"
      );
      console.log(
        "   🔗 Reference fields should resolve to proper API endpoints"
      );
    } else {
      console.log(
        "   ⚠️  Some systems not ready - check failed components above"
      );
    }

    console.log("\n🔗 Next Steps:");
    console.log("   1. Open frontend at http://localhost:5173");
    console.log(
      "   2. Trigger voice command with microphone or test interface"
    );
    console.log("   3. Verify VoiceConfirmationModal shows proper dropdowns");
    console.log(
      "   4. Check that dropdowns are populated only with expected data"
    );

    console.log("\n=".repeat(50));
  }
}

// Run the test if this script is executed directly
if (typeof window === "undefined") {
  // Node.js environment
  const tester = new VoiceConfirmationTester();
  tester.runCompleteTest().catch(console.error);
} else {
  // Browser environment - expose for manual execution
  window.VoiceConfirmationTester = VoiceConfirmationTester;
  console.log(
    "VoiceConfirmationTester loaded. Run: new VoiceConfirmationTester().runCompleteTest()"
  );
}
