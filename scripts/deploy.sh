#!/bin/bash

# Multiple Assignees Manager for Jira - Deployment Script
# This script handles the complete deployment process for the Forge app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Multiple Assignees Manager for Jira"
FORGE_ENV=${1:-development}

echo -e "${BLUE}🚀 Starting deployment of $APP_NAME${NC}"
echo -e "${BLUE}Environment: $FORGE_ENV${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${YELLOW}📋 $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check if Forge CLI is installed
if ! command -v forge &> /dev/null; then
    print_error "Forge CLI is not installed. Please install it first:"
    echo "npm install -g @forge/cli"
    exit 1
fi

# Check if logged in to Forge
if ! forge whoami &> /dev/null; then
    print_error "Not logged in to Forge. Please login first:"
    echo "forge login"
    exit 1
fi

print_success "Prerequisites check passed"

# Install dependencies
print_step "Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_error "package.json not found"
    exit 1
fi

# Validate manifest
print_step "Validating manifest..."
if [ -f "manifest.yml" ]; then
    if forge lint &> /dev/null; then
        print_success "Manifest validation passed"
    else
        print_error "Manifest validation failed. Please check manifest.yml"
        exit 1
    fi
else
    print_error "manifest.yml not found"
    exit 1
fi

# Build and deploy
print_step "Building and deploying app..."

if [ "$FORGE_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Deploying to PRODUCTION environment${NC}"
    echo "Are you sure you want to continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
    
    forge deploy --environment production
else
    forge deploy
fi

if [ $? -eq 0 ]; then
    print_success "App deployed successfully"
else
    print_error "Deployment failed"
    exit 1
fi

# Install/upgrade app
print_step "Installing/upgrading app..."

if [ "$FORGE_ENV" = "production" ]; then
    echo -e "${YELLOW}Please manually install the app in your production Jira instance:${NC}"
    echo "forge install --environment production"
else
    echo -e "${BLUE}Available sites for installation:${NC}"
    forge install --upgrade
fi

print_success "Installation completed"

# Post-deployment checks
print_step "Running post-deployment checks..."

# Check app status
echo -e "${BLUE}Checking app status...${NC}"
forge status

print_success "Post-deployment checks completed"

# Summary
echo ""
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo -e "${GREEN}===================${NC}"
echo -e "App: $APP_NAME"
echo -e "Environment: $FORGE_ENV"
echo -e "Status: ✅ Successfully deployed"
echo ""

# Next steps
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. 🔧 Configure the app in your Jira project:"
echo "   - Go to Project Settings > Issue Types > Fields"
echo "   - Add 'Multi Assignees' custom field to desired issue types"
echo ""
echo "2. 📊 Access the Team Capacity Dashboard:"
echo "   - Navigate to Project > Team Capacity Dashboard"
echo ""
echo "3. 🎯 Test the functionality:"
echo "   - Create/edit an issue and try the multi-assignee field"
echo "   - Test smart suggestions and role assignment"
echo ""
echo "4. 📈 Monitor the app:"
echo "   - Check logs: forge logs"
echo "   - View tunnel for debugging: forge tunnel"
echo ""

if [ "$FORGE_ENV" = "development" ]; then
    echo -e "${YELLOW}💡 Development Tips:${NC}"
    echo "- Use 'forge tunnel' for real-time debugging"
    echo "- Run 'forge logs --follow' to monitor logs"
    echo "- Use 'forge deploy' for quick updates during development"
    echo ""
fi

echo -e "${GREEN}🚀 Deployment completed successfully!${NC}" 