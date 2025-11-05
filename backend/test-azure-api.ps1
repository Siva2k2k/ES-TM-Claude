# PowerShell script to test Azure OpenAI API
# Load environment variables from .env file

# Read .env file and set environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Environment variables loaded from .env file" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

# Get configuration from environment variables
$endpoint = $env:AZURE_OPENAI_ENDPOINT
$apiKey = $env:AZURE_OPENAI_API_KEY
$deploymentName = $env:AZURE_OPENAI_DEPLOYMENT_NAME
$apiVersion = $env:AZURE_OPENAI_API_VERSION

Write-Host "🔧 Configuration:" -ForegroundColor Cyan
Write-Host "- Endpoint: $endpoint" -ForegroundColor White
Write-Host "- Deployment: $deploymentName" -ForegroundColor White
Write-Host "- API Version: $apiVersion" -ForegroundColor White
Write-Host "- API Key: ***$($apiKey.Substring($apiKey.Length - 4))" -ForegroundColor White
Write-Host ""

# Construct the full URL for chat completions
$url = "$($endpoint.TrimEnd('/'))/openai/deployments/$deploymentName/chat/completions?api-version=$apiVersion"

Write-Host "🌐 Request URL: $url" -ForegroundColor Yellow
Write-Host ""

# Request headers
$headers = @{
    "Content-Type" = "application/json"
    "api-key" = $apiKey
}

# Request body (using chat completions format, not the deprecated completions endpoint)
$body = @{
    messages = @(
        @{
            role = "system"
            content = "You are a helpful assistant."
        },
        @{
            role = "user" 
            content = "This is a test. Respond with a JSON object containing status and message."
        }
    )
    max_tokens = 150
    temperature = 0.1
    response_format = @{
        type = "json_object"
    }
} | ConvertTo-Json -Depth 10

Write-Host "📤 Request Body:" -ForegroundColor Magenta
Write-Host $body -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "🔄 Sending request to Azure OpenAI..." -ForegroundColor Cyan
    
    # Make the API call
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Response received successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Display response
    Write-Host "📥 Response Details:" -ForegroundColor Cyan
    Write-Host "- Model: $($response.model)" -ForegroundColor White
    Write-Host "- Finish Reason: $($response.choices[0].finish_reason)" -ForegroundColor White
    Write-Host "- Usage: $($response.usage.total_tokens) tokens (prompt: $($response.usage.prompt_tokens), completion: $($response.usage.completion_tokens))" -ForegroundColor White
    Write-Host ""
    
    Write-Host "💬 Generated Content:" -ForegroundColor Yellow
    Write-Host $response.choices[0].message.content -ForegroundColor White
    Write-Host ""
    
    # Try to parse JSON response
    try {
        $jsonResponse = $response.choices[0].message.content | ConvertFrom-Json
        Write-Host "✅ JSON parsing successful!" -ForegroundColor Green
        Write-Host "- Status: $($jsonResponse.status)" -ForegroundColor White
        Write-Host "- Message: $($jsonResponse.message)" -ForegroundColor White
    } catch {
        Write-Host "⚠️  Response is not valid JSON" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ API call failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 404) {
            Write-Host ""
            Write-Host "🔍 Troubleshooting 404 error:" -ForegroundColor Yellow
            Write-Host "1. Check if deployment name '$deploymentName' exists in your Azure OpenAI resource" -ForegroundColor White
            Write-Host "2. Verify the deployment is active and available" -ForegroundColor White
            Write-Host "3. Confirm the endpoint URL is correct" -ForegroundColor White
            Write-Host "4. Check API version compatibility" -ForegroundColor White
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host ""
            Write-Host "🔍 Authentication issue:" -ForegroundColor Yellow
            Write-Host "1. Check if API key is correct and active" -ForegroundColor White
            Write-Host "2. Verify API key has access to the deployment" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "🏁 Test completed." -ForegroundColor Cyan