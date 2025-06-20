import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Heading,
  Button,
  Badge,
  Avatar,
  ProgressBar,
  SectionMessage,
  Table,
  Head,
  Cell,
  Row,
  Tooltip,
  Select,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Grid,
  GridColumn,
  Chart,
  Lozenge,
  Status,
  EmptyState,
  Spinner,
} from "@forge/react";
import { view, invoke } from "@forge/bridge";
import ErrorBoundary from "./error-boundary";

const CapacityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectKey, setProjectKey] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const context = await view.getContext();
        const currentProjectKey = context?.extension?.project?.key;

        if (currentProjectKey) {
          setProjectKey(currentProjectKey);
          await Promise.all([
            loadTeamCapacity(currentProjectKey),
            loadAnalytics(currentProjectKey),
          ]);
        } else {
          setError("Unable to determine project context");
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (projectKey) {
        refreshData();
      }
    }, 5 * 60 * 1000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadTeamCapacity = async (key) => {
    try {
      const response = await invoke("getTeamCapacityData", { projectKey: key });
      if (response.success) {
        setTeamData(response.data);
      } else {
        throw new Error(response.error || "Failed to load team capacity");
      }
    } catch (err) {
      console.error("Error loading team capacity:", err);
      setError(err.message);
    }
  };

  const loadAnalytics = async (key) => {
    try {
      const response = await invoke("getCollaborationAnalytics", {
        projectKey: key,
        timeRange: parseInt(selectedTimeRange),
      });
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
      // Non-critical error, don't block dashboard
    }
  };

  const refreshData = async () => {
    if (!projectKey) return;

    setLoading(true);
    try {
      await Promise.all([
        loadTeamCapacity(projectKey),
        loadAnalytics(projectKey),
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case "optimal":
        return "success";
      case "busy":
        return "warning";
      case "overloaded":
        return "error";
      default:
        return "default";
    }
  };

  const getUtilizationColor = (rate) => {
    if (rate <= 0.6) return "success";
    if (rate <= 0.8) return "warning";
    return "error";
  };

  const formatLastRefresh = () => {
    const now = new Date();
    const diff = Math.floor((now - lastRefresh) / 1000 / 60);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 minute ago";
    return `${diff} minutes ago`;
  };

  const TeamOverviewTab = () => (
    <Stack space="space.200">
      {/* Team Metrics Summary */}
      <Grid templateColumns="1fr 1fr 1fr 1fr" gap="space.200">
        <GridColumn>
          <Box
            padding="space.200"
            backgroundColor="surface.sunken"
            borderRadius="3px"
          >
            <Stack space="space.100">
              <Text size="small" color="subtle">
                Average Utilization
              </Text>
              <Text size="large" weight="bold">
                {(teamData?.teamMetrics?.averageUtilization * 100 || 0).toFixed(
                  1
                )}
                %
              </Text>
              <ProgressBar
                value={teamData?.teamMetrics?.averageUtilization || 0}
                appearance={getUtilizationColor(
                  teamData?.teamMetrics?.averageUtilization || 0
                )}
              />
            </Stack>
          </Box>
        </GridColumn>

        <GridColumn>
          <Box
            padding="space.200"
            backgroundColor="surface.sunken"
            borderRadius="3px"
          >
            <Stack space="space.100">
              <Text size="small" color="subtle">
                Team Capacity
              </Text>
              <Text size="large" weight="bold">
                {teamData?.teamMetrics?.usedCapacity || 0} /{" "}
                {teamData?.teamMetrics?.totalCapacity || 0}
              </Text>
              <Text size="small" color="subtle">
                {teamData?.users?.length || 0} team members
              </Text>
            </Stack>
          </Box>
        </GridColumn>

        <GridColumn>
          <Box
            padding="space.200"
            backgroundColor="surface.sunken"
            borderRadius="3px"
          >
            <Stack space="space.100">
              <Text size="small" color="subtle">
                Overloaded Users
              </Text>
              <Text size="large" weight="bold" color="error">
                {teamData?.teamMetrics?.overloadedUsers || 0}
              </Text>
              <Text size="small" color="subtle">
                Require attention
              </Text>
            </Stack>
          </Box>
        </GridColumn>

        <GridColumn>
          <Box
            padding="space.200"
            backgroundColor="surface.sunken"
            borderRadius="3px"
          >
            <Stack space="space.100">
              <Text size="small" color="subtle">
                Collaboration Index
              </Text>
              <Text size="large" weight="bold">
                {(teamData?.teamMetrics?.collaborationIndex * 100 || 0).toFixed(
                  0
                )}
                %
              </Text>
              <Text size="small" color="subtle">
                Cross-team efficiency
              </Text>
            </Stack>
          </Box>
        </GridColumn>
      </Grid>

      {/* Capacity Alerts */}
      {teamData?.teamMetrics?.overloadedUsers > 0 && (
        <SectionMessage appearance="warning" title="Capacity Alerts">
          <Stack space="space.100">
            <Text>
              {teamData.teamMetrics.overloadedUsers} team member
              {teamData.teamMetrics.overloadedUsers > 1 ? "s are" : " is"}{" "}
              approaching capacity limits.
            </Text>
            <Text size="small">
              Consider redistributing assignments or adjusting sprint
              commitments.
            </Text>
          </Stack>
        </SectionMessage>
      )}

      {/* Team Members Table */}
      <Box>
        <Stack space="space.200">
          <Stack space="space.100" direction="horizontal" alignItems="center">
            <Heading size="medium">Team Workload Distribution</Heading>
            <Button
              appearance="subtle"
              size="small"
              onClick={refreshData}
              isLoading={loading}
            >
              Refresh
            </Button>
          </Stack>

          <Table>
            <Head>
              <Cell>
                <Text weight="bold">Team Member</Text>
              </Cell>
              <Cell>
                <Text weight="bold">Current Load</Text>
              </Cell>
              <Cell>
                <Text weight="bold">Utilization</Text>
              </Cell>
              <Cell>
                <Text weight="bold">Assignment Breakdown</Text>
              </Cell>
              <Cell>
                <Text weight="bold">Status</Text>
              </Cell>
            </Head>
            {teamData?.users?.map((user) => (
              <Row key={user.user.accountId}>
                <Cell>
                  <Stack
                    space="space.100"
                    direction="horizontal"
                    alignItems="center"
                  >
                    <Avatar
                      appearance="circle"
                      size="small"
                      src={user.user.avatarUrls?.["24x24"]}
                      name={user.user.displayName}
                    />
                    <Stack space="space.050">
                      <Text weight="medium">{user.user.displayName}</Text>
                      <Text size="small" color="subtle">
                        {user.user.emailAddress}
                      </Text>
                    </Stack>
                  </Stack>
                </Cell>
                <Cell>
                  <Stack space="space.050">
                    <Text weight="bold">
                      {user.currentCapacity.totalAssignments}
                    </Text>
                    <Text size="small" color="subtle">
                      assignments
                    </Text>
                  </Stack>
                </Cell>
                <Cell>
                  <Stack space="space.100">
                    <Text>
                      {(user.currentCapacity.utilizationRate * 100).toFixed(0)}%
                    </Text>
                    <ProgressBar
                      value={user.currentCapacity.utilizationRate}
                      appearance={getUtilizationColor(
                        user.currentCapacity.utilizationRate
                      )}
                    />
                  </Stack>
                </Cell>
                <Cell>
                  <Stack space="space.050" direction="horizontal">
                    <Tooltip content="Primary assignments">
                      <Badge appearance="primary">
                        {user.currentCapacity.primaryAssignments}P
                      </Badge>
                    </Tooltip>
                    <Tooltip content="Secondary assignments">
                      <Badge appearance="default">
                        {user.currentCapacity.secondaryAssignments}S
                      </Badge>
                    </Tooltip>
                    <Tooltip content="Reviewer assignments">
                      <Badge appearance="important">
                        {user.currentCapacity.reviewerAssignments}R
                      </Badge>
                    </Tooltip>
                    <Tooltip content="Collaborator assignments">
                      <Badge appearance="added">
                        {user.currentCapacity.collaboratorAssignments}C
                      </Badge>
                    </Tooltip>
                  </Stack>
                </Cell>
                <Cell>
                  <Status
                    appearance={getHealthStatusColor(
                      user.currentCapacity.healthStatus
                    )}
                    text={user.currentCapacity.healthStatus}
                  />
                </Cell>
              </Row>
            ))}
          </Table>
        </Stack>
      </Box>
    </Stack>
  );

  const AnalyticsTab = () => (
    <Stack space="space.200">
      <Stack space="space.100" direction="horizontal" alignItems="center">
        <Heading size="medium">Collaboration Analytics</Heading>
        <Select
          value={selectedTimeRange}
          onChange={setSelectedTimeRange}
          options={[
            { label: "Last 7 days", value: "7" },
            { label: "Last 30 days", value: "30" },
            { label: "Last 90 days", value: "90" },
          ]}
        />
      </Stack>

      {analytics ? (
        <Grid templateColumns="1fr 1fr" gap="space.200">
          <GridColumn>
            <Box
              padding="space.200"
              backgroundColor="surface.sunken"
              borderRadius="3px"
            >
              <Stack space="space.200">
                <Heading size="small">Assignment Patterns</Heading>
                <Stack space="space.100">
                  <Text size="small">Most common collaboration pairs</Text>
                  <Text size="small">Optimal team size analysis</Text>
                  <Text size="small">Role distribution effectiveness</Text>
                </Stack>
              </Stack>
            </Box>
          </GridColumn>

          <GridColumn>
            <Box
              padding="space.200"
              backgroundColor="surface.sunken"
              borderRadius="3px"
            >
              <Stack space="space.200">
                <Heading size="small">Performance Metrics</Heading>
                <Stack space="space.100">
                  <Text size="small">
                    Multi-assignee vs single resolution time
                  </Text>
                  <Text size="small">Quality metrics and bug rates</Text>
                  <Text size="small">Team satisfaction scores</Text>
                </Stack>
              </Stack>
            </Box>
          </GridColumn>
        </Grid>
      ) : (
        <Box padding="space.400">
          <EmptyState
            header="Analytics Loading"
            description="Collaboration analytics will appear here once data is processed."
          />
        </Box>
      )}
    </Stack>
  );

  const InsightsTab = () => (
    <Stack space="space.200">
      <Heading size="medium">AI-Powered Insights</Heading>

      <Grid templateColumns="1fr" gap="space.200">
        <GridColumn>
          <SectionMessage appearance="discovery" title="Workload Optimization">
            <Stack space="space.100">
              <Text>
                Based on current assignments, consider redistributing 2-3 tasks
                from overloaded team members to optimize delivery velocity.
              </Text>
              <Button appearance="link" size="small">
                View recommendations
              </Button>
            </Stack>
          </SectionMessage>
        </GridColumn>

        <GridColumn>
          <SectionMessage
            appearance="information"
            title="Collaboration Opportunity"
          >
            <Stack space="space.100">
              <Text>
                John Smith and Jane Doe have shown 23% faster resolution times
                when working together on similar issues.
              </Text>
              <Button appearance="link" size="small">
                See collaboration patterns
              </Button>
            </Stack>
          </SectionMessage>
        </GridColumn>

        <GridColumn>
          <SectionMessage appearance="success" title="Team Performance">
            <Stack space="space.100">
              <Text>
                Multi-assignee issues are being resolved 15% faster than
                single-assignee issues this sprint.
              </Text>
              <Button appearance="link" size="small">
                View detailed metrics
              </Button>
            </Stack>
          </SectionMessage>
        </GridColumn>
      </Grid>
    </Stack>
  );

  if (loading && !teamData) {
    return (
      <Box padding="space.400">
        <Stack space="space.200" alignItems="center">
          <Spinner size="large" />
          <Text>Loading team capacity data...</Text>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="space.200">
        <SectionMessage appearance="error" title="Error Loading Dashboard">
          <Text>{error}</Text>
          <Button appearance="primary" onClick={refreshData}>
            Retry
          </Button>
        </SectionMessage>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box padding="space.200">
        <Stack space="space.300">
          {/* Header */}
          <Stack space="space.100" direction="horizontal" alignItems="center">
            <Heading size="large">Team Capacity Dashboard</Heading>
            <Lozenge appearance="inprogress">Live</Lozenge>
          </Stack>

          <Stack space="space.050" direction="horizontal" alignItems="center">
            <Text size="small" color="subtle">
              Project: {projectKey} • Last updated: {formatLastRefresh()}
            </Text>
            <Button
              appearance="subtle"
              size="small"
              iconBefore="refresh"
              onClick={refreshData}
              isLoading={loading}
            >
              Refresh
            </Button>
          </Stack>

          {/* Main Dashboard Content */}
          <Tabs>
            <TabList>
              <Tab>Team Overview</Tab>
              <Tab>Analytics</Tab>
              <Tab>AI Insights</Tab>
            </TabList>

            <TabPanel>
              <TeamOverviewTab />
            </TabPanel>

            <TabPanel>
              <AnalyticsTab />
            </TabPanel>

            <TabPanel>
              <InsightsTab />
            </TabPanel>
          </Tabs>
        </Stack>
      </Box>
    </ErrorBoundary>
  );
};

ForgeReconciler.render(<CapacityDashboard />);
