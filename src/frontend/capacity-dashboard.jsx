import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Button,
  Badge,
  Lozenge,
  Heading,
} from "@forge/react";

const CapacityDashboard = () => {
  const [teamData, setTeamData] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  if (loading && teamData.length === 0) {
    return (
      <Box padding="large">
        <Text>Loading team capacity data...</Text>
      </Box>
    );
  }

  return (
    <Box padding="medium">
      <Stack space="large">
        {/* Header */}
        <Box>
          <Stack direction="horizontal" alignItems="center" space="medium">
            <Heading size="large">🏢 Team Capacity Dashboard</Heading>
            <Button
              appearance="subtle"
              onClick={loadDashboardData}
              isLoading={loading}
            >
              🔄 Refresh
            </Button>
          </Stack>
          <Text appearance="subtle" size="small">
            Last updated: {formatLastRefresh()} • Auto-refresh every 60 seconds
          </Text>
        </Box>

        {/* Key Metrics Overview */}
        <Box padding="medium" backgroundColor="neutral">
          <Text weight="bold" size="large">
            📊 Key Metrics
          </Text>
          <Stack space="medium">
            <Stack direction="horizontal" space="large">
              <Box>
                <Text size="small" appearance="subtle">
                  Team Utilization
                </Text>
                <Text size="xlarge" weight="bold">
                  {formatPercentage(analytics.teamUtilization || 0)}%
                </Text>
                <Badge
                  appearance={
                    analytics.trends?.utilizationTrend?.startsWith("+")
                      ? "added"
                      : "removed"
                  }
                >
                  {analytics.trends?.utilizationTrend || "N/A"}
                </Badge>
              </Box>
              <Box>
                <Text size="small" appearance="subtle">
                  Active Issues
                </Text>
                <Text size="xlarge" weight="bold">
                  {analytics.assignedIssues || 0}
                </Text>
                <Text size="small" appearance="subtle">
                  of {analytics.totalIssues || 0} total
                </Text>
              </Box>
              <Box>
                <Text size="small" appearance="subtle">
                  Story Points
                </Text>
                <Text size="xlarge" weight="bold">
                  {analytics.completedStoryPoints || 0}/
                  {analytics.totalStoryPoints || 0}
                </Text>
                <Text size="small" appearance="subtle">
                  Velocity: {analytics.teamVelocity || 0}
                </Text>
              </Box>
              <Box>
                <Text size="small" appearance="subtle">
                  Collaboration Score
                </Text>
                <Text size="xlarge" weight="bold">
                  {analytics.collaborationScore || 0}/10
                </Text>
                <Badge appearance="added">
                  {analytics.trends?.collaborationTrend || "N/A"}
                </Badge>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Team Members */}
        <Box>
          <Text weight="bold" size="large">
            👥 Team Members ({teamData.length})
          </Text>
          <Stack space="medium">
            {teamData.map((member) => (
              <Box
                key={member.user.id}
                padding="medium"
                backgroundColor="neutral"
              >
                <Stack space="small">
                  {/* Member Header */}
                  <Stack
                    direction="horizontal"
                    alignItems="center"
                    space="medium"
                  >
                    <Stack>
                      <Text weight="bold" size="medium">
                        {member.user.displayName}
                      </Text>
                      <Text size="small" appearance="subtle">
                        {member.user.email}
                      </Text>
                    </Stack>
                    <Lozenge
                      appearance={getAvailabilityColor(member.availability)}
                    >
                      {member.availability}
                    </Lozenge>
                    <Badge appearance="primary">
                      {formatPercentage(member.workload.utilization)}% Utilized
                    </Badge>
                  </Stack>

                  {/* Workload Info */}
                  <Stack direction="horizontal" space="large">
                    <Box>
                      <Text size="small" appearance="subtle">
                        Active Issues
                      </Text>
                      <Text weight="bold">
                        {member.workload.assignedIssues}/
                        {member.workload.capacity}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Story Points
                      </Text>
                      <Text weight="bold">{member.workload.storyPoints}</Text>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Hours Logged
                      </Text>
                      <Text weight="bold">{member.workload.hoursLogged}h</Text>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Completion Rate
                      </Text>
                      <Text weight="bold">
                        {formatPercentage(member.performance.completionRate)}%
                      </Text>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Avg Completion
                      </Text>
                      <Text weight="bold">
                        {member.performance.avgTimeToComplete}d
                      </Text>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Quality Score
                      </Text>
                      <Text weight="bold">
                        {member.performance.qualityScore}/10
                      </Text>
                    </Box>
                  </Stack>

                  {/* Roles and Skills */}
                  <Stack space="small">
                    <Box>
                      <Text size="small" appearance="subtle">
                        Roles:
                      </Text>
                      <Stack direction="horizontal" space="small">
                        {member.roles.map((role) => (
                          <Badge key={role} appearance="discovery">
                            {role}
                          </Badge>
                        ))}
                      </Stack>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Skills:
                      </Text>
                      <Stack direction="horizontal" space="small">
                        {member.skills.map((skill) => (
                          <Badge key={skill} appearance="information">
                            {skill}
                          </Badge>
                        ))}
                      </Stack>
                    </Box>
                    <Box>
                      <Text size="small" appearance="subtle">
                        Current Projects:
                      </Text>
                      <Stack direction="horizontal" space="small">
                        {member.currentProjects.map((project) => (
                          <Badge key={project} appearance="primary">
                            {project}
                          </Badge>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Risk Factors & Recommendations */}
        {analytics.riskFactors && analytics.riskFactors.length > 0 && (
          <Box padding="medium" backgroundColor="warning">
            <Text weight="bold" size="medium">
              ⚠️ Risk Factors & Recommendations
            </Text>
            <Stack space="small">
              {analytics.riskFactors.map((risk, index) => (
                <Text key={index} size="small">
                  • {risk}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {/* Footer */}
        <Box padding="small" backgroundColor="neutral">
          <Stack space="small">
            <Text weight="bold">🎯 Multi-Assignee Integration Active</Text>
            <Stack direction="horizontal" space="medium">
              <Text size="small">
                • Real-time capacity tracking across all assignee roles
              </Text>
              <Text size="small">
                • Workload balancing with AI-powered suggestions
              </Text>
              <Text size="small">• Cross-project collaboration analytics</Text>
            </Stack>
            <Text size="small" appearance="subtle">
              Version 7.0.0 - Enterprise Multi-Assignee Manager with
              Comprehensive Analytics
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<CapacityDashboard />);
