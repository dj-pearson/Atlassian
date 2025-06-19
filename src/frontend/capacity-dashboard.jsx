import React, { useState, useEffect } from "react";
import ForgeReconciler, {
  Text,
  Box,
  Stack,
  Heading,
  Badge,
  SectionMessage,
  Spinner,
} from "@forge/react";

const App = () => {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState([]);

  useEffect(() => {
    // Simulate loading team data
    const loadTeamData = async () => {
      setLoading(true);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTeamData([
        {
          id: 1,
          name: "John Smith",
          primaryAssignments: 3,
          secondaryAssignments: 5,
          totalCapacity: 10,
          utilizationRate: 0.8,
        },
        {
          id: 2,
          name: "Jane Doe",
          primaryAssignments: 2,
          secondaryAssignments: 4,
          totalCapacity: 8,
          utilizationRate: 0.75,
        },
        {
          id: 3,
          name: "Bob Johnson",
          primaryAssignments: 4,
          secondaryAssignments: 6,
          totalCapacity: 10,
          utilizationRate: 0.95,
        },
      ]);

      setLoading(false);
    };

    loadTeamData();
  }, []);

  const getCapacityBadgeAppearance = (utilizationRate) => {
    if (utilizationRate >= 0.9) return "removed";
    if (utilizationRate >= 0.8) return "important";
    if (utilizationRate >= 0.6) return "primary";
    return "added";
  };

  const getOverloadedMembers = () => {
    return teamData.filter((member) => member.utilizationRate >= 0.9);
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

  const overloadedMembers = getOverloadedMembers();

  return (
    <Box padding="space.300">
      <Stack space="space.300">
        <Heading as="h1">Team Capacity Dashboard</Heading>

        <Text>
          Multiple Assignees Manager - Modern UI Kit Implementation v3.0.0
        </Text>

        {overloadedMembers.length > 0 && (
          <SectionMessage appearance="warning" title="Capacity Alert">
            <Text>
              {overloadedMembers.length} team{" "}
              {overloadedMembers.length === 1 ? "member is" : "members are"}{" "}
              approaching capacity limits. Consider redistributing work:{" "}
              {overloadedMembers.map((m) => m.name).join(", ")}
            </Text>
          </SectionMessage>
        )}

        <Box padding="space.200">
          <Stack space="space.200">
            <Heading as="h2" size="medium">
              Team Overview
            </Heading>

            <Stack space="space.150">
              {teamData.map((member) => (
                <Box key={member.id} padding="space.150">
                  <Stack space="space.100">
                    <Text weight="semibold">{member.name}</Text>
                    <Text>
                      Primary: {member.primaryAssignments} • Secondary:{" "}
                      {member.secondaryAssignments} • Total:{" "}
                      {member.primaryAssignments + member.secondaryAssignments}/
                      {member.totalCapacity}
                    </Text>
                    <Text>
                      Capacity:{" "}
                      <Badge
                        appearance={getCapacityBadgeAppearance(
                          member.utilizationRate
                        )}
                      >
                        {Math.round(member.utilizationRate * 100)}%
                      </Badge>
                    </Text>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Text size="small">
          Dashboard v3.0.0 • Using @forge/react v11.2.3 • Modern UI Kit
          Components
        </Text>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<App />);
