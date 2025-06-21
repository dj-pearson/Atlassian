import React, { useState, useEffect } from "react";
import {
  Text,
  Box,
  Stack,
  Heading,
  Button,
  SectionMessage,
  TextField,
  Modal,
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  Head,
  Row,
  Cell,
  Badge,
  Lozenge,
  Spinner,
  ButtonGroup,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const CapacityAdminPanel = ({ isOpen, onClose, projectKey }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [autoAssignmentStatus, setAutoAssignmentStatus] = useState({
    processing: false,
    results: null,
  });

  useEffect(() => {
    if (isOpen && projectKey) {
      loadTeamCapacityData();
    }
  }, [isOpen, projectKey]);

  const loadTeamCapacityData = async () => {
    try {
      setLoading(true);
      const response = await invoke("getCapacityData", { projectKey });

      if (response.users) {
        // Load individual settings for each user
        const usersWithSettings = await Promise.all(
          response.users.map(async (user) => {
            try {
              const settingsResponse = await invoke("getUserCapacitySettings", {
                accountId: user.userAccountId,
              });
              return {
                ...user,
                settings: settingsResponse.data,
              };
            } catch (error) {
              return {
                ...user,
                settings: {
                  maxCapacity: 10,
                  workingHours: 8,
                  totalCapacity: 40,
                },
              };
            }
          })
        );
        setTeamMembers(usersWithSettings);
      }
    } catch (error) {
      console.error("Error loading team capacity data:", error);
      setMessage({ type: "error", text: "Failed to load team data" });
    } finally {
      setLoading(false);
    }
  };

  const updateUserCapacity = async (userAccountId, newSettings) => {
    try {
      setSaving(true);
      const response = await invoke("updateUserCapacitySettings", {
        accountId: userAccountId,
        settings: newSettings,
      });

      if (response.success) {
        // Update local state
        setTeamMembers((prev) =>
          prev.map((user) =>
            user.userAccountId === userAccountId
              ? { ...user, settings: response.data }
              : user
          )
        );
        setMessage({
          type: "success",
          text: "Capacity settings updated successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: response.error || "Failed to update settings",
        });
      }
    } catch (error) {
      console.error("Error updating capacity:", error);
      setMessage({ type: "error", text: "Failed to update capacity settings" });
    } finally {
      setSaving(false);
    }
  };

  const runAutoAssignment = async () => {
    try {
      setAutoAssignmentStatus({ processing: true, results: null });

      // Get all issues without assignees in the project
      const response = await invoke("bulkAutoAssignFromMultiAssignee", {
        projectKey,
      });

      setAutoAssignmentStatus({
        processing: false,
        results: response,
      });

      if (response.success) {
        setMessage({
          type: "success",
          text: `Auto-assignment completed! ${response.assignedCount} issues updated.`,
        });
      } else {
        setMessage({
          type: "error",
          text: response.error || "Auto-assignment failed",
        });
      }
    } catch (error) {
      console.error("Error running auto-assignment:", error);
      setAutoAssignmentStatus({ processing: false, results: null });
      setMessage({ type: "error", text: "Auto-assignment failed" });
    }
  };

  const getUtilizationColor = (utilization) => {
    if (utilization >= 1.0) return "red";
    if (utilization >= 0.8) return "yellow";
    return "green";
  };

  const getHealthStatusAppearance = (status) => {
    switch (status) {
      case "optimal":
        return "success";
      case "busy":
        return "inprogress";
      case "overloaded":
        return "removed";
      default:
        return "default";
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="xlarge">
      <ModalDialog>
        <ModalHeader>
          <Heading as="h2">Team Capacity Management</Heading>
          <Text>Project: {projectKey}</Text>
        </ModalHeader>

        <ModalBody>
          <Stack space="space.300">
            {message && (
              <SectionMessage
                appearance={message.type === "error" ? "error" : "confirmation"}
                title={message.type === "error" ? "Error" : "Success"}
              >
                <Text>{message.text}</Text>
              </SectionMessage>
            )}

            {/* Auto-Assignment Section */}
            <Box
              padding="space.200"
              backgroundColor="color.background.accent.gray.subtlest"
            >
              <Stack space="space.200">
                <Heading as="h3" size="small">
                  🤖 Auto-Assignment from Multi-Assignees
                </Heading>
                <Text>
                  Automatically set the first multi-assignee as the default
                  assignee for issues without current assignees. This helps
                  ensure proper workload tracking.
                </Text>

                <ButtonGroup>
                  <Button
                    appearance="primary"
                    onClick={runAutoAssignment}
                    isDisabled={autoAssignmentStatus.processing}
                  >
                    {autoAssignmentStatus.processing ? (
                      <>
                        <Spinner size="small" /> Processing...
                      </>
                    ) : (
                      "Run Auto-Assignment"
                    )}
                  </Button>
                </ButtonGroup>

                {autoAssignmentStatus.results && (
                  <Box
                    padding="space.100"
                    backgroundColor="color.background.neutral"
                  >
                    <Text weight="bold">Assignment Results:</Text>
                    <Text>
                      • Issues processed:{" "}
                      {autoAssignmentStatus.results.processedCount || 0}
                    </Text>
                    <Text>
                      • Issues assigned:{" "}
                      {autoAssignmentStatus.results.assignedCount || 0}
                    </Text>
                    <Text>
                      • Skipped (already assigned):{" "}
                      {autoAssignmentStatus.results.skippedCount || 0}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Team Capacity Table */}
            <Stack space="space.200">
              <Heading as="h3" size="small">
                👥 Team Capacity Settings
              </Heading>

              {loading ? (
                <Box padding="space.400">
                  <Spinner size="large" />
                  <Text>Loading team data...</Text>
                </Box>
              ) : (
                <Table>
                  <Head>
                    <Cell>
                      <Text weight="bold">Team Member</Text>
                    </Cell>
                    <Cell>
                      <Text weight="bold">Current Utilization</Text>
                    </Cell>
                    <Cell>
                      <Text weight="bold">Capacity Settings</Text>
                    </Cell>
                    <Cell>
                      <Text weight="bold">Status</Text>
                    </Cell>
                    <Cell>
                      <Text weight="bold">Actions</Text>
                    </Cell>
                  </Head>
                  {teamMembers.map((user) => (
                    <Row key={user.userAccountId}>
                      <Cell>
                        <Stack space="space.050">
                          <Text weight="bold">{user.displayName}</Text>
                          <Text size="small" color="color.text.subtlest">
                            {user.email}
                          </Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="space.050">
                          <Text>
                            {Math.round(user.utilizationRate * 100)}% (
                            {user.primary +
                              user.secondary +
                              user.reviewer +
                              user.collaborator}
                            /{user.settings?.totalCapacity || 40}h)
                          </Text>
                          <Lozenge
                            appearance={getUtilizationColor(
                              user.utilizationRate
                            )}
                          >
                            {Math.round(user.utilizationRate * 100)}%
                          </Lozenge>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Stack space="space.050">
                          <Text size="small">
                            Max Assignments: {user.settings?.maxCapacity || 10}
                          </Text>
                          <Text size="small">
                            Working Hours: {user.settings?.workingHours || 8}
                            h/day
                          </Text>
                          <Text size="small">
                            Total Capacity: {user.settings?.totalCapacity || 40}
                            h/week
                          </Text>
                        </Stack>
                      </Cell>
                      <Cell>
                        <Badge
                          appearance={getHealthStatusAppearance(
                            user.healthStatus
                          )}
                        >
                          {user.healthStatus?.charAt(0).toUpperCase() +
                            user.healthStatus?.slice(1)}
                        </Badge>
                      </Cell>
                      <Cell>
                        <Button
                          appearance="subtle"
                          onClick={() => setSelectedUser(user)}
                          size="compact"
                        >
                          Edit Settings
                        </Button>
                      </Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Stack>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>
            Close
          </Button>
          <Button appearance="primary" onClick={loadTeamCapacityData}>
            Refresh Data
          </Button>
        </ModalFooter>
      </ModalDialog>

      {/* User Settings Modal */}
      {selectedUser && (
        <UserCapacityModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={updateUserCapacity}
          saving={saving}
        />
      )}
    </Modal>
  );
};

// Individual User Capacity Settings Modal
const UserCapacityModal = ({ user, isOpen, onClose, onSave, saving }) => {
  const [settings, setSettings] = useState({
    maxCapacity: 10,
    workingHours: 8,
    notificationPreferences: {
      overloadAlert: true,
      dailyDigest: false,
      weeklyReport: true,
    },
  });

  useEffect(() => {
    if (user?.settings) {
      setSettings(user.settings);
    }
  }, [user]);

  const handleSave = async () => {
    await onSave(user.userAccountId, settings);
    onClose();
  };

  const handleCapacityChange = (value) => {
    setSettings((prev) => ({
      ...prev,
      maxCapacity: Math.max(1, Math.min(50, parseInt(value) || 10)),
    }));
  };

  const handleWorkingHoursChange = (value) => {
    setSettings((prev) => ({
      ...prev,
      workingHours: Math.max(1, Math.min(12, parseInt(value) || 8)),
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <ModalDialog width="medium">
        <ModalHeader>
          <Heading as="h3">Capacity Settings: {user.displayName}</Heading>
        </ModalHeader>

        <ModalBody>
          <Stack space="space.300">
            <TextField
              label="Maximum Concurrent Assignments"
              value={settings.maxCapacity.toString()}
              onChange={handleCapacityChange}
              placeholder="10"
              description="Maximum number of issues this user can handle simultaneously"
            />

            <TextField
              label="Working Hours per Day"
              value={settings.workingHours.toString()}
              onChange={handleWorkingHoursChange}
              placeholder="8"
              description="Daily working hours for capacity calculations (weekly = daily × 5)"
            />

            <Box padding="space.200" backgroundColor="color.background.neutral">
              <Stack space="space.100">
                <Text weight="bold">Calculated Weekly Capacity:</Text>
                <Text>{settings.workingHours * 5} hours per week</Text>
                <Text size="small" color="color.text.subtlest">
                  Based on {settings.workingHours} hours/day × 5 days/week
                </Text>
              </Stack>
            </Box>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button appearance="primary" onClick={handleSave} isDisabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </ModalFooter>
      </ModalDialog>
    </Modal>
  );
};

export default CapacityAdminPanel;
