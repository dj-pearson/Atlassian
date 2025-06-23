import api, { route } from "@forge/api";

// Notifications handler for multi-assignee enhanced notifications
export default async function notificationsHandler(event, context) {
  try {
    // This handler can be extended for external notification integrations
    // like Slack, Teams, email systems, etc.

    switch (event.type) {
      case "assignment_changed":
        await handleAssignmentNotification(event.data, context);
        break;
      case "workflow_transition":
        await handleWorkflowNotification(event.data, context);
        break;
      case "approval_required":
        await handleApprovalNotification(event.data, context);
        break;
      default:
        }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Notifications handler error:", error);
  }
}

// Handle assignment change notifications
async function handleAssignmentNotification(data, context) {
  try {
    const { issue, assignees, action } = data;

    // Send notifications based on integration preferences
    await Promise.all([
      sendJiraNotifications(issue, assignees, action),
      sendSlackNotifications(issue, assignees, action),
      sendEmailNotifications(issue, assignees, action),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error handling assignment notification:", error);
  }
}

// Handle workflow transition notifications
async function handleWorkflowNotification(data, context) {
  try {
    const { issue, statusChange, assignees } = data;

    // Send workflow-specific notifications
    await sendWorkflowNotifications(issue, statusChange, assignees);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error handling workflow notification:", error);
  }
}

// Handle approval requirement notifications
async function handleApprovalNotification(data, context) {
  try {
    const { issue, reviewers, rule } = data;

    // Send approval notifications
    await sendApprovalNotifications(issue, reviewers, rule);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error handling approval notification:", error);
  }
}

// Send Jira notifications (comments with mentions)
async function sendJiraNotifications(issue, assignees, action) {
  try {
    const actionMessages = {
      assigned: "You have been assigned to this issue",
      unassigned: "You have been removed from this issue",
      role_changed: "Your role on this issue has been updated",
    };

    const message =
      actionMessages[action] || "Your assignment status has changed";

    for (const assignee of assignees) {
      const notification = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `📋 ${message} as ${assignee.role}. `,
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
    if (process.env.NODE_ENV === 'development') console.error("Error sending Jira notifications:", error);
  }
}

// Send Slack notifications (if configured)
async function sendSlackNotifications(issue, assignees, action) {
  try {
    // This would require Slack integration configuration
    // Example implementation:
    // const slackWebhook = await getSlackWebhookUrl();
    // if (slackWebhook) {
    //   const slackMessage = formatSlackMessage(issue, assignees, action);
    //   await sendSlackMessage(slackWebhook, slackMessage);
    // }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error sending Slack notifications:", error);
  }
}

// Send email notifications (if configured)
async function sendEmailNotifications(issue, assignees, action) {
  try {
    // This would require email service integration
    // Example implementation:
    // for (const assignee of assignees) {
    //   const emailContent = formatEmailContent(issue, assignee, action);
    //   await sendEmail(assignee.emailAddress, emailContent);
    // }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error sending email notifications:", error);
  }
}

// Send workflow-specific notifications
async function sendWorkflowNotifications(issue, statusChange, assignees) {
  try {
    // Create workflow transition summary
    const workflowSummary = {
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
                  text: `🔄 Workflow Transition: ${statusChange.from} → ${statusChange.to}\n\nAffected team members:`,
                },
              ],
            },
            {
              type: "bulletList",
              content: assignees.map((assignee) => ({
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
                        text: ` (${assignee.role}) - ${getWorkflowMessage(
                          assignee.role,
                          statusChange.to
                        )}`,
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
          body: workflowSummary,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error sending workflow notifications:", error);
  }
}

// Get role-specific workflow messages
function getWorkflowMessage(role, status) {
  const messages = {
    Primary: {
      "In Progress": "Drive this issue forward",
      "Code Review": "Ensure code is ready for review",
      Testing: "Support testing efforts",
      Done: "Great work completing this!",
    },
    Secondary: {
      "In Progress": "Ready to contribute",
      "Code Review": "Available for review support",
      Testing: "Assist with testing",
      Done: "Well done on the contribution!",
    },
    Reviewer: {
      "In Progress": "Monitor progress for review",
      "Code Review": "Please review the code",
      Testing: "Conduct thorough testing",
      Done: "Review completed successfully",
    },
    Collaborator: {
      "In Progress": "Stay informed of progress",
      "Code Review": "Code is being reviewed",
      Testing: "Testing in progress",
      Done: "Issue completed",
    },
  };

  return messages[role]?.[status] || "Status updated";
}

// Send approval notifications
async function sendApprovalNotifications(issue, reviewers, rule) {
  try {
    const approvalNotification = {
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
                  text: `⚠️ Approval Required: ${rule.description}\n\nReviewers, please provide your approval:`,
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
                        text: ` (${reviewer.role}) - Please review and approve`,
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
                  text: '\n💡 Reply with "✅ Approved" or "❌ Rejected" to provide your decision.',
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
          body: approvalNotification,
          visibility: {
            type: "role",
            value: "Developers",
          },
        }),
      });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error sending approval notifications:", error);
  }
}

// Format Slack message (example implementation)
function formatSlackMessage(issue, assignees, action) {
  const actionEmojis = {
    assigned: "✅",
    unassigned: "❌",
    role_changed: "🔄",
  };

  const emoji = actionEmojis[action] || "📋";

  return {
    text: `${emoji} Multi-Assignee Update`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${issue.key}*: ${
            issue.fields.summary
          }\n\n*Action*: ${action}\n*Assignees*: ${assignees
            .map((a) => `${a.displayName} (${a.role})`)
            .join(", ")}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Issue",
            },
            url: `https://your-domain.atlassian.net/browse/${issue.key}`,
          },
        ],
      },
    ],
  };
}

// Format email content (example implementation)
function formatEmailContent(issue, assignee, action) {
  const subject = `[${issue.key}] Assignment ${action}: ${issue.fields.summary}`;

  const body = `
    Hi ${assignee.displayName},
    
    You have been ${action} ${action === "assigned" ? "to" : "from"} issue ${
    issue.key
  } as a ${assignee.role}.
    
    Issue: ${issue.fields.summary}
    Status: ${issue.fields.status.name}
    Priority: ${issue.fields.priority.name}
    
    View the issue: https://your-domain.atlassian.net/browse/${issue.key}
    
    Best regards,
    Multi-Assignee Manager
  `;

  return { subject, body };
}
