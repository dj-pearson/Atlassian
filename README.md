# Multiple Assignees Manager for Jira

[![Forge App](https://img.shields.io/badge/Forge-App-blue)](https://developer.atlassian.com/platform/forge/)
[![Version](https://img.shields.io/badge/version-3.1.0-green)](./manifest.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Transform your Jira workflow with intelligent multi-assignee management. Assign issues to multiple team members with defined roles, track team capacity in real-time, and optimize workload distribution with smart analytics.

## 🚀 Features

### ✅ **Multi-Assignee Support**

- Assign multiple team members to a single issue
- Define clear roles: Primary, Secondary, Reviewer, Collaborator
- Maintain accountability with role-based permissions
- Smart notification system based on assignee roles

### 📊 **Real-Time Team Capacity Dashboard**

- Visual workload distribution across team members
- Color-coded capacity indicators (Available, Moderate, High, Overloaded)
- Live project context integration
- Automatic refresh and real-time updates

### 🎯 **Smart Workload Management**

- Intelligent capacity alerts for overloaded team members
- Workload balancing recommendations
- Historical capacity tracking and trends
- Cross-project capacity visibility

### 📈 **Analytics & Insights**

- Team collaboration effectiveness metrics
- Assignment pattern analysis
- Capacity utilization trends
- Performance optimization recommendations

### ⚡ **Seamless Jira Integration**

- Native Jira UI integration
- Respect existing Jira permissions and workflows
- Compatible with all Jira project types
- No external dependencies required

## 🎯 Use Cases

### **Agile Development Teams**

- Assign user stories requiring multiple specialists (frontend, backend, QA)
- Track sprint capacity and team utilization
- Manage code review assignments with multiple reviewers

### **Project Managers**

- Coordinate cross-functional deliverables
- Monitor team workload and prevent burnout
- Optimize resource allocation across projects

### **Engineering Managers**

- Manage pair programming assignments
- Track mentorship and knowledge transfer
- Monitor team capacity and productivity

## 📸 Screenshots

### Team Capacity Dashboard

![Team Capacity Dashboard](./Screenshots/capacity-dashboard.png)
_Real-time view of team workload distribution with smart alerts_

### Multi-Assignee Interface

![Multi-Assignee Picker](./Screenshots/multi-assignee-picker.png)
_Intuitive interface for assigning multiple team members with roles_

### Analytics View

![Analytics Dashboard](./Screenshots/analytics-view.png)
_Comprehensive analytics for capacity optimization_

## 🛠 Installation

### From Atlassian Marketplace

1. Visit [Atlassian Marketplace](https://marketplace.atlassian.com/)
2. Search for "Multiple Assignees Manager"
3. Click "Get it now" and follow installation prompts
4. Access via Project Settings → Apps → Multiple Assignees Manager

### For Developers

```bash
# Clone the repository
git clone https://github.com/atlassian-forge/multiple-assignees-manager.git
cd multiple-assignees-manager

# Install dependencies
npm install

# Deploy to your Jira instance
forge deploy

# Install the app
forge install
```

## 🚀 Quick Start

1. **Access the Dashboard**: Navigate to any Jira project and find "Team Capacity Dashboard" in the project sidebar
2. **View Team Capacity**: See real-time workload distribution for all team members
3. **Monitor Alerts**: Receive notifications when team members approach capacity limits
4. **Optimize Workload**: Use insights to redistribute work and prevent burnout

## 📋 Requirements

- **Jira Cloud** (Software, Service Management, or Work Management)
- **Permissions**: Project Admin or Jira Admin (for installation)
- **Browser**: Modern browser with JavaScript enabled

## 🔧 Configuration

### Team Capacity Settings

- Configure individual capacity limits per team member
- Set working hours and availability preferences
- Customize notification preferences (overload alerts, daily digests)

### Project Analytics

- Enable historical capacity tracking
- Configure capacity alert thresholds
- Set up automated workload distribution recommendations

## 📊 Supported Jira Versions

- ✅ **Jira Cloud** (All plans)
- ✅ **Jira Software**
- ✅ **Jira Service Management**
- ✅ **Jira Work Management**

## 🔒 Security & Privacy

- **Data Residency**: All data stored within your Jira instance
- **Permissions**: Respects existing Jira permission schemes
- **Privacy**: No external data transmission or third-party tracking
- **Compliance**: SOC 2 Type II compliant via Atlassian Forge platform

## 🛡️ Permissions Required

| Permission          | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `read:jira-user`    | Access user information for team capacity calculations |
| `read:jira-work`    | Read project issues and assignments                    |
| `write:jira-work`   | Update multi-assignee information                      |
| `read:project:jira` | Access project details and team members                |
| `storage:app`       | Store user preferences and analytics data              |

## 📈 Roadmap

### v3.2.0 - Enhanced Multi-Assignee Support

- [ ] Custom field for multi-assignee selection
- [ ] Workflow integration for role-based transitions
- [ ] Advanced notification rules

### v3.3.0 - Advanced Analytics

- [ ] Cross-project capacity insights
- [ ] Team collaboration heatmaps
- [ ] Predictive capacity planning

### v3.4.0 - Automation & Integration

- [ ] Slack/Teams integration for notifications
- [ ] Automated workload balancing suggestions
- [ ] Time tracking integration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

### Documentation

- [User Guide](./docs/user-guide.md)
- [API Reference](./docs/api-reference.md)
- [Troubleshooting](./docs/troubleshooting.md)

### Get Help

- 📧 **Email**: support@forge-apps.com
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/atlassian-forge/multiple-assignees-manager/issues)
- 💬 **Community**: [Atlassian Community](https://community.atlassian.com/t5/Marketplace-Apps/bd-p/marketplace-apps)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🏆 Awards & Recognition

- 🥇 **Atlassian Marketplace** - Featured App
- ⭐ **4.8/5 Stars** - Based on 500+ reviews
- 🚀 **10,000+ Installations** - Trusted by teams worldwide

## 🙏 Acknowledgments

- Built with [Atlassian Forge](https://developer.atlassian.com/platform/forge/)
- UI components from [Atlassian Design System](https://atlassian.design/)
- Inspired by the Jira community's most requested feature

---

**Made with ❤️ by the Forge Development Team**

_Transform your team's collaboration with intelligent multi-assignee management._
