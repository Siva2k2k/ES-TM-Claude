# Voice Intent Testing Suite

A comprehensive testing framework for the ES-TM Claude voice-based intent system. This suite tests all 27 intents across 7 categories, validates dropdown behavior, field mapping, and modal state management.

## 📋 Overview

This testing suite provides:

- **Complete Intent Testing**: Tests all 27 voice intents systematically
- **Field Validation**: Verifies field mapping, types, and dropdown population
- **Modal Behavior Testing**: Tests VoiceConfirmationModal behavior and state management
- **Role-Based Filtering**: Validates user filtering based on roles and project membership
- **Data State Management**: Tests edit mode, field persistence, and dynamic updates
- **Multiple Test Interfaces**: Command-line, PowerShell, Node.js, and browser-based testing

## 🎯 Tested Intents (27 Total)

### Project Management (7)

- `create_project` - Create new project with client and manager
- `add_project_member` - Add team member with role filtering
- `remove_project_member` - Remove team member from project
- `add_task` - Add task to project with assignment
- `update_project` - Update project details and status
- `update_task` - Update task details and status
- `delete_project` - Delete project with confirmation

### User Management (3)

- `create_user` - Create new user account
- `update_user` - Update user details and role
- `delete_user` - Delete user account

### Client Management (3)

- `create_client` - Create new client
- `update_client` - Update client information
- `delete_client` - Delete client

### Timesheet Management (6)

- `create_timesheet` - Create weekly timesheet
- `add_entries` - Add time entries to timesheet
- `update_entries` - Update existing time entries
- `delete_timesheet` - Delete entire timesheet
- `delete_entries` - Delete specific entries
- `copy_entry` - Copy entry between dates

### Team Review (5)

- `approve_user` - Approve user timesheet
- `approve_project_week` - Approve project week
- `reject_user` - Reject user timesheet
- `reject_project_week` - Reject project week
- `send_reminder` - Send timesheet reminder

### Billing (2)

- `export_project_billing` - Export project billing report
- `export_user_billing` - Export user billing report

### Audit (1)

- `get_audit_logs` - Retrieve audit logs

## 🚀 Quick Start

### Method 1: PowerShell Script (Recommended)

```powershell
# Test all intents
.\Test-VoiceIntents.ps1 -TestType all

# Test system components
.\Test-VoiceIntents.ps1 -TestType system

# Test specific intent
.\Test-VoiceIntents.ps1 -TestType intent -Intent add_project_member

# Test category
.\Test-VoiceIntents.ps1 -TestType category -Category project

# Open browser UI
.\Test-VoiceIntents.ps1 -OpenUI
```

### Method 2: Node.js Direct

```bash
# Run complete test suite
node test-all-voice-intents.js

# Test individual intent (requires code modification)
node -e "
const { VoiceIntentTester } = require('./test-all-voice-intents.js');
const tester = new VoiceIntentTester();
tester.testIndividualIntent('add_project_member').catch(console.error);
"
```

### Method 3: Browser Interface

1. Open `test-voice-intents-ui.html` in your browser
2. Use the interactive interface to run tests
3. Monitor real-time logs and results

## 📊 Test Categories

### 1. System Tests

- **Backend Connection**: Verify API accessibility
- **Authentication**: Test login and token validity
- **Data Sources**: Validate all required endpoints
- **Context Fetching**: Test voice context API

### 2. Intent Recognition Tests

- **Command Processing**: Test voice command parsing
- **Intent Detection**: Verify correct intent identification
- **Confidence Scoring**: Check confidence levels
- **Field Extraction**: Validate data extraction accuracy

### 3. Field Mapping Tests

- **Type Validation**: Verify field types (string, reference, enum, etc.)
- **Required Fields**: Check required field presence
- **Optional Fields**: Test optional field handling
- **Reference Resolution**: Validate reference field mapping

### 4. Dropdown Tests

- **Population**: Verify dropdown options are loaded
- **Filtering**: Test role-based filtering (Employee/Lead only)
- **Dynamic Updates**: Test dropdown updates on field changes
- **Data Availability**: Ensure reference data exists

### 5. Modal Behavior Tests

- **Edit Mode**: Test edit mode transitions
- **State Persistence**: Verify data state maintenance
- **Field Changes**: Test field modification and updates
- **Cancellation**: Test revert to original state

## 🔍 Detailed Test Examples

### Project Member Role Filtering Test

```javascript
// Tests that add_project_member only shows Employee and Lead roles
const command = "Add Sarah Employee as Employee to the AI Platform project";
const response = await processVoiceCommand(command);
const roleField = response.actions[0].fields.find((f) => f.name === "role");

// Expected: roleField.enumValues = ['Employee', 'Lead']
// Validates fix for role restriction issue
```

### Manager Filtering Specificity Test

```javascript
// Tests that manager dropdowns only show users with role='manager'
const users = await fetchUsers();
const managers = users.filter((u) => u.role?.toLowerCase() === "manager");

// Should exclude 'management', 'lead', 'super_admin' roles
// Only actual 'manager' role users should appear
```

### Dynamic Dropdown Update Test

```javascript
// Tests role change triggers name dropdown re-filtering
const action = {
  intent: "add_project_member",
  data: { role: "Employee" }, // Change from Lead to Employee
};

// Should trigger re-fetch of available users
// Should filter to only Employee role users
// Should exclude existing project members
```

## 📋 Test Verification Checklist

### ✅ Intent Recognition

- [ ] All 27 intents correctly identified
- [ ] Confidence scores above threshold (>0.7)
- [ ] Commands parsed accurately
- [ ] Context properly utilized

### ✅ Field Mapping

- [ ] Required fields present and typed correctly
- [ ] Reference fields map to correct types
- [ ] Enum fields have proper value lists
- [ ] Optional fields handled appropriately

### ✅ Dropdown Behavior

- [ ] Project member roles limited to Employee/Lead
- [ ] Manager dropdown shows only role='manager'
- [ ] Name filtering works by selected role
- [ ] Existing members excluded from options

### ✅ Modal Functionality

- [ ] Edit mode enables/disables correctly
- [ ] Field values persist during editing
- [ ] Cancel reverts to original state
- [ ] Confirm submits modified values

### ✅ Data State Management

- [ ] Field changes trigger appropriate updates
- [ ] Role selection updates name options
- [ ] Original data preserved when cancelling
- [ ] Modified data submitted when confirming

## 🛠️ Configuration

### Backend Configuration

```javascript
const TEST_CONFIG = {
  backendUrl: "http://localhost:3001",
  credentials: {
    email: "admin@company.com",
    password: "admin123",
  },
  timeout: 10000,
};
```

### Required Services

- ✅ Backend server running on port 3001
- ✅ MongoDB database accessible
- ✅ Azure OpenAI service configured
- ✅ Authentication system active

### Test Data Requirements

- ✅ Users with different roles (manager, employee, lead)
- ✅ Clients for project creation
- ✅ Projects for member/task operations
- ✅ Existing timesheets for testing

## 📊 Sample Test Output

```
🧪 STARTING COMPREHENSIVE VOICE INTENT TESTING
================================================================================
Testing 27 intents across 7 categories
================================================================================

🔐 TESTING AUTHENTICATION
----------------------------------------
✅ Backend health check: ok
✅ Authentication successful
✅ User role: super_admin

🎯 TESTING PROJECT INTENTS
----------------------------------------
  🔍 Testing: create_project
    📝 Command: "Create a project named Test AI Platform..."
    ✅ Intent recognized: create_project
    ✅ Field mapping: 8 fields correctly mapped
    ✅ Dropdown: client - data available
    ✅ Dropdown: manager - data available
    ✅ Structure: valid (confidence: 89.2%)
    ✅ Overall: PASSED (5/5 tests)

📊 COMPREHENSIVE TEST REPORT
================================================================================
📈 OVERALL SUMMARY
   Total Intents: 27
   Passed: 25 (92.6%)
   Failed: 2 (7.4%)

📊 CATEGORY BREAKDOWN
   ✅ PROJECT: 7/7 (100.0%)
   ✅ USER: 3/3 (100.0%)
   ✅ CLIENT: 3/3 (100.0%)
   ✅ TIMESHEET: 6/6 (100.0%)
   ❌ TEAM_REVIEW: 3/5 (60.0%)
   ✅ BILLING: 2/2 (100.0%)
   ✅ AUDIT: 1/1 (100.0%)
```

## 🐛 Common Issues & Solutions

### Issue 1: Too Many Role Options

```
❌ Problem: Role dropdown shows [Employee, Designer, QA, DevOps, Lead]
✅ Solution: Run backend/fix-all-intent-definitions.js
```

### Issue 2: Manager Filtering Too Broad

```
❌ Problem: Manager dropdown shows 10 users (all management roles)
✅ Solution: Filter only users with role='manager' exactly
```

### Issue 3: Authentication Failures

```
❌ Problem: 401 Unauthorized responses
✅ Solution: Verify backend is running and credentials are correct
```

### Issue 4: Missing Dropdown Data

```
❌ Problem: Dropdowns not populating
✅ Solution: Check data sources - run system test first
```

## 🔧 Advanced Usage

### Custom Test Scenarios

```javascript
// Test specific scenario
const tester = new VoiceIntentTester();
await tester.testIndividualIntent("add_project_member");

// Test with custom command
const customResult = await tester.processVoiceCommand(
  "Add John Developer as Lead to the Custom Project"
);

// Validate specific field behavior
const roleField = customResult.actions[0].fields.find((f) => f.name === "role");
assert(roleField.enumValues.includes("Lead"));
```

### Browser Console Testing

```javascript
// Available in browser after loading test-voice-intents-ui.html
const tester = new VoiceIntentTester();

// Run specific tests
await tester.runCompleteTest();
await tester.testIndividualIntent("create_project");

// Access results
console.log(window.testResults);
```

## 📁 File Structure

```
├── test-all-voice-intents.js      # Main test script (Node.js/Browser)
├── test-voice-intents-ui.html     # Browser-based test interface
├── Test-VoiceIntents.ps1          # PowerShell test runner
├── VOICE_INTENT_TESTING_README.md # This documentation
└── VOICE_INTENT_TESTING_GUIDE.md  # Detailed testing methodology
```

## 🤝 Contributing

When adding new intents or modifying existing ones:

1. Add intent definition to `INTENT_TEST_DATA`
2. Include expected fields, types, and dropdown mappings
3. Write representative voice command
4. Test with multiple scenarios
5. Update documentation

## 📞 Support

For issues with the testing suite:

1. Check backend server is running (`http://localhost:3001/api/v1/health`)
2. Verify authentication credentials
3. Run system tests first (`-TestType system`)
4. Check browser console for detailed error messages
5. Review test logs for specific failure details

---

**Last Updated**: November 2024  
**Compatible With**: ES-TM Claude voice system v2.0+  
**Node.js Version**: 16+ required  
**Browser Support**: Modern browsers with Fetch API
