import { uiModificationsApi } from "@forge/jira-bridge";
import api, { route } from "@forge/api";

// UI Modifications handler for assignee synchronization
export default async function uiModificationsHandler(event, context) {
  console.log("UI Modifications Handler - Event:", event.type);

  uiModificationsApi.onInit(async ({ api: uiApi }) => {
    try {
      console.log("UI Modifications - Initializing assignee sync");

      // Get the multi-assignees custom field
      const multiAssigneesField = uiApi.getFieldById(
        "customfield_multi-assignees"
      );
      const assigneeField = uiApi.getFieldById("assignee");

      if (multiAssigneesField && assigneeField) {
        // Listen for changes to multi-assignees field
        multiAssigneesField.onChange(async (value) => {
          console.log("Multi-assignees field changed:", value);

          if (value && value.length > 0) {
            // Find primary assignee or use first user
            const primaryUser =
              value.find((user) => user.role === "Primary") || value[0];

            if (primaryUser) {
              // Sync to native assignee field
              await assigneeField.setValue(
                primaryUser.accountId || primaryUser.id
              );
              console.log("Synced primary assignee:", primaryUser.displayName);

              // Show success message
              uiApi.showFlag({
                id: "assignee-synced",
                title: "Primary Assignee Updated",
                description: `${primaryUser.displayName} set as primary assignee`,
                type: "success",
                isAutoDismiss: true,
              });
            }
          } else {
            // Clear assignee if no multi-assignees
            await assigneeField.setValue(null);
            console.log("Cleared assignee - no multi-assignees selected");
          }
        });

        // Initialize with current values
        const currentMultiAssignees = await multiAssigneesField.getValue();
        if (currentMultiAssignees && currentMultiAssignees.length > 0) {
          const primaryUser =
            currentMultiAssignees.find((user) => user.role === "Primary") ||
            currentMultiAssignees[0];
          if (primaryUser) {
            await assigneeField.setValue(
              primaryUser.accountId || primaryUser.id
            );
          }
        }
      }

      // Add visual indicators for multi-assignee context
      const issuePanel = uiApi.getPanel("issue-panel");
      if (issuePanel) {
        issuePanel.addBanner({
          id: "multi-assignee-banner",
          appearance: "info",
          title: "Multi-Assignee Mode Active",
          description:
            "This issue uses enhanced multi-assignee management with role-based responsibilities.",
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("UI Modifications error:", error);

      // Show error flag
      uiApi.showFlag({
        id: "ui-mod-error",
        title: "Multi-Assignee Integration Error",
        description: "There was an issue with assignee synchronization",
        type: "error",
        isAutoDismiss: true,
      });
    }
  });

  // Handle form submission events
  uiModificationsApi.onSubmit(async ({ api: uiApi, payload }) => {
    try {
      console.log("Form submission - validating multi-assignees");

      const multiAssigneesField = uiApi.getFieldById(
        "customfield_multi-assignees"
      );
      const multiAssignees = await multiAssigneesField.getValue();

      // Validation: Ensure at least one primary assignee
      if (multiAssignees && multiAssignees.length > 0) {
        const primaryCount = multiAssignees.filter(
          (user) => user.role === "Primary"
        ).length;

        if (primaryCount === 0) {
          // Auto-assign first user as primary
          multiAssignees[0].role = "Primary";
          await multiAssigneesField.setValue(multiAssignees);

          uiApi.showFlag({
            id: "auto-primary-assigned",
            title: "Primary Assignee Auto-Assigned",
            description: `${multiAssignees[0].displayName} automatically set as Primary`,
            type: "warning",
            isAutoDismiss: true,
          });
        } else if (primaryCount > 1) {
          // Warning for multiple primary assignees
          uiApi.showFlag({
            id: "multiple-primary-warning",
            title: "Multiple Primary Assignees",
            description:
              "Consider having only one Primary assignee for clarity",
            type: "warning",
            isAutoDismiss: true,
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Form submission validation error:", error);
      return {
        success: false,
        error: "Multi-assignee validation failed",
      };
    }
  });
}
