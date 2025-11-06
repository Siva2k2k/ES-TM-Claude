# 🧪 Manual Dropdown Population Test Guide

## ✅ Prerequisites Checklist

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd "d:\Web_dev\React\BOLT PHASE-2\ES-TM Claude\backend"

# Install dependencies (if not done)
npm install

# Start backend development server
npm run dev
```

**Expected Output:** Server should start on port 3001

### 2. Frontend Setup

```powershell
# Navigate to frontend directory (new terminal)
cd "d:\Web_dev\React\BOLT PHASE-2\ES-TM Claude\frontend"

# Install dependencies (if not done)
npm install

# Start frontend development server
npm run dev
```

**Expected Output:** Frontend should start on port 5173

### 3. Database Verification

- MongoDB URI is configured in backend/.env
- Admin user exists: admin@company.com / admin123

## 🎯 Test Scenario: Create Project Intent

### Sample Voice Command:

```
"Create a project named Internal Project 3.0 with Manager, Project Manager with budget $12,000 and client root stock. For the period. 12/12/2025 to 30/01/2026."
```

### Expected Field Mapping:

Based on intent definition, this should map to:

- **projectName**: "Internal Project 3.0" (string)
- **description**: Auto-generated or empty (string)
- **clientName**: "root stock" (reference → client dropdown)
- **managerName**: "Project Manager" (reference → manager dropdown)
- **startDate**: "12/12/2025" (date)
- **endDate**: "30/01/2026" (date)
- **budget**: "$12,000" → 12000 (number)
- **status**: Default or user selection (enum dropdown)

## 🔍 Step-by-Step Testing Process

### Step 1: Backend API Testing

Open PowerShell and test the endpoints manually:

```powershell
# Test login
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@company.com","password":"admin123"}'

# Copy the token from response, then test endpoints:
$token = "YOUR_TOKEN_HERE"

# Test clients endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method GET -Headers @{"Authorization"="Bearer $token"}

# Test users endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method GET -Headers @{"Authorization"="Bearer $token"}
```

**✅ Expected Results:**

- Login returns success: true and token
- Clients endpoint returns list of clients with \_id and client_name
- Users endpoint returns list of users with \_id, full_name, and role
- Manager filtering should show users with roles: manager, management, lead, super_admin

### Step 2: Frontend Voice Interface Testing

1. **Open Browser**

   ```
   http://localhost:5173
   ```

2. **Login**

   - Email: admin@company.com
   - Password: admin123

3. **Access Voice Interface**

   - Look for voice/microphone button or component
   - If there's a voice command input field, use that

4. **Execute Voice Command**

   ```
   Create a project named Internal Project 3.0 with Manager, Project Manager with budget $12,000 and client root stock. For the period. 12/12/2025 to 30/01/2026.
   ```

5. **Verify Voice Confirmation Modal**
   - Modal should appear with detected intent and extracted data
   - Check if "Edit" functionality is available

## 🎯 Critical Dropdown Tests

### Test 1: Client Dropdown Population

**Field:** clientName (reference type)
**Expected Behavior:**

- Dropdown should be populated with actual clients from database
- Each option should have format: `{value: client._id, label: client.client_name}`
- Should show real client names, not hardcoded values

**Verification Points:**

```javascript
// Check in browser DevTools Console:
// 1. Dropdown options should match clients from API
// 2. Values should be MongoDB ObjectIds
// 3. Labels should be readable client names
```

### Test 2: Manager Dropdown Population

**Field:** managerName (reference type)
**Expected Behavior:**

- Dropdown should only show users with manager-level roles
- Filtered roles: ['manager', 'management', 'lead', 'super_admin']
- Format: `{value: user._id, label: user.full_name}`

**Verification Points:**

```javascript
// Check in browser DevTools Console:
// 1. Only manager-level users appear
// 2. Values are user ObjectIds
// 3. Labels are full names
// 4. Regular employees are excluded
```

### Test 3: Status Enum Dropdown

**Field:** status (enum type)
**Expected Behavior:**

- Dropdown should show predefined enum values: ['Active', 'Completed', 'Archived']
- No API call needed, sourced from intent definition

**Verification Points:**

```javascript
// Should show exactly these options:
// {value: 'Active', label: 'Active'}
// {value: 'Completed', label: 'Completed'}
// {value: 'Archived', label: 'Archived'}
```

## 🐛 Debugging Steps

### If Dropdowns Are Empty:

1. **Check Browser DevTools Console**

   - Look for API call errors
   - Check network tab for failed requests

2. **Verify API Responses**

   ```javascript
   // In browser console, check if data is being fetched:
   fetch("/api/v1/clients", {
     headers: { Authorization: "Bearer " + localStorage.getItem("token") },
   })
     .then((r) => r.json())
     .then(console.log);
   ```

3. **Check VoiceConfirmationModal State**
   - Use React DevTools to inspect component state
   - Check `dropdownOptions` state object
   - Verify `loadingOptions` state

### If Wrong Data Appears:

1. **Check Field Type Detection**

   - Verify field.type === 'reference'
   - Check field.referenceType value
   - Ensure field name mapping is correct

2. **Check API Response Format**
   - Clients should have \_id and client_name
   - Users should have \_id, full_name, and role
   - Enum values should match intent definition

## 📊 Success Criteria

### ✅ Pass Conditions:

1. **Client Dropdown**: Shows real clients from database, not hardcoded
2. **Manager Dropdown**: Shows only manager-level users, properly filtered
3. **Status Dropdown**: Shows enum values: Active, Completed, Archived
4. **No Other Options**: Dropdowns contain ONLY the expected data types
5. **Proper Values**: Option values are database IDs, not display names
6. **API Integration**: Data comes from backend APIs, not static arrays

### ❌ Fail Conditions:

1. Empty dropdowns when data exists in database
2. Hardcoded or static dropdown options
3. All users appearing in manager dropdown (no role filtering)
4. API errors preventing data fetch
5. Dropdowns showing unexpected data sources

## 🔧 Common Issues & Solutions

### Issue: "No dropdowns appear"

**Solution:** Check if VoiceConfirmationModal is detecting reference types correctly

### Issue: "Dropdowns are empty but APIs work"

**Solution:** Check field name mapping in getOptionsForField function

### Issue: "All users appear in manager dropdown"

**Solution:** Verify role filtering logic in fetchDropdownOptions

### Issue: "API calls fail"

**Solution:** Check authentication token and CORS settings

## 📝 Test Report Template

```
## Dropdown Population Test Results

### Environment:
- Backend: http://localhost:3001 ✅/❌
- Frontend: http://localhost:5173 ✅/❌
- Authentication: ✅/❌

### API Endpoints:
- GET /clients: ✅/❌ (X clients found)
- GET /users: ✅/❌ (X users found, Y managers)

### Voice Command Recognition:
- Intent: create_project ✅/❌
- Field mapping: ✅/❌
- Modal appearance: ✅/❌

### Dropdown Population:
- Client dropdown: ✅/❌ (Source: Database/Static)
- Manager dropdown: ✅/❌ (Filtered: Yes/No)
- Status dropdown: ✅/❌ (Source: Enum/Static)

### Data Verification:
- Option values: Database IDs ✅/❌
- Option labels: Readable names ✅/❌
- No unexpected data: ✅/❌

### Overall Result: PASS/FAIL
```
