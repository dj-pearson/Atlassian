import React, { useState, useEffect } from "react";
import ForgeReconciler, { Text, Stack, Badge, Avatar } from "@forge/react";
import { view } from "@forge/bridge";

const MultiAssigneeRenderer = () => {
  const [assignees, setAssignees] = useState([]);
  const [isLicensed, setIsLicensed] = useState(false);

  useEffect(() => {
    const loadFieldData = async () => {
      try {
        const context = await view.getContext();
        const license = context?.license;
        setIsLicensed(license?.active === true);

        // Demo data - in real implementation, this would fetch from storage
        if (license?.active) {
          setAssignees([
            {
              accountId: "user-1",
              displayName: "John Smith",
              role: "Primary",
              avatarUrl: null,
            },
            {
              accountId: "user-2",
              displayName: "Jane Doe",
              role: "Secondary",
              avatarUrl: null,
            },
          ]);
        }
      } catch (err) {
        console.error("Error loading field data:", err);
      }
    };

    loadFieldData();
  }, []);

  if (!isLicensed) {
    return (
      <Text size="small" color="subtle">
        🔒 Premium Feature
      </Text>
    );
  }

  if (assignees.length === 0) {
    return (
      <Text size="small" color="subtle">
        No assignees
      </Text>
    );
  }

  // For compact display in lists, show max 3 assignees
  const displayAssignees = assignees.slice(0, 3);
  const remainingCount = assignees.length - 3;

  return (
    <Stack space="space.050" direction="horizontal" alignItems="center">
      {displayAssignees.map((assignee) => (
        <Avatar
          key={assignee.accountId}
          appearance="circle"
          size="xsmall"
          name={assignee.displayName}
          src={assignee.avatarUrl}
        />
      ))}

      {remainingCount > 0 && (
        <Text size="small" color="subtle">
          +{remainingCount}
        </Text>
      )}

      <Text size="small" color="subtle">
        ({assignees.length})
      </Text>
    </Stack>
  );
};

ForgeReconciler.render(<MultiAssigneeRenderer />);
