import api, { route } from "@forge/api";

// Issue events handler for multi-assignee integration with bidirectional sync
export default async function issueEventsHandler(event, context) {
  try {
    console.log("🔔 Issue event triggered:", {
      eventType: event.eventType,
      issueKey: event.issue?.key,
      timestamp: new Date().toISOString(),
    });

    const issue = event.issue;
    if (!issue) {
      console.log("❌ No issue data in event");
      return;
    }

    // Handle different event types with enhanced bidirectional sync
    switch (event.eventType) {
      case "avi:jira:created:issue":
      case "jira:issue_created":
        console.log("📝 Handling issue created:", issue.key);
        await handleIssueCreated(issue, context);
        break;
      case "avi:jira:updated:issue":
      case "jira:issue_updated":
        console.log("📝 Handling issue updated:", issue.key);
        await handleIssueUpdated(issue, context, event);
        break;
      default:
        console.log("❓ Unknown event type:", event.eventType);
    }
  } catch (error) {
    console.error("❌ Issue events handler error:", error);
  }
}

// Handle issue creation with bidirectional sync
async function handleIssueCreated(issue, context) {
  try {
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    const multiAssignees = issue.fields[multiAssigneesFieldId];
    const currentAssignee = issue.fields.assignee;

    // 1. Bidirectional sync between assignee and multi-assignees
    await syncAssigneeFields(
      issue.key,
      multiAssignees,
      currentAssignee,
      "created"
    );

    // 2. Send welcome notifications to all assignees
    if (multiAssignees && multiAssignees.length > 0) {
      await sendAssignmentNotifications(issue, multiAssignees, "assigned");
    }

    // 3. Create subtask assignments if configured
    if (multiAssignees && multiAssignees.length > 0) {
      await handleSubtaskAssignments(issue, multiAssignees);
    }

    // 4. Update team capacity tracking
    if (multiAssignees && multiAssignees.length > 0) {
      await updateCapacityTracking(multiAssignees, "add", issue);
    }

    // 5. Log assignment activity
    await logAssignmentActivity(
      issue.key,
      multiAssignees || [],
      "created",
      context.accountId
    );
  } catch (error) {
    // Silently handle errors in production
    if (process.env.NODE_ENV === "development") {
      if (process.env.NODE_ENV === "development")
        console.error("Error handling issue created:", error);
    }
  }
}

// Handle issue updates with enhanced bidirectional sync
async function handleIssueUpdated(issue, context, event) {
  try {
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    console.log("🔍 Multi-assignee field ID:", multiAssigneesFieldId);

    // Fetch fresh issue data to ensure we have the latest state
    const freshIssueResponse = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}`);
    const freshIssue = await freshIssueResponse.json();

    const multiAssignees = freshIssue.fields[multiAssigneesFieldId];
    const currentAssignee = freshIssue.fields.assignee;

    console.log("📋 Current issue state:", {
      issueKey: issue.key,
      multiAssignees: multiAssignees?.map((u) => u.displayName) || "none",
      currentAssignee: currentAssignee?.displayName || "none",
    });

    // Get previous state from changelog
    const changelogItem =
      event.changelog?.items?.find(
        (item) =>
          item.field === "assignee" || item.fieldId === multiAssigneesFieldId
      ) ||
      context.changelog?.items?.find(
        (item) =>
          item.field === "assignee" || item.fieldId === multiAssigneesFieldId
      );

    console.log(
      "📜 Changelog item found:",
      changelogItem
        ? {
            field: changelogItem.field,
            fieldId: changelogItem.fieldId,
            from: changelogItem.from,
            to: changelogItem.to,
          }
        : "none"
    );

    // 1. Enhanced bidirectional sync with fresh data
    await syncAssigneeFields(
      freshIssue.key,
      multiAssignees,
      currentAssignee,
      "updated",
      changelogItem
    );

    // 2. Handle assignment change notifications
    if (changelogItem) {
      await handleAssignmentChangeNotifications(
        issue,
        changelogItem,
        multiAssignees
      );
    }

    // 3. Update capacity tracking
    await updateCapacityChanges([], multiAssignees || [], issue);

    // 4. Log assignment activity
    await logAssignmentActivity(
      issue.key,
      multiAssignees || [],
      "updated",
      context.accountId
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      if (process.env.NODE_ENV === "development")
        console.error("Error handling issue updated:", error);
    }
  }
}

// Enhanced bidirectional sync between assignee and multi-assignee fields
async function syncAssigneeFields(
  issueKey,
  multiAssignees,
  currentAssignee,
  action,
  changelogItem = null
) {
  try {
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    let needsUpdate = false;
    let updateFields = {};

    // Case 1: Default assignee changed/added - ensure it's also in multi-assignees
    if (changelogItem && changelogItem.field === "assignee") {
      const oldAssigneeId = changelogItem.from;
      const newAssigneeId = changelogItem.to;

      let updatedMultiAssignees = [...(multiAssignees || [])];

      // If new assignee is set, ensure they're in multi-assignees
      if (newAssigneeId && currentAssignee) {
        const isAlreadyInMulti = updatedMultiAssignees.some(
          (user) => (user.accountId || user.id) === newAssigneeId
        );

        if (!isAlreadyInMulti) {
          // Add as first user (primary position)
          updatedMultiAssignees.unshift({
            accountId: currentAssignee.accountId,
            displayName: currentAssignee.displayName,
            emailAddress: currentAssignee.emailAddress,
            role: "Primary",
          });
          needsUpdate = true;
        }
      }

      // If assignee was cleared, don't automatically clear multi-assignees
      // Let user manage multi-assignees independently
      if (!newAssigneeId && oldAssigneeId) {
      }

      if (needsUpdate) {
        updateFields[multiAssigneesFieldId] = updatedMultiAssignees;
      }
    }

    // Case 2: Multi-assignees changed - handle default assignee sync intelligently
    else if (changelogItem && changelogItem.fieldId === multiAssigneesFieldId) {
      console.log("🔄 Multi-assignee field changed detected");
      const firstUser =
        multiAssignees && multiAssignees.length > 0 ? multiAssignees[0] : null;
      const currentAssigneeId = currentAssignee?.accountId;
      const firstUserId = firstUser?.accountId || firstUser?.id;

      console.log("📊 Sync context:", {
        firstUser: firstUser?.displayName,
        currentAssignee: currentAssignee?.displayName,
        firstUserId,
        currentAssigneeId,
      });

      // Only sync to default assignee if needed
      if (
        firstUser &&
        (!currentAssignee || currentAssigneeId !== firstUserId)
      ) {
        // Don't update if the current assignee is already the first multi-assignee
        if (currentAssigneeId === firstUserId) {
          console.log(
            "⏭️ Skipping assignee update - already set to first multi-assignee:",
            firstUser.displayName
          );
        } else {
          console.log(
            "✅ Setting default assignee to first multi-assignee:",
            firstUser.displayName
          );
          updateFields.assignee = { accountId: firstUserId };
          needsUpdate = true;
        }
      }
      // Clear default assignee if no multi-assignees AND current assignee is not in remaining multi-assignees
      else if (!firstUser && currentAssignee) {
        // Check if current assignee is still in the multi-assignees list
        const currentAssigneeStillInMulti = multiAssignees?.some(
          (user) => (user.accountId || user.id) === currentAssigneeId
        );

        if (!currentAssigneeStillInMulti) {
          updateFields.assignee = null;
          needsUpdate = true;
        }
      }
      // If current assignee was removed from multi-assignees, replace with first remaining user
      else if (
        firstUser &&
        currentAssignee &&
        firstUserId !== currentAssigneeId
      ) {
        const currentAssigneeStillInMulti = multiAssignees?.some(
          (user) => (user.accountId || user.id) === currentAssigneeId
        );

        if (!currentAssigneeStillInMulti) {
          updateFields.assignee = { accountId: firstUserId };
          needsUpdate = true;
        }
      }
    }

    // Case 3: Initial sync on creation - multi-assignees to default assignee
    else if (action === "created") {
      const firstUser =
        multiAssignees && multiAssignees.length > 0 ? multiAssignees[0] : null;

      if (firstUser && !currentAssignee) {
        updateFields.assignee = {
          accountId: firstUser.accountId || firstUser.id,
        };
        needsUpdate = true;
      }
    }

    // Case 4: Fallback sync - only handle clear mismatches, don't force sync
    if (action === "updated" && !changelogItem) {
      const firstUser =
        multiAssignees && multiAssignees.length > 0 ? multiAssignees[0] : null;
      const currentAssigneeId = currentAssignee?.accountId;
      const firstUserId = firstUser?.accountId || firstUser?.id;

      // Only sync if there's a clear mismatch that needs fixing
      // Case: Multi-assignees exist but no default assignee
      if (firstUser && !currentAssignee) {
        updateFields.assignee = { accountId: firstUserId };
        needsUpdate = true;
      }
      // Case: Default assignee exists but not in multi-assignees list
      else if (currentAssignee && multiAssignees && multiAssignees.length > 0) {
        const currentAssigneeInMulti = multiAssignees.some(
          (user) => (user.accountId || user.id) === currentAssigneeId
        );

        if (!currentAssigneeInMulti) {
          // Add current assignee to multi-assignees instead of changing default assignee
          const updatedMultiAssignees = [
            {
              accountId: currentAssignee.accountId,
              displayName: currentAssignee.displayName,
              emailAddress: currentAssignee.emailAddress,
              role: "Primary",
            },
            ...(multiAssignees || []),
          ];

          updateFields[multiAssigneesFieldId] = updatedMultiAssignees;
          needsUpdate = true;
        }
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      console.log("🔧 Applying field updates:", updateFields);
      try {
        const response = await api
          .asApp()
          .requestJira(route`/rest/api/3/issue/${issueKey}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: updateFields }),
          });
        console.log("✅ Field update successful:", response.status);

        // Add a user-friendly notification about the update
        await sendFieldUpdateNotification(issueKey, updateFields);
      } catch (updateError) {
        console.error("❌ Field update failed:", updateError);
        throw updateError;
      }
    }
  } catch (error) {
    console.error("❌ Error in bidirectional sync:", error);
  }
}

// Handle assignment change notifications
async function handleAssignmentChangeNotifications(
  issue,
  changelogItem,
  multiAssignees
) {
  try {
    if (changelogItem.field === "assignee") {
      const oldAssigneeId = changelogItem.from;
      const newAssigneeId = changelogItem.to;

      // Notify old assignee of removal
      if (oldAssigneeId) {
        await sendAssigneeChangeNotification(
          issue,
          oldAssigneeId,
          "unassigned"
        );
      }

      // Notify new assignee of assignment
      if (newAssigneeId) {
        await sendAssigneeChangeNotification(issue, newAssigneeId, "assigned");
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Error handling assignment change notifications:", error);
  }
}

// Send notification for assignee changes
async function sendAssigneeChangeNotification(issue, accountId, type) {
  try {
    const message =
      type === "assigned"
        ? `You have been assigned to this issue.`
        : `You have been unassigned from this issue.`;

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
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
                    text: message + " ",
                  },
                  {
                    type: "mention",
                    attrs: { id: accountId },
                  },
                ],
              },
            ],
          },
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Error sending assignee change notification:", error);
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
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    roleMessages[notification.role] || "You've been assigned to this issue."
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
    if (process.env.NODE_ENV === "development")
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
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
      console.error("Error updating capacity changes:", error);
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

    // You would store this in your preferred storage solution
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Error logging assignment activity:", error);
  }
}

// Get multi-assignees field ID dynamically
async function getMultiAssigneesFieldId() {
  try {
    // Get all custom fields
    const response = await api.asApp().requestJira(route`/rest/api/3/field`);
    const fields = await response.json();

    // Find the multi-assignees field by name or description
    const multiAssigneesField = fields.find(
      (field) =>
        field.name?.toLowerCase().includes("multi") &&
        field.name?.toLowerCase().includes("assignee")
    );

    if (multiAssigneesField) {
      return multiAssigneesField.id;
    }

    // Fallback to common field ID patterns
    return "customfield_10037"; // Based on your console logs
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Error getting multi-assignees field ID:", error);
    return "customfield_10037"; // Fallback
  }
}

// Send a notification about field updates to help users see changes
async function sendFieldUpdateNotification(issueKey, updateFields) {
  try {
    if (updateFields.assignee) {
      // Create a comment to notify that the assignee was automatically updated
      const assigneeAccountId = updateFields.assignee.accountId;

      await api
        .asApp()
        .requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
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
                      text: "🤖 The default assignee has been automatically updated to match the first multi-assignee: ",
                    },
                    {
                      type: "mention",
                      attrs: { id: assigneeAccountId },
                    },
                    {
                      type: "text",
                      text: ". Please refresh the page to see the updated assignment.",
                    },
                  ],
                },
              ],
            },
            visibility: {
              type: "role",
              value: "Developers",
            },
          }),
        });

      console.log(`📨 Sent field update notification for ${issueKey}`);
    }
  } catch (error) {
    console.error("❌ Error sending field update notification:", error);
  }
}
