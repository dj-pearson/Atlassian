import api, { route } from "@forge/api";

// Issue events handler for multi-assignee integration
export default async function issueEventsHandler(event, context) {
  console.log(
    "Issue Events Handler - Event:",
    event.eventType,
    "Issue:",
    event.issue?.key
  );

  try {
    const issue = event.issue;
    if (!issue) {
      console.log("No issue data in event");
      return;
    }

    // Get multi-assignees custom field ID (you'll need to replace with actual field ID)
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    const multiAssignees = issue.fields[multiAssigneesFieldId];

    if (!multiAssignees || multiAssignees.length === 0) {
      console.log("No multi-assignees found for issue:", issue.key);
      return;
    }

    // Handle different event types
    switch (event.eventType) {
      case "jira:issue_created":
        await handleIssueCreated(issue, multiAssignees, context);
        break;
      case "jira:issue_updated":
        await handleIssueUpdated(issue, multiAssignees, context);
        break;
      default:
        console.log("Unhandled event type:", event.eventType);
    }
  } catch (error) {
    console.error("Issue events handler error:", error);
  }
}

// Handle issue creation
async function handleIssueCreated(issue, multiAssignees, context) {
  console.log("Handling issue created:", issue.key);

  try {
    // 1. Sync primary assignee to native assignee field
    await syncPrimaryAssignee(issue.key, multiAssignees);

    // 2. Send welcome notifications to all assignees
    await sendAssignmentNotifications(issue, multiAssignees, "assigned");

    // 3. Create subtask assignments if configured
    await handleSubtaskAssignments(issue, multiAssignees);

    // 4. Update team capacity tracking
    await updateCapacityTracking(multiAssignees, "add", issue);

    // 5. Log assignment activity
    await logAssignmentActivity(
      issue.key,
      multiAssignees,
      "created",
      context.accountId
    );
  } catch (error) {
    console.error("Error handling issue created:", error);
  }
}

// Handle issue updates
async function handleIssueUpdated(issue, multiAssignees, context) {
  console.log("Handling issue updated:", issue.key);

  try {
    // Get previous assignees from changelog
    const previousAssignees = await getPreviousAssignees(issue, context);

    // 1. Sync primary assignee if changed
    await syncPrimaryAssignee(issue.key, multiAssignees);

    // 2. Send notifications for assignment changes
    await handleAssignmentChanges(issue, previousAssignees, multiAssignees);

    // 3. Update capacity tracking
    await updateCapacityChanges(previousAssignees, multiAssignees, issue);

    // 4. Log assignment activity
    await logAssignmentActivity(
      issue.key,
      multiAssignees,
      "updated",
      context.accountId
    );
  } catch (error) {
    console.error("Error handling issue updated:", error);
  }
}

// Sync primary assignee to native assignee field
async function syncPrimaryAssignee(issueKey, multiAssignees) {
  try {
    const primaryUser =
      multiAssignees.find((user) => user.role === "Primary") ||
      multiAssignees[0];

    if (primaryUser) {
      await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            assignee: { accountId: primaryUser.accountId || primaryUser.id },
          },
        }),
      });

      console.log(
        "Synced primary assignee:",
        primaryUser.displayName,
        "for issue:",
        issueKey
      );
    } else {
      // Clear assignee if no primary
      await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            assignee: null,
          },
        }),
      });

      console.log("Cleared assignee for issue:", issueKey);
    }
  } catch (error) {
    console.error("Error syncing primary assignee:", error);
  }
}

// Send notifications to assignees
async function sendAssignmentNotifications(
  issue,
  multiAssignees,
  notificationType
) {
  try {
    const notifications = [];

    for (const assignee of multiAssignees) {
      const notificationLevel = getNotificationLevel(assignee.role);

      if (shouldSendNotification(notificationLevel, notificationType)) {
        notifications.push({
          accountId: assignee.accountId || assignee.id,
          role: assignee.role,
          issue: issue,
          type: notificationType,
        });
      }
    }

    // Send notifications in batch
    await Promise.all(
      notifications.map((notification) =>
        sendIndividualNotification(notification)
      )
    );

    console.log(
      `Sent ${notifications.length} assignment notifications for issue:`,
      issue.key
    );
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
  }
}

// Get notification level based on role
function getNotificationLevel(role) {
  const notificationLevels = {
    Primary: "all",
    Secondary: "relevant",
    Reviewer: "approval",
    Collaborator: "updates",
  };

  return notificationLevels[role] || "updates";
}

// Check if notification should be sent
function shouldSendNotification(level, type) {
  const notificationMatrix = {
    all: ["assigned", "updated", "commented", "transitioned"],
    relevant: ["assigned", "updated", "transitioned"],
    approval: ["assigned", "transitioned"],
    updates: ["assigned"],
  };

  return notificationMatrix[level]?.includes(type) || false;
}

// Send individual notification
async function sendIndividualNotification(notification) {
  try {
    // Create a comment mentioning the user (Jira will send notification)
    const message = generateNotificationMessage(notification);

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${notification.issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: message,
                  },
                  {
                    type: "mention",
                    attrs: {
                      id: notification.accountId,
                    },
                  },
                ],
              },
            ],
          },
          visibility: {
            type: "role",
            value: "Developers", // Adjust based on your needs
          },
        }),
      });
  } catch (error) {
    console.error("Error sending individual notification:", error);
  }
}

// Generate notification message
function generateNotificationMessage(notification) {
  const roleMessages = {
    Primary: `You've been assigned as the Primary owner of this issue. `,
    Secondary: `You've been assigned as a Secondary contributor to this issue. `,
    Reviewer: `You've been assigned as a Reviewer for this issue. `,
    Collaborator: `You've been added as a Collaborator on this issue. `,
  };

  return (
    roleMessages[notification.role] || `You've been assigned to this issue. `
  );
}

// Handle subtask assignments
async function handleSubtaskAssignments(issue, multiAssignees) {
  try {
    // Get subtasks for this issue
    const subtasksResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/search?jql=parent=${issue.key}&fields=key,summary,assignee`
      );
    const subtasks = await subtasksResponse.json();

    if (subtasks.issues && subtasks.issues.length > 0) {
      // Distribute subtasks among assignees based on workload
      await distributeSubtasks(subtasks.issues, multiAssignees);
    }
  } catch (error) {
    console.error("Error handling subtask assignments:", error);
  }
}

// Distribute subtasks among assignees
async function distributeSubtasks(subtasks, multiAssignees) {
  try {
    const assignableUsers = multiAssignees.filter((user) =>
      ["Primary", "Secondary"].includes(user.role)
    );

    if (assignableUsers.length === 0) return;

    // Simple round-robin distribution
    for (let i = 0; i < subtasks.length; i++) {
      const assignee = assignableUsers[i % assignableUsers.length];

      await api
        .asApp()
        .requestJira(route`/rest/api/3/issue/${subtasks[i].key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              assignee: { accountId: assignee.accountId || assignee.id },
            },
          }),
        });
    }

    console.log(
      `Distributed ${subtasks.length} subtasks among ${assignableUsers.length} assignees`
    );
  } catch (error) {
    console.error("Error distributing subtasks:", error);
  }
}

// Update capacity tracking
async function updateCapacityTracking(multiAssignees, operation, issue) {
  try {
    // This would integrate with your capacity tracking system
    const capacityUpdates = multiAssignees.map((assignee) => ({
      accountId: assignee.accountId || assignee.id,
      role: assignee.role,
      operation: operation, // 'add' or 'remove'
      issueKey: issue.key,
      storyPoints: issue.fields.customfield_10016 || 1, // Adjust field ID
      timestamp: new Date().toISOString(),
    }));

    // Store capacity updates (you'd implement this based on your storage strategy)
    console.log("Capacity updates:", capacityUpdates);
  } catch (error) {
    console.error("Error updating capacity tracking:", error);
  }
}

// Handle capacity changes between old and new assignees
async function updateCapacityChanges(
  previousAssignees,
  currentAssignees,
  issue
) {
  try {
    const prevIds = new Set(
      (previousAssignees || []).map((a) => a.accountId || a.id)
    );
    const currIds = new Set(currentAssignees.map((a) => a.accountId || a.id));

    // Remove capacity for users no longer assigned
    const removedUsers = (previousAssignees || []).filter(
      (a) => !currIds.has(a.accountId || a.id)
    );

    // Add capacity for newly assigned users
    const addedUsers = currentAssignees.filter(
      (a) => !prevIds.has(a.accountId || a.id)
    );

    if (removedUsers.length > 0) {
      await updateCapacityTracking(removedUsers, "remove", issue);
    }

    if (addedUsers.length > 0) {
      await updateCapacityTracking(addedUsers, "add", issue);
    }
  } catch (error) {
    console.error("Error updating capacity changes:", error);
  }
}

// Handle assignment changes and notifications
async function handleAssignmentChanges(
  issue,
  previousAssignees,
  currentAssignees
) {
  try {
    const prevIds = new Set(
      (previousAssignees || []).map((a) => a.accountId || a.id)
    );
    const currIds = new Set(currentAssignees.map((a) => a.accountId || a.id));

    // Notify newly assigned users
    const newAssignees = currentAssignees.filter(
      (a) => !prevIds.has(a.accountId || a.id)
    );

    if (newAssignees.length > 0) {
      await sendAssignmentNotifications(issue, newAssignees, "assigned");
    }

    // Notify removed users
    const removedAssignees = (previousAssignees || []).filter(
      (a) => !currIds.has(a.accountId || a.id)
    );

    if (removedAssignees.length > 0) {
      await sendAssignmentNotifications(issue, removedAssignees, "unassigned");
    }
  } catch (error) {
    console.error("Error handling assignment changes:", error);
  }
}

// Get previous assignees from issue history
async function getPreviousAssignees(issue, context) {
  try {
    // This would require accessing the issue's changelog
    // For now, return empty array - you'd implement based on your needs
    return [];
  } catch (error) {
    console.error("Error getting previous assignees:", error);
    return [];
  }
}

// Log assignment activity
async function logAssignmentActivity(
  issueKey,
  multiAssignees,
  action,
  actorId
) {
  try {
    const activity = {
      issueKey: issueKey,
      action: action,
      assignees: multiAssignees.map((a) => ({
        accountId: a.accountId || a.id,
        role: a.role,
        displayName: a.displayName,
      })),
      actor: actorId,
      timestamp: new Date().toISOString(),
    };

    console.log("Assignment activity logged:", activity);
    // You would store this in your preferred storage solution
  } catch (error) {
    console.error("Error logging assignment activity:", error);
  }
}

// Get multi-assignees field ID
async function getMultiAssigneesFieldId() {
  // You'll need to implement this to get the actual custom field ID
  // For now, return a placeholder
  return "customfield_10100"; // Replace with actual field ID
}
