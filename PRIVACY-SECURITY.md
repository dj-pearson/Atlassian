# Privacy and Security Information

## Multiple Assignees Manager for Jira

### 📋 **Data Collection and Usage**

#### **Personal Data Collected**

- **User Account Information**: Atlassian Account ID, display name, email address
- **Jira Issue Data**: Issue assignments, status, priority, summary (for capacity calculations)
- **Usage Analytics**: Feature usage patterns, dashboard access frequency (anonymized)
- **User Preferences**: Capacity settings, notification preferences

#### **Data Processing Purpose**

- **Team Capacity Calculation**: Analyze current workload distribution
- **Workload Analytics**: Generate capacity insights and recommendations
- **User Experience**: Remember user preferences and settings
- **Performance Monitoring**: Improve app performance and reliability

### 🔒 **Data Storage and Security**

#### **Data Residency**

- **Primary Storage**: All data stored within your Atlassian instance using Forge Storage API
- **No External Transfer**: Personal data never leaves your Atlassian infrastructure
- **Tenant Isolation**: Complete data isolation between different Atlassian instances
- **Encryption**: All data encrypted at rest and in transit (AES-256)

#### **Data Retention**

- **User Preferences**: Stored until app uninstallation or user deletion
- **Capacity Analytics**: Historical data retained for 12 months maximum
- **Usage Logs**: Aggregated, anonymized logs retained for 6 months
- **Issue Data**: Cached temporarily (24 hours) for performance optimization

### 🌍 **GDPR Compliance**

#### **Legal Basis for Processing**

- **Legitimate Interest**: Team capacity management and workload optimization
- **Consent**: User-configured preferences and optional analytics
- **Contract Performance**: Providing the purchased service functionality

#### **Data Subject Rights**

- **Right to Access**: Users can view all stored preferences via app settings
- **Right to Rectification**: Users can modify capacity settings and preferences
- **Right to Erasure**: Complete data deletion upon app uninstallation
- **Right to Portability**: Settings can be exported via API (Enterprise tier)

#### **Data Protection Measures**

- **Privacy by Design**: Minimal data collection by design
- **Data Minimization**: Only collect data necessary for functionality
- **Purpose Limitation**: Data used only for stated purposes
- **Accuracy**: Real-time synchronization with Jira data

### 🛡️ **Security Measures**

#### **Platform Security**

- **Atlassian Forge**: Built on SOC 2 Type II compliant platform
- **Infrastructure**: Leverages AWS security and compliance
- **Authentication**: Uses Atlassian's secure authentication system
- **Authorization**: Respects all Jira permission schemes

#### **Application Security**

- **Input Validation**: All user inputs validated and sanitized
- **API Security**: Rate limiting and proper error handling
- **No Third-Party Services**: No external API calls or data transmission
- **Secure Development**: Regular security reviews and updates

### 📊 **Data Sharing and Third Parties**

#### **No External Sharing**

- **Zero Third-Party Access**: No data shared with external services
- **No Analytics Tracking**: No Google Analytics or similar tracking
- **No Marketing Data**: No data used for marketing purposes
- **Vendor Isolation**: Complete vendor data isolation

#### **Internal Processing Only**

- **Forge Platform**: Data processed only within Atlassian infrastructure
- **API Calls**: Only to authorized Jira REST APIs within same instance
- **Storage**: Exclusively Forge Storage API (encrypted)

### 🏢 **Enterprise Data Governance**

#### **Data Classification**

- **Personal Data**: User profiles, preferences, email addresses
- **Business Data**: Issue assignments, capacity metrics, team analytics
- **System Data**: Performance logs, error reports (anonymized)
- **Configuration Data**: App settings, custom rules, workflows

#### **Compliance Certifications**

- **SOC 2 Type II**: Inherited from Atlassian Forge platform
- **ISO 27001**: Atlassian's security management standards
- **GDPR**: Full compliance with European data protection regulations
- **Privacy Shield**: Data transfer protections (where applicable)

### 📞 **Data Breach Response**

#### **Incident Response Plan**

1. **Detection**: Automated monitoring and alerting
2. **Assessment**: Impact evaluation within 24 hours
3. **Notification**: Customer notification within 72 hours (if required)
4. **Remediation**: Immediate containment and resolution
5. **Prevention**: Security updates and process improvements

#### **Customer Responsibilities**

- **Access Control**: Manage user permissions appropriately
- **Data Classification**: Classify sensitive data according to policies
- **Incident Reporting**: Report suspected security issues promptly
- **Regular Reviews**: Periodically review app permissions and usage

### 🔧 **Technical Safeguards**

#### **Data Protection Implementation**

```javascript
// Example: Data anonymization for analytics
const anonymizeUserData = (userData) => {
  return {
    userId: hashUserId(userData.accountId),
    utilizationRate: userData.utilizationRate,
    // Remove all personally identifiable information
  };
};
```

#### **Privacy Controls**

- **Opt-out Options**: Users can disable analytics collection
- **Data Minimization**: Configurable data retention periods
- **Access Logging**: Audit trail of all data access
- **Consent Management**: Clear consent for optional features

### 📋 **Scope Justification**

#### **Required API Permissions**

- **read:jira-user**: Display user names and avatars in capacity dashboard
- **read:jira-work**: Access issue assignments for capacity calculations
- **read:project:jira**: Get project team members and structure
- **storage:app**: Store user preferences and analytics data

#### **Permission Usage Details**

- **User Data**: Only display name and avatar for UI purposes
- **Issue Data**: Only assignment and status for capacity metrics
- **Project Data**: Only team membership for capacity dashboard
- **Storage**: User preferences, capacity settings, historical analytics

### ✅ **Compliance Checklist**

- [x] **GDPR Article 13**: Transparent information provided
- [x] **GDPR Article 25**: Privacy by design implemented
- [x] **GDPR Article 32**: Appropriate security measures
- [x] **Data Minimization**: Only necessary data collected
- [x] **Consent Management**: Clear opt-in/opt-out options
- [x] **Data Subject Rights**: All rights supported
- [x] **Breach Notification**: Response plan established
- [x] **Third-Party Assessment**: No external data sharing

### 📞 **Contact Information**

#### **Data Protection Officer**

- **Email**: privacy@multiple-assignees-manager.com
- **Response Time**: 72 hours maximum
- **Languages**: English

#### **Privacy Inquiries**

- **General Questions**: support@multiple-assignees-manager.com
- **Data Requests**: privacy@multiple-assignees-manager.com
- **Security Reports**: security@multiple-assignees-manager.com

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Review Cycle**: Annual or upon significant changes

This privacy and security information is provided to comply with GDPR, CCPA, and other applicable data protection regulations. For specific legal advice, consult with qualified legal counsel.
