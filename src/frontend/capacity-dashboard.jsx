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
  User,
  DynamicTable,
} from "@forge/react";
import { view, invoke } from "@forge/bridge";
import ErrorBoundary from "./error-boundary";
import { useProductContext } from "@forge/react";

const CapacityDashboard = () => {
  const context = useProductContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectKey, setProjectKey] = useState(null);
  const [teamData, setTeamData] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState("overview");

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Generate comprehensive team capacity data
      const mockTeamData = [
        {
          user: {
            id: "user1",
            displayName: "John Smith",
            email: "john.smith@company.com",
          },
          workload: {
            assignedIssues: 8,
            utilization: 0.65,
            capacity: 12,
            storyPoints: 34,
            hoursLogged: 28,
          },
          roles: ["Primary", "Secondary"],
          skills: ["Frontend", "React", "JavaScript"],
          performance: {
            completionRate: 0.92,
            avgTimeToComplete: 3.2,
            qualityScore: 8.5,
          },
          currentProjects: ["PROJ-123", "PROJ-456"],
          availability: "Available",
        },
        {
          user: {
            id: "user2",
            displayName: "Jane Doe",
            email: "jane.doe@company.com",
          },
          workload: {
            assignedIssues: 12,
            utilization: 0.85,
            capacity: 14,
            storyPoints: 42,
            hoursLogged: 35,
          },
          roles: ["Primary", "Reviewer"],
          skills: ["Backend", "Python", "API Design"],
          performance: {
            completionRate: 0.88,
            avgTimeToComplete: 2.8,
            qualityScore: 9.1,
          },
          currentProjects: ["PROJ-789", "PROJ-101"],
          availability: "Busy",
        },
        {
          user: {
            id: "user3",
            displayName: "Mike Johnson",
            email: "mike.johnson@company.com",
          },
          workload: {
            assignedIssues: 15,
            utilization: 0.95,
            capacity: 16,
            storyPoints: 58,
            hoursLogged: 42,
          },
          roles: ["Primary", "Secondary", "Reviewer"],
          skills: ["Full Stack", "DevOps", "Cloud"],
          performance: {
            completionRate: 0.85,
            avgTimeToComplete: 4.1,
            qualityScore: 8.8,
          },
          currentProjects: ["PROJ-202", "PROJ-303"],
          availability: "Overloaded",
        },
        {
          user: {
            id: "user4",
            displayName: "Sarah Wilson",
            email: "sarah.wilson@company.com",
          },
          workload: {
            assignedIssues: 6,
            utilization: 0.45,
            capacity: 13,
            storyPoints: 21,
            hoursLogged: 18,
          },
          roles: ["Reviewer", "Collaborator"],
          skills: ["UX Design", "Research", "Prototyping"],
          performance: {
            completionRate: 0.95,
            avgTimeToComplete: 2.5,
            qualityScore: 9.3,
          },
          currentProjects: ["PROJ-404"],
          availability: "Available",
        },
        {
          user: {
            id: "user5",
            displayName: "Alex Chen",
            email: "alex.chen@company.com",
          },
          workload: {
            assignedIssues: 10,
            utilization: 0.75,
            capacity: 13,
            storyPoints: 39,
            hoursLogged: 31,
          },
          roles: ["Secondary", "Reviewer"],
          skills: ["QA", "Automation", "Testing"],
          performance: {
            completionRate: 0.91,
            avgTimeToComplete: 3.0,
            qualityScore: 8.9,
          },
          currentProjects: ["PROJ-505", "PROJ-606"],
          availability: "Busy",
        },
      ];

      const mockAnalytics = {
        totalIssues: 187,
        assignedIssues: 51,
        unassignedIssues: 136,
        teamUtilization: 0.73,
        avgCompletionTime: 3.12,
        collaborationScore: 8.4,
        totalStoryPoints: 194,
        completedStoryPoints: 128,
        teamVelocity: 42,
        trends: {
          utilizationTrend: "+5%",
          completionTrend: "-8%",
          collaborationTrend: "+12%",
          velocityTrend: "+15%",
        },
        riskFactors: [
          "Mike Johnson is overloaded (95% utilization)",
          "136 unassigned issues in backlog",
          "Sprint velocity trending upward",
        ],
      };

      setTeamData(mockTeamData);
      setAnalytics(mockAnalytics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getUtilizationColor = (utilization) => {
    if (utilization < 0.7) return "success";
    if (utilization < 0.9) return "information";
    return "danger";
  };

  const getUtilizationStatus = (utilization) => {
    if (utilization < 0.7) return "Optimal";
    if (utilization < 0.9) return "Busy";
    return "Overloaded";
  };

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case "Available":
        return "success";
      case "Busy":
        return "information";
      case "Overloaded":
        return "danger";
      default:
        return "neutral";
    }
  };

  const formatPercentage = (value) => Math.round(value * 100);

  const formatLastRefresh = () => {
    const now = new Date();
    const diff = Math.floor((now - lastRefresh) / 1000 / 60);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 minute ago";
    return `${diff} minutes ago`;
  };

  const teamTableHead = {
    cells: [
      { key: "user", content: "Team Member" },
      { key: "utilization", content: "Utilization" },
      { key: "status", content: "Status" },
      { key: "assignments", content: "Active Issues" },
      { key: "expertise", content: "Top Skills" },
      { key: "performance", content: "Performance" },
    ],
  };

  const teamTableRows = teamData?.map((member) => ({
    key: member.user.id,
    cells: [
      {
        key: "user",
        content: (
          <Stack direction="horizontal" space="space.100" alignBlock="center">
            <Avatar
              appearance="circle"
              size="small"
              src={member.user.avatarUrls?.["24x24"]}
              name={member.user.displayName}
            />
          </Stack>
        ),
      },
      {
        key: "utilization",
        content: (
          <Stack space="space.050">
            <ProgressBar
              value={member.workload.utilization}
              appearance={getUtilizationColor(member.workload.utilization)}
            />
            <Text size="small">
              {formatPercentage(member.workload.utilization)}%
            </Text>
          </Stack>
        ),
      },
      {
        key: "status",
        content: (
          <Status
            appearance={getUtilizationColor(member.workload.utilization)}
            text={getUtilizationStatus(member.workload.utilization)}
          />
        ),
      },
      {
        key: "assignments",
        content: (
          <Stack direction="horizontal" space="space.050">
            <Badge appearance="primary">
              {member.workload.assignedIssues}P
            </Badge>
            <Badge appearance="default">
              {member.workload.capacity - member.workload.assignedIssues}S
            </Badge>
          </Stack>
        ),
      },
      {
        key: "expertise",
        content: (
          <Stack direction="horizontal" space="space.050">
            {member.skills.slice(0, 2).map((skill) => (
              <Lozenge key={skill} appearance="neutral" isBold={false}>
                {skill}
              </Lozenge>
            ))}
          </Stack>
        ),
      },
      {
        key: "performance",
        content: (
          <Stack direction="horizontal" space="space.050" alignBlock="center">
            <Badge
              appearance={
                member.performance.completionRate > 0.8
                  ? "success"
                  : "information"
              }
            >
              {formatPercentage(member.performance.completionRate)}%
            </Badge>
          </Stack>
        ),
      },
    ],
  }));

  const OverviewTab = () => (
    <Stack space="space.300">
      {/* Key Metrics */}
      <Box>
        <Text as="h3">Team Capacity Overview</Text>
        <Stack direction="horizontal" space="space.200">
          <Box
            xcss={{
              padding: "space.200",
              backgroundColor: "color.background.success.subtle",
              borderRadius: "border.radius",
            }}
          >
            <Stack space="space.100">
              <Text weight="bold" size="xlarge">
                {analytics?.totalIssues || 0}
              </Text>
              <Text color="color.text.subtle">Total Issues</Text>
            </Stack>
          </Box>

          <Box
            xcss={{
              padding: "space.200",
              backgroundColor: "color.background.information.subtle",
              borderRadius: "border.radius",
            }}
          >
            <Stack space="space.100">
              <Text weight="bold" size="xlarge">
                {analytics?.assignedIssues || 0}
              </Text>
              <Text color="color.text.subtle">Assigned Issues</Text>
            </Stack>
          </Box>

          <Box
            xcss={{
              padding: "space.200",
              backgroundColor: "color.background.warning.subtle",
              borderRadius: "border.radius",
            }}
          >
            <Stack space="space.100">
              <Text weight="bold" size="xlarge">
                {formatPercentage(analytics?.teamUtilization || 0)}%
              </Text>
              <Text color="color.text.subtle">Team Utilization</Text>
            </Stack>
          </Box>

          <Box
            xcss={{
              padding: "space.200",
              backgroundColor: "color.background.danger.subtle",
              borderRadius: "border.radius",
            }}
          >
            <Stack space="space.100">
              <Text weight="bold" size="xlarge">
                {analytics?.overloadedMembers || 0}
              </Text>
              <Text color="color.text.subtle">Overloaded</Text>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Team Table */}
      <Box>
        <Stack
          direction="horizontal"
          space="space.100"
          alignInline="space-between"
        >
          <Text as="h4">Team Members</Text>
          <Stack direction="horizontal" space="space.100">
            <Button
              appearance="subtle"
              onClick={loadDashboardData}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Text size="small" color="color.text.subtle">
              Auto-refresh: 60s
            </Text>
          </Stack>
        </Stack>

        <DynamicTable
          head={teamTableHead}
          rows={teamTableRows}
          isLoading={loading}
          loadingSpinnerSize="large"
        />
      </Box>
    </Stack>
  );

  const AnalyticsTab = () => (
    <Stack space="space.300">
      <Box>
        <Text as="h3">Advanced Analytics</Text>
        <Text color="color.text.subtle">
          AI-powered insights for optimal team performance
        </Text>
      </Box>

      {/* Performance Metrics */}
      <Stack direction="horizontal" space="space.200">
        <Box
          xcss={{
            padding: "space.200",
            backgroundColor: "color.background.discovery.subtle",
            borderRadius: "border.radius",
            width: "50%",
          }}
        >
          <Stack space="space.150">
            <Text weight="medium">🎯 Team Performance</Text>
            <Stack space="space.100">
              <Stack
                direction="horizontal"
                space="space.100"
                alignInline="space-between"
              >
                <Text>Average Score</Text>
                <Badge appearance="success">
                  {analytics?.avgPerformance || 0}/10
                </Badge>
              </Stack>
              <Stack
                direction="horizontal"
                space="space.100"
                alignInline="space-between"
              >
                <Text>Collaboration Index</Text>
                <Badge appearance="information">
                  {analytics?.collaborationIndex || 0}%
                </Badge>
              </Stack>
              <Stack
                direction="horizontal"
                space="space.100"
                alignInline="space-between"
              >
                <Text>Delivery Rate</Text>
                <Badge appearance="discovery">
                  {analytics?.deliveryRate || 0}%
                </Badge>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Box
          xcss={{
            padding: "space.200",
            backgroundColor: "color.background.neutral.subtle",
            borderRadius: "border.radius",
            width: "50%",
          }}
        >
          <Stack space="space.150">
            <Text weight="medium">📊 Workload Distribution</Text>
            <Stack space="space.100">
              <Text size="small">Average Utilization</Text>
              <ProgressBar
                value={analytics?.avgUtilization || 0}
                appearance={getUtilizationColor(analytics?.avgUtilization || 0)}
              />
              <Text size="small" color="color.text.subtle">
                {Math.round((analytics?.avgUtilization || 0) * 100)}% team
                capacity
              </Text>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {/* AI Recommendations */}
      {analytics?.recommendations && analytics.recommendations.length > 0 && (
        <Box>
          <Text as="h4">🤖 AI Recommendations</Text>
          <Stack space="space.100">
            {analytics.recommendations.map((rec, index) => (
              <Box
                key={index}
                xcss={{
                  padding: "space.150",
                  backgroundColor: "color.background.discovery.subtle",
                  borderRadius: "border.radius",
                }}
              >
                <Stack space="space.100">
                  <Stack
                    direction="horizontal"
                    space="space.100"
                    alignBlock="center"
                  >
                    <Badge appearance="discovery">{rec.priority}</Badge>
                    <Text weight="medium">{rec.title}</Text>
                  </Stack>
                  <Text color="color.text.subtle">{rec.description}</Text>
                  {rec.impact && (
                    <Text size="small" color="color.text.success">
                      Expected impact: {rec.impact}
                    </Text>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
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
          <Button appearance="primary" onClick={loadDashboardData}>
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
            <Heading size="large">🏢 Team Capacity Dashboard</Heading>
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
              onClick={loadDashboardData}
              isLoading={loading}
            >
              🔄 Refresh
            </Button>
          </Stack>

          {/* Main Dashboard Content */}
          <Tabs>
            <TabList>
              <Tab>Team Overview</Tab>
              <Tab>Analytics</Tab>
            </TabList>

            <TabPanel>
              <OverviewTab />
            </TabPanel>

            <TabPanel>
              <AnalyticsTab />
            </TabPanel>
          </Tabs>
        </Stack>
      </Box>
    </ErrorBoundary>
  );
};

ForgeReconciler.render(<CapacityDashboard />);
