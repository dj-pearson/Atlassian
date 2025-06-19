import React, { useState, useEffect } from "react";
import {
  Text,
  Box,
  Stack,
  Heading,
  Button,
  SectionMessage,
  TextField,
  Checkbox,
  Select,
  Modal,
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const UserSettings = ({ isOpen, onClose, userAccountId }) => {
  const [settings, setSettings] = useState({
    maxCapacity: 10,
    workingHours: 8,
    notificationPreferences: {
      overloadAlert: true,
      dailyDigest: false,
      weeklyReport: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && userAccountId) {
      loadUserSettings();
    }
  }, [isOpen, userAccountId]);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const response = await invoke("getUserCapacitySettings", {
        accountId: userAccountId,
      });

      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await invoke("updateUserCapacitySettings", {
        accountId: userAccountId,
        settings,
      });

      if (response.success) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: response.error || "Failed to save settings",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleCapacityChange = (value) => {
    setSettings((prev) => ({
      ...prev,
      maxCapacity: Math.max(1, Math.min(20, parseInt(value) || 10)),
    }));
  };

  const handleWorkingHoursChange = (value) => {
    setSettings((prev) => ({
      ...prev,
      workingHours: Math.max(1, Math.min(12, parseInt(value) || 8)),
    }));
  };

  const handleNotificationChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <ModalDialog width="medium">
        <ModalHeader>
          <Heading as="h2">Capacity Settings</Heading>
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

            <Stack space="space.200">
              <Heading as="h3" size="small">
                Capacity Limits
              </Heading>

              <TextField
                label="Maximum Concurrent Assignments"
                value={settings.maxCapacity.toString()}
                onChange={handleCapacityChange}
                placeholder="10"
                description="Maximum number of issues you can handle simultaneously"
              />

              <TextField
                label="Working Hours per Day"
                value={settings.workingHours.toString()}
                onChange={handleWorkingHoursChange}
                placeholder="8"
                description="Your daily working hours for capacity calculations"
              />
            </Stack>

            <Stack space="space.200">
              <Heading as="h3" size="small">
                Notification Preferences
              </Heading>

              <Checkbox
                isChecked={settings.notificationPreferences.overloadAlert}
                onChange={(checked) =>
                  handleNotificationChange("overloadAlert", checked)
                }
                label="Overload Alerts"
                description="Get notified when approaching capacity limits"
              />

              <Checkbox
                isChecked={settings.notificationPreferences.dailyDigest}
                onChange={(checked) =>
                  handleNotificationChange("dailyDigest", checked)
                }
                label="Daily Digest"
                description="Receive daily summary of your assignments"
              />

              <Checkbox
                isChecked={settings.notificationPreferences.weeklyReport}
                onChange={(checked) =>
                  handleNotificationChange("weeklyReport", checked)
                }
                label="Weekly Report"
                description="Get weekly capacity and productivity insights"
              />
            </Stack>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button appearance="subtle" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={saveSettings}
            isLoading={saving}
            isDisabled={loading}
          >
            Save Settings
          </Button>
        </ModalFooter>
      </ModalDialog>
    </Modal>
  );
};

export default UserSettings;
