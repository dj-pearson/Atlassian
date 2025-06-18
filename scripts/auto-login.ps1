# Automated Forge Login Script
# This script handles Forge authentication using various methods

param(
    [string]$Email = "",
    [string]$ApiToken = ""
)

# Colors for output
function Write-Step { 
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor Yellow 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red 
}

function Write-Info { 
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Blue 
}

Write-Info "🔑 Forge Authentication Setup"
Write-Host ""

# Function to read .env file if it exists
function Read-EnvFile {
    if (Test-Path ".env") {
        Write-Info "Found .env file, reading credentials..."
        Get-Content ".env" | ForEach-Object {
            if ($_ -match "^([^=]+)=(.*)$") {
                $name = $matches[1]
                $value = $matches[2]
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        return $true
    }
    return $false
}

# Try to get credentials from various sources
$envFileExists = Read-EnvFile

# Get email
if (-not $Email) {
    $Email = if ($env:ATLASSIAN_EMAIL) { $env:ATLASSIAN_EMAIL } else { $env:FORGE_EMAIL }
}

# Get API token
if (-not $ApiToken) {
    $ApiToken = if ($env:ATLASSIAN_API_TOKEN) { $env:ATLASSIAN_API_TOKEN } else { $env:FORGE_API_TOKEN }
}

# If still no credentials, prompt for them
if (-not $Email) {
    Write-Info "Email not found in environment variables or .env file"
    $Email = Read-Host "Enter your Atlassian email"
}

if (-not $ApiToken) {
    Write-Info "API Token not found in environment variables or .env file"
    Write-Info "Get your API token from: https://id.atlassian.com/manage/api-tokens"
    $ApiTokenSecure = Read-Host "Enter your Atlassian API token" -AsSecureString
    $ApiToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiTokenSecure))
}

Write-Step "Attempting Forge login..."

# Method 1: Try environment variable approach
$env:FORGE_EMAIL = $Email
$env:FORGE_API_TOKEN = $ApiToken

# Method 2: Create a temporary input file for forge login
$tempFile = [System.IO.Path]::GetTempFileName()
$loginInput = @"
$Email
$ApiToken
"@

$loginInput | Out-File -FilePath $tempFile -Encoding UTF8

try {
    # Try non-interactive login first
    Write-Info "Attempting automated login..."
    
    # Check if already logged in
    $whoami = forge whoami 2>$null
    if ($whoami) {
        Write-Success "Already logged in to Forge as: $whoami"
        return
    }
    
    # Method 3: Use expect-like functionality with input redirection
    Write-Info "Redirecting input to forge login..."
    
    # Create a more robust input script
    $inputScript = @"
$Email
$ApiToken

"@
    
    $inputScript | forge login 2>$null
    
    # Verify login worked
    Start-Sleep -Seconds 2
    $whoami = forge whoami 2>$null
    
    if ($whoami) {
        Write-Success "Successfully logged in to Forge!"
        Write-Info "Logged in as: $whoami"
    } else {
        throw "Login verification failed"
    }
    
} catch {
    Write-Error "Automated login failed. Please try manual login:"
    Write-Info "Run: forge login"
    Write-Info "Email: $Email"
    Write-Info "API Token: (from .env file or environment)"
    
    # Fallback: Open the API token URL
    Write-Info "Opening API token management page..."
    Start-Process "https://id.atlassian.com/manage/api-tokens"
    
    exit 1
} finally {
    # Cleanup
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

Write-Success "Forge authentication completed!"
Write-Host ""
Write-Info "Next steps:"
Write-Host "1. Run: npm install"
Write-Host "2. Run: forge deploy"
Write-Host "3. Run: forge install"
Write-Host ""
Write-Info "Or use the automated deployment script:"
Write-Host ".\scripts\deploy.ps1" 