import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const resolver = new Resolver();

// Define the resolver function that matches the frontend call
resolver.define("getCapacityData", async ({ payload, context }) => {
  try {
    console.log("Fetching real capacity data from Jira...");

    // Get the current project context
    const projectKey =
      context?.extension?.project?.key ||
      payload?.context?.extension?.project?.key ||
      payload?.projectKey ||
      "MULTIPLE";

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
        await addUserAssignment(userCapacity, defaultAssignee, {
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
          for (let index = 0; index < multiAssignees.length; index++) {
            const assignee = multiAssignees[index];
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
              await addUserAssignment(userCapacity, assignee, {
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
          }
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
});

resolver.define("getUserCapacitySettings", async ({ payload, context }) => {
  try {
    const { accountId } = payload;
    console.log("Getting capacity settings for user:", accountId);

    // Get user settings from Jira properties (or default values)
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`
      );

    let settings = {
      maxCapacity: 10,
      workingHours: 8,
      totalCapacity: 40, // 8 hours * 5 days
      notificationPreferences: {
        overloadAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
    };

    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        settings = { ...settings, ...JSON.parse(data.value) };
      }
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error getting user capacity settings:", error);
    return {
      success: false,
      error: error.message,
      data: {
        maxCapacity: 10,
        workingHours: 8,
        totalCapacity: 40,
        notificationPreferences: {
          overloadAlert: true,
          dailyDigest: false,
          weeklyReport: true,
        },
      },
    };
  }
});

resolver.define("updateUserCapacitySettings", async ({ payload, context }) => {
  try {
    const { accountId, settings } = payload;
    console.log("Updating capacity settings for user:", accountId, settings);

    // Calculate total capacity from working hours (assuming 5 days/week)
    const totalCapacity = settings.workingHours * 5;
    const updatedSettings = {
      ...settings,
      totalCapacity,
    };

    // Store settings in Jira user properties
    await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: JSON.stringify(updatedSettings),
          }),
        }
      );

    return { success: true, data: updatedSettings };
  } catch (error) {
    console.error("Error updating user capacity settings:", error);
    return { success: false, error: error.message };
  }
});

resolver.define(
  "setDefaultAssigneeFromMultiAssignee",
  async ({ payload, context }) => {
    try {
      const { issueKey, force = false } = payload;
      console.log(
        "Setting default assignee from multi-assignee for:",
        issueKey
      );

      // Get issue details
      const issueResponse = await api
        .asApp()
        .requestJira(
          route`/rest/api/3/issue/${issueKey}?expand=names&fields=assignee,${await getMultiAssigneesFieldId()}`
        );

      if (!issueResponse.ok) {
        throw new Error("Failed to fetch issue");
      }

      const issue = await issueResponse.json();
      const multiAssigneesFieldId = await getMultiAssigneesFieldId();
      const multiAssignees = issue.fields[multiAssigneesFieldId];
      const currentAssignee = issue.fields.assignee;

      // Only proceed if we have multi-assignees
      if (!multiAssignees || multiAssignees.length === 0) {
        return {
          success: false,
          message: "No multi-assignees found",
        };
      }

      // Only set if no current assignee or force is true
      if (currentAssignee && !force) {
        return {
          success: false,
          message: "Issue already has an assignee. Use force=true to override.",
          currentAssignee: currentAssignee.displayName,
        };
      }

      // Find primary assignee or use first one
      const primaryAssignee =
        multiAssignees.find((user) => user.role === "Primary") ||
        multiAssignees[0];

      // Update the issue assignee
      await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            assignee: {
              accountId: primaryAssignee.accountId || primaryAssignee.id,
            },
          },
        }),
      });

      // Add a comment explaining the assignment
      const comment = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "panel",
            attrs: { panelType: "info" },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "🤖 Auto-Assignment: Default assignee set from multi-assignee field. ",
                  },
                  {
                    type: "mention",
                    attrs: {
                      id: primaryAssignee.accountId || primaryAssignee.id,
                    },
                  },
                  {
                    type: "text",
                    text: ` is now the primary assignee.`,
                  },
                ],
              },
            ],
          },
        ],
      };

      await api
        .asApp()
        .requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: comment }),
        });

      return {
        success: true,
        assignee: primaryAssignee.displayName,
        message: "Default assignee set successfully",
      };
    } catch (error) {
      console.error("Error setting default assignee:", error);
      return { success: false, error: error.message };
    }
  }
);

resolver.define(
  "bulkAutoAssignFromMultiAssignee",
  async ({ payload, context }) => {
    try {
      const { projectKey } = payload;
      console.log("Running bulk auto-assignment for project:", projectKey);

      const multiAssigneesFieldId = await getMultiAssigneesFieldId();
      if (!multiAssigneesFieldId) {
        return {
          success: false,
          error: "Multi-assignees custom field not found",
        };
      }

      // Get all issues without assignees that have multi-assignees
      const response = await api
        .asApp()
        .requestJira(route`/rest/api/3/search`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jql: `project = "${projectKey}" AND assignee is EMPTY AND status != Done AND status != Closed`,
            fields: ["assignee", multiAssigneesFieldId],
            maxResults: 1000,
          }),
        });

      if (!response.ok) {
        throw new Error("Failed to fetch issues");
      }

      const data = await response.json();
      const issues = data.issues || [];

      let processedCount = 0;
      let assignedCount = 0;
      let skippedCount = 0;
      const results = [];

      console.log(`Found ${issues.length} unassigned issues to process`);

      // Process each issue
      for (const issue of issues) {
        processedCount++;
        const issueKey = issue.key;
        const multiAssignees = issue.fields[multiAssigneesFieldId];

        if (!multiAssignees || multiAssignees.length === 0) {
          skippedCount++;
          results.push({
            issueKey,
            status: "skipped",
            reason: "No multi-assignees found",
          });
          continue;
        }

        try {
          // Find primary assignee or use first one
          const primaryAssignee =
            multiAssignees.find((user) => user.role === "Primary") ||
            multiAssignees[0];

          // Update the issue assignee
          await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                assignee: {
                  accountId: primaryAssignee.accountId || primaryAssignee.id,
                },
              },
            }),
          });

          // Add a comment explaining the assignment
          const comment = {
            type: "doc",
            version: 1,
            content: [
              {
                type: "panel",
                attrs: { panelType: "info" },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "🤖 Bulk Auto-Assignment: Default assignee set from multi-assignee field. ",
                      },
                      {
                        type: "mention",
                        attrs: {
                          id: primaryAssignee.accountId || primaryAssignee.id,
                        },
                      },
                      {
                        type: "text",
                        text: ` is now the primary assignee.`,
                      },
                    ],
                  },
                ],
              },
            ],
          };

          await api
            .asApp()
            .requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: comment }),
            });

          assignedCount++;
          results.push({
            issueKey,
            status: "assigned",
            assignee: primaryAssignee.displayName,
          });

          console.log(
            `✅ Assigned ${primaryAssignee.displayName} to ${issueKey}`
          );
        } catch (error) {
          console.error(`❌ Failed to assign ${issueKey}:`, error);
          skippedCount++;
          results.push({
            issueKey,
            status: "failed",
            reason: error.message,
          });
        }
      }

      console.log(`Bulk auto-assignment completed:`, {
        processedCount,
        assignedCount,
        skippedCount,
      });

      return {
        success: true,
        processedCount,
        assignedCount,
        skippedCount,
        results,
        message: `Processed ${processedCount} issues, assigned ${assignedCount}, skipped ${skippedCount}`,
      };
    } catch (error) {
      console.error("Error in bulk auto-assignment:", error);
      return {
        success: false,
        error: error.message,
        processedCount: 0,
        assignedCount: 0,
        skippedCount: 0,
      };
    }
  }
);

resolver.define("checkUserPermissions", async ({ payload, context }) => {
  try {
    const { projectKey } = payload;

    // Get current user info
    const userResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/myself`);
    const currentUser = await userResponse.json();

    // Check if user has project admin permissions
    const permissionsResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/mypermissions?projectKey=${projectKey}`);
    const permissions = await permissionsResponse.json();

    // Check for admin-level permissions
    const isAdmin =
      permissions.permissions?.ADMINISTER_PROJECTS?.havePermission ||
      permissions.permissions?.PROJECT_ADMIN?.havePermission ||
      permissions.permissions?.ADMINISTER?.havePermission ||
      currentUser.accountType === "atlassian" || // Atlassian staff
      false;

    console.log(`User ${currentUser.displayName} admin status: ${isAdmin}`);

    return {
      isAdmin,
      user: {
        accountId: currentUser.accountId,
        displayName: currentUser.displayName,
        emailAddress: currentUser.emailAddress,
      },
    };
  } catch (error) {
    console.error("Error checking user permissions:", error);
    return { isAdmin: false, error: error.message };
  }
});

// Helper function to get the multi-assignees field ID
async function getMultiAssigneesFieldId() {
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

    return multiAssigneesField ? multiAssigneesField.id : null;
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return null;
  }
}

// Helper function to add or update user assignment data
async function addUserAssignment(userCapacity, assignee, assignment) {
  const userId = assignee.accountId;

  if (!userCapacity.has(userId)) {
    // Get user's individual capacity settings
    let totalCapacity = 40; // Default fallback
    try {
      const capacityResponse = await api
        .asApp()
        .requestJira(
          route`/rest/api/3/user/properties/capacity-settings?accountId=${userId}`
        );

      if (capacityResponse.ok) {
        const capacityData = await capacityResponse.json();
        if (capacityData.value) {
          const settings = JSON.parse(capacityData.value);
          totalCapacity = settings.totalCapacity || 40;
        }
      }
    } catch (error) {
      console.log("Using default capacity for user:", userId);
    }

    userCapacity.set(userId, {
      userAccountId: userId,
      displayName: assignee.displayName || assignee.name || "Unknown User",
      email: assignee.emailAddress || "",
      avatarUrl:
        assignee.avatarUrls?.["48x48"] || assignee.avatarUrls?.["32x32"] || "",
      totalCapacity, // Now uses individual user settings
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

export const handler = resolver.getDefinitions();
