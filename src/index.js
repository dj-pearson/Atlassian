import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { storage } from "@forge/api";

const resolver = new Resolver();

// Main custom field handler
resolver.define("handler", async (req) => {
  console.log("Multi-assignees field handler called");
  return {
    content: "Multi-assignees field initialized",
  };
});

// Edit multi-assignees handler
resolver.define("editMultiAssignees", async (req) => {
  const { context, payload } = req;
  console.log("Edit multi-assignees called with context:", context);

  try {
    // Get current issue data
    const issueKey = context.extension.issue.key;
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issueKey}?expand=names`);

    const issue = response.body;

    // Get current multi-assignees data
    let multiAssignees = [];
    try {
      const entityProperty = await api
        .asApp()
        .requestJira(
          route`/rest/api/3/issue/${issueKey}/properties/multi-assignees`
        );
      multiAssignees = JSON.parse(entityProperty.body.value);
    } catch (error) {
      console.log("No existing multi-assignees data found");
    }

    return {
      issue,
      multiAssignees,
      availableUsers: await getAvailableUsers(context.extension.project.key),
    };
  } catch (error) {
    console.error("Error in editMultiAssignees:", error);
    return { error: error.message };
  }
});

// View multi-assignees handler
resolver.define("viewMultiAssignees", async (req) => {
  const { context } = req;

  try {
    const issueKey = context.extension.issue.key;

    // Get multi-assignees data
    let multiAssignees = [];
    try {
      const entityProperty = await api
        .asApp()
        .requestJira(
          route`/rest/api/3/issue/${issueKey}/properties/multi-assignees`
        );
      multiAssignees = JSON.parse(entityProperty.body.value);
    } catch (error) {
      console.log("No multi-assignees data found for issue:", issueKey);
    }

    // Get user details for each assignee
    const assigneeDetails = await Promise.all(
      multiAssignees.map(async (assignee) => {
        try {
          const userResponse = await api
            .asApp()
            .requestJira(
              route`/rest/api/3/user?accountId=${assignee.userAccountId}`
            );
          return {
            ...assignee,
            user: userResponse.body,
          };
        } catch (error) {
          console.error("Error fetching user details:", error);
          return assignee;
        }
      })
    );

    return {
      multiAssignees: assigneeDetails,
      issueKey,
    };
  } catch (error) {
    console.error("Error in viewMultiAssignees:", error);
    return { error: error.message };
  }
});

// Capacity dashboard handler
resolver.define("capacityDashboard", async (req) => {
  const { context } = req;

  try {
    const projectKey = context.extension.project.key;

    // Get all issues in project with multi-assignees
    const issuesResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/search?jql=project=${projectKey}&expand=names&maxResults=1000`
      );

    const issues = issuesResponse.body.issues;

    // Calculate team capacity
    const teamCapacity = await calculateTeamCapacity(projectKey, issues);

    return {
      teamCapacity,
      projectKey,
      totalIssues: issues.length,
    };
  } catch (error) {
    console.error("Error in capacityDashboard:", error);
    return { error: error.message };
  }
});

// Smart assignee suggestions handler
resolver.define("assigneeSuggestions", async (req) => {
  const { context } = req;

  try {
    const issueKey = context.extension.issue.key;
    const projectKey = context.extension.project.key;

    // Get issue details
    const issueResponse = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issueKey}?expand=names`);
    const issue = issueResponse.body;

    // Generate smart suggestions
    const suggestions = await generateAssigneeSuggestions(issue);

    return {
      suggestions,
      issue,
      projectKey,
    };
  } catch (error) {
    console.error("Error in assigneeSuggestions:", error);
    return { error: error.message };
  }
});

// Analytics webhook handler
resolver.define("analyticsWebhook", async (req) => {
  const { body } = req;

  try {
    // Store analytics event
    await storage.set(`analytics:${Date.now()}:${body.eventType}`, {
      ...body,
      timestamp: new Date().toISOString(),
    });

    console.log("Analytics event stored:", body.eventType);
    return { success: true };
  } catch (error) {
    console.error("Error in analyticsWebhook:", error);
    return { error: error.message };
  }
});

// App lifecycle handlers
resolver.define("install-handler", async (req) => {
  console.log("Multiple Assignees Manager installed");

  // Initialize default settings
  await storage.set("app-settings", {
    maxAssignees: 8,
    defaultRoles: ["primary", "secondary", "reviewer", "collaborator"],
    notificationSettings: {
      digestMode: true,
      frequency: "immediate",
    },
  });

  return { success: true };
});

resolver.define("uninstall-handler", async (req) => {
  console.log("Multiple Assignees Manager uninstalled");
  return { success: true };
});

// Helper functions
async function getAvailableUsers(projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`
      );
    return response.body;
  } catch (error) {
    console.error("Error fetching available users:", error);
    return [];
  }
}

async function calculateTeamCapacity(projectKey, issues) {
  const userCapacity = {};

  for (const issue of issues) {
    try {
      // Get multi-assignees for each issue
      const entityProperty = await api
        .asApp()
        .requestJira(
          route`/rest/api/3/issue/${issue.key}/properties/multi-assignees`
        );

      const multiAssignees = JSON.parse(entityProperty.body.value);

      multiAssignees.forEach((assignee) => {
        if (!userCapacity[assignee.userAccountId]) {
          userCapacity[assignee.userAccountId] = {
            userAccountId: assignee.userAccountId,
            primary: 0,
            secondary: 0,
            reviewer: 0,
            collaborator: 0,
            totalCapacity: 10, // Default max capacity
          };
        }

        userCapacity[assignee.userAccountId][assignee.role]++;
      });
    } catch (error) {
      // Issue doesn't have multi-assignees, skip
      continue;
    }
  }

  // Calculate utilization rates
  Object.values(userCapacity).forEach((user) => {
    const totalAssignments =
      user.primary + user.secondary + user.reviewer + user.collaborator;
    user.utilizationRate = totalAssignments / user.totalCapacity;
    user.healthStatus =
      user.utilizationRate < 0.7
        ? "optimal"
        : user.utilizationRate < 0.9
        ? "busy"
        : "overloaded";
  });

  return Object.values(userCapacity);
}

async function generateAssigneeSuggestions(issue) {
  const suggestions = [];

  try {
    // Get assignable users for the project
    const usersResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${issue.fields.project.key}&maxResults=20`
      );

    const users = usersResponse.body;

    // Simple suggestion algorithm based on components and issue type
    for (const user of users) {
      let score = 0;

      // Score based on component expertise (simplified)
      if (issue.fields.components && issue.fields.components.length > 0) {
        score += 0.4; // Component match bonus
      }

      // Score based on availability (simplified - random for demo)
      score += Math.random() * 0.6;

      suggestions.push({
        user,
        score,
        reasons: ["Component expertise", "Available capacity"],
        suggestedRole: score > 0.7 ? "primary" : "secondary",
      });
    }

    // Sort by score and return top 5
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return [];
  }
}

export const handler = resolver.getDefinitions();
