import Resolver from "@forge/resolver";
import { storage } from "@forge/api";
import api, { route } from "@forge/api";

const resolver = new Resolver();

// Get multi-assignees for an issue
resolver.define("getMultiAssignees", async ({ payload, context }) => {
  const { issueKey } = payload;

  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueKey}/properties/multi-assignees`
      );

    if (response.status === 200) {
      const data = JSON.parse(response.body.value);
      return { success: true, assignees: data.assignees || [] };
    }

    return { success: true, assignees: [] };
  } catch (error) {
    console.error("Error fetching multi-assignees:", error);
    return { success: false, error: error.message, assignees: [] };
  }
});

// Update multi-assignees for an issue
resolver.define("updateMultiAssignees", async ({ payload, context }) => {
  const { issueKey, assignees } = payload;

  try {
    const assigneeData = {
      assignees: assignees || [],
      lastModified: new Date().toISOString(),
      version: 1,
    };

    await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueKey}/properties/multi-assignees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assigneeData),
        }
      );

    return { success: true, message: "Multi-assignees updated successfully" };
  } catch (error) {
    console.error("Error updating multi-assignees:", error);
    return { success: false, error: error.message };
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

// Get team capacity data
resolver.define("getTeamCapacity", async ({ payload, context }) => {
  const { projectKey } = payload;

  try {
    // Get project users
    const usersResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`
      );

    const users = JSON.parse(usersResponse.body);

    // Calculate capacity for each user (placeholder algorithm)
    const teamCapacity = users.map((user) => ({
      accountId: user.accountId,
      displayName: user.displayName,
      avatarUrls: user.avatarUrls,
      primaryAssignments: Math.floor(Math.random() * 5),
      secondaryAssignments: Math.floor(Math.random() * 8),
      reviewerAssignments: Math.floor(Math.random() * 3),
      totalCapacity: 10,
      utilizationRate: Math.random(),
      healthStatus: ["optimal", "busy", "overloaded"][
        Math.floor(Math.random() * 3)
      ],
    }));

    const teamMetrics = {
      averageUtilization:
        teamCapacity.reduce((sum, user) => sum + user.utilizationRate, 0) /
        teamCapacity.length,
      totalAssignments: teamCapacity.reduce(
        (sum, user) =>
          sum + user.primaryAssignments + user.secondaryAssignments,
        0
      ),
      teamSize: teamCapacity.length,
    };

    return { success: true, teamCapacity, teamMetrics };
  } catch (error) {
    console.error("Error fetching team capacity:", error);
    return {
      success: false,
      error: error.message,
      teamCapacity: [],
      teamMetrics: {},
    };
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
