# Voice Intent Testing PowerShell Script
# Provides easy commands to run comprehensive voice intent tests

param(
    [string]$TestType = "help",
    [string]$Intent = "",
    [string]$Category = "",
    [switch]$Verbose = $false,
    [switch]$OpenUI = $false,
    [switch]$Backend = $false,
    [switch]$Frontend = $false
)

# Configuration
$BackendUrl = "http://localhost:3001"
$FrontendUrl = "http://localhost:5173"
$TestScript = "test-all-voice-intents.js"
$TestUI = "test-voice-intents-ui.html"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    
    $actualColor = switch ($Color) {
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        "Info" { "Cyan" }
        "Header" { "Magenta" }
        default { "White" }
    }
    
    Write-Host $Message -ForegroundColor $actualColor
}

function Show-Header {
    Write-ColorOutput "=" * 80 -Color "Header"
    Write-ColorOutput "VOICE INTENT TESTING SUITE" -Color "Header"
    Write-ColorOutput "Comprehensive testing for ES-TM Claude voice system" -Color "Info"
    Write-ColorOutput "=" * 80 -Color "Header"
}

function Show-Help {
    Show-Header
    Write-ColorOutput "`nAVAILABLE TEST COMMANDS:" -Color "Info"
    Write-ColorOutput ""
    Write-ColorOutput "SYSTEM TESTS:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType system" -Color "Success"
    Write-ColorOutput "    -> Test backend connection, auth, and data sources"
    Write-ColorOutput ""
    Write-ColorOutput "INDIVIDUAL TESTS:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType intent -Intent add_project_member" -Color "Success"
    Write-ColorOutput "    -> Test specific intent"
    Write-ColorOutput ""
    Write-ColorOutput "CATEGORY TESTS:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType category -Category project" -Color "Success"
    Write-ColorOutput "    -> Test all intents in category (project, user, client, timesheet, team_review, billing, audit)"
    Write-ColorOutput ""
    Write-ColorOutput "COMPREHENSIVE TESTS:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType all" -Color "Success"
    Write-ColorOutput "    -> Run complete test suite (all 27 intents)"
    Write-ColorOutput ""
    Write-ColorOutput "MODAL TESTS:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType modal" -Color "Success"
    Write-ColorOutput "    -> Test dropdown behavior and edit mode"
    Write-ColorOutput ""
    Write-ColorOutput "UI INTERFACE:" -Color "Header"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -OpenUI" -Color "Success"
    Write-ColorOutput "    -> Open browser-based testing interface"
    Write-ColorOutput ""
    Write-ColorOutput "QUICK EXAMPLES:" -Color "Warning"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType system -Verbose"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType intent -Intent create_project -Verbose"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType category -Category project"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -TestType all -Backend"
    Write-ColorOutput "  .\Test-VoiceIntents.ps1 -OpenUI"
    Write-ColorOutput ""
}

function Test-Prerequisites {
    Write-ColorOutput "Checking prerequisites..." -Color "Info"
    
    # Check if Node.js is available
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-ColorOutput "Node.js: $nodeVersion" -Color "Success"
    } else {
        Write-ColorOutput "Node.js not found - required for testing" -Color "Error"
        return $false
    }
    
    # Check if test script exists
    if (Test-Path $TestScript) {
        Write-ColorOutput "Test script: $TestScript found" -Color "Success"
    } else {
        Write-ColorOutput "Test script not found: $TestScript" -Color "Error"
        return $false
    }
    
    # Check backend connectivity
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET -TimeoutSec 5
        Write-ColorOutput "Backend: $BackendUrl (Status: $($response.status))" -Color "Success"
    } catch {
        Write-ColorOutput "Backend: $BackendUrl not accessible" -Color "Error"
        Write-ColorOutput "   Make sure backend server is running on port 3001" -Color "Warning"
        return $false
    }
    
    # Check frontend (optional)
    if ($Frontend) {
        try {
            $response = Invoke-WebRequest -Uri $FrontendUrl -Method GET -TimeoutSec 5
            Write-ColorOutput "Frontend: $FrontendUrl accessible" -Color "Success"
        } catch {
            Write-ColorOutput "Frontend: $FrontendUrl not accessible (optional)" -Color "Warning"
        }
    }
    
    return $true
}

function Test-Authentication {
    Write-ColorOutput "`nTesting authentication..." -Color "Info"
    
    $loginData = @{
        email = "admin@company.com"
        password = "admin123"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginData
        
        if ($response.success -and $response.tokens.accessToken) {
            Write-ColorOutput "Authentication successful" -Color "Success"
            Write-ColorOutput "   User: $($response.user.full_name) ($($response.user.role))" -Color "Info"
            return $response.tokens.accessToken
        } else {
            Write-ColorOutput "Authentication failed - invalid response" -Color "Error"
            return $null
        }
    } catch {
        Write-ColorOutput "Authentication failed: $($_.Exception.Message)" -Color "Error"
        return $null
    }
}

function Test-DataSources {
    param([string]$Token)
    
    Write-ColorOutput "`nTesting data sources..." -Color "Info"
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $endpoints = @(
        @{ Name = "Users"; Url = "/api/v1/users" },
        @{ Name = "Clients"; Url = "/api/v1/clients" },
        @{ Name = "Projects"; Url = "/api/v1/projects" },
        @{ Name = "Voice Context"; Url = "/api/v1/voice/context" }
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$BackendUrl$($endpoint.Url)" -Method GET -Headers $headers
            
            # Determine data count based on response structure
            $count = 0
            if ($response.users) { $count = $response.users.Count }
            elseif ($response.data) { $count = $response.data.Count }
            elseif ($response.projects) { $count = $response.projects.Count }
            elseif ($response.context) { $count = "Available" }
            else { $count = "Unknown" }
            
            Write-ColorOutput "  $($endpoint.Name): $count items" -Color "Success"
        } catch {
            Write-ColorOutput "  $($endpoint.Name): Failed ($($_.Exception.Message))" -Color "Error"
        }
    }
}

function Run-NodeTest {
    param([string]$TestCommand)
    
    Write-ColorOutput "`nRunning Node.js test..." -Color "Info"
    Write-ColorOutput "Command: $TestCommand" -Color "Info"
    
    if ($Verbose) {
        & node -e $TestCommand
    } else {
        & node -e $TestCommand 2>$null
    }
}

function Test-SystemComponents {
    Show-Header
    Write-ColorOutput "SYSTEM COMPONENT TESTING" -Color "Header"
    
    if (-not (Test-Prerequisites)) {
        Write-ColorOutput "Prerequisites check failed - cannot continue" -Color "Error"
        return
    }
    
    $token = Test-Authentication
    if (-not $token) {
        Write-ColorOutput "Authentication failed - cannot continue" -Color "Error"
        return
    }
    
    Test-DataSources -Token $token
    
    Write-ColorOutput "`nSystem component testing completed" -Color "Success"
}

function Test-IndividualIntent {
    param([string]$IntentName)
    
    Show-Header
    Write-ColorOutput "INDIVIDUAL INTENT TESTING: $IntentName" -Color "Header"
    
    if (-not (Test-Prerequisites)) {
        return
    }
    
    $testCommand = @"
const { VoiceIntentTester } = require('./$TestScript');
const tester = new VoiceIntentTester();
tester.testIndividualIntent('$IntentName').catch(console.error);
"@
    
    Run-NodeTest -TestCommand $testCommand
}

function Test-Category {
    param([string]$CategoryName)
    
    Show-Header
    Write-ColorOutput "CATEGORY TESTING: $CategoryName" -Color "Header"
    
    if (-not (Test-Prerequisites)) {
        return
    }
    
    $testCommand = @"
const { VoiceIntentTester, INTENT_TEST_DATA } = require('./$TestScript');
const tester = new VoiceIntentTester();
(async () => {
    await tester.testAuthentication();
    if (INTENT_TEST_DATA['$CategoryName']) {
        await tester.testIntentCategory('$CategoryName', INTENT_TEST_DATA['$CategoryName']);
    } else {
        console.log('Category not found: $CategoryName');
        console.log('Available categories:', Object.keys(INTENT_TEST_DATA));
    }
})().catch(console.error);
"@
    
    Run-NodeTest -TestCommand $testCommand
}

function Test-AllIntents {
    Show-Header
    Write-ColorOutput "COMPREHENSIVE INTENT TESTING" -Color "Header"
    Write-ColorOutput "Testing all 27 intents across 7 categories..." -Color "Info"
    
    if (-not (Test-Prerequisites)) {
        return
    }
    
    $testCommand = @"
const { VoiceIntentTester } = require('./$TestScript');
const tester = new VoiceIntentTester();
tester.runCompleteTest().catch(console.error);
"@
    
    Run-NodeTest -TestCommand $testCommand
}

function Test-ModalBehavior {
    Show-Header
    Write-ColorOutput "MODAL BEHAVIOR TESTING" -Color "Header"
    
    if (-not (Test-Prerequisites)) {
        return
    }
    
    $testCommand = @"
const { VoiceIntentTester } = require('./$TestScript');
const tester = new VoiceIntentTester();
(async () => {
    await tester.testAuthentication();
    await tester.testDropdownBehavior();
    await tester.testDataStateManagement();
    console.log('Modal behavior testing completed');
})().catch(console.error);
"@
    
    Run-NodeTest -TestCommand $testCommand
}

function Open-TestUI {
    Write-ColorOutput "Opening browser-based testing interface..." -Color "Info"
    
    if (Test-Path $TestUI) {
        Write-ColorOutput "Opening: $TestUI" -Color "Success"
        Start-Process $TestUI
    } else {
        Write-ColorOutput "UI file not found: $TestUI" -Color "Error"
        Write-ColorOutput "   Run the script from the project root directory" -Color "Warning"
    }
}

function Show-AvailableIntents {
    Write-ColorOutput "`nAVAILABLE INTENTS BY CATEGORY:" -Color "Info"
    
    $intentData = @{
        "project" = @("create_project", "add_project_member", "remove_project_member", "add_task", "update_project", "update_task", "delete_project")
        "user" = @("create_user", "update_user", "delete_user")
        "client" = @("create_client", "update_client", "delete_client")
        "timesheet" = @("create_timesheet", "add_entries", "update_entries", "delete_timesheet", "delete_entries", "copy_entry")
        "team_review" = @("approve_user", "approve_project_week", "reject_user", "reject_project_week", "send_reminder")
        "billing" = @("export_project_billing", "export_user_billing")
        "audit" = @("get_audit_logs")
    }
    
    foreach ($category in $intentData.Keys) {
        Write-ColorOutput "`n$($category.ToUpper()) ($(($intentData[$category]).Count)):" -Color "Header"
        foreach ($intent in $intentData[$category]) {
            Write-ColorOutput "  - $intent" -Color "Success"
        }
    }
    
    Write-ColorOutput "`nTotal: $(($intentData.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum) intents" -Color "Info"
}

# Main execution logic
switch ($TestType.ToLower()) {
    "help" { 
        Show-Help 
        Show-AvailableIntents
    }
    "system" { 
        Test-SystemComponents 
    }
    "intent" { 
        if (-not $Intent) {
            Write-ColorOutput "Please specify an intent name with -Intent parameter" -Color "Error"
            Show-AvailableIntents
        } else {
            Test-IndividualIntent -IntentName $Intent
        }
    }
    "category" { 
        if (-not $Category) {
            Write-ColorOutput "Please specify a category name with -Category parameter" -Color "Error"
            Write-ColorOutput "Available categories: project, user, client, timesheet, team_review, billing, audit" -Color "Warning"
        } else {
            Test-Category -CategoryName $Category
        }
    }
    "all" { 
        Test-AllIntents 
    }
    "modal" { 
        Test-ModalBehavior 
    }
    default {
        if ($OpenUI) {
            Open-TestUI
        } else {
            Write-ColorOutput "Unknown test type: $TestType" -Color "Error"
            Show-Help
        }
    }
}

# Handle UI flag
if ($OpenUI -and $TestType -ne "default") {
    Open-TestUI
}

Write-ColorOutput "`nTesting session completed!" -Color "Success"