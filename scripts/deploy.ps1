# Multiple Assignees Manager for Jira - PowerShell Deployment Script
# This script handles the complete deployment process for the Forge app

param(
    [string]$Environment = "development"
)

# Configuration
$AppName = "Multiple Assignees Manager for Jira"
$ForgeEnv = $Environment

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

Write-Info "🚀 Starting deployment of $AppName"
Write-Info "Environment: $ForgeEnv"
Write-Host ""

# Check prerequisites
Write-Step "Checking prerequisites..."

# Check if Forge CLI is installed
try {
    $forgeVersion = forge --version 2>$null
    if (-not $forgeVersion) {
        throw "Forge CLI not found"
    }
} catch {
    Write-Error "Forge CLI is not installed. Please install it first:"
    Write-Host "npm install -g @forge/cli"
    exit 1
}

# Check if logged in to Forge
try {
    $whoami = forge whoami 2>$null
    if (-not $whoami) {
        throw "Not logged in"
    }
} catch {
    Write-Error "Not logged in to Forge. Please login first:"
    Write-Host "forge login"
    exit 1
}

Write-Success "Prerequisites check passed"

# Install dependencies
Write-Step "Installing dependencies..."
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
} else {
    Write-Error "package.json not found"
    exit 1
}

# Validate manifest
Write-Step "Validating manifest..."
if (Test-Path "manifest.yml") {
    try {
        forge lint 2>$null
        Write-Success "Manifest validation passed"
    } catch {
        Write-Error "Manifest validation failed. Please check manifest.yml"
        exit 1
    }
} else {
    Write-Error "manifest.yml not found"
    exit 1
}

# Build and deploy
Write-Step "Building and deploying app..."

if ($ForgeEnv -eq "production") {
    Write-Host "⚠️  Deploying to PRODUCTION environment" -ForegroundColor Yellow
    $response = Read-Host "Are you sure you want to continue? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Host "Deployment cancelled"
        exit 0
    }
    
    forge deploy --environment production
} else {
    forge deploy
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "App deployed successfully"
} else {
    Write-Error "Deployment failed"
    exit 1
}

# Install/upgrade app
Write-Step "Installing/upgrading app..."

if ($ForgeEnv -eq "production") {
    Write-Host "Please manually install the app in your production Jira instance:" -ForegroundColor Yellow
    Write-Host "forge install --environment production"
} else {
    Write-Info "Available sites for installation:"
    forge install --upgrade
}

Write-Success "Installation completed"

# Post-deployment checks
Write-Step "Running post-deployment checks..."

# Check app status
Write-Info "Checking app status..."
forge status

Write-Success "Post-deployment checks completed"

# Summary
Write-Host ""
Write-Host "🎉 Deployment Summary" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "App: $AppName"
Write-Host "Environment: $ForgeEnv"
Write-Host "Status: ✅ Successfully deployed"
Write-Host ""

# Next steps
Write-Info "📋 Next Steps:"
Write-Host ""
Write-Host "1. 🔧 Configure the app in your Jira project:"
Write-Host "   - Go to Project Settings > Issue Types > Fields"
Write-Host "   - Add 'Multi Assignees' custom field to desired issue types"
Write-Host ""
Write-Host "2. 📊 Access the Team Capacity Dashboard:"
Write-Host "   - Navigate to Project > Team Capacity Dashboard"
Write-Host ""
Write-Host "3. 🎯 Test the functionality:"
Write-Host "   - Create/edit an issue and try the multi-assignee field"
Write-Host "   - Test smart suggestions and role assignment"
Write-Host ""
Write-Host "4. 📈 Monitor the app:"
Write-Host "   - Check logs: forge logs"
Write-Host "   - View tunnel for debugging: forge tunnel"
Write-Host ""

if ($ForgeEnv -eq "development") {
    Write-Host "💡 Development Tips:" -ForegroundColor Yellow
    Write-Host "- Use 'forge tunnel' for real-time debugging"
    Write-Host "- Run 'forge logs --follow' to monitor logs"
    Write-Host "- Use 'forge deploy' for quick updates during development"
    Write-Host ""
}

Write-Host "🚀 Deployment completed successfully!" -ForegroundColor Green 