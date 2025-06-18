# 🚀 Quick Start Guide - Multiple Assignees Manager for Jira

Get your Multiple Assignees Manager app up and running in minutes! This guide will walk you through the complete setup process.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** (v16 or later) installed
- ✅ **Atlassian Developer Account** with access to a Jira Cloud instance
- ✅ **Forge CLI** installed globally
- ✅ **Administrative access** to your Jira project

### Installing Prerequisites

1. **Install Node.js**
   Download from [nodejs.org](https://nodejs.org/)

2. **Install Forge CLI**

   ```bash
   npm install -g @forge/cli
   ```

3. **Login to Forge**
   ```bash
   forge login
   ```

## 🏗️ Step 1: Setup the App

### Option A: Automated Deployment (Recommended)

**For Windows (PowerShell):**

```powershell
.\scripts\deploy.ps1
```

**For macOS/Linux:**

```bash
./scripts/deploy.sh
```

### Option B: Manual Deployment

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Deploy the app**

   ```bash
   forge deploy
   ```

3. **Install on your Jira instance**
   ```bash
   forge install
   ```

## ⚙️ Step 2: Configure the Custom Field

1. **Navigate to your Jira project**
2. **Go to Project Settings** → **Issue Types** → **Fields**
3. **Add the Multi Assignees field:**
   - Click "Add Field"
   - Search for "Multi Assignees"
   - Select and add to desired issue types
4. **Configure field permissions** if needed

## 🎯 Step 3: Test the Functionality

### Testing Multi-Assignee Field

1. **Create or edit an issue**
2. **Find the "Multi Assignees" field**
3. **Click to add assignees:**
   - Search for team members
   - Assign roles (Primary, Secondary, Reviewer, Collaborator)
   - Use "⚡ Smart Suggest" for recommendations
4. **Save the issue**

### Testing Smart Suggestions

1. **Open an issue with components or labels**
2. **Click the Multi Assignees field**
3. **Click "⚡ Smart Suggest"**
4. **Review AI-powered recommendations**
5. **Apply suggestions with one click**

### Testing Team Dashboard

1. **Navigate to your project**
2. **Go to "Team Capacity Dashboard"** (in project sidebar)
3. **View team workload and capacity metrics**
4. **Monitor capacity alerts and health status**

## 🔧 Step 4: Advanced Configuration

### Customizing Role Permissions

Edit the role permissions in `src/index.js`:

```javascript
const assigneeRoles = {
  primary: {
    permissions: ["edit", "transition", "assign", "logTime"],
    notifications: "all",
  },
  secondary: {
    permissions: ["edit", "transition", "logTime"],
    notifications: "relevant",
  },
  // ... customize as needed
};
```

### Adjusting Capacity Thresholds

Modify capacity thresholds in storage utilities:

```javascript
capacityThresholds: {
  optimal: 0.7,    // Green status
  busy: 0.9,       // Yellow status
  overloaded: 1.0  // Red status
}
```

## 📊 Step 5: Monitor and Analyze

### Viewing Logs

```bash
# View recent logs
forge logs

# Follow logs in real-time
forge logs --follow
```

### Analytics Dashboard

The app automatically tracks:

- Assignment patterns
- Team collaboration metrics
- Capacity utilization
- User adoption rates

Access analytics through the Team Capacity Dashboard.

## 🐛 Troubleshooting

### Common Issues

**Issue: Custom field not appearing**

- Solution: Ensure field is added to issue type screens
- Check field permissions and context

**Issue: Smart suggestions not working**

- Solution: Verify users have proper project permissions
- Check component/label assignments on issues

**Issue: Dashboard not loading**

- Solution: Ensure users have project view permissions
- Check browser console for errors

**Issue: Deployment fails**

- Solution: Verify Forge CLI login status
- Check manifest.yml syntax
- Ensure all dependencies are installed

### Debug Mode

For development and debugging:

```bash
# Start tunnel for real-time debugging
forge tunnel

# Check app status
forge status

# Validate manifest
forge lint
```

### Getting Help

1. **Check logs**: `forge logs`
2. **Review manifest**: `forge lint`
3. **Test locally**: `forge tunnel`
4. **Atlassian Community**: [community.atlassian.com](https://community.atlassian.com)

## 🎉 Step 6: Go Live!

### Production Deployment

When ready for production:

1. **Deploy to production**

   ```bash
   ./scripts/deploy.ps1 production
   # or
   ./scripts/deploy.sh production
   ```

2. **Install on production Jira**

   ```bash
   forge install --environment production
   ```

3. **Configure production settings**
   - Set up proper field permissions
   - Configure team capacity thresholds
   - Enable analytics and monitoring

### User Training

Share these resources with your team:

1. **Multi-Assignee Basics**

   - How to assign multiple users
   - Understanding role types
   - Using smart suggestions

2. **Dashboard Usage**

   - Reading capacity metrics
   - Understanding health indicators
   - Managing team workload

3. **Best Practices**
   - When to use multiple assignees
   - Optimal role assignments
   - Capacity management tips

## 📈 Next Steps

### Enhance Your Implementation

1. **Integrate with other tools**:

   - Slack/Teams notifications
   - Time tracking systems
   - Analytics platforms

2. **Customize for your workflow**:

   - Adjust role permissions
   - Modify capacity thresholds
   - Add custom analytics

3. **Scale across projects**:
   - Deploy to multiple projects
   - Create organization-wide standards
   - Train additional teams

### Marketplace Publication

Ready to share with the community?

1. **Review Atlassian guidelines**
2. **Complete security review**
3. **Submit to Atlassian Marketplace**
4. **Monitor user feedback**

## 🏆 Success Metrics

Track these KPIs to measure success:

- **Adoption Rate**: % of issues using multi-assignees
- **Team Collaboration**: Cross-functional assignment frequency
- **Capacity Optimization**: Reduced overload incidents
- **User Satisfaction**: NPS scores and feedback

---

## 🎯 Quick Reference

### Common Commands

```bash
# Development
forge tunnel              # Debug mode
forge logs --follow       # Monitor logs
forge deploy              # Quick deploy

# Production
forge deploy --environment production
forge install --environment production

# Maintenance
forge status              # Check app status
forge lint                # Validate manifest
```

### Important URLs

- **Forge Documentation**: [developer.atlassian.com/platform/forge](https://developer.atlassian.com/platform/forge/)
- **Jira API Reference**: [developer.atlassian.com/cloud/jira/platform/rest/v3/](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- **Atlassian Community**: [community.atlassian.com](https://community.atlassian.com)

---

🚀 **You're all set!** Your Multiple Assignees Manager is now ready to transform how your team collaborates on Jira issues.
