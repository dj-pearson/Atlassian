import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Heading,
  Badge,
  Button,
  SectionMessage,
  Avatar,
  UserPicker,
  Select,
  Modal,
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@forge/react";
import { view } from "@forge/bridge";
import ErrorBoundary from "./error-boundary";

const MultiAssigneePanel = () => {
  const [loading, setLoading] = useState(true);
  const [issueKey, setIssueKey] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLicensed, setIsLicensed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadIssueContext = async () => {
      try {
        const context = await view.getContext();
        const currentIssueKey = context?.extension?.issue?.key;
        const license = context?.license;

        setIsLicensed(license?.active === true);

        if (currentIssueKey) {
          setIssueKey(currentIssueKey);
          await loadMultiAssignees(currentIssueKey);
        } else {
          setError("Unable to determine issue context");
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("Error loading issue context:", err);
        setError("Failed to load issue context");
      } finally {
        setLoading(false);
      }
    };

    loadIssueContext();
  }, []);

  const loadMultiAssignees = async (key) => {
    try {
      // For demo purposes, show sample assignees
      // In real implementation, this would fetch from storage
      setAssignees([
        {
          accountId: "user-1",
          displayName: "John Smith",
          role: "Primary",
          avatarUrl: null,
          assignedDate: new Date().toISOString(),
        },
        {
          accountId: "user-2",
          displayName: "Jane Doe",
          role: "Secondary",
          avatarUrl: null,
          assignedDate: new Date().toISOString(),
        },
        {
          accountId: "user-3",
          displayName: "Bob Johnson",
          role: "Reviewer",
          avatarUrl: null,
          assignedDate: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error("Error loading multi-assignees:", err);
      setError("Failed to load assignees");
    }
  };

  const getRoleBadgeAppearance = (role) => {
    switch (role) {
      case "Primary":
        return "primary";
      case "Secondary":
        return "default";
      case "Reviewer":
        return "important";
      case "Collaborator":
        return "added";
      default:
        return "default";
    }
  };

  const handleRemoveAssignee = (accountId) => {
    if (!isLicensed) {
      alert(
        "Removing assignees is a Premium feature. Upgrade to unlock full functionality!"
      );
      return;
    }

    setAssignees((prev) => prev.filter((a) => a.accountId !== accountId));
  };

  const handleAddAssignee = () => {
    if (!isLicensed) {
      alert(
        "Adding multiple assignees is a Premium feature. Upgrade to unlock full functionality!"
      );
      return;
    }

    setShowAddModal(true);
  };

  if (loading) {
    return (
      <Box padding="space.200">
        <Text>Loading assignees...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="space.200">
        <SectionMessage appearance="error">
          <Text>{error}</Text>
        </SectionMessage>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box padding="space.200">
        <Stack space="space.200">
          <Stack space="space.100" direction="horizontal" alignItems="center">
            <Heading as="h3" size="small">
              Multiple Assignees
            </Heading>
            {!isLicensed && <Badge appearance="discovery">Trial</Badge>}
          </Stack>

          {!isLicensed && (
            <SectionMessage appearance="discovery" title="Premium Feature">
              <Stack space="space.100">
                <Text size="small">
                  Multiple assignees with role management is a Premium feature.
                  Upgrade to assign multiple team members to issues with defined
                  roles.
                </Text>
                <Button appearance="primary" size="small">
                  Upgrade to Premium
                </Button>
              </Stack>
            </SectionMessage>
          )}

          <Stack space="space.150">
            {assignees.map((assignee) => (
              <Box key={assignee.accountId} padding="space.100">
                <Stack
                  space="space.100"
                  direction="horizontal"
                  alignItems="center"
                >
                  <Avatar
                    appearance="circle"
                    size="small"
                    name={assignee.displayName}
                    src={assignee.avatarUrl}
                  />

                  <Stack space="space.050" grow="fill">
                    <Text weight="medium" size="small">
                      {assignee.displayName}
                    </Text>
                    <Badge
                      appearance={getRoleBadgeAppearance(assignee.role)}
                      size="small"
                    >
                      {assignee.role}
                    </Badge>
                  </Stack>

                  {isLicensed && (
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={() => handleRemoveAssignee(assignee.accountId)}
                    >
                      Remove
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}

            {assignees.length === 0 && (
              <Box padding="space.200">
                <Text color="subtle" size="small">
                  No multiple assignees set.{" "}
                  {isLicensed
                    ? 'Click "Add Assignee" to get started.'
                    : "Upgrade to Premium to add multiple assignees."}
                </Text>
              </Box>
            )}
          </Stack>

          <Button appearance="primary" size="small" onClick={handleAddAssignee}>
            + Add Assignee
          </Button>

          <Text size="small" color="subtle">
            Issue: {issueKey} • {assignees.length} assignee
            {assignees.length !== 1 ? "s" : ""}
          </Text>
        </Stack>
      </Box>
    </ErrorBoundary>
  );
};

ForgeReconciler.render(<MultiAssigneePanel />);
