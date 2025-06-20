import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Stack,
  Box,
  Text,
  Lozenge,
  User,
  Badge,
} from "@forge/react";
import { useProductContext } from "@forge/react";

const MultiAssigneesView = () => {
  const context = useProductContext();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (context?.fieldValue) {
          const currentUsers = Array.isArray(context.fieldValue)
            ? context.fieldValue
            : [context.fieldValue];
          setSelectedUsers(currentUsers);

          // Mock roles for demo
          const mockRoles = {};
          currentUsers.forEach((user, index) => {
            const roles = ["Primary", "Secondary", "Reviewer", "Collaborator"];
            mockRoles[user.id || user.accountId] = roles[index % roles.length];
          });
          setUserRoles(mockRoles);
        }
      } catch (error) {
        console.error("Error loading multi-assignees view data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (context) {
      loadData();
    }
  }, [context]);

  const getRoleColor = (role) => {
    switch (role) {
      case "Primary":
        return "success";
      case "Secondary":
        return "information";
      case "Reviewer":
        return "discovery";
      case "Collaborator":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getWorkloadStatus = () => {
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

  if (loading) {
    return (
      <Box>
        <Text color="color.text.subtle">Loading assignees...</Text>
      </Box>
    );
  }

  if (!selectedUsers || selectedUsers.length === 0) {
    return (
      <Box>
        <Text color="color.text.subtle">No assignees selected</Text>
      </Box>
    );
  }

  // If only one user, show compact view
  if (selectedUsers.length === 1) {
    const user = selectedUsers[0];
    const role = userRoles[user.id || user.accountId] || "Assignee";
    const workloadStatus = getWorkloadStatus();

    return (
      <Stack direction="horizontal" space="space.100" alignBlock="center">
        <User accountId={user.id || user.accountId} />
        <Lozenge appearance={getRoleColor(role)}>{role}</Lozenge>
        <Lozenge appearance={getWorkloadColor(workloadStatus)} isBold={false}>
          {workloadStatus}
        </Lozenge>
      </Stack>
    );
  }

  // Multiple users - show detailed view
  return (
    <Stack space="space.150">
      {/* Header with count */}
      <Stack direction="horizontal" space="space.100" alignBlock="center">
        <Text weight="medium">Multi Assignees</Text>
        <Badge appearance="primary">{selectedUsers.length}</Badge>
        <Text size="small" color="color.text.subtle">
          v5.7.0
        </Text>
      </Stack>

      {/* User list */}
      <Stack space="space.100">
        {selectedUsers.map((user) => {
          const userId = user.id || user.accountId;
          const role = userRoles[userId] || "Assignee";
          const workloadStatus = getWorkloadStatus();

          return (
            <Box
              key={userId}
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
                  <User accountId={userId} />
                </Stack>

                <Stack
                  direction="horizontal"
                  space="space.050"
                  alignBlock="center"
                >
                  <Lozenge appearance={getRoleColor(role)}>{role}</Lozenge>
                  <Lozenge
                    appearance={getWorkloadColor(workloadStatus)}
                    isBold={false}
                  >
                    {workloadStatus}
                  </Lozenge>
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {/* Success indicator */}
      <Box
        xcss={{
          padding: "space.100",
          backgroundColor: "color.background.success.subtle",
          borderRadius: "border.radius",
        }}
      >
        <Stack space="space.050">
          <Text size="small" weight="medium" color="color.text.success">
            ✅ Modern UI Kit Active
          </Text>
          <Text size="small" color="color.text.subtle">
            Deprecation error resolved with @forge/react v10+
          </Text>
        </Stack>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <MultiAssigneesView />
  </React.StrictMode>
);
