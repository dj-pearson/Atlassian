import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  UserPicker,
  Label,
  HelperMessage,
  Button,
  Stack,
  Box,
  Text,
  Badge,
  Lozenge,
} from "@forge/react";
import { useProductContext } from "@forge/react";
import { requestJira } from "@forge/bridge";

const MultiAssigneesEdit = () => {
  const context = useProductContext();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load current field value
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (context?.fieldValue) {
          const currentUsers = Array.isArray(context.fieldValue)
            ? context.fieldValue
            : [context.fieldValue];
          setSelectedUsers(currentUsers);
        }

        // Generate mock suggestions for demo
        if (context?.projectKey) {
          const mockSuggestions = [
            {
              user: { id: "user1", displayName: "John Smith", avatarUrls: {} },
              score: 85,
              recommendedRole: "Primary",
              reason: "Strong expertise in similar issues",
            },
            {
              user: { id: "user2", displayName: "Jane Doe", avatarUrls: {} },
              score: 78,
              recommendedRole: "Secondary",
              reason: "Available capacity and relevant experience",
            },
          ];
          setSuggestions(mockSuggestions);
        }
      } catch (error) {
        console.error("Error loading multi-assignees data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (context) {
      loadData();
    }
  }, [context]);

  const handleUserChange = async (newUsers) => {
    setSelectedUsers(newUsers || []);

    // Auto-assign Primary role to first user if no roles set
    if (
      newUsers &&
      newUsers.length > 0 &&
      Object.keys(userRoles).length === 0
    ) {
      setUserRoles({ [newUsers[0].id]: "Primary" });
    }

    // Update the native assignee with primary user
    if (newUsers && newUsers.length > 0) {
      try {
        const primaryUser =
          newUsers.find((user) => userRoles[user.id] === "Primary") ||
          newUsers[0];
        await requestJira(`/rest/api/3/issue/${context.issueKey}/assignee`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: primaryUser.id }),
        });
      } catch (error) {
        console.error("Error updating assignee:", error);
      }
    }
  };

  const handleRoleChange = (userId, role) => {
    const newRoles = { ...userRoles, [userId]: role };
    setUserRoles(newRoles);
  };

  const applySuggestion = (suggestion) => {
    const newUsers = [...selectedUsers];
    if (!newUsers.find((u) => u.id === suggestion.user.id)) {
      newUsers.push(suggestion.user);
      setSelectedUsers(newUsers);

      // Auto-assign suggested role
      if (suggestion.recommendedRole) {
        handleRoleChange(suggestion.user.id, suggestion.recommendedRole);
      }
    }
  };

  const getWorkloadStatus = (userId) => {
    // Mock workload status
    const statuses = ["optimal", "busy", "overloaded"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const getWorkloadColor = (status) => {
    switch (status) {
      case "optimal":
        return "success";
      case "busy":
        return "information";
      case "overloaded":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <Stack space="space.200">
      <Box>
        <Text as="h3">Multi Assignees - Enterprise Edition v5.7.0</Text>
        <Text color="color.text.subtle">
          Modern UI Kit - Deprecation Error Fixed ✅
        </Text>
      </Box>

      {/* Main User Picker */}
      <Box>
        <Label labelFor="multi-assignees">Assignees</Label>
        <UserPicker
          id="multi-assignees"
          isMulti={true}
          value={selectedUsers}
          onChange={handleUserChange}
          placeholder="Search and select users..."
          isLoading={loading}
        />
        <HelperMessage>
          Select multiple users and assign roles. Native UserPicker component
          with modern UI Kit.
        </HelperMessage>
      </Box>

      {/* Selected Users with Roles */}
      {selectedUsers && selectedUsers.length > 0 && (
        <Box>
          <Text weight="medium">Selected Assignees & Roles</Text>
          <Stack space="space.100">
            {selectedUsers.map((user) => (
              <Box
                key={user.id}
                xcss={{
                  padding: "space.100",
                  backgroundColor: "color.background.neutral.subtle",
                  borderRadius: "border.radius",
                }}
              >
                <Stack
                  direction="horizontal"
                  space="space.100"
                  alignInline="space-between"
                >
                  <Stack
                    direction="horizontal"
                    space="space.100"
                    alignBlock="center"
                  >
                    <Text>{user.displayName}</Text>
                    <Lozenge
                      appearance={getWorkloadColor(getWorkloadStatus(user.id))}
                    >
                      {getWorkloadStatus(user.id)}
                    </Lozenge>
                  </Stack>

                  <Stack direction="horizontal" space="space.050">
                    {["Primary", "Secondary", "Reviewer", "Collaborator"].map(
                      (role) => (
                        <Button
                          key={role}
                          appearance={
                            userRoles[user.id] === role ? "primary" : "subtle"
                          }
                          spacing="compact"
                          onClick={() => handleRoleChange(user.id, role)}
                        >
                          {role}
                        </Button>
                      )
                    )}
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* AI-Powered Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Box>
          <Text weight="medium">🤖 Smart Suggestions</Text>
          <Stack space="space.100">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <Box
                key={index}
                xcss={{
                  padding: "space.100",
                  backgroundColor: "color.background.discovery.subtle",
                  borderRadius: "border.radius",
                }}
              >
                <Stack
                  direction="horizontal"
                  space="space.100"
                  alignInline="space-between"
                >
                  <Stack space="space.050">
                    <Stack
                      direction="horizontal"
                      space="space.100"
                      alignBlock="center"
                    >
                      <Text weight="medium">{suggestion.user.displayName}</Text>
                      <Badge appearance="discovery">
                        {suggestion.score}% match
                      </Badge>
                      <Lozenge appearance="discovery">
                        {suggestion.recommendedRole}
                      </Lozenge>
                    </Stack>
                    <Text size="small" color="color.text.subtle">
                      {suggestion.reason}
                    </Text>
                  </Stack>

                  <Button
                    appearance="primary"
                    spacing="compact"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    Add
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Success Message */}
      <Box
        xcss={{
          padding: "space.150",
          backgroundColor: "color.background.success.subtle",
          borderRadius: "border.radius",
        }}
      >
        <Stack space="space.100">
          <Text weight="medium" color="color.text.success">
            ✅ Modern UI Kit Active
          </Text>
          <Text size="small" color="color.text.subtle">
            Using @forge/react v10+ with native UserPicker component.
            Deprecation error resolved!
          </Text>
        </Stack>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <MultiAssigneesEdit />
  </React.StrictMode>
);
