# Multiple Assignees Manager for Jira - Documentation

## Table of Contents

- [Overview](#overview)
- [Installation Guide](#installation-guide)
- [Getting Started](#getting-started)
- [Multi-Assignee Field](#multi-assignee-field)
- [Capacity Dashboard](#capacity-dashboard)
- [Admin Panel](#admin-panel)
- [Auto-Assignment Features](#auto-assignment-features)
- [Hierarchy Detection](#hierarchy-detection)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Support](#support)

---

## Overview

**Multiple Assignees Manager for Jira** is a comprehensive team collaboration solution that enhances Jira's assignment capabilities with intelligent multi-assignee management, automated workflow synchronization, and visual capacity tracking.

### Key Features

- 🔄 **Multi-Assignee Fields** - Add multiple team members to any issue
- 🤖 **Intelligent Auto-Assignment** - Automatic sync between multi-assignee and default assignee
- 📊 **Team Capacity Dashboard** - Visual workload tracking and health indicators
- 🏢 **Automated Hierarchy Detection** - Smart team structure based on permissions
- ⚡ **Real-time Synchronization** - Bidirectional data consistency

### Built on Atlassian Forge

- ✅ **0% commission** on first $1M revenue (starting Jan 2026)
- ✅ **SOC 2 compliance** inheritance
- ✅ **"Runs on Atlassian"** certified
- ✅ **No external dependencies** - all processing within Atlassian Cloud

---

## Installation Guide

### Prerequisites

- Jira Cloud instance
- Project admin or site admin permissions
- Compatible with all Jira project types (Software, Service Management, Work Management)

### Installation Steps

1. **Install from Atlassian Marketplace**

   - Navigate to your Jira instance
   - Go to Apps → Find new apps
   - Search for "Multiple Assignees Manager"
   - Click "Install" and accept permissions

2. **Automatic Configuration**

   - The app automatically creates the "Multi Assignees" custom field
   - Field is added to all screens and issue types by default
   - No additional configuration required for basic functionality

3. **Verify Installation**
   - Open any issue
   - Look for the "Multi Assignees" field in the issue details
   - You should see a user selection interface

### Post-Installation Setup

**For Project Administrators:**

- Access the Capacity Dashboard via the project sidebar
- Configure team member capacity settings in the Admin Panel
- Review hierarchy detection settings

**For Team Members:**

- Start adding multiple assignees to issues
- Monitor workload via the Capacity Dashboard
- Leverage auto-assignment features

---

## Getting Started

### Quick Start Guide

1. **Add Your First Multi-Assignee**

   - Open any issue
   - Find the "Multi Assignees" field
   - Click to add users
   - Select team members from the dropdown
   - Save the issue

2. **View Team Capacity**

   - Navigate to project sidebar
   - Click "Team Capacity Dashboard"
   - Review team workload and utilization
   - Identify capacity bottlenecks

3. **Access Admin Features** (Team Leads and above)
   - Open Capacity Dashboard
   - Click "⚙️ Admin Settings"
   - Configure individual capacity settings
   - Run bulk auto-assignment operations

### Basic Workflow

```
Issue Creation → Add Multi-Assignees → Auto-Assignment Sync → Capacity Tracking → Team Visibility
```

---

## Multi-Assignee Field

### How It Works

The Multi Assignees field allows you to assign multiple team members to a single issue while maintaining compatibility with Jira's standard assignee field.

### Adding Multi-Assignees

1. **In Issue View**

   - Locate the "Multi Assignees" field
   - Click the field or "Add assignees" button
   - Search and select users from your Jira instance
   - Users are added with avatar and display name
   - Click outside the field to save

2. **Bulk Assignment**
   - Use the Admin Panel for bulk operations
   - Select multiple issues
   - Apply consistent multi-assignee patterns

### Managing Multi-Assignees

**Removing Assignees:**

- Click the "×" next to any user's name
- Changes save automatically

**Reordering Assignees:**

- The first assignee becomes the primary assignee
- Drag and drop to reorder (if interface supports)
- First assignee automatically syncs to default assignee field

### Field Behavior

- **Auto-Sync**: First multi-assignee automatically becomes default assignee
- **Notifications**: Only primary assignee receives Jira notifications
- **Workflow**: Respects existing Jira workflow rules
- **Permissions**: Only users with assign permissions can modify

---

## Capacity Dashboard

### Overview

The Capacity Dashboard provides real-time visibility into team workload, capacity utilization, and project health metrics.

### Accessing the Dashboard

1. **From Project Sidebar**

   - Navigate to your Jira project
   - Look for "Team Capacity Dashboard" in the sidebar
   - Click to open the dashboard

2. **From Apps Menu**
   - Go to Apps → Multiple Assignees Manager
   - Select "Capacity Dashboard"

### Dashboard Components

#### Team Overview Table

| Column                  | Description                              |
| ----------------------- | ---------------------------------------- |
| **Team Member**         | User avatar, name, and role              |
| **Current Assignments** | Number of active assignments             |
| **Capacity Settings**   | Max assignments and hours per assignment |
| **Utilization Rate**    | Percentage of capacity used              |
| **Health Status**       | Color-coded indicator (Green/Yellow/Red) |

#### Health Indicators

- 🟢 **Green (0-70%)**: Optimal workload
- 🟡 **Yellow (71-90%)**: Approaching capacity
- 🔴 **Red (91%+)**: Over capacity, risk of burnout

#### Performance Metrics

- **Project Summary**: Total issues, assignments, team size
- **Capacity Overview**: Team utilization statistics
- **Trend Analysis**: Historical capacity trends (if data available)

### Dashboard Features

**Real-time Updates:**

- Refreshes every 30 seconds automatically
- Manual refresh button available
- Shows last update timestamp

**Filtering Options:**

- Filter by team member
- Filter by capacity status
- Date range selection

**Export Capabilities:**

- Export capacity reports
- Share dashboard views
- Historical data access

---

## Admin Panel

### Access Requirements

**Who Can Access:**

- Project Administrators
- Team Leads (detected automatically)
- Users with "Administer Projects" permission

### Opening Admin Panel

1. Open the Capacity Dashboard
2. Click "⚙️ Admin Settings" button
3. Admin panel opens in modal window

### Admin Features

#### Team Capacity Management

**Individual Capacity Settings:**

- **Max Assignments**: Maximum number of concurrent assignments (1-50)
- **Working Hours per Assignment**: Hours allocated per assignment (1-12)
- **Custom Notes**: Additional capacity considerations

**Bulk Operations:**

- Apply settings to multiple team members
- Import/export capacity configurations
- Reset to default settings

#### Auto-Assignment Tools

**Bulk Auto-Assignment:**

- Processes all issues without assignees
- Sets first multi-assignee as default assignee
- Shows progress and results summary

**Manual Assignment:**

- Assign specific issues by issue key
- Override existing assignments if needed
- Detailed success/error reporting

#### Hierarchy Management

**Team Structure:**

- View detected hierarchy levels
- Manage team visibility settings
- Configure cross-project permissions

**Detection Settings:**

- Test hierarchy detection
- Refresh team structure
- Debug permission mappings

### Configuration Best Practices

1. **Set Realistic Capacity Limits**

   - Consider actual working hours
   - Account for meetings and other duties
   - Review and adjust regularly

2. **Use Hierarchy Features**

   - Let the system auto-detect team structure
   - Validate detected levels
   - Adjust visibility as needed

3. **Monitor Team Health**
   - Regular capacity reviews
   - Proactive workload balancing
   - Address red indicators quickly

---

## Auto-Assignment Features

### How Auto-Assignment Works

The app automatically synchronizes the first multi-assignee with Jira's default assignee field, ensuring workflow compatibility while maintaining multi-assignee visibility.

### Automatic Sync Rules

1. **Primary Assignment**: First multi-assignee becomes default assignee
2. **Smart Prevention**: Skips update if assignee is already correct
3. **Notification Control**: Prevents duplicate assignment notifications
4. **Workflow Respect**: Honors existing Jira workflow rules

### Sync Triggers

**Real-time Triggers:**

- Adding first multi-assignee to unassigned issue
- Changing order of multi-assignees
- Removing current primary assignee

**Manual Triggers:**

- Bulk auto-assignment from Admin Panel
- Manual assignment tool
- API-based assignments

### Sync Status Monitoring

**Success Indicators:**

```
✅ Setting default assignee to first multi-assignee: [User Name]
✅ Field update successful: 204
```

**Skip Indicators:**

```
⏭️ Skipping assignee update - already set to first multi-assignee: [User Name]
```

**Error Handling:**

- Detailed error logging
- Automatic retry mechanisms
- Graceful fallback behavior

### Manual Assignment Tool

**When to Use:**

- Issues with complex assignment history
- Bulk correction of assignment inconsistencies
- Testing auto-assignment functionality

**How to Use:**

1. Open Admin Panel
2. Click "🔧 Manual Assign Issue"
3. Enter issue key (e.g., "PROJ-123")
4. Click "Assign"
5. Review success/error message

---

## Hierarchy Detection

### Overview

The app automatically detects team hierarchy based on Jira permissions, groups, and project roles, enabling appropriate access control and visibility.

### Hierarchy Levels

| Level | Role                   | Permissions               | Scope             |
| ----- | ---------------------- | ------------------------- | ----------------- |
| **1** | Division Manager       | Full cross-project access | Multiple projects |
| **2** | Project Manager        | Project-wide management   | Single project    |
| **3** | Team Lead              | Team management           | Team/component    |
| **4** | Individual Contributor | Self-management only      | Personal tasks    |

### Detection Criteria

**Permission-Based:**

- Project administration rights
- User management permissions
- Workflow management access
- Global Jira permissions

**Group-Based:**

- Jira group memberships
- Project role assignments
- Custom group configurations

**Activity-Based:**

- Assignment patterns
- Issue creation frequency
- Comment and activity levels

### Testing Hierarchy Detection

1. **Access Test Tool**

   - Open Admin Panel
   - Find "🏢 Team Hierarchy Detection" section
   - Click "🔍 Test My Hierarchy Level"

2. **Review Results**

   - **Detected Level**: Your assigned hierarchy level
   - **Scope**: Project or cross-project access
   - **Permissions**: Number of detected permissions
   - **Groups**: Group memberships analyzed
   - **Visible Users**: Users you can manage

3. **Troubleshooting Detection**
   - Ensure proper Jira permissions
   - Verify group memberships
   - Contact admin if detection seems incorrect

---

## Troubleshooting

### Common Issues

#### Multi-Assignee Field Not Visible

**Symptoms:**

- Cannot see "Multi Assignees" field on issues
- Field appears but is not editable

**Solutions:**

1. Check field configuration in Jira Admin
2. Verify field is added to appropriate screens
3. Confirm user has "Edit Issues" permission
4. Refresh browser cache

#### Auto-Assignment Not Working

**Symptoms:**

- Multi-assignees added but default assignee not updated
- Assignment sync appears delayed

**Solutions:**

1. Check Forge logs for error messages
2. Verify first multi-assignee has valid permissions
3. Ensure issue is not in restricted workflow state
4. Try manual assignment tool in Admin Panel

#### Capacity Dashboard Loading Issues

**Symptoms:**

- Dashboard shows loading spinner indefinitely
- "No data available" message appears

**Solutions:**

1. Verify project key is correct
2. Check user permissions for project access
3. Refresh dashboard manually
4. Clear browser cache and reload

#### Admin Panel Access Denied

**Symptoms:**

- "Access denied" message when opening admin panel
- Admin button not visible

**Solutions:**

1. Verify project admin permissions
2. Check hierarchy detection results
3. Contact site admin for permission review
4. Test hierarchy detection tool

### Performance Issues

#### Slow Dashboard Loading

**Causes:**

- Large team size (50+ members)
- High number of active issues
- Network connectivity issues

**Solutions:**

1. Use browser developer tools to check network requests
2. Clear app cache via Admin Panel
3. Reduce dashboard refresh frequency
4. Contact support for performance optimization

#### Memory Usage Concerns

**Monitoring:**

- Check performance stats in Admin Panel
- Monitor browser memory usage
- Review cache size and cleanup frequency

**Optimization:**

- Regular cache cleanup (automatic every 10 minutes)
- Reduce auto-refresh intervals
- Close unused browser tabs

### Error Messages

#### Common Error Codes

**403 Forbidden:**

- Check user permissions
- Verify project access rights
- Review hierarchy detection

**404 Not Found:**

- Confirm issue key exists
- Check project key spelling
- Verify user can access issue

**500 Internal Server Error:**

- Check Forge logs for details
- Retry operation after few minutes
- Contact support if persistent

### Getting Help

1. **Check Documentation**: Review this wiki for solutions
2. **Test Tools**: Use built-in testing and diagnostic tools
3. **Community Support**: Post questions in Atlassian Community
4. **Direct Support**: Contact via app listing page
5. **Logs**: Include relevant log information in support requests

---

## FAQ

### General Questions

**Q: Is this app free?**
A: The app follows a freemium model with basic features free for small teams and paid tiers for advanced features and larger organizations.

**Q: Does this work with Jira Server/Data Center?**
A: Currently, the app is designed specifically for Jira Cloud and built on the Atlassian Forge platform.

**Q: Can I export multi-assignee data?**
A: Yes, multi-assignee data is stored in standard Jira custom fields and can be exported using Jira's native export features.

### Technical Questions

**Q: How does auto-assignment handle workflow restrictions?**
A: The app respects all existing Jira workflow rules and will only update assignees when permitted by the current workflow state.

**Q: What happens if I uninstall the app?**
A: The Multi Assignees custom field data is preserved, but auto-assignment and dashboard features will no longer function.

**Q: Can I customize the capacity calculation?**
A: Yes, admins can set individual capacity limits, working hours per assignment, and other parameters via the Admin Panel.

**Q: Does the app work with Jira automation rules?**
A: Yes, the app integrates seamlessly with Jira's native automation and can trigger automation rules when assignments change.

### Security Questions

**Q: Where is my data stored?**
A: All data is stored within your Atlassian Cloud instance. No data is transmitted to external services.

**Q: What permissions does the app require?**
A: The app requires standard Jira permissions to read issues, manage custom fields, and access user information within your instance.

**Q: Is the app SOC 2 compliant?**
A: Yes, as a Forge app, it inherits Atlassian's SOC 2 compliance and security standards.

### Usage Questions

**Q: How many multi-assignees can I add to an issue?**
A: There's no hard limit, but we recommend keeping assignments reasonable for effective collaboration (typically 2-5 assignees).

**Q: Can I use this with existing custom fields?**
A: Yes, the app works alongside existing custom fields and doesn't interfere with other Jira functionality.

**Q: How often does the capacity dashboard update?**
A: The dashboard refreshes automatically every 30 seconds, with manual refresh available anytime.

---

## Support

### Getting Support

**Community Support:**

- [Atlassian Community](https://community.atlassian.com/) - Post questions and browse existing answers
- Tag questions with "multiple-assignees-manager" for faster response

**Direct Support:**

- Via Atlassian Marketplace app listing page
- Include detailed error descriptions and steps to reproduce
- Attach relevant screenshots or log information

**Documentation:**

- This wiki contains comprehensive setup and troubleshooting information
- Check FAQ section for common questions
- Review troubleshooting guide for technical issues

### What to Include in Support Requests

1. **Environment Information:**

   - Jira Cloud instance URL
   - App version number
   - Browser and version

2. **Issue Details:**

   - Detailed description of the problem
   - Steps to reproduce the issue
   - Expected vs. actual behavior

3. **Error Information:**

   - Error messages (full text)
   - Browser console errors (if applicable)
   - Screenshots of the issue

4. **Context:**
   - When did the issue start?
   - Recent changes to Jira configuration
   - Number of users affected

### Response Times

- **Community**: Community-driven response times
- **Direct Support**: 24-48 hours for initial response
- **Critical Issues**: Prioritized handling for app-breaking issues

### Additional Resources

- **Atlassian Forge Documentation**: [developer.atlassian.com/platform/forge](https://developer.atlassian.com/platform/forge/)
- **Jira Cloud Documentation**: [support.atlassian.com/jira-cloud](https://support.atlassian.com/jira-cloud/)
- **Best Practices**: Follow Atlassian's recommended practices for custom fields and app usage

---

## Version History

### Current Version: 8.0.0

- **Initial marketplace release**
- Multi-assignee field management
- Intelligent auto-assignment sync
- Team capacity dashboard
- Automated hierarchy detection
- Admin panel with bulk operations
- Real-time bidirectional synchronization
- Enterprise security and compliance features

### Upcoming Features

- Enhanced reporting and analytics
- Mobile app support
- Integration with Confluence
- Advanced workflow automation
- Custom capacity calculation rules

---

_Last updated: December 2024_
_For the most current information, visit the [Atlassian Marketplace listing](https://marketplace.atlassian.com/)._
