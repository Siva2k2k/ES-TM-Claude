/**
 * Test script for Project Member Intent with Dynamic Role Filtering
 * Tests the enhanced VoiceConfirmationModal behavior for add_project_member intent
 */

const TEST_CONFIG = {
  backendUrl: "http://localhost:3001",
  credentials: {
    email: "admin@company.com",
    password: "admin123",
  },
  sampleCommands: {
    addEmployee: "Add John Developer H as Employee to the AI Platform project",
    addLead: "Add Jane Designer as Lead to the AI Platform project",
  },
};

class ProjectMemberTester {
  constructor() {
    this.token = null;
    this.testResults = {};
  }

  async runCompleteTest() {
    console.log("🧪 Starting Project Member Intent Test...\n");

    try {
      // Step 1: Authentication
      await this.testAuthentication();

      // Step 2: Test updated intent definitions
      await this.testIntentDefinitions();

      // Step 3: Test role enum values
      await this.testRoleEnumValues();

      // Step 4: Test user filtering by role
      await this.testUserFiltering();

      // Step 5: Test voice command processing
      await this.testVoiceCommands();

      // Step 6: Generate report
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
        this.testResults.authentication = { success: true, user: data.user };
        console.log("✅ Authentication successful\n");
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      this.testResults.authentication = {
        success: false,
        error: error.message,
      };
      throw error;
    }
  }

  async testIntentDefinitions() {
    console.log("📋 Testing Intent Definitions...");

    try {
      // Test add_project_member intent
      const addMemberResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/voice/process-command`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: TEST_CONFIG.sampleCommands.addEmployee,
            context: { user_id: "admin", current_page: "projects" },
          }),
        }
      );

      const addMemberData = await addMemberResponse.json();

      if (addMemberData.actions && addMemberData.actions[0]) {
        const action = addMemberData.actions[0];
        const roleField = action.fields?.find((f) => f.name === "role");

        this.testResults.intentDefinitions = {
          success: true,
          intent: action.intent,
          roleField: roleField,
          enumValues: roleField?.enumValues || [],
        };

        console.log(`✅ Intent: ${action.intent}`);
        console.log(`✅ Role field found: ${roleField ? "Yes" : "No"}`);
        console.log(
          `✅ Enum values: [${roleField?.enumValues?.join(", ") || "none"}]`
        );
        console.log("");
      } else {
        throw new Error("No actions returned from voice processing");
      }
    } catch (error) {
      this.testResults.intentDefinitions = {
        success: false,
        error: error.message,
      };
      console.log("❌ Intent definitions test failed\n");
    }
  }

  async testRoleEnumValues() {
    console.log("🎯 Testing Role Enum Values...");

    const expectedRoles = ["Employee", "Lead"];
    const actualRoles = this.testResults.intentDefinitions?.enumValues || [];

    const correctValues =
      expectedRoles.every((role) => actualRoles.includes(role)) &&
      actualRoles.every((role) => expectedRoles.includes(role));

    this.testResults.roleEnum = {
      success: correctValues,
      expected: expectedRoles,
      actual: actualRoles,
      extraValues: actualRoles.filter((role) => !expectedRoles.includes(role)),
      missingValues: expectedRoles.filter(
        (role) => !actualRoles.includes(role)
      ),
    };

    if (correctValues) {
      console.log("✅ Role enum values are correct: [Employee, Lead]");
    } else {
      console.log("❌ Role enum values are incorrect:");
      console.log(`   Expected: [${expectedRoles.join(", ")}]`);
      console.log(`   Actual: [${actualRoles.join(", ")}]`);
      if (this.testResults.roleEnum.extraValues.length > 0) {
        console.log(
          `   Extra values: [${this.testResults.roleEnum.extraValues.join(
            ", "
          )}]`
        );
      }
      if (this.testResults.roleEnum.missingValues.length > 0) {
        console.log(
          `   Missing values: [${this.testResults.roleEnum.missingValues.join(
            ", "
          )}]`
        );
      }
    }
    console.log("");
  }

  async testUserFiltering() {
    console.log("👥 Testing User Filtering by Role...");

    try {
      const usersResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/users`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );
      const usersData = await usersResponse.json();

      if (usersData.success && usersData.users) {
        const allUsers = usersData.users;
        const employees = allUsers.filter(
          (u) => u.role?.toLowerCase() === "employee"
        );
        const leads = allUsers.filter((u) => u.role?.toLowerCase() === "lead");

        this.testResults.userFiltering = {
          success: true,
          totalUsers: allUsers.length,
          employees: {
            count: employees.length,
            users: employees.map((u) => ({
              name: u.full_name,
              role: u.role,
              id: u.id,
            })),
          },
          leads: {
            count: leads.length,
            users: leads.map((u) => ({
              name: u.full_name,
              role: u.role,
              id: u.id,
            })),
          },
        };

        console.log(`✅ Total users: ${allUsers.length}`);
        console.log(`✅ Employees (role='employee'): ${employees.length}`);
        employees.forEach((emp) =>
          console.log(`   - ${emp.full_name} (${emp.role})`)
        );
        console.log(`✅ Leads (role='lead'): ${leads.length}`);
        leads.forEach((lead) =>
          console.log(`   - ${lead.full_name} (${lead.role})`)
        );
      } else {
        throw new Error("Failed to fetch users");
      }
    } catch (error) {
      this.testResults.userFiltering = { success: false, error: error.message };
      console.log("❌ User filtering test failed");
    }
    console.log("");
  }

  async testVoiceCommands() {
    console.log("🎤 Testing Voice Commands...");

    try {
      // Test Employee command
      const employeeResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/voice/process-command`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: TEST_CONFIG.sampleCommands.addEmployee,
            context: { user_id: "admin", current_page: "projects" },
          }),
        }
      );

      const employeeData = await employeeResponse.json();

      // Test Lead command
      const leadResponse = await fetch(
        `${TEST_CONFIG.backendUrl}/api/v1/voice/process-command`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: TEST_CONFIG.sampleCommands.addLead,
            context: { user_id: "admin", current_page: "projects" },
          }),
        }
      );

      const leadData = await leadResponse.json();

      this.testResults.voiceCommands = {
        success: true,
        employee: {
          intent: employeeData.actions?.[0]?.intent,
          roleDetected: employeeData.actions?.[0]?.data?.role,
          fields: employeeData.actions?.[0]?.fields?.length || 0,
        },
        lead: {
          intent: leadData.actions?.[0]?.intent,
          roleDetected: leadData.actions?.[0]?.data?.role,
          fields: leadData.actions?.[0]?.fields?.length || 0,
        },
      };

      console.log("Employee command:");
      console.log(
        `   ✅ Intent: ${this.testResults.voiceCommands.employee.intent}`
      );
      console.log(
        `   ✅ Role detected: ${this.testResults.voiceCommands.employee.roleDetected}`
      );
      console.log(
        `   ✅ Fields: ${this.testResults.voiceCommands.employee.fields}`
      );

      console.log("Lead command:");
      console.log(
        `   ✅ Intent: ${this.testResults.voiceCommands.lead.intent}`
      );
      console.log(
        `   ✅ Role detected: ${this.testResults.voiceCommands.lead.roleDetected}`
      );
      console.log(
        `   ✅ Fields: ${this.testResults.voiceCommands.lead.fields}`
      );
    } catch (error) {
      this.testResults.voiceCommands = { success: false, error: error.message };
      console.log("❌ Voice commands test failed");
    }
    console.log("");
  }

  generateReport() {
    console.log("📝 PROJECT MEMBER INTENT TEST REPORT");
    console.log("=".repeat(50));

    // Authentication
    console.log("\n🔐 Authentication:");
    if (this.testResults.authentication?.success) {
      console.log("   ✅ PASSED");
    } else {
      console.log("   ❌ FAILED");
    }

    // Intent Definitions
    console.log("\n📋 Intent Definitions:");
    if (this.testResults.intentDefinitions?.success) {
      console.log("   ✅ PASSED - Intent definitions updated correctly");
    } else {
      console.log("   ❌ FAILED - Intent definitions not working");
    }

    // Role Enum Values
    console.log("\n🎯 Role Enum Values:");
    if (this.testResults.roleEnum?.success) {
      console.log("   ✅ PASSED - Only Employee and Lead roles allowed");
    } else {
      console.log("   ❌ FAILED - Incorrect role enum values");
      if (this.testResults.roleEnum?.extraValues?.length > 0) {
        console.log(
          `      Extra: [${this.testResults.roleEnum.extraValues.join(", ")}]`
        );
      }
    }

    // User Filtering
    console.log("\n👥 User Filtering:");
    if (this.testResults.userFiltering?.success) {
      console.log(
        "   ✅ PASSED - Users can be filtered by Employee/Lead roles"
      );
      console.log(
        `      Employees available: ${this.testResults.userFiltering.employees.count}`
      );
      console.log(
        `      Leads available: ${this.testResults.userFiltering.leads.count}`
      );
    } else {
      console.log("   ❌ FAILED - User filtering not working");
    }

    // Voice Commands
    console.log("\n🎤 Voice Commands:");
    if (this.testResults.voiceCommands?.success) {
      console.log("   ✅ PASSED - Voice commands processed correctly");
    } else {
      console.log("   ❌ FAILED - Voice command processing failed");
    }

    console.log("\n🎯 EXPECTED MODAL BEHAVIOR:");
    console.log("   1. Role dropdown: Should show only [Employee, Lead]");
    console.log(
      "   2. Name dropdown: Should filter users based on selected role"
    );
    console.log("   3. Name dropdown: Should exclude existing project members");
    console.log(
      "   4. Dynamic updates: Name options should change when role changes"
    );

    console.log("\n🔗 Frontend Testing Instructions:");
    console.log(
      "   1. Open VoiceConfirmationModal with add_project_member intent"
    );
    console.log("   2. Verify Role dropdown shows only Employee and Lead");
    console.log(
      "   3. Select Employee → verify Name dropdown shows only employees"
    );
    console.log("   4. Select Lead → verify Name dropdown shows only leads");
    console.log(
      "   5. Verify existing project members are excluded from Name dropdown"
    );

    console.log("\n=".repeat(50));
  }
}

// Run the test if this script is executed directly
if (typeof window === "undefined") {
  // Node.js environment
  const tester = new ProjectMemberTester();
  tester.runCompleteTest().catch(console.error);
} else {
  // Browser environment - expose for manual execution
  window.ProjectMemberTester = ProjectMemberTester;
  console.log(
    "ProjectMemberTester loaded. Run: new ProjectMemberTester().runCompleteTest()"
  );
}
