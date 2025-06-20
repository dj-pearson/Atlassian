import api, { route } from "@forge/api";

// Workflow handler for multi-assignee workflow integration
export default async function workflowHandler(event, context) {
  console.log(
    "Workflow Handler - Event:",
    event.eventType,
    "Issue:",
    event.issue?.key
  );

  try {
    const issue = event.issue;
    const changelog = event.changelog;

    if (!issue || !changelog) {
      console.log("Missing issue or changelog data");
      return;
    }

    // Check if status changed
    const statusChange = changelog.items?.find(
      (item) => item.field === "status"
    );
    if (!statusChange) {
      console.log("No status change detected");
      return;
    }

    console.log(
      `Status changed from ${statusChange.fromString} to ${statusChange.toString}`
    );

    // Get multi-assignees
    const multiAssigneesFieldId = await getMultiAssigneesFieldId();
    const multiAssignees = issue.fields[multiAssigneesFieldId];

    if (!multiAssignees || multiAssignees.length === 0) {
      console.log("No multi-assignees found, using standard workflow");
      return;
    }

    // Handle workflow transitions based on roles
    await handleWorkflowTransition(
      issue,
      statusChange,
      multiAssignees,
      context
    );
  } catch (error) {
    console.error("Workflow handler error:", error);
  }
}

// Handle workflow transitions with role-based logic
async function handleWorkflowTransition(
  issue,
  statusChange,
  multiAssignees,
  context
) {
  try {
    const fromStatus = statusChange.fromString;
    const toStatus = statusChange.toString;

    console.log(`Processing workflow transition: ${fromStatus} → ${toStatus}`);

    // Define role-based workflow rules
    const workflowRules = getWorkflowRules();
    const applicableRules = workflowRules.filter(
      (rule) => rule.fromStatus === fromStatus && rule.toStatus === toStatus
    );

    if (applicableRules.length === 0) {
      console.log("No specific multi-assignee rules for this transition");
      await handleStandardTransition(issue, statusChange, multiAssignees);
      return;
    }

    // Process each applicable rule
    for (const rule of applicableRules) {
      await processWorkflowRule(issue, rule, multiAssignees, context);
    }

    // Send role-based notifications
    await sendTransitionNotifications(issue, statusChange, multiAssignees);
  } catch (error) {
    console.error("Error handling workflow transition:", error);
  }
}

// Get workflow rules configuration
function getWorkflowRules() {
  return [
    {
      name: "Require Review Approval",
      fromStatus: "In Progress",
      toStatus: "Done",
      requiredRoles: ["Reviewer"],
      action: "require_approval",
      description: "All reviewers must approve before completion",
    },
    {
      name: "Primary Assignee Notification",
      fromStatus: "To Do",
      toStatus: "In Progress",
      requiredRoles: ["Primary"],
      action: "notify_primary",
      description: "Notify primary assignee when work begins",
    },
    {
      name: "Code Review Required",
      fromStatus: "In Progress",
      toStatus: "Code Review",
      requiredRoles: ["Primary", "Secondary"],
      action: "assign_reviewers",
      description: "Assign reviewers for code review",
    },
    {
      name: "QA Testing Assignment",
      fromStatus: "Code Review",
      toStatus: "Testing",
      requiredRoles: ["Reviewer"],
      action: "assign_qa",
      description: "Assign QA testers from reviewer role",
    },
  ];
}

// Process individual workflow rule
async function processWorkflowRule(issue, rule, multiAssignees, context) {
  try {
    console.log(`Processing rule: ${rule.name}`);

    const relevantAssignees = multiAssignees.filter((assignee) =>
      rule.requiredRoles.includes(assignee.role)
    );

    if (relevantAssignees.length === 0) {
      console.log(
        `No assignees found for required roles: ${rule.requiredRoles.join(
          ", "
        )}`
      );
      return;
    }

    switch (rule.action) {
      case "require_approval":
        await handleApprovalRequirement(issue, relevantAssignees, rule);
        break;
      case "notify_primary":
        await notifyPrimaryAssignee(issue, relevantAssignees, rule);
        break;
      case "assign_reviewers":
        await assignCodeReviewers(issue, relevantAssignees, rule);
        break;
      case "assign_qa":
        await assignQATesters(issue, relevantAssignees, rule);
        break;
      default:
        console.log(`Unknown workflow action: ${rule.action}`);
    }
  } catch (error) {
    console.error(`Error processing workflow rule ${rule.name}:`, error);
  }
}

// Handle approval requirements
async function handleApprovalRequirement(issue, reviewers, rule) {
  try {
    console.log(`Requiring approval from ${reviewers.length} reviewers`);

    // Create approval tracking comment
    const approvalComment = {
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
                  text: `🔍 ${rule.description}\n\nReviewers required:`,
                },
              ],
            },
            {
              type: "bulletList",
              content: reviewers.map((reviewer) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "mention",
                        attrs: { id: reviewer.accountId || reviewer.id },
                      },
                      {
                        type: "text",
                        text: ` (${reviewer.role}) - ⏳ Pending`,
                      },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    };

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: approvalComment,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });

    // Set up approval tracking (you'd implement based on your storage needs)
    await trackApprovalRequirement(issue.key, reviewers, rule);
  } catch (error) {
    console.error("Error handling approval requirement:", error);
  }
}

// Notify primary assignee
async function notifyPrimaryAssignee(issue, primaryAssignees, rule) {
  try {
    console.log("Notifying primary assignees of status change");

    for (const assignee of primaryAssignees) {
      const notification = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `🚀 Work has started on this issue. As the ${assignee.role} assignee, you're responsible for driving this to completion. `,
              },
              {
                type: "mention",
                attrs: { id: assignee.accountId || assignee.id },
              },
            ],
          },
        ],
      };

      await api
        .asApp()
        .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: notification,
            visibility: {
              type: "role",
              value: "Developers",
            },
          }),
        });
    }
  } catch (error) {
    console.error("Error notifying primary assignee:", error);
  }
}

// Assign code reviewers
async function assignCodeReviewers(issue, developers, rule) {
  try {
    console.log("Assigning code reviewers");

    // Create a code review checklist comment
    const reviewComment = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "panel",
          attrs: { panelType: "warning" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "📋 Code Review Required\n\nDevelopers assigned for review:",
                },
              ],
            },
            {
              type: "bulletList",
              content: developers.map((dev) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "mention",
                        attrs: { id: dev.accountId || dev.id },
                      },
                      {
                        type: "text",
                        text: ` (${dev.role}) - Please review the code changes`,
                      },
                    ],
                  },
                ],
              })),
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "\n✅ Code quality\n✅ Test coverage\n✅ Documentation\n✅ Performance considerations",
                },
              ],
            },
          ],
        },
      ],
    };

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: reviewComment,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    console.error("Error assigning code reviewers:", error);
  }
}

// Assign QA testers
async function assignQATesters(issue, reviewers, rule) {
  try {
    console.log("Assigning QA testers from reviewer role");

    const qaComment = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "panel",
          attrs: { panelType: "success" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "🧪 QA Testing Phase\n\nAssigned testers:",
                },
              ],
            },
            {
              type: "bulletList",
              content: reviewers.map((reviewer) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "mention",
                        attrs: { id: reviewer.accountId || reviewer.id },
                      },
                      {
                        type: "text",
                        text: ` - Please test according to acceptance criteria`,
                      },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
    };

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: qaComment,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    console.error("Error assigning QA testers:", error);
  }
}

// Handle standard transitions without special rules
async function handleStandardTransition(issue, statusChange, multiAssignees) {
  try {
    console.log("Handling standard transition with multi-assignee awareness");

    // Create a general notification for all assignees
    const transitionComment = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `📝 Status updated: ${statusChange.fromString} → ${statusChange.toString}\n\nAll assignees notified:`,
            },
          ],
        },
        {
          type: "bulletList",
          content: multiAssignees.map((assignee) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "mention",
                    attrs: { id: assignee.accountId || assignee.id },
                  },
                  {
                    type: "text",
                    text: ` (${assignee.role})`,
                  },
                ],
              },
            ],
          })),
        },
      ],
    };

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: transitionComment,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    console.error("Error handling standard transition:", error);
  }
}

// Send transition notifications based on roles
async function sendTransitionNotifications(
  issue,
  statusChange,
  multiAssignees
) {
  try {
    console.log("Sending role-based transition notifications");

    // Define notification rules based on status and role
    const notificationRules = {
      "In Progress": {
        Primary: "You are now responsible for driving this issue forward.",
        Secondary: "This issue is now in progress. Be ready to contribute.",
        Reviewer: "This issue is in progress. Review may be required soon.",
        Collaborator: "FYI: This issue has started development.",
      },
      "Code Review": {
        Primary: "Your code is ready for review.",
        Secondary: "Code review phase has started.",
        Reviewer: "Please review the code for this issue.",
        Collaborator: "Code is being reviewed for this issue.",
      },
      Testing: {
        Primary: "Your code is being tested.",
        Secondary: "Testing phase has started.",
        Reviewer: "Please test this issue according to acceptance criteria.",
        Collaborator: "This issue is now in testing.",
      },
      Done: {
        Primary: "Great work! This issue is complete.",
        Secondary: "This issue has been completed.",
        Reviewer: "This issue has been completed and approved.",
        Collaborator: "This issue is now complete.",
      },
    };

    const statusNotifications = notificationRules[statusChange.toString];
    if (!statusNotifications) {
      console.log(
        "No specific notifications defined for status:",
        statusChange.toString
      );
      return;
    }

    // Send personalized notifications
    for (const assignee of multiAssignees) {
      const message = statusNotifications[assignee.role];
      if (message) {
        await sendPersonalizedNotification(
          issue,
          assignee,
          message,
          statusChange
        );
      }
    }
  } catch (error) {
    console.error("Error sending transition notifications:", error);
  }
}

// Send personalized notification to individual assignee
async function sendPersonalizedNotification(
  issue,
  assignee,
  message,
  statusChange
) {
  try {
    const notification = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `🔄 Status: ${statusChange.toString}\n\n${message} `,
            },
            {
              type: "mention",
              attrs: { id: assignee.accountId || assignee.id },
            },
          ],
        },
      ],
    };

    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issue.key}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: notification,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });

    console.log(
      `Sent personalized notification to ${assignee.displayName} (${assignee.role})`
    );
  } catch (error) {
    console.error("Error sending personalized notification:", error);
  }
}

// Track approval requirements (implement based on your storage needs)
async function trackApprovalRequirement(issueKey, reviewers, rule) {
  try {
    const approvalTracking = {
      issueKey: issueKey,
      rule: rule.name,
      reviewers: reviewers.map((r) => ({
        accountId: r.accountId || r.id,
        role: r.role,
        approved: false,
        timestamp: null,
      })),
      created: new Date().toISOString(),
      completed: false,
    };

    console.log("Tracking approval requirement:", approvalTracking);
    // You would store this in your preferred storage solution
  } catch (error) {
    console.error("Error tracking approval requirement:", error);
  }
}

// Get multi-assignees field ID
async function getMultiAssigneesFieldId() {
  // You'll need to implement this to get the actual custom field ID
  return "customfield_10100"; // Replace with actual field ID
}
