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

resolver.define("testUserProperties", async ({ payload, context }) => {
  try {
    const testAccountId = "712020:fc018830-212d-44c1-b955-94ff897112cd"; // Dan Pearson

    console.log("Testing user properties API...");

    // First, try to store a test value
    const testData = { test: "value", timestamp: new Date().toISOString() };
    console.log("Storing test data:", testData);

    const storeResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/test-property?accountId=${testAccountId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: testData }),
        }
      );

    console.log("Store response status:", storeResponse.status);

    // Then try to retrieve it
    const getResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/test-property?accountId=${testAccountId}`
      );

    console.log("Get response status:", getResponse.status);

    let retrievedData = null;
    if (getResponse.ok) {
      retrievedData = await getResponse.json();
      console.log("Retrieved data:", retrievedData);
    }

    return {
      success: true,
      storeStatus: storeResponse.status,
      getStatus: getResponse.status,
      storedData: testData,
      retrievedData: retrievedData,
    };
  } catch (error) {
    console.error("User properties test failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

resolver.define("testSimple", async ({ payload, context }) => {
  console.log("=== SIMPLE TEST RESOLVER CALLED ===");
  return { test: "working", timestamp: new Date().toISOString() };
});

resolver.define("getUserCapacitySettings", async ({ payload, context }) => {
  const { accountId } = payload;

  console.log("=== getUserCapacitySettings CALLED FOR:", accountId, "===");

  // Default settings
  const defaultSettings = {
    maxCapacity: 10,
    workingHours: 8,
    totalCapacity: 40,
    notificationPreferences: {
      overloadAlert: true,
      dailyDigest: false,
      weeklyReport: true,
    },
  };

  try {
    console.log("Making API request for user:", accountId);

    // Get user settings from Jira properties
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`
      );

    console.log("Response status:", response.status, "OK:", response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log("API Response data:", JSON.stringify(data, null, 2));

      if (data.value) {
        console.log("Found saved data, type:", typeof data.value);

        // Parse the saved settings
        let savedSettings;
        if (typeof data.value === "string") {
          savedSettings = JSON.parse(data.value);
        } else {
          savedSettings = data.value;
        }

        console.log(
          "Parsed saved settings:",
          JSON.stringify(savedSettings, null, 2)
        );

        // Merge with defaults
        const finalSettings = { ...defaultSettings, ...savedSettings };
        console.log("Final settings:", JSON.stringify(finalSettings, null, 2));

        return {
          success: true,
          data: finalSettings,
        };
      } else {
        console.log("No saved data found, returning defaults");
        return {
          success: true,
          data: defaultSettings,
        };
      }
    } else {
      console.log("API request failed, returning defaults");
      return {
        success: true,
        data: defaultSettings,
      };
    }
  } catch (error) {
    console.error("Error in getUserCapacitySettings:", error);
    return {
      success: true,
      data: defaultSettings,
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
    const requestBody = {
      value: updatedSettings,
    };
    console.log(`Storing settings for ${accountId}:`, requestBody);

    const storeResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

    console.log(
      `Store response for ${accountId}:`,
      storeResponse.status,
      storeResponse.ok
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
      console.log("🚀 Running bulk auto-assignment for project:", projectKey);

      const multiAssigneesFieldId = await getMultiAssigneesFieldId();
      if (!multiAssigneesFieldId) {
        console.error("❌ Multi-assignees custom field not found");
        return {
          success: false,
          error:
            "Multi-assignees custom field not found. Please ensure the field exists and is accessible.",
          processedCount: 0,
          assignedCount: 0,
          skippedCount: 0,
        };
      }

      console.log(`✅ Found multi-assignees field: ${multiAssigneesFieldId}`);

      // Get all issues without assignees in the project
      const response = await api
        .asApp()
        .requestJira(route`/rest/api/3/search`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jql: `project = "${projectKey}" AND assignee is EMPTY AND status != Done AND status != Closed AND status != Resolved`,
            fields: ["key", "summary", "assignee", multiAssigneesFieldId],
            maxResults: 1000,
          }),
        });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to fetch issues:", errorText);
        throw new Error(
          `Failed to fetch issues: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      const issues = data.issues || [];

      let processedCount = 0;
      let assignedCount = 0;
      let skippedCount = 0;
      const results = [];

      console.log(`📋 Found ${issues.length} unassigned issues to process`);

      if (issues.length === 0) {
        return {
          success: true,
          processedCount: 0,
          assignedCount: 0,
          skippedCount: 0,
          results: [],
          message: "No unassigned issues found in the project.",
        };
      }

      // Process each issue
      for (const issue of issues) {
        processedCount++;
        const issueKey = issue.key;
        const multiAssignees = issue.fields[multiAssigneesFieldId];

        console.log(`🔍 Processing ${issueKey}:`, {
          multiAssignees: multiAssignees ? multiAssignees.length : 0,
          multiAssigneesData: multiAssignees,
        });

        if (!multiAssignees || multiAssignees.length === 0) {
          skippedCount++;
          results.push({
            issueKey,
            status: "skipped",
            reason: "No multi-assignees found",
          });
          console.log(`⏭️ Skipped ${issueKey}: No multi-assignees`);
          continue;
        }

        try {
          // Find primary assignee or use first one
          // Handle both old format (with role) and new format (just users)
          let primaryAssignee = null;

          if (multiAssignees[0]?.role) {
            // Old format with roles
            primaryAssignee =
              multiAssignees.find((user) => user.role === "Primary") ||
              multiAssignees[0];
          } else {
            // New format - just user objects
            primaryAssignee = multiAssignees[0];
          }

          if (!primaryAssignee) {
            skippedCount++;
            results.push({
              issueKey,
              status: "skipped",
              reason: "Could not determine primary assignee",
            });
            console.log(
              `⏭️ Skipped ${issueKey}: Could not determine primary assignee`
            );
            continue;
          }

          // Get the account ID - handle different formats
          const accountId =
            primaryAssignee.accountId ||
            primaryAssignee.id ||
            primaryAssignee.key;
          if (!accountId) {
            skippedCount++;
            results.push({
              issueKey,
              status: "skipped",
              reason: "Primary assignee missing account ID",
            });
            console.log(
              `⏭️ Skipped ${issueKey}: Primary assignee missing account ID`
            );
            continue;
          }

          console.log(
            `👤 Setting assignee for ${issueKey}: ${
              primaryAssignee.displayName || primaryAssignee.name
            } (${accountId})`
          );

          // Update the issue assignee
          const updateResponse = await api
            .asApp()
            .requestJira(route`/rest/api/3/issue/${issueKey}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: {
                  assignee: {
                    accountId: accountId,
                  },
                },
              }),
            });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(
              `Failed to update assignee: ${updateResponse.status} ${errorText}`
            );
          }

          // Add a comment explaining the assignment (optional - don't fail if this fails)
          try {
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
                            id: accountId,
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
          } catch (commentError) {
            console.warn(
              `⚠️ Could not add comment to ${issueKey}:`,
              commentError.message
            );
            // Don't fail the assignment because of comment failure
          }

          assignedCount++;
          results.push({
            issueKey,
            status: "assigned",
            assignee:
              primaryAssignee.displayName || primaryAssignee.name || accountId,
          });

          console.log(
            `✅ Successfully assigned ${
              primaryAssignee.displayName || primaryAssignee.name
            } to ${issueKey}`
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

      const summary = {
        processedCount,
        assignedCount,
        skippedCount,
      };

      console.log(`🎯 Bulk auto-assignment completed:`, summary);

      return {
        success: true,
        ...summary,
        results,
        message: `Processed ${processedCount} issues: ${assignedCount} assigned, ${skippedCount} skipped`,
      };
    } catch (error) {
      console.error("❌ Error in bulk auto-assignment:", error);
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

resolver.define("getSyncStatus", async ({ payload, context }) => {
  try {
    const { projectKey } = payload;
    console.log(
      `🔍 Checking bidirectional sync status for project: ${projectKey}`
    );

    // Get multi-assignees field ID
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    if (!multiAssigneesFieldId) {
      return {
        success: false,
        error: "Multi-assignees field not found",
        data: { totalIssues: 0, syncedIssues: 0, unsyncedIssues: 0 },
      };
    }

    // Fetch issues with both assignee and multi-assignees fields
    const response = await api.asApp().requestJira(route`/rest/api/3/search`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jql: `project = "${projectKey}" AND status != Done AND status != Closed`,
        fields: ["key", "summary", "assignee", multiAssigneesFieldId],
        maxResults: 1000,
      }),
    });

    const data = await response.json();
    const issues = data.issues || [];

    let syncedIssues = 0;
    let unsyncedIssues = 0;
    const syncDetails = [];

    // Check sync status for each issue
    for (const issue of issues) {
      const assignee = issue.fields.assignee;
      const multiAssignees = issue.fields[multiAssigneesFieldId] || [];

      const assigneeId = assignee?.accountId;
      const firstMultiAssigneeId =
        multiAssignees.length > 0 ? multiAssignees[0]?.accountId : null;

      const isSynced =
        (assigneeId &&
          firstMultiAssigneeId &&
          assigneeId === firstMultiAssigneeId) ||
        (!assigneeId && multiAssignees.length === 0);

      if (isSynced) {
        syncedIssues++;
      } else {
        unsyncedIssues++;
      }

      syncDetails.push({
        issueKey: issue.key,
        summary: issue.fields.summary,
        assignee: assignee?.displayName || "Unassigned",
        firstMultiAssignee: multiAssignees[0]?.displayName || "None",
        isSynced,
        syncStatus: isSynced ? "In Sync" : "Out of Sync",
      });
    }

    console.log(
      `📊 Sync Status: ${syncedIssues}/${issues.length} issues in sync`
    );

    return {
      success: true,
      data: {
        totalIssues: issues.length,
        syncedIssues,
        unsyncedIssues,
        syncAccuracy:
          issues.length > 0
            ? Math.round((syncedIssues / issues.length) * 100)
            : 100,
        details: syncDetails.slice(0, 20), // Limit details to first 20 issues
        lastChecked: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Error checking sync status:", error);
    return {
      success: false,
      error: error.message,
      data: { totalIssues: 0, syncedIssues: 0, unsyncedIssues: 0 },
    };
  }
});

// Helper function to get the multi-assignees field ID
async function getMultiAssigneesFieldId() {
  try {
    console.log("🔍 Searching for multi-assignees custom field...");

    const fieldsResponse = await api
      .asApp()
      .requestJira(route`/rest/api/3/field`);

    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch fields: ${fieldsResponse.status}`);
    }

    const fields = await fieldsResponse.json();

    // Look for our multi-assignees field with various possible names
    const multiAssigneesField = fields.find(
      (field) =>
        field.name === "Multi Assignees" ||
        field.name === "Multi-Assignees" ||
        field.name === "Multiple Assignees" ||
        field.key === "multi-assignees-field" ||
        field.name.toLowerCase().includes("multi assignee") ||
        field.name.toLowerCase().includes("multiple assignee") ||
        field.schema?.custom?.includes("multi-assignees") ||
        field.schema?.custom?.includes("user-picker")
    );

    if (multiAssigneesField) {
      console.log(
        `✅ Found multi-assignees field: ${multiAssigneesField.name} (${multiAssigneesField.id})`
      );
      return multiAssigneesField.id;
    }

    // Log available custom fields for debugging
    const customFields = fields.filter((field) => field.custom);
    console.log(
      "📋 Available custom fields:",
      customFields.map((f) => ({
        name: f.name,
        id: f.id,
        schema: f.schema?.custom,
      }))
    );

    console.error("❌ Multi-assignees field not found");
    return null;
  } catch (error) {
    console.error("❌ Error fetching custom fields:", error);
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
          // Handle both old (string) and new (object) formats for backward compatibility
          let settings =
            typeof capacityData.value === "string"
              ? JSON.parse(capacityData.value)
              : capacityData.value;

          // Handle nested structure - data might be in settings.value
          if (settings.value) {
            settings = settings.value;
          }

          totalCapacity =
            settings.totalCapacity || (settings.workingHours || 8) * 5;
          console.log(
            `📊 Loaded capacity for ${assignee.displayName}: ${totalCapacity}h/week`
          );
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
