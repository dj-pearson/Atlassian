import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Badge,
  Box,
  Stack,
  Inline,
  xcss,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import { useProductContext } from "@forge/react";

const containerStyles = xcss({
  padding: "space.150",
});

const assigneeItemStyles = xcss({
  padding: "space.100",
  backgroundColor: "color.background.neutral.subtle",
  borderRadius: "border.radius.100",
  marginBottom: "space.075",
});

const avatarStyles = xcss({
  width: "24px",
  height: "24px",
  borderRadius: "border.radius.circle",
});

const MultiAssigneesView = () => {
  const context = useProductContext();
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssignees = async () => {
      if (!context?.extension?.issue?.key) return;

      setLoading(true);
      try {
        const result = await invoke("getMultiAssignees", {
          issueKey: context.extension.issue.key,
        });

        if (result.success) {
          setAssignees(result.assignees || []);
        }
      } catch (error) {
        console.error("Error loading assignees:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAssignees();
  }, [context]);

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

  const getRoleIcon = (role) => {
    switch (role) {
      case "primary":
        return "👑";
      case "secondary":
        return "🤝";
      case "reviewer":
        return "👀";
      case "collaborator":
        return "💬";
      default:
        return "👤";
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (assignees.length === 0) {
    return (
      <Box xcss={containerStyles}>
        <Text color="color.text.subtle">No assignees</Text>
      </Box>
    );
  }

  // Sort assignees by role priority
  const sortedAssignees = [...assignees].sort((a, b) => {
    const rolePriority = {
      primary: 0,
      secondary: 1,
      reviewer: 2,
      collaborator: 3,
    };
    return (rolePriority[a.role] || 4) - (rolePriority[b.role] || 4);
  });

  return (
    <Box xcss={containerStyles}>
      <Stack space="space.100">
        {sortedAssignees.map((assignee) => (
          <Box key={assignee.accountId} xcss={assigneeItemStyles}>
            <Inline space="space.100" alignBlock="center">
              {assignee.avatarUrls && assignee.avatarUrls["24x24"] && (
                <img
                  src={assignee.avatarUrls["24x24"]}
                  alt={assignee.displayName}
                  style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                />
              )}
              <Text
                weight={assignee.role === "primary" ? "semibold" : "regular"}
              >
                {assignee.displayName}
              </Text>
              <Badge appearance={getRoleBadgeAppearance(assignee.role)}>
                {getRoleIcon(assignee.role)} {assignee.role}
              </Badge>
            </Inline>
          </Box>
        ))}

        <Text size="small" color="color.text.subtle">
          {assignees.length} assignee{assignees.length !== 1 ? "s" : ""}
          {assignees.some((a) => a.role === "primary") &&
            " • Primary assignee assigned"}
        </Text>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <MultiAssigneesView />
  </React.StrictMode>
);
