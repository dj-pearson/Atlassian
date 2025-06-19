import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Button,
  Badge,
  Box,
  Stack,
  Inline,
  ProgressBar,
  xcss,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import { useProductContext } from "@forge/react";

const containerStyles = xcss({
  padding: "space.300",
  maxWidth: "1200px",
});

const headerStyles = xcss({
  borderBottom: "2px solid token(color.border)",
  paddingBottom: "space.200",
  marginBottom: "space.300",
});

const cardStyles = xcss({
  padding: "space.200",
  backgroundColor: "color.background.neutral.subtle",
  borderRadius: "border.radius.200",
  border: "1px solid token(color.border)",
});

const userRowStyles = xcss({
  padding: "space.150",
  backgroundColor: "color.background.neutral",
  borderRadius: "border.radius.100",
  marginBottom: "space.100",
  border: "1px solid token(color.border.subtle)",
});

const CapacityDashboard = () => {
  const context = useProductContext();
  const [teamCapacity, setTeamCapacity] = useState([]);
  const [teamMetrics, setTeamMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCapacityData = async () => {
      if (!context?.extension?.project?.key) return;

      setLoading(true);
      try {
        const result = await invoke("getTeamCapacity", {
          projectKey: context.extension.project.key,
        });

        if (result.success) {
          setTeamCapacity(result.teamCapacity || []);
          setTeamMetrics(result.teamMetrics || {});
        }
      } catch (error) {
        console.error("Error loading capacity data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCapacityData();
  }, [context]);

  const getHealthStatusBadge = (status) => {
    switch (status) {
      case "optimal":
        return <Badge appearance="added">✅ Optimal</Badge>;
      case "busy":
        return <Badge appearance="default">⚠️ Busy</Badge>;
      case "overloaded":
        return <Badge appearance="removed">🔴 Overloaded</Badge>;
      default:
        return <Badge appearance="default">Unknown</Badge>;
    }
  };

  const getUtilizationColor = (rate) => {
    if (rate < 0.7) return "success";
    if (rate < 0.9) return "warning";
    return "danger";
  };

  const handleRefresh = () => {
    setLoading(true);
    // Reload data
    const loadCapacityData = async () => {
      try {
        const result = await invoke("getTeamCapacity", {
          projectKey: context.extension.project.key,
        });

        if (result.success) {
          setTeamCapacity(result.teamCapacity || []);
          setTeamMetrics(result.teamMetrics || {});
        }
      } catch (error) {
        console.error("Error loading capacity data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCapacityData();
  };

  if (loading) {
    return (
      <Box xcss={containerStyles}>
        <Text>Loading team capacity data...</Text>
      </Box>
    );
  }

  return (
    <Box xcss={containerStyles}>
      <Stack space="space.300">
        {/* Header */}
        <Box xcss={headerStyles}>
          <Stack space="space.200">
            <Inline
              space="space.200"
              alignBlock="center"
              spread="space-between"
            >
              <Text as="h1" weight="bold">
                Team Capacity Dashboard
              </Text>
              <Button onClick={handleRefresh} appearance="primary">
                🔄 Refresh
              </Button>
            </Inline>
            <Text color="color.text.subtle">
              Real-time overview of team assignments and workload distribution
            </Text>
          </Stack>
        </Box>

        {/* Team Metrics Overview */}
        <Stack space="space.200">
          <Text as="h2" weight="semibold">
            Team Overview
          </Text>
          <Inline space="space.200">
            <Box xcss={cardStyles}>
              <Stack space="space.100">
                <Text weight="semibold">Team Size</Text>
                <Text as="span" weight="bold" color="color.text.accent.blue">
                  {teamMetrics.teamSize || 0} members
                </Text>
              </Stack>
            </Box>
            <Box xcss={cardStyles}>
              <Stack space="space.100">
                <Text weight="semibold">Total Assignments</Text>
                <Text as="span" weight="bold" color="color.text.accent.green">
                  {teamMetrics.totalAssignments || 0} issues
                </Text>
              </Stack>
            </Box>
            <Box xcss={cardStyles}>
              <Stack space="space.100">
                <Text weight="semibold">Average Utilization</Text>
                <Text as="span" weight="bold" color="color.text.accent.orange">
                  {Math.round((teamMetrics.averageUtilization || 0) * 100)}%
                </Text>
              </Stack>
            </Box>
          </Inline>
        </Stack>

        {/* Individual Team Member Capacity */}
        <Stack space="space.200">
          <Text as="h2" weight="semibold">
            Individual Capacity
          </Text>
          <Stack space="space.150">
            {teamCapacity.map((member) => (
              <Box key={member.accountId} xcss={userRowStyles}>
                <Stack space="space.150">
                  <Inline
                    space="space.150"
                    alignBlock="center"
                    spread="space-between"
                  >
                    <Inline space="space.150" alignBlock="center">
                      {member.avatarUrls && member.avatarUrls["24x24"] && (
                        <img
                          src={member.avatarUrls["24x24"]}
                          alt={member.displayName}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      <Text weight="semibold">{member.displayName}</Text>
                    </Inline>
                    {getHealthStatusBadge(member.healthStatus)}
                  </Inline>

                  <Box>
                    <ProgressBar
                      value={member.utilizationRate}
                      appearance={getUtilizationColor(member.utilizationRate)}
                    />
                    <Text size="small" color="color.text.subtle">
                      {Math.round(member.utilizationRate * 100)}% utilization
                    </Text>
                  </Box>

                  <Inline space="space.300">
                    <Inline space="space.100" alignBlock="center">
                      <Badge appearance="primary">
                        👑 {member.primaryAssignments}
                      </Badge>
                      <Text size="small">Primary</Text>
                    </Inline>
                    <Inline space="space.100" alignBlock="center">
                      <Badge appearance="default">
                        🤝 {member.secondaryAssignments}
                      </Badge>
                      <Text size="small">Secondary</Text>
                    </Inline>
                    <Inline space="space.100" alignBlock="center">
                      <Badge appearance="important">
                        👀 {member.reviewerAssignments}
                      </Badge>
                      <Text size="small">Reviews</Text>
                    </Inline>
                  </Inline>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>

        {/* Capacity Alerts */}
        {teamCapacity.some(
          (member) => member.healthStatus === "overloaded"
        ) && (
          <Box xcss={cardStyles}>
            <Stack space="space.150">
              <Text weight="semibold" color="color.text.danger">
                ⚠️ Capacity Alerts
              </Text>
              {teamCapacity
                .filter((member) => member.healthStatus === "overloaded")
                .map((member) => (
                  <Text key={member.accountId} color="color.text.danger">
                    • {member.displayName} is overloaded (
                    {Math.round(member.utilizationRate * 100)}% capacity)
                  </Text>
                ))}
              <Text size="small" color="color.text.subtle">
                Consider redistributing assignments or adjusting sprint scope.
              </Text>
            </Stack>
          </Box>
        )}

        {/* Footer */}
        <Text size="small" color="color.text.subtle" textAlign="center">
          Last updated: {new Date().toLocaleString()} • Auto-refresh every 5
          minutes
        </Text>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <CapacityDashboard />
  </React.StrictMode>
);
