import Resolver from "@forge/resolver";
import { storage } from "@forge/api";
import api, { route } from "@forge/api";

const resolver = new Resolver();

// Fetch team members and their assignments for a project
resolver.define("getTeamCapacity", async (req) => {
  try {
    const { projectKey } = req.payload;

    if (!projectKey) {
      return { error: "Project key is required" };
    }

    // Get all issues in the project
    const issuesResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/search`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jql: `project = "${projectKey}" AND resolution = Unresolved`,
          fields: [
            "assignee",
            "status",
            "issuetype",
            "priority",
            "created",
            "updated",
            "summary",
          ],
          maxResults: 1000,
        }),
      });

    const issues = issuesResponse.body.issues;

    // Get project users (assignable users)
    const usersResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/user/assignable/search`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        query: {
          project: projectKey,
          maxResults: 100,
        },
      });

    const users = usersResponse.body;

    // Calculate capacity for each user
    const teamCapacity = users.map((user) => {
      const userIssues = issues.filter(
        (issue) =>
          issue.fields.assignee &&
          issue.fields.assignee.accountId === user.accountId
      );

      const primaryAssignments = userIssues.length;

      // Get secondary assignments from storage (for multi-assignee feature)
      const secondaryAssignments = 0; // TODO: Implement multi-assignee storage

      const totalAssignments = primaryAssignments + secondaryAssignments;
      const maxCapacity = 10; // Default capacity
      const utilizationRate = Math.min(totalAssignments / maxCapacity, 1.0);

      return {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress,
        avatarUrls: user.avatarUrls,
        primaryAssignments,
        secondaryAssignments,
        totalAssignments,
        maxCapacity,
        utilizationRate,
        isOverloaded: utilizationRate >= 0.9,
        recentIssues: userIssues.slice(0, 5).map((issue) => ({
          key: issue.key,
          summary: issue.fields.summary || "No summary",
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name || "None",
        })),
      };
    });

    // Sort by utilization rate (highest first)
    teamCapacity.sort((a, b) => b.utilizationRate - a.utilizationRate);

    const teamMetrics = {
      averageUtilization:
        teamCapacity.reduce((sum, member) => sum + member.utilizationRate, 0) /
        teamCapacity.length,
      totalAssignments: teamCapacity.reduce(
        (sum, member) =>
          sum + member.primaryAssignments + member.secondaryAssignments,
        0
      ),
      teamSize: teamCapacity.length,
    };

    return {
      success: true,
      data: {
        projectKey,
        teamMembers: teamCapacity,
        overloadedCount: teamCapacity.filter((member) => member.isOverloaded)
          .length,
        totalMembers: teamCapacity.length,
        averageUtilization:
          teamCapacity.reduce(
            (sum, member) => sum + member.utilizationRate,
            0
          ) / teamCapacity.length,
        lastUpdated: new Date().toISOString(),
      },
      teamMetrics,
    };
  } catch (error) {
    console.error("Error fetching team capacity:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch team capacity data",
    };
  }
});

// Get user capacity settings
resolver.define("getUserCapacitySettings", async (req) => {
  try {
    const { accountId } = req.payload;

    const settings = (await storage.get(`user:${accountId}:capacity`)) || {
      maxCapacity: 10,
      workingHours: 8,
      notificationPreferences: {
        overloadAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
    };

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return { success: false, error: error.message };
  }
});

// Update user capacity settings
resolver.define("updateUserCapacitySettings", async (req) => {
  try {
    const { accountId, settings } = req.payload;

    await storage.set(`user:${accountId}:capacity`, settings);

    return { success: true, message: "Settings updated successfully" };
  } catch (error) {
    console.error("Error updating user settings:", error);
    return { success: false, error: error.message };
  }
});

// Get project capacity analytics
resolver.define("getProjectAnalytics", async (req) => {
  try {
    const { projectKey, days = 30 } = req.payload;

    // Get historical data (simplified for now)
    const analytics = (await storage.get(
      `project:${projectKey}:analytics`
    )) || {
      capacityTrends: [],
      collaborationMetrics: {},
      assignmentPatterns: {},
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error("Error fetching project analytics:", error);
    return { success: false, error: error.message };
  }
});

// Multi-assignee functions (placeholder for future implementation)
resolver.define("getMultiAssignees", async (req) => {
  try {
    const { issueKey } = req.payload;

    const multiAssignees = (await storage.get(
      `issue:${issueKey}:assignees`
    )) || {
      assignees: [],
      roles: {},
      lastUpdated: null,
    };

    return { success: true, data: multiAssignees };
  } catch (error) {
    console.error("Error fetching multi-assignees:", error);
    return { success: false, error: error.message };
  }
});

resolver.define("updateMultiAssignees", async (req) => {
  try {
    const { issueKey, assignees, roles } = req.payload;

    const data = {
      assignees,
      roles,
      lastUpdated: new Date().toISOString(),
    };

    await storage.set(`issue:${issueKey}:assignees`, data);

    return { success: true, message: "Multi-assignees updated successfully" };
  } catch (error) {
    console.error("Error updating multi-assignees:", error);
    return { success: false, error: error.message };
  }
});

// Get current issue context
resolver.define("getIssueContext", async ({ payload, context }) => {
  const { issueKey } = payload;

  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueKey}?fields=summary,assignee,project,issuetype,components,labels`
      );

    const issue = JSON.parse(response.body);

    return {
      success: true,
      issue: {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee,
        project: issue.fields.project,
        issueType: issue.fields.issuetype,
        components: issue.fields.components || [],
        labels: issue.fields.labels || [],
      },
    };
  } catch (error) {
    console.error("Error fetching issue context:", error);
    return { success: false, error: error.message, issue: null };
  }
});

// Get assignee suggestions based on issue context
resolver.define("getAssigneeSuggestions", async ({ payload, context }) => {
  const { issueKey, projectKey } = payload;

  try {
    // Get assignable users for the project
    const usersResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=20`
      );

    const users = JSON.parse(usersResponse.body);

    // Simple suggestion algorithm - in real implementation, this would be more sophisticated
    const suggestions = users.map((user) => ({
      accountId: user.accountId,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      avatarUrls: user.avatarUrls,
      expertise: "General", // Placeholder for ML-based expertise detection
      workload: Math.floor(Math.random() * 10) + 1, // Placeholder for actual workload calculation
      collaborationScore: Math.floor(Math.random() * 5) + 1,
    }));

    return { success: true, suggestions };
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return { success: false, error: error.message, suggestions: [] };
  }
});

export const handler = resolver.getDefinitions();

export async function getDashboardData(req) {
  try {
    // Simple resolver that returns success status
    // The React component will handle its own data
    return {
      success: true,
      message: "Dashboard data loaded successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Dashboard resolver error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
