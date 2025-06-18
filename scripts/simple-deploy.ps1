# Simple Deployment Script for Multiple Assignees Manager
# This handles the complete deployment with manual credential input

Write-Host "🚀 Multiple Assignees Manager Deployment" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Blue
Write-Host ""

# Check if .env file exists and read credentials
$email = ""
$apiToken = ""

if (Test-Path ".env") {
    Write-Host "📋 Reading credentials from .env file..." -ForegroundColor Yellow
    $envContent = Get-Content ".env"
    
    foreach ($line in $envContent) {
        if ($line -match "ATLASSIAN_EMAIL=(.*)") {
            $email = $matches[1]
        }
        if ($line -match "ATLASSIAN_API_TOKEN=(.*)") {
            $apiToken = $matches[1]
        }
    }
    
    if ($email -and $apiToken) {
        Write-Host "✅ Found credentials in .env file" -ForegroundColor Green
        Write-Host "Email: $email" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
}

# Step 1: Check if already logged in
Write-Host ""
Write-Host "📋 Checking Forge login status..." -ForegroundColor Yellow

try {
    $whoami = forge whoami 2>$null
    if ($whoami) {
        Write-Host "✅ Already logged in as: $whoami" -ForegroundColor Green
    } else {
        Write-Host "❌ Not logged in to Forge" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔑 Please login manually:" -ForegroundColor Yellow
        Write-Host "1. Run: forge login" -ForegroundColor White
        Write-Host "2. Email: $email" -ForegroundColor White
        Write-Host "3. API Token: (copy from .env file)" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening login prompt..." -ForegroundColor Blue
        
        # Try to start login process
        Start-Process powershell -ArgumentList "-Command", "forge login; Read-Host 'Press Enter to continue'"
        
        # Wait for user to complete login
        Write-Host ""
        $continue = Read-Host "Press Enter after you've completed the forge login in the other window"
        
        # Verify login
        $whoami = forge whoami 2>$null
        if (-not $whoami) {
            Write-Host "❌ Login verification failed. Please try again." -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Login successful!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error checking login status" -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "📋 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 3: Deploy the app
Write-Host ""
Write-Host "📋 Deploying app to Forge..." -ForegroundColor Yellow
forge deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ App deployed successfully" -ForegroundColor Green

# Step 4: Install the app
Write-Host ""
Write-Host "📋 Installing app on Jira instance..." -ForegroundColor Yellow
forge install --upgrade
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ App installation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ App installed successfully" -ForegroundColor Green

# Success summary
Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Go to your Jira project" -ForegroundColor White
Write-Host "2. Navigate to Project Settings → Issue Types → Fields" -ForegroundColor White
Write-Host "3. Add the 'Multi Assignees' field to your issue types" -ForegroundColor White
Write-Host "4. Test the functionality by editing an issue" -ForegroundColor White
Write-Host "5. Check out the Team Capacity Dashboard in your project" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Development Commands:" -ForegroundColor Blue
Write-Host "- forge logs          # View app logs" -ForegroundColor White
Write-Host "- forge tunnel        # Start development tunnel" -ForegroundColor White
Write-Host "- forge status        # Check app status" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Your Multiple Assignees Manager is now live!" -ForegroundColor Green 