import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Button,
  ButtonGroup,
  Select,
  Badge,
  Box,
  Stack,
  Inline,
  xcss,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import { useProductContext } from "@forge/react";

const containerStyles = xcss({
  padding: "space.200",
  border: "1px solid token(color.border)",
  borderRadius: "border.radius.200",
});

const assigneeItemStyles = xcss({
  padding: "space.150",
  backgroundColor: "color.background.neutral.subtle",
  borderRadius: "border.radius.100",
  marginBottom: "space.100",
});

const MultiAssigneesEdit = () => {
  const context = useProductContext();
  const [assignees, setAssignees] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issueContext, setIssueContext] = useState(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("secondary");

  const roleOptions = [
    { label: "Primary", value: "primary" },
    { label: "Secondary", value: "secondary" },
    { label: "Reviewer", value: "reviewer" },
    { label: "Collaborator", value: "collaborator" },
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!context?.extension?.issue?.key) return;

      setLoading(true);
      try {
        const [assigneesResult, issueResult, suggestionsResult] =
          await Promise.all([
            invoke("getMultiAssignees", {
              issueKey: context.extension.issue.key,
            }),
            invoke("getIssueContext", {
              issueKey: context.extension.issue.key,
            }),
            invoke("getAssigneeSuggestions", {
              issueKey: context.extension.issue.key,
              projectKey: context.extension.project?.key,
            }),
          ]);

        if (assigneesResult.success) {
          setAssignees(assigneesResult.assignees || []);
        }

        if (issueResult.success) {
          setIssueContext(issueResult.issue);
        }

        if (suggestionsResult.success) {
          setSuggestions(suggestionsResult.suggestions || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [context]);

  const handleAddAssignee = async () => {
    if (!selectedUser) return;

    const suggestion = suggestions.find((s) => s.accountId === selectedUser);
    if (!suggestion) return;

    const newAssignee = {
      accountId: suggestion.accountId,
      displayName: suggestion.displayName,
      emailAddress: suggestion.emailAddress,
      avatarUrls: suggestion.avatarUrls,
      role: selectedRole,
      assignedDate: new Date().toISOString(),
    };

    const updatedAssignees = [...assignees, newAssignee];
    setAssignees(updatedAssignees);

    // Save to backend
    try {
      await invoke("updateMultiAssignees", {
        issueKey: context.extension.issue.key,
        assignees: updatedAssignees,
      });
    } catch (error) {
      console.error("Error saving assignees:", error);
    }

    setSelectedUser("");
    setSelectedRole("secondary");
  };

  const handleRemoveAssignee = async (accountId) => {
    const updatedAssignees = assignees.filter((a) => a.accountId !== accountId);
    setAssignees(updatedAssignees);

    try {
      await invoke("updateMultiAssignees", {
        issueKey: context.extension.issue.key,
        assignees: updatedAssignees,
      });
    } catch (error) {
      console.error("Error saving assignees:", error);
    }
  };

  const handleRoleChange = async (accountId, newRole) => {
    const updatedAssignees = assignees.map((a) =>
      a.accountId === accountId ? { ...a, role: newRole } : a
    );
    setAssignees(updatedAssignees);

    try {
      await invoke("updateMultiAssignees", {
        issueKey: context.extension.issue.key,
        assignees: updatedAssignees,
      });
    } catch (error) {
      console.error("Error saving assignees:", error);
    }
  };

  const getRoleBadgeAppearance = (role) => {
    switch (role) {
      case "primary":
        return "primary";
      case "secondary":
        return "default";
      case "reviewer":
        return "important";
      case "collaborator":
        return "added";
      default:
        return "default";
    }
  };

  if (loading) {
    return <Text>Loading multi-assignees...</Text>;
  }

  const userOptions = suggestions.map((user) => ({
    label: `${user.displayName} (${user.emailAddress})`,
    value: user.accountId,
  }));

  return (
    <Box xcss={containerStyles}>
      <Stack space="space.200">
        <Text weight="medium">Multi Assignees</Text>

        {assignees.length > 0 && (
          <Stack space="space.100">
            {assignees.map((assignee) => (
              <Box key={assignee.accountId} xcss={assigneeItemStyles}>
                <Inline space="space.100" alignBlock="center">
                  <Text>{assignee.displayName}</Text>
                  <Badge appearance={getRoleBadgeAppearance(assignee.role)}>
                    {assignee.role}
                  </Badge>
                  <Select
                    value={assignee.role}
                    options={roleOptions}
                    onChange={(value) =>
                      handleRoleChange(assignee.accountId, value)
                    }
                  />
                  <Button
                    appearance="subtle"
                    onClick={() => handleRemoveAssignee(assignee.accountId)}
                  >
                    Remove
                  </Button>
                </Inline>
              </Box>
            ))}
          </Stack>
        )}

        <Stack space="space.100">
          <Text weight="medium">Add Assignee</Text>
          <Inline space="space.100" alignBlock="center">
            <Select
              placeholder="Select user..."
              value={selectedUser}
              options={userOptions}
              onChange={setSelectedUser}
            />
            <Select
              value={selectedRole}
              options={roleOptions}
              onChange={setSelectedRole}
            />
            <Button
              appearance="primary"
              onClick={handleAddAssignee}
              isDisabled={!selectedUser}
            >
              Add
            </Button>
          </Inline>
        </Stack>

        <Text color="color.text.subtle">
          {assignees.length} assignee{assignees.length !== 1 ? "s" : ""} • Total
          capacity: {assignees.length * 8}h
        </Text>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <MultiAssigneesEdit />
  </React.StrictMode>
);
