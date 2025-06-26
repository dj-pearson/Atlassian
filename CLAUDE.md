# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Atlassian Forge application** for Jira Cloud that provides enterprise multi-assignee management with team capacity tracking. The app allows assigning multiple users to issues with defined roles and provides real-time team capacity analytics.

**Key Technologies:**
- Atlassian Forge platform (Node.js 18.x runtime)
- React components with Forge React libraries
- Webpack for custom UI builds
- Jira REST API v3 integration

## Development Commands

### Main Application (Root Directory)
```bash
# Deploy the Forge app to your development environment
npm run deploy

# Install the app to a Jira instance
npm run install

# Clean up build artifacts for production
npm run cleanup
```

### Capacity Dashboard Frontend (src/frontend/capacity-dashboard/)
```bash
# Production build for deployment
npm run build

# Development build (faster, includes source maps)
npm run dev

# Start development server with live reload
npm run start
```

### Deployment Scripts
```bash
# Automated deployment (Linux/macOS)
./scripts/deploy.sh

# Automated deployment (Windows)
.\scripts\deploy.ps1
```

## Architecture Overview

### Core Components

**Forge App Structure:**
- `src/index.js` - Main entry point exporting resolver handlers
- `src/resolvers/` - Forge resolver functions for data processing
- `src/handlers/` - Event handlers for Jira issue updates
- `src/frontend/` - React components and UI resources

**Key Architectural Patterns:**
1. **Single Resolver Pattern** - Main resolver in `capacity-dashboard.js` handles multiple functions
2. **Bidirectional Field Sync** - Auto-sync between default assignee and multi-assignee fields
3. **Hierarchical Permission System** - Role-based access control across organizational levels
4. **Event-Driven Updates** - Real-time updates via Jira issue event triggers

### Frontend Architecture

**Hybrid UI Approach:**
- React JSX components for custom field edit/view (`multi-assignees-edit.jsx`, `multi-assignees-view.jsx`)
- Webpack-built dashboard (`capacity-dashboard/`) for complex analytics UI
- Static HTML/CSS resources in `static/` directory

**Build Process:**
1. React components are built directly by Forge
2. Complex dashboard requires separate webpack build process
3. Built assets are referenced in `manifest.yml` under resources

### Data Flow

**Multi-Assignee Management:**
- Custom field stores array of users with roles (Primary, Secondary, Reviewer, Collaborator)
- Bidirectional sync maintains consistency with default Jira assignee field
- Event handlers (`issue-events-handler`) trigger on issue create/update

**Capacity Calculation:**
- Real-time aggregation of issues assigned to team members
- Permission-based filtering shows relevant team data only
- Caching mechanisms optimize performance for large teams

## Key Files and Structure

**Configuration:**
- `manifest.yml` - Forge app configuration defining custom fields, pages, and permissions
- `package.json` - Main app dependencies and scripts
- `src/frontend/capacity-dashboard/package.json` - Frontend build configuration

**Core Implementation:**
- `src/resolvers/capacity-dashboard.js` - Main resolver with multiple exported functions
- `src/handlers/` - Issue event handlers for real-time updates
- `src/utils/` - Utility functions for API calls and data processing

**Frontend Components:**
- `src/frontend/multi-assignees-*.jsx` - Custom field UI components
- `src/frontend/capacity-dashboard/` - Webpack-built analytics dashboard
- `static/` - Static resources and admin page HTML

## Development Workflow

### Testing Changes
1. Make code changes in appropriate directories
2. For dashboard changes: `cd src/frontend/capacity-dashboard && npm run build`
3. Deploy with `npm run deploy`
4. Test in Jira development instance

### Permission System
The app uses Jira's native permission system with automatic hierarchy detection:
- Individual contributors see only their assignments
- Team leads see their team members
- Managers see multiple teams based on Jira project permissions
- Enterprise admins have cross-project visibility

### Custom Field Integration
The multi-assignee custom field integrates deeply with Jira:
- Appears in issue edit/view screens
- Syncs with default assignee field
- Triggers workflow updates and notifications
- Respects existing Jira permission schemes

## Common Development Tasks

### Adding New Resolver Functions
1. Add function to `src/resolvers/capacity-dashboard.js`
2. Export in main resolver object
3. Reference in `manifest.yml` if needed for UI integration

### Modifying Dashboard UI
1. Work in `src/frontend/capacity-dashboard/` directory
2. Run `npm run dev` for development server
3. Build with `npm run build` before deployment
4. Ensure built assets are committed

### Event Handler Modifications
1. Update handlers in `src/handlers/` directory
2. Event triggers are configured in `manifest.yml`
3. Test with issue create/update operations in Jira

### Permission Changes
- Modify scope requirements in `manifest.yml`
- Update permission checks in resolver functions
- Test across different user permission levels