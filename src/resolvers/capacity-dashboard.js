import api, { route } from "@forge/api";

// Capacity dashboard resolver
export async function getCapacityData(req) {
  try {
    console.log("Fetching real capacity data from Jira...");

    // Get the current project context
    const { context } = req;
    const projectKey = context?.extension?.project?.key || "MULTIPLE";

    console.log(`Fetching issues for project: ${projectKey}`);

    // First, get all custom fields to find our multi-assignees field
    let multiAssigneesFieldId = null;
    try {
      const fieldsResponse = await api
        .asApp()
        .requestJira(route`/rest/api/3/field`);
      const fields = await fieldsResponse.json();

      // Look for our multi-assignees field
      const multiAssigneesField = fields.find(
        (field) =>
          field.name === "Multi Assignees" ||
          field.key === "multi-assignees-field" ||
          field.name.toLowerCase().includes("multi assignee")
      );

      if (multiAssigneesField) {
        multiAssigneesFieldId = multiAssigneesField.id;
        console.log(
          `Found multi-assignees field with ID: ${multiAssigneesFieldId}`
        );
      } else {
        console.log(
          "Multi-assignees field not found, will only use default assignee"
        );
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }

    // Build the fields array dynamically
    const fieldsToFetch = ["key", "summary", "assignee", "priority", "status"];

    if (multiAssigneesFieldId) {
      fieldsToFetch.push(multiAssigneesFieldId);
    }

    // Fetch all issues from the project with assignee data
    const response = await api.asApp().requestJira(route`/rest/api/3/search`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jql: `project = "${projectKey}" AND status != Done AND status != Closed`,
        expand: ["names"],
        fields: fieldsToFetch,
        maxResults: 1000,
      }),
    });

    const data = await response.json();
    console.log(`Found ${data.issues?.length || 0} issues`);

    if (!data.issues) {
      console.log("No issues found, returning empty data");
      return {
        metrics: {
          totalMembers: 0,
          avgUtilization: 0,
          activeAssignments: 0,
          healthStatus: "Good",
        },
        users: [],
        alerts: [],
        projectKey,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Process issues to calculate capacity
    const userCapacity = new Map();
    const assignments = [];

    // Process each issue
    for (const issue of data.issues) {
      const issueKey = issue.key;
      const summary = issue.fields.summary;
      const priority = issue.fields.priority?.name || "Medium";
      const status = issue.fields.status?.name || "In Progress";

      console.log(`Processing issue ${issueKey}: ${summary}`);

      // Get default assignee
      const defaultAssignee = issue.fields.assignee;
      if (defaultAssignee) {
        console.log(`  - Default assignee: ${defaultAssignee.displayName}`);
        addUserAssignment(userCapacity, defaultAssignee, {
          issueKey,
          summary,
          role: "Primary",
          priority,
          status,
        });
        assignments.push({
          issueKey,
          summary,
          assignee: defaultAssignee,
          role: "Primary",
          priority,
          status,
        });
      }

      // Get multi-assignees (custom field)
      if (multiAssigneesFieldId) {
        const multiAssignees = issue.fields[multiAssigneesFieldId];
        if (multiAssignees && Array.isArray(multiAssignees)) {
          console.log(
            `  - Multi-assignees: ${multiAssignees
              .map((u) => u.displayName)
              .join(", ")}`
          );
          multiAssignees.forEach((assignee, index) => {
            // Don't double-count if they're also the default assignee
            if (
              !defaultAssignee ||
              assignee.accountId !== defaultAssignee.accountId
            ) {
              const role =
                index === 0
                  ? "Secondary"
                  : index === 1
                  ? "Reviewer"
                  : "Collaborator";
              addUserAssignment(userCapacity, assignee, {
                issueKey,
                summary,
                role,
                priority,
                status,
              });
              assignments.push({
                issueKey,
                summary,
                assignee,
                role,
                priority,
                status,
              });
            }
          });
        }
      }
    }

    console.log(`Processed assignments for ${userCapacity.size} users`);

    // Convert user capacity map to array and calculate metrics
    const users = Array.from(userCapacity.values()).map((user) => {
      const totalAssignments =
        user.primary + user.secondary + user.reviewer + user.collaborator;
      const utilizationRate = Math.min(
        totalAssignments / (user.totalCapacity || 40),
        1.5
      ); // Cap at 150%

      let healthStatus = "optimal";
      if (utilizationRate >= 1.0) {
        healthStatus = "overloaded";
      } else if (utilizationRate >= 0.8) {
        healthStatus = "busy";
      }

      console.log(
        `User ${
          user.displayName
        }: ${totalAssignments} assignments, ${Math.round(
          utilizationRate * 100
        )}% utilization, ${healthStatus}`
      );

      return {
        ...user,
        utilizationRate,
        healthStatus,
      };
    });

    // Calculate overall metrics
    const totalMembers = users.length;
    const avgUtilization =
      totalMembers > 0
        ? Math.round(
            (users.reduce((sum, user) => sum + user.utilizationRate, 0) /
              totalMembers) *
              100
          )
        : 0;
    const activeAssignments = assignments.length;

    // Determine health status
    const overloadedCount = users.filter(
      (u) => u.healthStatus === "overloaded"
    ).length;
    const busyCount = users.filter((u) => u.healthStatus === "busy").length;

    let healthStatus = "Good";
    if (overloadedCount > 0) {
      healthStatus = "Critical";
    } else if (busyCount > totalMembers * 0.5) {
      healthStatus = "Warning";
    }

    // Generate alerts
    const alerts = [];
    users.forEach((user) => {
      const utilPercent = Math.round(user.utilizationRate * 100);
      if (user.healthStatus === "overloaded") {
        alerts.push({
          type: "critical",
          message: `${user.displayName} is at ${utilPercent}% capacity - immediate attention required`,
          user: user.displayName,
        });
      } else if (user.healthStatus === "busy") {
        alerts.push({
          type: "warning",
          message: `${user.displayName} is at ${utilPercent}% capacity - consider redistributing workload`,
          user: user.displayName,
        });
      }
    });

    const result = {
      metrics: {
        totalMembers,
        avgUtilization,
        activeAssignments,
        healthStatus,
      },
      users: users.sort((a, b) => b.utilizationRate - a.utilizationRate), // Sort by utilization descending
      alerts,
      projectKey,
      lastUpdated: new Date().toISOString(),
      debug: {
        multiAssigneesFieldId,
        totalIssues: data.issues.length,
        totalAssignments: assignments.length,
      },
    };

    console.log("Capacity data processed successfully:", {
      totalMembers,
      avgUtilization,
      activeAssignments,
      healthStatus,
      multiAssigneesFieldFound: !!multiAssigneesFieldId,
    });

    return result;
  } catch (error) {
    console.error("Error fetching capacity data:", error);

    // Return fallback data with error info
    return {
      error: `Failed to load capacity data: ${error.message}`,
      metrics: {
        totalMembers: 0,
        avgUtilization: 0,
        activeAssignments: 0,
        healthStatus: "Error",
      },
      users: [],
      alerts: [
        {
          type: "critical",
          message: `Dashboard error: ${error.message}`,
          user: "System",
        },
      ],
      projectKey: "UNKNOWN",
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Helper function to add or update user assignment data
function addUserAssignment(userCapacity, assignee, assignment) {
  const userId = assignee.accountId;

  if (!userCapacity.has(userId)) {
    userCapacity.set(userId, {
      userAccountId: userId,
      displayName: assignee.displayName || assignee.name || "Unknown User",
      email: assignee.emailAddress || "",
      avatarUrl:
        assignee.avatarUrls?.["48x48"] || assignee.avatarUrls?.["32x32"] || "",
      totalCapacity: 40, // Default capacity - could be made configurable
      primary: 0,
      secondary: 0,
      reviewer: 0,
      collaborator: 0,
      assignments: [],
    });
  }

  const user = userCapacity.get(userId);

  // Increment role count
  const roleKey = assignment.role.toLowerCase();
  if (user.hasOwnProperty(roleKey)) {
    user[roleKey]++;
  }

  // Add assignment details
  user.assignments.push(assignment);
}
