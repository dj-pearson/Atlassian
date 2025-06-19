import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Heading,
  Badge,
  SectionMessage,
  Spinner,
  Image,
  Button,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import { view } from "@forge/bridge";

const App = () => {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [error, setError] = useState(null);
  const [projectKey, setProjectKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [isLicensed, setIsLicensed] = useState(false);

  useEffect(() => {
    const loadProjectContext = async () => {
      try {
        const context = await view.getContext();
        const currentProjectKey = context?.extension?.project?.key;

        // Check license status
        const license = context?.license;
        setLicenseInfo(license);
        setIsLicensed(license?.active === true);

        if (currentProjectKey) {
          setProjectKey(currentProjectKey);
          await loadTeamData(currentProjectKey);
        } else {
          setError("Unable to determine project context");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading project context:", err);
        setError("Failed to load project context");
        setLoading(false);
      }
    };

    loadProjectContext();
  }, []);

  const loadTeamData = async (key) => {
    try {
      setLoading(true);
      setError(null);

      // For unlicensed apps, show limited demo data
      if (!isLicensed) {
        setTeamData({
          projectKey: key || "DEMO",
          teamMembers: [
            {
              accountId: "demo-1",
              displayName: "John Smith",
              primaryAssignments: 3,
              secondaryAssignments: 5,
              totalAssignments: 8,
              maxCapacity: 10,
              utilizationRate: 0.8,
              isOverloaded: false,
              recentIssues: [
                {
                  key: "DEMO-1",
                  summary: "Sample task",
                  status: "In Progress",
                  priority: "High",
                },
              ],
            },
            {
              accountId: "demo-2",
              displayName: "Jane Doe",
              primaryAssignments: 2,
              secondaryAssignments: 4,
              totalAssignments: 6,
              maxCapacity: 8,
              utilizationRate: 0.75,
              isOverloaded: false,
              recentIssues: [
                {
                  key: "DEMO-2",
                  summary: "Another task",
                  status: "To Do",
                  priority: "Medium",
                },
              ],
            },
          ],
          overloadedCount: 0,
          totalMembers: 2,
          averageUtilization: 0.77,
          lastUpdated: new Date().toISOString(),
          isDemo: true,
        });
        return;
      }

      // For licensed apps, attempt to fetch real data
      const response = await invoke("getTeamCapacity", { projectKey: key });

      if (response.success) {
        setTeamData(response.data);
      } else {
        throw new Error(response.error || "Failed to load team data");
      }
    } catch (err) {
      console.error("Error loading team data:", err);
      setError(err.message || "Failed to load team capacity data");

      // Fallback to demo data for development
      setTeamData({
        projectKey: key || "DEMO",
        teamMembers: [
          {
            accountId: "demo-1",
            displayName: "John Smith",
            primaryAssignments: 3,
            secondaryAssignments: 5,
            totalAssignments: 8,
            maxCapacity: 10,
            utilizationRate: 0.8,
            isOverloaded: false,
            recentIssues: [
              {
                key: "DEMO-1",
                summary: "Sample task",
                status: "In Progress",
                priority: "High",
              },
            ],
          },
          {
            accountId: "demo-2",
            displayName: "Jane Doe",
            primaryAssignments: 2,
            secondaryAssignments: 4,
            totalAssignments: 6,
            maxCapacity: 8,
            utilizationRate: 0.75,
            isOverloaded: false,
            recentIssues: [
              {
                key: "DEMO-2",
                summary: "Another task",
                status: "To Do",
                priority: "Medium",
              },
            ],
          },
          {
            accountId: "demo-3",
            displayName: "Bob Johnson",
            primaryAssignments: 4,
            secondaryAssignments: 6,
            totalAssignments: 10,
            maxCapacity: 10,
            utilizationRate: 0.95,
            isOverloaded: true,
            recentIssues: [
              {
                key: "DEMO-3",
                summary: "Critical bug",
                status: "In Progress",
                priority: "Highest",
              },
            ],
          },
        ],
        overloadedCount: 1,
        totalMembers: 3,
        averageUtilization: 0.83,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (projectKey) {
      setRefreshing(true);
      await loadTeamData(projectKey);
      setRefreshing(false);
    }
  };

  const handleUpgrade = () => {
    // In a real marketplace app, this would redirect to the billing page
    // For now, we'll show an informative message
    alert(
      "Upgrade functionality will be available when the app is published on Atlassian Marketplace. This demo shows the premium features that will be unlocked."
    );
  };

  const getCapacityBadgeAppearance = (utilizationRate) => {
    if (utilizationRate >= 0.9) return "removed";
    if (utilizationRate >= 0.8) return "important";
    if (utilizationRate >= 0.6) return "primary";
    return "added";
  };

  const formatUtilization = (rate) => {
    return Math.round(rate * 100);
  };

  const getStatusBadge = (isOverloaded, utilizationRate) => {
    if (isOverloaded) return { appearance: "removed", text: "Overloaded" };
    if (utilizationRate >= 0.8)
      return { appearance: "important", text: "High" };
    if (utilizationRate >= 0.6)
      return { appearance: "primary", text: "Moderate" };
    return { appearance: "added", text: "Available" };
  };

  if (loading) {
    return (
      <Box padding="space.300">
        <Stack space="space.200" alignItems="center">
          <Spinner size="medium" />
          <Text>Loading team capacity data...</Text>
        </Stack>
      </Box>
    );
  }

  if (error && !teamData) {
    return (
      <Box padding="space.300">
        <SectionMessage appearance="error" title="Error Loading Data">
          <Text>{error}</Text>
          <Button appearance="primary" onClick={handleRefresh}>
            Retry
          </Button>
        </SectionMessage>
      </Box>
    );
  }

  const overloadedMembers =
    teamData?.teamMembers?.filter((member) => member.isOverloaded) || [];

  return (
    <Box padding="space.300">
      <Stack space="space.300">
        <Stack space="space.200">
          <Heading as="h1">Team Capacity Dashboard</Heading>
          <Text>
            Project: {teamData?.projectKey || "Unknown"} •
            {teamData?.totalMembers || 0} team members • Average utilization:{" "}
            {formatUtilization(teamData?.averageUtilization || 0)}%
          </Text>

          <Box>
            <Button
              appearance="subtle"
              onClick={handleRefresh}
              isDisabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </Box>
        </Stack>

        {/* License Status Display */}
        {!isLicensed && (
          <SectionMessage
            appearance="discovery"
            title="Trial Mode - Upgrade to Premium"
          >
            <Stack space="space.200">
              <Text>
                You're viewing demo data. Upgrade to Premium to access real-time
                team capacity analytics, advanced features, and unlimited team
                members.
              </Text>
              <Button appearance="primary" onClick={handleUpgrade}>
                Upgrade to Premium - $5/month
              </Button>
            </Stack>
          </SectionMessage>
        )}

        {error && isLicensed && (
          <SectionMessage appearance="warning" title="Data Warning">
            <Text>Using demo data due to: {error}</Text>
          </SectionMessage>
        )}

        {teamData?.isDemo && (
          <SectionMessage appearance="information" title="Demo Mode">
            <Text>
              Showing sample team capacity data. Upgrade to view your actual
              project data.
            </Text>
          </SectionMessage>
        )}

        {overloadedMembers.length > 0 && (
          <SectionMessage appearance="warning" title="Capacity Alert">
            <Text>
              {overloadedMembers.length} team{" "}
              {overloadedMembers.length === 1 ? "member is" : "members are"}{" "}
              approaching capacity limits. Consider redistributing work:{" "}
              {overloadedMembers.map((m) => m.displayName).join(", ")}
            </Text>
          </SectionMessage>
        )}

        <Box padding="space.200">
          <Stack space="space.200">
            <Heading as="h2" size="medium">
              Team Overview
            </Heading>

            <Stack space="space.200">
              {teamData?.teamMembers?.map((member) => {
                const statusBadge = getStatusBadge(
                  member.isOverloaded,
                  member.utilizationRate
                );

                return (
                  <Box key={member.accountId} padding="space.200">
                    <Stack space="space.150">
                      <Stack space="space.100">
                        <Text weight="bold">{member.displayName}</Text>

                        <Text>
                          Primary: {member.primaryAssignments} • Secondary:{" "}
                          {member.secondaryAssignments} • Total:{" "}
                          {member.totalAssignments}/{member.maxCapacity}
                        </Text>

                        <Stack space="space.100" direction="horizontal">
                          <Text>Capacity:</Text>
                          <Badge
                            appearance={getCapacityBadgeAppearance(
                              member.utilizationRate
                            )}
                          >
                            {formatUtilization(member.utilizationRate)}%
                          </Badge>
                          <Badge appearance={statusBadge.appearance}>
                            {statusBadge.text}
                          </Badge>
                        </Stack>

                        {member.recentIssues &&
                          member.recentIssues.length > 0 && (
                            <Box padding="space.100">
                              <Text weight="semibold" size="small">
                                Recent Issues:
                              </Text>
                              <Stack space="space.050">
                                {member.recentIssues
                                  .slice(0, isLicensed ? 5 : 1)
                                  .map((issue) => (
                                    <Text key={issue.key} size="small">
                                      {issue.key}: {issue.summary} (
                                      {issue.status})
                                    </Text>
                                  ))}
                                {!isLicensed &&
                                  member.recentIssues.length > 1 && (
                                    <Text size="small" color="subtle">
                                      + {member.recentIssues.length - 1} more
                                      issues (Premium feature)
                                    </Text>
                                  )}
                              </Stack>
                            </Box>
                          )}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}

              {!isLicensed && (
                <Box padding="space.200">
                  <SectionMessage appearance="discovery">
                    <Stack space="space.100">
                      <Text weight="bold">Unlock Full Team Insights</Text>
                      <Text>Premium features include:</Text>
                      <Text>• Real-time Jira data integration</Text>
                      <Text>• Complete issue history per team member</Text>
                      <Text>• Advanced capacity analytics</Text>
                      <Text>• Workload balancing recommendations</Text>
                      <Text>• Cross-project insights</Text>
                    </Stack>
                  </SectionMessage>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>

        <Text size="small">
          Dashboard v4.0.0 • Using @forge/react v11.2.3 •
          {isLicensed ? "Premium" : "Trial Mode"} • Last updated:{" "}
          {teamData?.lastUpdated
            ? new Date(teamData.lastUpdated).toLocaleString()
            : "Never"}
        </Text>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<App />);
