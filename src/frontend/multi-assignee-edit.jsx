import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Button,
  Avatar,
  Select,
  SectionMessage,
  Textfield,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@forge/react";
import { view, invoke } from "@forge/bridge";

const MultiAssigneeEdit = () => {
  const [assignees, setAssignees] = useState([]);
  const [isLicensed, setIsLicensed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [context, setContext] = useState(null);

  const roleOptions = [
    { label: "Primary", value: "Primary" },
    { label: "Secondary", value: "Secondary" },
    { label: "Reviewer", value: "Reviewer" },
    { label: "Collaborator", value: "Collaborator" },
  ];

  useEffect(() => {
    const loadFieldData = async () => {
      try {
        const viewContext = await view.getContext();
        setContext(viewContext);
        const license = viewContext?.license;
        setIsLicensed(license?.active === true);

        // Load project users for the user picker
        if (viewContext?.extension?.project?.key) {
          const suggestions = await invoke("getAssigneeSuggestions", {
            projectKey: viewContext.extension.project.key,
            issueKey: viewContext.extension.issue?.key,
          });

          if (suggestions.success) {
            setAvailableUsers(suggestions.suggestions);
            setSearchResults(suggestions.suggestions);
          }
        }

        // Load existing multi-assignees for this issue
        if (viewContext?.extension?.issue?.key) {
          const multiAssignees = await invoke("getMultiAssignees", {
            issueKey: viewContext.extension.issue.key,
          });

          if (multiAssignees.success && multiAssignees.data.assignees) {
            setAssignees(multiAssignees.data.assignees);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("Error loading field data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFieldData();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(availableUsers);
    } else {
      const filtered = availableUsers.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.emailAddress &&
            user.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered);
    }
  }, [searchQuery, availableUsers]);

  const handleAddAssignee = (user, role = "Secondary") => {
    if (!isLicensed) {
      alert("Adding multiple assignees is a Premium feature!");
      return;
    }

    // Check if user is already assigned
    if (assignees.some((a) => a.accountId === user.accountId)) {
      alert("This user is already assigned to this issue!");
      return;
    }

    const newAssignee = {
      accountId: user.accountId,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      avatarUrls: user.avatarUrls,
      role: role,
      assignedDate: new Date().toISOString(),
    };

    setAssignees((prev) => [...prev, newAssignee]);
    setShowUserPicker(false);
    setSearchQuery("");

    // Save to storage
    saveAssignees([...assignees, newAssignee]);
  };

  const handleRemoveAssignee = (accountId) => {
    if (!isLicensed) {
      alert("Removing assignees is a Premium feature!");
      return;
    }

    const updatedAssignees = assignees.filter((a) => a.accountId !== accountId);
    setAssignees(updatedAssignees);
    saveAssignees(updatedAssignees);
  };

  const handleRoleChange = (accountId, newRole) => {
    if (!isLicensed) {
      alert("Changing roles is a Premium feature!");
      return;
    }

    const updatedAssignees = assignees.map((a) =>
      a.accountId === accountId ? { ...a, role: newRole } : a
    );
    setAssignees(updatedAssignees);
    saveAssignees(updatedAssignees);
  };

  const saveAssignees = async (assigneesToSave) => {
    if (context?.extension?.issue?.key) {
      try {
        await invoke("updateMultiAssignees", {
          issueKey: context.extension.issue.key,
          assignees: assigneesToSave,
          roles: assigneesToSave.reduce((acc, assignee) => {
            acc[assignee.accountId] = assignee.role;
            return acc;
          }, {}),
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("Error saving assignees:", err);
      }
    }
  };

  const UserPickerModal = () => (
    <Modal onClose={() => setShowUserPicker(false)}>
      <ModalHeader>
        <ModalTitle>Add Assignee</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Stack space="space.200">
          <Textfield
            label="Search users"
            placeholder="Start typing to search for users..."
            value={searchQuery}
            onChange={setSearchQuery}
            autoFocus
          />

          <Box>
            <Text size="small" weight="medium">
              Available Users
            </Text>
            <Stack space="space.100">
              {searchResults.slice(0, 10).map((user) => (
                <Box
                  key={user.accountId}
                  padding="space.100"
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleAddAssignee(user)}
                >
                  <Stack
                    space="space.100"
                    direction="horizontal"
                    alignItems="center"
                  >
                    <Avatar
                      appearance="circle"
                      size="small"
                      src={user.avatarUrls?.["24x24"]}
                      name={user.displayName}
                    />
                    <Stack space="space.050">
                      <Text size="small" weight="medium">
                        {user.displayName}
                      </Text>
                      {user.emailAddress && (
                        <Text size="small" color="subtle">
                          {user.emailAddress}
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              ))}

              {searchResults.length === 0 && searchQuery && (
                <Text size="small" color="subtle">
                  No users found matching "{searchQuery}"
                </Text>
              )}

              {searchResults.length > 10 && (
                <Text size="small" color="subtle">
                  Showing first 10 results. Refine your search to see more
                  specific matches.
                </Text>
              )}
            </Stack>
          </Box>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={() => setShowUserPicker(false)}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );

  if (loading) {
    return <Text size="small">Loading...</Text>;
  }

  if (!isLicensed) {
    return (
      <Box padding="space.200">
        <SectionMessage appearance="discovery" title="Premium Feature">
          <Stack space="space.150">
            <Text size="small">
              Multiple Assignees with role management is available in Premium.
            </Text>
            <Button appearance="primary" size="small">
              Upgrade to Premium - $5/month
            </Button>
          </Stack>
        </SectionMessage>
      </Box>
    );
  }

  return (
    <Box padding="space.200">
      <Stack space="space.200">
        <Stack space="space.100" direction="horizontal" alignItems="center">
          <Text weight="medium" size="small">
            Multiple Assignees
          </Text>
          <Button
            appearance="primary"
            size="small"
            onClick={() => setShowUserPicker(true)}
          >
            + Add Assignee
          </Button>
        </Stack>

        <Stack space="space.150">
          {assignees.map((assignee) => (
            <Box
              key={assignee.accountId}
              padding="space.100"
              style={{
                border: "1px solid #ddd",
                borderRadius: "3px",
                backgroundColor: "#f8f9fa",
              }}
            >
              <Stack
                space="space.100"
                direction="horizontal"
                alignItems="center"
              >
                <Avatar
                  appearance="circle"
                  size="small"
                  src={assignee.avatarUrls?.["24x24"]}
                  name={assignee.displayName}
                />

                <Stack space="space.050" grow="fill">
                  <Text size="small" weight="medium">
                    {assignee.displayName}
                  </Text>
                  {assignee.emailAddress && (
                    <Text size="small" color="subtle">
                      {assignee.emailAddress}
                    </Text>
                  )}
                </Stack>

                <Select
                  options={roleOptions}
                  value={assignee.role}
                  onChange={(value) =>
                    handleRoleChange(assignee.accountId, value)
                  }
                  placeholder="Select role"
                  size="small"
                />

                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => handleRemoveAssignee(assignee.accountId)}
                >
                  Remove
                </Button>
              </Stack>
            </Box>
          ))}

          {assignees.length === 0 && (
            <Box
              padding="space.200"
              style={{
                border: "1px dashed #ccc",
                borderRadius: "3px",
                textAlign: "center",
              }}
            >
              <Stack space="space.100" alignItems="center">
                <Text color="subtle" size="small">
                  No multiple assignees added yet
                </Text>
                <Text color="subtle" size="small">
                  Click "Add Assignee" to search and select team members
                </Text>
              </Stack>
            </Box>
          )}
        </Stack>

        <Text size="small" color="subtle">
          {assignees.length} assignee{assignees.length !== 1 ? "s" : ""} •
          Search and select users just like Jira's built-in assignee field
        </Text>
      </Stack>

      {showUserPicker && <UserPickerModal />}
    </Box>
  );
};

ForgeReconciler.render(<MultiAssigneeEdit />);
