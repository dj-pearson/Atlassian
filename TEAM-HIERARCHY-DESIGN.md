# Multi-Level Team Hierarchy Management Design

## 🎯 Executive Summary

This document outlines the design for implementing multi-level team hierarchy management in the Multiple Assignees Manager for Jira. This feature enables organizations to scale from individual accounts to enterprise-level deployments with proper role-based access control and hierarchical team visibility.

## 🏢 Business Use Cases

### Individual Contributors

- Personal workload management
- Basic team collaboration
- Limited visibility to own assignments

### Team Leads (10-15 people)

- Manage direct team members
- View team capacity and workload
- Assign work within team boundaries
- Access team-specific analytics

### Department Managers (50-100 people)

- Oversee multiple teams
- Cross-team resource allocation
- Department-wide capacity planning
- Escalation and approval workflows

### Regional/Division Managers (100-500 people)

- Multi-department visibility
- Regional capacity planning
- Strategic resource allocation
- Executive reporting and analytics

### Enterprise Administrators (500+ people)

- Organization-wide visibility
- Global capacity planning
- Policy and permission management
- Advanced analytics and reporting

## 🔧 Technical Architecture

### 1. Hierarchical Data Model

```javascript
// Team Hierarchy Structure
const teamHierarchy = {
  organizationId: "org-123",
  levels: [
    {
      level: 0, // Enterprise
      name: "Organization",
      permissions: ["GLOBAL_ADMIN", "ALL_PROJECTS", "POLICY_MANAGEMENT"],
    },
    {
      level: 1, // Division/Region
      name: "Division",
      permissions: ["DIVISION_ADMIN", "CROSS_DEPARTMENT", "STRATEGIC_PLANNING"],
    },
    {
      level: 2, // Department
      name: "Department",
      permissions: ["DEPARTMENT_ADMIN", "CROSS_TEAM", "RESOURCE_ALLOCATION"],
    },
    {
      level: 3, // Team
      name: "Team",
      permissions: ["TEAM_LEAD", "TEAM_MANAGEMENT", "DIRECT_REPORTS"],
    },
    {
      level: 4, // Individual
      name: "Individual",
      permissions: ["SELF_MANAGEMENT", "PEER_COLLABORATION"],
    },
  ],
};

// User-Team Relationship
const userTeamMapping = {
  userId: "user-123",
  primaryTeam: "team-456",
  hierarchyPath: ["org-123", "division-789", "dept-101", "team-456"],
  roles: [
    {
      teamId: "team-456",
      role: "TEAM_LEAD",
      level: 3,
      permissions: ["MANAGE_TEAM", "ASSIGN_WORK", "VIEW_TEAM_ANALYTICS"],
    },
    {
      teamId: "dept-101",
      role: "CONTRIBUTOR",
      level: 2,
      permissions: ["VIEW_DEPARTMENT_SUMMARY"],
    },
  ],
  managedTeams: ["team-456", "team-457"], // Teams this user manages
  visibleTeams: ["team-456", "team-457", "team-458"], // Teams this user can see
  reportingChain: ["manager-789", "director-101", "vp-123"],
};
```

### 2. Permission Matrix

| Role Level             | View Scope                 | Management Scope    | Analytics Access   | Assignment Powers     |
| ---------------------- | -------------------------- | ------------------- | ------------------ | --------------------- |
| **Enterprise Admin**   | All teams/projects         | Global policies     | Full analytics     | Cross-org assignment  |
| **Division Manager**   | Division teams             | Division policies   | Division analytics | Cross-dept assignment |
| **Department Manager** | Department teams           | Department policies | Dept analytics     | Cross-team assignment |
| **Team Lead**          | Team + collaborating teams | Team settings       | Team analytics     | Team assignment       |
| **Senior Individual**  | Team + related projects    | Personal settings   | Personal analytics | Peer collaboration    |
| **Individual**         | Personal + assigned        | Personal settings   | Personal dashboard | Self-management       |

### 3. Data Filtering Architecture

```javascript
// Hierarchical Data Filter
class HierarchicalDataFilter {
  constructor(userContext) {
    this.userId = userContext.userId;
    this.userRoles = userContext.roles;
    this.hierarchyPath = userContext.hierarchyPath;
    this.managedTeams = userContext.managedTeams;
    this.visibleTeams = userContext.visibleTeams;
  }

  // Filter capacity data based on user's hierarchy level
  filterCapacityData(allCapacityData) {
    const userLevel = this.getUserLevel();

    switch (userLevel) {
      case "ENTERPRISE_ADMIN":
        return allCapacityData; // See everything

      case "DIVISION_MANAGER":
        return allCapacityData.filter(
          (data) =>
            this.isInDivision(data.userId) || this.isCollaborating(data.userId)
        );

      case "DEPARTMENT_MANAGER":
        return allCapacityData.filter(
          (data) =>
            this.isInDepartment(data.userId) ||
            this.isDirectCollaborator(data.userId)
        );

      case "TEAM_LEAD":
        return allCapacityData.filter(
          (data) =>
            this.isInManagedTeams(data.userId) ||
            this.isTeamCollaborator(data.userId)
        );

      case "INDIVIDUAL":
        return allCapacityData.filter(
          (data) =>
            data.userId === this.userId || this.isDirectPeer(data.userId)
        );
    }
  }

  // Filter project visibility
  filterProjectAccess(projects) {
    return projects.filter((project) => {
      const projectTeams = this.getProjectTeams(project);
      return projectTeams.some((teamId) => this.visibleTeams.includes(teamId));
    });
  }
}
```

## 🚀 Implementation Plan

### Phase 1: Core Hierarchy Framework (Version 6.116.0)

#### 1.1 Database Schema Updates

```sql
-- Team Hierarchy Table
CREATE TABLE team_hierarchy (
  id VARCHAR PRIMARY KEY,
  parent_id VARCHAR REFERENCES team_hierarchy(id),
  level INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  organization_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Team Memberships
CREATE TABLE user_team_memberships (
  user_id VARCHAR NOT NULL,
  team_id VARCHAR NOT NULL REFERENCES team_hierarchy(id),
  role VARCHAR NOT NULL, -- MEMBER, LEAD, MANAGER, ADMIN
  level INTEGER NOT NULL,
  permissions JSON,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- Team Project Associations
CREATE TABLE team_project_associations (
  team_id VARCHAR NOT NULL REFERENCES team_hierarchy(id),
  project_key VARCHAR NOT NULL,
  access_level VARCHAR NOT NULL, -- FULL, LIMITED, READ_ONLY
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, project_key)
);
```

#### 1.2 Forge Storage Implementation

```javascript
// Since Forge uses app storage, we'll implement using structured keys
const STORAGE_KEYS = {
  TEAM_HIERARCHY: "team-hierarchy",
  USER_TEAMS: "user-teams",
  TEAM_PROJECTS: "team-projects",
  HIERARCHY_CACHE: "hierarchy-cache",
};

// Storage Helper Functions
async function getTeamHierarchy(organizationId) {
  const hierarchyKey = `${STORAGE_KEYS.TEAM_HIERARCHY}:${organizationId}`;
  return await storage.get(hierarchyKey);
}

async function getUserTeamMemberships(userId) {
  const userTeamsKey = `${STORAGE_KEYS.USER_TEAMS}:${userId}`;
  return await storage.get(userTeamsKey);
}

async function getTeamProjectAssociations(teamId) {
  const teamProjectsKey = `${STORAGE_KEYS.TEAM_PROJECTS}:${teamId}`;
  return await storage.get(teamProjectsKey);
}
```

### Phase 2: Permission System Enhancement (Version 6.117.0)

#### 2.1 Enhanced Permission Resolver

```javascript
resolver.define("getUserHierarchyContext", async ({ payload, context }) => {
  try {
    const { userId, projectKey } = payload;

    // Get user's team memberships
    const userTeams = await getUserTeamMemberships(userId);

    // Get user's hierarchy path
    const hierarchyPath = await buildHierarchyPath(userTeams);

    // Determine user's access level for this project
    const accessLevel = await determineProjectAccessLevel(userId, projectKey);

    // Get managed teams
    const managedTeams = await getManagedTeams(userId);

    // Get visible teams based on hierarchy
    const visibleTeams = await getVisibleTeams(userId, hierarchyPath);

    return {
      success: true,
      context: {
        userId,
        projectKey,
        hierarchyPath,
        accessLevel,
        managedTeams,
        visibleTeams,
        permissions: await getUserPermissions(userId, projectKey),
      },
    };
  } catch (error) {
    console.error("Error getting user hierarchy context:", error);
    return { success: false, error: error.message };
  }
});
```

#### 2.2 Hierarchical Capacity Data Resolver

```javascript
resolver.define("getHierarchicalCapacityData", async ({ payload, context }) => {
  try {
    const { projectKey, userId } = payload;

    // Get user's hierarchy context
    const hierarchyContext = await getUserHierarchyContext({
      payload: { userId, projectKey },
      context,
    });

    if (!hierarchyContext.success) {
      throw new Error("Could not determine user hierarchy context");
    }

    // Get all capacity data
    const allCapacityData = await getCapacityData({
      payload: { projectKey },
      context,
    });

    // Filter data based on user's hierarchy level
    const filter = new HierarchicalDataFilter(hierarchyContext.context);
    const filteredData = filter.filterCapacityData(allCapacityData.data);

    // Add hierarchy metadata
    const enrichedData = await enrichWithHierarchyData(
      filteredData,
      hierarchyContext.context
    );

    return {
      success: true,
      data: enrichedData,
      metadata: {
        userLevel: hierarchyContext.context.accessLevel,
        visibleTeamsCount: hierarchyContext.context.visibleTeams.length,
        managedTeamsCount: hierarchyContext.context.managedTeams.length,
        hierarchyPath: hierarchyContext.context.hierarchyPath,
      },
    };
  } catch (error) {
    console.error("Error getting hierarchical capacity data:", error);
    return { success: false, error: error.message };
  }
});
```

### Phase 3: Dashboard UI Updates (Version 6.118.0)

#### 3.1 Hierarchical Dashboard Components

```javascript
// Team Hierarchy Selector
class TeamHierarchySelectorComponent {
  constructor(userContext) {
    this.userContext = userContext;
    this.selectedTeamLevel = userContext.primaryTeam;
  }

  render() {
    return `
      <div class="hierarchy-selector">
        <div class="breadcrumb-nav">
          ${this.renderBreadcrumb()}
        </div>
        <div class="team-selector">
          ${this.renderTeamSelector()}
        </div>
        <div class="view-toggle">
          ${this.renderViewToggle()}
        </div>
      </div>
    `;
  }

  renderBreadcrumb() {
    return this.userContext.hierarchyPath
      .map(
        (level, index) => `
        <span class="breadcrumb-item ${
          index === this.userContext.hierarchyPath.length - 1 ? "active" : ""
        }"
              onclick="selectHierarchyLevel(${index})">
          ${level.name}
        </span>
      `
      )
      .join('<span class="breadcrumb-separator">></span>');
  }

  renderTeamSelector() {
    const visibleTeams = this.userContext.visibleTeams;
    return `
      <select id="team-selector" onchange="handleTeamChange(this.value)">
        <option value="all">All Visible Teams</option>
        ${visibleTeams
          .map(
            (team) => `
          <option value="${team.id}" ${
              team.id === this.selectedTeamLevel ? "selected" : ""
            }>
            ${team.name} (${team.memberCount} members)
          </option>
        `
          )
          .join("")}
      </select>
    `;
  }
}

// Hierarchical Capacity Grid
class HierarchicalCapacityGrid {
  constructor(capacityData, userContext) {
    this.capacityData = capacityData;
    this.userContext = userContext;
    this.groupingLevel = this.determineOptimalGrouping();
  }

  determineOptimalGrouping() {
    const userLevel = this.userContext.accessLevel;
    const dataSize = this.capacityData.length;

    if (userLevel === "ENTERPRISE_ADMIN" && dataSize > 100) {
      return "DIVISION";
    } else if (userLevel === "DIVISION_MANAGER" && dataSize > 50) {
      return "DEPARTMENT";
    } else if (userLevel === "DEPARTMENT_MANAGER" && dataSize > 20) {
      return "TEAM";
    } else {
      return "INDIVIDUAL";
    }
  }

  render() {
    const groupedData = this.groupDataByLevel(this.groupingLevel);

    return `
      <div class="hierarchical-capacity-grid">
        <div class="grid-controls">
          ${this.renderGroupingControls()}
        </div>
        <div class="capacity-groups">
          ${Object.entries(groupedData)
            .map(
              ([groupName, members]) => `
            <div class="capacity-group" data-group="${groupName}">
              <div class="group-header">
                <h3>${groupName}</h3>
                <div class="group-metrics">
                  ${this.renderGroupMetrics(members)}
                </div>
                <button class="group-toggle" onclick="toggleGroup('${groupName}')">
                  <span class="toggle-icon">▼</span>
                </button>
              </div>
              <div class="group-content">
                ${this.renderGroupMembers(members)}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
}
```

### Phase 4: Advanced Features (Version 6.119.0)

#### 4.1 Cross-Team Assignment Management

```javascript
// Cross-team assignment with approval workflows
resolver.define("requestCrossTeamAssignment", async ({ payload, context }) => {
  try {
    const { issueKey, targetUserId, requestingUserId, justification } = payload;

    // Check if requesting user has permission for cross-team assignment
    const requesterContext = await getUserHierarchyContext({
      payload: { userId: requestingUserId },
      context,
    });

    const targetUserContext = await getUserHierarchyContext({
      payload: { userId: targetUserId },
      context,
    });

    // Determine if approval is needed
    const needsApproval = await checkCrossTeamApprovalNeeded(
      requesterContext,
      targetUserContext
    );

    if (needsApproval) {
      // Create approval request
      const approvalRequest = await createApprovalRequest({
        issueKey,
        targetUserId,
        requestingUserId,
        justification,
        approvers: await getRequiredApprovers(
          requesterContext,
          targetUserContext
        ),
      });

      return {
        success: true,
        requiresApproval: true,
        approvalRequestId: approvalRequest.id,
        message: "Cross-team assignment request submitted for approval",
      };
    } else {
      // Direct assignment allowed
      await assignUserToIssue(issueKey, targetUserId, requestingUserId);

      return {
        success: true,
        requiresApproval: false,
        message: "User assigned successfully",
      };
    }
  } catch (error) {
    console.error("Error processing cross-team assignment:", error);
    return { success: false, error: error.message };
  }
});
```

#### 4.2 Hierarchical Analytics

```javascript
// Advanced analytics with hierarchy-aware metrics
resolver.define("getHierarchicalAnalytics", async ({ payload, context }) => {
  try {
    const { userId, timeRange, analysisLevel } = payload;

    const userContext = await getUserHierarchyContext({
      payload: { userId },
      context,
    });

    // Get analytics data based on user's visibility scope
    const analyticsData = await generateHierarchicalAnalytics({
      userContext: userContext.context,
      timeRange,
      analysisLevel,
    });

    return {
      success: true,
      analytics: {
        summary: analyticsData.summary,
        teamBreakdown: analyticsData.teamBreakdown,
        capacityTrends: analyticsData.capacityTrends,
        collaborationMetrics: analyticsData.collaborationMetrics,
        recommendations: analyticsData.recommendations,
      },
      metadata: {
        dataScope: userContext.context.accessLevel,
        teamsAnalyzed: analyticsData.teamsCount,
        timeRange: timeRange,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error generating hierarchical analytics:", error);
    return { success: false, error: error.message };
  }
});
```

## 🔒 Security Considerations

### 1. Data Isolation

- Strict enforcement of hierarchy-based data access
- No data leakage between organizational boundaries
- Audit trails for all cross-hierarchy access

### 2. Permission Validation

- Double-validation of permissions at resolver and UI levels
- Regular permission cache invalidation
- Fail-safe defaults (least privilege principle)

### 3. Compliance Features

- GDPR-compliant data handling
- SOC 2 compliance through Atlassian Forge
- Role-based audit logging

## 📊 Configuration Examples

### Small Team (10-15 people)

```yaml
hierarchy:
  levels: 2
  structure:
    - level: 0
      name: "Team"
      roles: ["TEAM_LEAD", "SENIOR_MEMBER", "MEMBER"]
    - level: 1
      name: "Individual"
      roles: ["CONTRIBUTOR"]
```

### Department (50-100 people)

```yaml
hierarchy:
  levels: 3
  structure:
    - level: 0
      name: "Department"
      roles: ["DEPARTMENT_MANAGER"]
    - level: 1
      name: "Team"
      roles: ["TEAM_LEAD", "SENIOR_MEMBER"]
    - level: 2
      name: "Individual"
      roles: ["CONTRIBUTOR", "SPECIALIST"]
```

### Enterprise (500+ people)

```yaml
hierarchy:
  levels: 5
  structure:
    - level: 0
      name: "Organization"
      roles: ["ENTERPRISE_ADMIN", "CTO", "VP_ENGINEERING"]
    - level: 1
      name: "Division"
      roles: ["DIVISION_MANAGER", "DIRECTOR"]
    - level: 2
      name: "Department"
      roles: ["DEPARTMENT_MANAGER", "SENIOR_MANAGER"]
    - level: 3
      name: "Team"
      roles: ["TEAM_LEAD", "TECH_LEAD"]
    - level: 4
      name: "Individual"
      roles: ["SENIOR_ENGINEER", "ENGINEER", "JUNIOR_ENGINEER"]
```

## 🚦 Migration Strategy

### Phase 1: Backward Compatibility

- Existing installations continue to work as single-team setups
- Gradual opt-in to hierarchy features
- Data migration tools for existing team structures

### Phase 2: Hierarchy Setup Wizard

- Guided setup for organizational structure
- Import from existing Jira projects/components
- Integration with Atlassian Access for enterprise customers

### Phase 3: Advanced Features

- Cross-team workflows
- Advanced analytics and reporting
- Integration with other Atlassian tools (Confluence, Bitbucket)

## 📈 Success Metrics

### Adoption Metrics

- Percentage of teams using hierarchy features
- Average hierarchy depth per organization
- Cross-team collaboration frequency

### Performance Metrics

- Dashboard load times with hierarchical filtering
- Permission check response times
- Data filtering efficiency

### User Satisfaction

- Feature usage analytics
- User feedback scores
- Support ticket reduction

This comprehensive design provides a scalable foundation for multi-level team management while maintaining the simplicity that makes the app valuable for smaller teams.
