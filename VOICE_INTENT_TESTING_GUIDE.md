# Voice-Based Intent Testing and Debugging Guide

## Overview

This comprehensive guide documents the methodology for testing, debugging, and fixing voice-based intent issues in the ES-TM Claude application. It covers the complete workflow from backend authentication to frontend modal verification.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Authentication and Connection](#authentication-and-connection)
4. [Backend API Testing](#backend-api-testing)
5. [Voice Command Processing](#voice-command-processing)
6. [Frontend Modal Testing](#frontend-modal-testing)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Case Studies](#case-studies)
9. [Automated Testing Scripts](#automated-testing-scripts)
10. [Troubleshooting](#troubleshooting)

## System Architecture

### Voice Flow Architecture

```
Voice Input → Azure OpenAI → Intent Recognition → Field Mapping → Validation → Modal Display → Action Execution
```

### Key Components

- **Backend**: Node.js/Express with MongoDB
- **Voice Processing**: Azure OpenAI integration
- **Frontend**: React with TypeScript
- **Authentication**: JWT-based token system
- **Database**: MongoDB with intent definitions

## Prerequisites

### Required Services

- ✅ Backend server running on port 3001
- ✅ Frontend server running on port 5173
- ✅ MongoDB database accessible
- ✅ Azure OpenAI service configured

### Required Tools

- PowerShell (for API testing)
- Browser with Developer Tools
- Node.js for test scripts
- MongoDB connection for data verification

## Authentication and Connection

### Step 1: Establish Backend Connection

#### PowerShell Method

```powershell
# Test backend connectivity
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/health" -Method GET
Write-Output "Backend Status: $($response.status)"
```

#### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2025-11-05T...",
  "services": {
    "database": "connected",
    "voice": "available"
  }
}
```

### Step 2: Obtain Authentication Token

#### PowerShell Authentication

```powershell
# Create login request
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

# Send authentication request
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginData

# Extract token
$token = $response.tokens.accessToken
Write-Output "Token obtained successfully"
```

#### Expected Response Structure

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "68df77ec2ba674aa3c8cd2bb",
    "email": "admin@company.com",
    "full_name": "System Admin",
    "role": "super_admin"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Step 3: Verify Authorization

#### Test Token Validity

```powershell
# Test authenticated endpoint
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$userResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method GET -Headers $headers
Write-Output "User count: $($userResponse.users.Count)"
```

## Backend API Testing

### Step 4: Test Data Source APIs

#### Test Clients API

```powershell
$clients = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Output "=== CLIENTS DATA ==="
Write-Output "Count: $($clients.data.Count)"
$clients.data | Select-Object name, _id | Format-Table -AutoSize
```

#### Test Users API with Role Filtering

```powershell
$users = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Output "=== USERS BY ROLE ==="
Write-Output "Managers (role='manager'):"
$users.users | Where-Object { $_.role -eq "manager" } | Select-Object full_name, role, id | Format-Table -AutoSize

Write-Output "Employees (role='employee'):"
$users.users | Where-Object { $_.role -eq "employee" } | Select-Object full_name, role, id | Format-Table -AutoSize

Write-Output "Leads (role='lead'):"
$users.users | Where-Object { $_.role -eq "lead" } | Select-Object full_name, role, id | Format-Table -AutoSize
```

#### Test Projects API

```powershell
$projects = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/projects" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Output "=== PROJECTS DATA ==="
Write-Output "Count: $($projects.projects.Count)"
$projects.projects | Select-Object name, _id | Format-Table -AutoSize
```

## Voice Command Processing

### Step 5: Test Voice Command Endpoint

#### Basic Voice Command Test

```powershell
# Prepare voice command request
$voiceBody = @{
    transcript = "Create a project named Internal Project 3.0 with Manager, Project Manager with budget `$12,000 and client Rootstockk. For the period. 12/12/2025 to 30/01/2026."
    context = @{
        user_id = "admin"
        current_page = "projects"
    }
} | ConvertTo-Json

# Send voice processing request
$voiceResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/voice/process-command" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $voiceBody

# Analyze response
Write-Output "=== VOICE PROCESSING RESULT ==="
Write-Output "Intent: $($voiceResponse.actions[0].intent)"
Write-Output "Confidence: $($voiceResponse.actions[0].confidence)"
Write-Output "Fields detected: $($voiceResponse.actions[0].fields.Count)"
```

#### Field-Specific Analysis

```powershell
Write-Output "=== FIELD ANALYSIS ==="
$voiceResponse.actions[0].fields | Format-Table name, type, referenceType, required -AutoSize

Write-Output "=== REFERENCE FIELDS ==="
$voiceResponse.actions[0].fields | Where-Object { $_.type -eq "reference" } | Format-Table name, referenceType -AutoSize

Write-Output "=== ENUM FIELDS ==="
$voiceResponse.actions[0].fields | Where-Object { $_.type -eq "enum" } | Format-Table name, enumValues -AutoSize
```

### Step 6: Test Specific Intent Types

#### Project Member Intent Test

```powershell
$memberBody = @{
    transcript = "Add John Developer H as Employee to the AI Platform project"
    context = @{
        user_id = "admin"
        current_page = "projects"
    }
} | ConvertTo-Json

$memberResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/voice/process-command" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $memberBody

Write-Output "=== PROJECT MEMBER INTENT ==="
Write-Output "Intent: $($memberResponse.actions[0].intent)"
Write-Output "Role field enum values: $($memberResponse.actions[0].fields | Where-Object { $_.name -eq 'role' } | Select-Object -ExpandProperty enumValues)"
```

## Frontend Modal Testing

### Step 7: Frontend Integration Testing

#### Open Test Page

1. Navigate to: `http://localhost:5173/test-confirmation-modal.html`
2. Or create custom test page with VoiceConfirmationModal

#### Test Modal Behavior

```javascript
// Browser console testing
const testVoiceModal = async () => {
  // Trigger voice command programmatically
  const voiceContext = useVoice(); // React context

  // Simulate voice processing result
  const mockAction = {
    intent: "add_project_member",
    fields: [
      {
        name: "projectName",
        type: "reference",
        referenceType: "project",
        required: true,
      },
      {
        name: "role",
        type: "enum",
        enumValues: ["Employee", "Lead"],
        required: true,
      },
      {
        name: "name",
        type: "reference",
        referenceType: "user",
        required: true,
      },
    ],
    data: {
      projectName: "",
      role: "",
      name: "",
    },
  };

  // This would trigger the modal
  voiceContext.setPendingActions([mockAction]);
};
```

### Step 8: Verify Dropdown Population

#### Check Role Dropdown

1. **Expected**: Only shows "Employee" and "Lead"
2. **Verify**: No other roles (Designer, QA, DevOps) appear
3. **Test**: Select each role and verify name dropdown updates

#### Check Name Dropdown Filtering

1. **Select "Employee"**: Should show only users with role='employee'
2. **Select "Lead"**: Should show only users with role='lead'
3. **Verify Exclusions**: Existing project members should not appear

#### Verify Dynamic Updates

1. Change role selection
2. Observe name dropdown updates in real-time
3. Confirm filtered options are correct

## Common Issues and Solutions

### Issue 1: Too Many Role Options

```
❌ Problem: Role dropdown shows [Employee, Designer, QA, DevOps, Lead]
✅ Solution: Update intent definition enum values
```

**Fix Steps:**

1. Update `backend/fix-all-intent-definitions.js`
2. Change enum values to `['Employee', 'Lead']`
3. Run: `node fix-all-intent-definitions.js`

### Issue 2: Incorrect Manager Filtering

```
❌ Problem: Manager dropdown shows 10 users (all management roles)
✅ Solution: Filter only users with role='manager'
```

**Fix Steps:**

1. Update `VoiceConfirmationModal.tsx`
2. Change filter: `u.role?.toLowerCase() === 'manager'`
3. Update `VoiceFieldMapper.ts` accordingly

### Issue 3: Name Dropdown Not Filtering by Role

```
❌ Problem: Name dropdown shows all users regardless of role selection
✅ Solution: Implement dynamic filtering in fetchDropdownOptions
```

**Fix Steps:**

1. Add role-based filtering logic
2. Implement field change handler for role updates
3. Re-fetch options when role changes

### Issue 4: Existing Members Not Excluded

```
❌ Problem: Name dropdown includes users already in the project
✅ Solution: Fetch project members and exclude from available options
```

**Fix Steps:**

1. Call `/projects/${projectId}/members` API
2. Extract existing member IDs
3. Filter users to exclude existing members

## Case Studies

### Case Study 1: Manager Role Filtering Fix

#### Initial Problem

```javascript
// BEFORE: Too broad filtering
const managers = users.filter((u) =>
  ["manager", "management", "lead", "super_admin"].includes(
    u.role?.toLowerCase()
  )
);
// Result: 10 users returned
```

#### Solution Applied

```javascript
// AFTER: Precise filtering
const managers = users.filter((u) => u.role?.toLowerCase() === "manager");
// Result: 2 users returned
```

#### Verification

```powershell
# Test command
$users.users | Where-Object { $_.role -eq "manager" } | Select-Object full_name, role, id
# Expected: Only actual managers
```

### Case Study 2: Project Member Role Restriction

#### Initial Problem

```javascript
// BEFORE: All project roles allowed
enumValues: {
  role: ["Employee", "Designer", "QA", "DevOps", "Lead"];
}
```

#### Solution Applied

```javascript
// AFTER: Restricted to business requirements
enumValues: {
  role: ["Employee", "Lead"];
}
```

#### Verification

```powershell
# Test voice command
$memberResponse.actions[0].fields | Where-Object { $_.name -eq 'role' } | Select-Object -ExpandProperty enumValues
# Expected: @('Employee', 'Lead')
```

## Automated Testing Scripts

### Complete Test Script

Create `test-voice-system.js`:

```javascript
class VoiceSystemTester {
  async runCompleteTest() {
    console.log("🧪 Starting Complete Voice System Test...\n");

    // Step 1: Authentication
    await this.testAuthentication();

    // Step 2: Data Sources
    await this.testDataSources();

    // Step 3: Voice Processing
    await this.testVoiceProcessing();

    // Step 4: Modal Behavior
    await this.testModalBehavior();

    // Step 5: Generate Report
    this.generateReport();
  }

  async testAuthentication() {
    // Implementation from previous examples
  }

  async testDataSources() {
    // Test all API endpoints
  }

  async testVoiceProcessing() {
    // Test voice command processing
  }

  async testModalBehavior() {
    // Test expected modal dropdown behavior
  }

  generateReport() {
    // Generate comprehensive test report
  }
}
```

### Running Tests

```bash
# Backend tests
node test-voice-system.js

# Frontend tests (browser console)
new VoiceSystemTester().runCompleteTest()
```

## Troubleshooting

### Authentication Issues

#### Token Expiration

```powershell
# Symptoms: 401 Unauthorized responses
# Solution: Re-authenticate
$loginData = @{ email = "admin@company.com"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginData
$token = $response.tokens.accessToken
```

#### Invalid Credentials

```powershell
# Check user exists in database
# Verify password is correct
# Check MongoDB connection
```

### Voice Processing Issues

#### Intent Not Recognized

```powershell
# Check intent definitions in MongoDB
# Verify Azure OpenAI service
# Test with simpler commands
```

#### Field Mapping Errors

```powershell
# Check VoiceFieldMapper.ts
# Verify referenceTypes mapping
# Test field resolution logic
```

### Frontend Modal Issues

#### Dropdown Not Populating

```javascript
// Check console for API errors
// Verify backend endpoints are accessible
// Check authentication token in requests
```

#### Dynamic Filtering Not Working

```javascript
// Verify handleFieldChange implementation
// Check fetchDropdownOptions logic
// Test role selection changes
```

## Best Practices

### Testing Workflow

1. **Always start with authentication**
2. **Test backend APIs before frontend**
3. **Verify data sources are correct**
4. **Test voice processing in isolation**
5. **Validate modal behavior step by step**

### Debugging Strategy

1. **Use structured testing approach**
2. **Test one component at a time**
3. **Verify expected vs actual results**
4. **Document all issues and solutions**
5. **Create reproducible test cases**

### Code Quality

1. **Add comprehensive error handling**
2. **Include detailed logging**
3. **Write automated tests**
4. **Document API contracts**
5. **Maintain consistent naming conventions**

## Monitoring and Maintenance

### Regular Health Checks

```powershell
# Daily health check script
$health = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/health" -Method GET
if ($health.status -eq "ok") {
    Write-Output "✅ System healthy"
} else {
    Write-Output "❌ System issues detected"
}
```

### Performance Monitoring

- Monitor response times for voice processing
- Track authentication success rates
- Monitor database query performance
- Track modal rendering times

### Error Tracking

- Log all voice processing errors
- Track field mapping failures
- Monitor authentication failures
- Record modal rendering errors

## Conclusion

This guide provides a comprehensive methodology for testing and fixing voice-based intent issues. By following these steps systematically, you can:

- ✅ Establish reliable connections and authentication
- ✅ Test backend APIs and data sources
- ✅ Verify voice command processing
- ✅ Validate frontend modal behavior
- ✅ Debug issues efficiently
- ✅ Implement robust solutions

The key to success is methodical testing, thorough documentation, and systematic debugging. Always test from the backend up to the frontend, verifying each layer before proceeding to the next.

## Quick Reference

### Essential Commands

```powershell
# Authentication
$loginData = @{ email = "admin@company.com"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginData
$token = $response.tokens.accessToken

# Voice Command Test
$body = @{ transcript = "Your voice command here"; context = @{ user_id = "admin"; current_page = "projects" } } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/voice/process-command" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $body

# Data Source Test
$users = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method GET -Headers @{"Authorization"="Bearer $token"}
$clients = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method GET -Headers @{"Authorization"="Bearer $token"}
```

### Common URLs

- Backend Health: `http://localhost:3001/api/v1/health`
- Authentication: `http://localhost:3001/api/v1/auth/login`
- Voice Processing: `http://localhost:3001/api/v1/voice/process-command`
- Frontend Test: `http://localhost:5173/test-confirmation-modal.html`

---

_This guide is living documentation that should be updated as the system evolves and new issues are discovered and resolved._
