import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Badge,
  Avatar,
  SectionMessage,
} from "@forge/react";
import { view } from "@forge/bridge";

const MultiAssigneeView = () => {
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLicensed, setIsLicensed] = useState(false);

  useEffect(() => {
    const loadFieldData = async () => {
      try {
        const context = await view.getContext();
        const license = context?.license;
        setIsLicensed(license?.active === true);

        // Demo data for viewing
        if (license?.active) {
          setAssignees([
            {
              accountId: "user-1",
              displayName: "John Smith",
              role: "Primary",
            },
            {
              accountId: "user-2",
              displayName: "Jane Doe",
              role: "Secondary",
            },
            {
              accountId: "user-3",
              displayName: "Bob Johnson",
              role: "Reviewer",
            },
          ]);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("Error loading field data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFieldData();
  }, []);

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

  if (loading) {
    return <Text size="small">Loading...</Text>;
  }

  if (!isLicensed) {
    return (
      <Box padding="space.100">
        <SectionMessage appearance="discovery">
          <Stack space="space.100">
            <Text size="small">🔒 Multiple Assignees (Premium Feature)</Text>
            <Text size="small" color="subtle">
              Upgrade to assign multiple team members with roles
            </Text>
          </Stack>
        </SectionMessage>
      </Box>
    );
  }

  if (assignees.length === 0) {
    return (
      <Text size="small" color="subtle">
        No multiple assignees set
      </Text>
    );
  }

  return (
    <Box>
      <Stack space="space.100">
        {assignees.map((assignee) => (
          <Stack
            key={assignee.accountId}
            space="space.050"
            direction="horizontal"
            alignItems="center"
          >
            <Avatar
              appearance="circle"
              size="xsmall"
              name={assignee.displayName}
            />
            <Text size="small">{assignee.displayName}</Text>
            <Badge
              appearance={getRoleBadgeAppearance(assignee.role)}
              size="small"
            >
              {assignee.role}
            </Badge>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<MultiAssigneeView />);
