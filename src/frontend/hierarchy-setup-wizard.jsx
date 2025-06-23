import React, { useState, useEffect } from "react";
import { invoke } from "@forge/bridge";
import {
  Box,
  Button,
  Checkbox,
  Form,
  FormHeader,
  FormSection,
  FormFooter,
  Grid,
  Heading,
  Text,
  Textfield,
  Select,
  Option,
  Stack,
  Lozenge,
  ProgressBar,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  UserPicker,
} from "@atlaskit/ui";
import { view } from "@forge/bridge";

const HierarchySetupWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState(null);
  const [organizationConfig, setOrganizationConfig] = useState({
    organizationName: "",
    organizationId: "",
    levels: [],
    autoCreateTeams: false,
    defaultTeams: [],
  });
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = 4;

  useEffect(() => {
    loadSetupData();
  }, []);

  const loadSetupData = async () => {
    try {
      setIsLoading(true);
      const response = await invoke("getHierarchySetupData", {
        suggestFromJira: true,
      });

      if (response.success) {
        setSetupData(response.setupData);

        // Auto-populate organization name from user's domain
        const userEmail = response.setupData.currentUser.emailAddress;
        const domain = userEmail.split("@")[1];
        const orgName =
          domain.split(".")[0].charAt(0).toUpperCase() +
          domain.split(".")[0].slice(1);

        setOrganizationConfig((prev) => ({
          ...prev,
          organizationName: orgName,
          organizationId: domain.replace(/[^a-z0-9]/g, "-").toLowerCase(),
          levels: response.setupData.defaultHierarchyLevels,
        }));
      } else {
        setError("Failed to load setup data");
      }
    } catch (err) {
      console.error("Error loading setup data:", err);
      setError("Failed to load setup data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);

      // Initialize the hierarchy
      const initResponse = await invoke("initializeHierarchy", {
        organizationId: organizationConfig.organizationId,
        config: organizationConfig,
      });

      if (initResponse.success) {
        // Create teams if specified
        if (organizationConfig.autoCreateTeams && teams.length > 0) {
          for (const team of teams) {
            await invoke("createHierarchyTeam", {
              teamData: {
                ...team,
                organizationId: organizationConfig.organizationId,
              },
            });
          }
        }

        // Close wizard and refresh parent
        await view.close();
      } else {
        setError(initResponse.error || "Failed to initialize hierarchy");
      }
    } catch (err) {
      console.error("Error finishing setup:", err);
      setError("Failed to complete setup");
    } finally {
      setIsLoading(false);
    }
  };

  const addTeam = () => {
    setTeams([
      ...teams,
      {
        name: "",
        description: "",
        level: 3,
        teamLeadId: null,
        projectKey: null,
      },
    ]);
  };

  const updateTeam = (index, field, value) => {
    const updatedTeams = [...teams];
    updatedTeams[index][field] = value;
    setTeams(updatedTeams);
  };

  const removeTeam = (index) => {
    setTeams(teams.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderOrganizationStep();
      case 3:
        return renderHierarchyStep();
      case 4:
        return renderTeamsStep();
      default:
        return null;
    }
  };

  const renderWelcomeStep = () => (
    <Box padding="large">
      <Stack space="large">
        <Heading level="h600">Welcome to Team Hierarchy Setup</Heading>
        <Text>
          This wizard will help you set up a multi-level team hierarchy for your
          organization. This enables:
        </Text>
        <Stack space="small">
          <Text>✅ Role-based access control</Text>
          <Text>✅ Hierarchical team management</Text>
          <Text>✅ Scalable permission structure</Text>
          <Text>✅ Cross-team collaboration</Text>
        </Stack>

        {setupData?.suggestedStructure && (
          <Box backgroundColor="discovery" padding="medium">
            <Heading level="h700">Detected Structure</Heading>
            <Text>
              We found {setupData.availableProjects.length} projects and suggest
              a{setupData.suggestedStructure.recommendedLevels}-level hierarchy.
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );

  const renderOrganizationStep = () => (
    <Box padding="large">
      <Stack space="large">
        <Heading level="h600">Organization Configuration</Heading>

        <Form>
          <FormSection>
            <Textfield
              label="Organization Name"
              value={organizationConfig.organizationName}
              onChange={(value) =>
                setOrganizationConfig((prev) => ({
                  ...prev,
                  organizationName: value,
                }))
              }
              placeholder="Enter your organization name"
              isRequired
            />

            <Textfield
              label="Organization ID"
              value={organizationConfig.organizationId}
              onChange={(value) =>
                setOrganizationConfig((prev) => ({
                  ...prev,
                  organizationId: value
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "-"),
                }))
              }
              description="Unique identifier for your organization (auto-generated from name)"
              isRequired
            />
          </FormSection>
        </Form>
      </Stack>
    </Box>
  );

  const renderHierarchyStep = () => (
    <Box padding="large">
      <Stack space="large">
        <Heading level="h600">Hierarchy Structure</Heading>
        <Text>
          Configure the levels of your organizational hierarchy. You can
          customize these later.
        </Text>

        <Stack space="medium">
          {organizationConfig.levels.map((level, index) => (
            <Box key={index} backgroundColor="neutral" padding="medium">
              <Grid
                templateColumns="1fr 2fr 3fr"
                gap="medium"
                alignItems="center"
              >
                <Lozenge appearance="inprogress">Level {level.level}</Lozenge>
                <Textfield
                  value={level.name}
                  onChange={(value) => {
                    const updatedLevels = [...organizationConfig.levels];
                    updatedLevels[index].name = value;
                    setOrganizationConfig((prev) => ({
                      ...prev,
                      levels: updatedLevels,
                    }));
                  }}
                />
                <Text size="small">{level.description}</Text>
              </Grid>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );

  const renderTeamsStep = () => (
    <Box padding="large">
      <Stack space="large">
        <Heading level="h600">Initial Teams Setup</Heading>

        <Checkbox
          isChecked={organizationConfig.autoCreateTeams}
          onChange={(checked) =>
            setOrganizationConfig((prev) => ({
              ...prev,
              autoCreateTeams: checked,
            }))
          }
          label="Create initial teams automatically"
          description="This will create teams based on your current projects and structure"
        />

        {organizationConfig.autoCreateTeams && (
          <Stack space="medium">
            <Box>
              <Button onClick={addTeam} appearance="primary">
                Add Team
              </Button>
            </Box>

            {teams.map((team, index) => (
              <Box key={index} backgroundColor="neutral" padding="medium">
                <Stack space="small">
                  <Grid
                    templateColumns="2fr 1fr auto"
                    gap="medium"
                    alignItems="end"
                  >
                    <Textfield
                      label="Team Name"
                      value={team.name}
                      onChange={(value) => updateTeam(index, "name", value)}
                      placeholder="Enter team name"
                    />

                    <Select
                      label="Level"
                      value={team.level}
                      onChange={(value) =>
                        updateTeam(index, "level", parseInt(value))
                      }
                    >
                      {organizationConfig.levels.map((level) => (
                        <Option key={level.level} value={level.level}>
                          {level.name}
                        </Option>
                      ))}
                    </Select>

                    <Button
                      onClick={() => removeTeam(index)}
                      appearance="danger"
                    >
                      Remove
                    </Button>
                  </Grid>

                  <Textfield
                    label="Description"
                    value={team.description}
                    onChange={(value) =>
                      updateTeam(index, "description", value)
                    }
                    placeholder="Team description (optional)"
                  />

                  {setupData?.availableProjects && (
                    <Select
                      label="Associated Project"
                      value={team.projectKey || ""}
                      onChange={(value) =>
                        updateTeam(index, "projectKey", value)
                      }
                    >
                      <Option value="">No project association</Option>
                      {setupData.availableProjects.map((project) => (
                        <Option key={project.key} value={project.key}>
                          {project.name} ({project.key})
                        </Option>
                      ))}
                    </Select>
                  )}
                </Stack>
              </Box>
            ))}

            {setupData?.suggestedStructure?.suggestedTeams && (
              <Box backgroundColor="discovery" padding="medium">
                <Heading level="h700">Suggested Teams</Heading>
                <Text>Based on your projects:</Text>
                <Stack space="small">
                  {setupData.suggestedStructure.suggestedTeams.map(
                    (suggestion, index) => (
                      <Box key={index}>
                        <Button
                          appearance="link"
                          onClick={() => {
                            setTeams((prev) => [
                              ...prev,
                              {
                                name: suggestion.name,
                                description: suggestion.description,
                                level: suggestion.level,
                                teamLeadId: null,
                                projectKey: suggestion.projects[0] || null,
                              },
                            ]);
                          }}
                        >
                          + Add {suggestion.name}
                        </Button>
                        <Text size="small"> - {suggestion.description}</Text>
                      </Box>
                    )
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );

  if (isLoading && !setupData) {
    return (
      <Box padding="large">
        <Stack space="medium" alignItems="center">
          <ProgressBar isIndeterminate />
          <Text>Loading setup data...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Progress Header */}
      <Box backgroundColor="neutral" padding="medium">
        <Stack space="small">
          <Text weight="bold">
            Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
          </Text>
          <ProgressBar progress={currentStep / totalSteps} />
        </Stack>
      </Box>

      {/* Error Display */}
      {error && (
        <Box backgroundColor="danger" padding="medium">
          <Text color="danger">{error}</Text>
        </Box>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Footer */}
      <Box backgroundColor="neutral" padding="medium">
        <Stack
          direction="horizontal"
          space="medium"
          justifyContent="space-between"
        >
          <Button onClick={handlePrevious} isDisabled={currentStep === 1}>
            Previous
          </Button>

          <Stack direction="horizontal" space="small">
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                appearance="primary"
                isDisabled={!isStepValid(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                appearance="primary"
                isLoading={isLoading}
                isDisabled={!isStepValid(currentStep)}
              >
                Complete Setup
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

const getStepTitle = (step) => {
  const titles = {
    1: "Welcome",
    2: "Organization",
    3: "Hierarchy",
    4: "Teams",
  };
  return titles[step] || "";
};

const isStepValid = (step) => {
  // Add validation logic for each step
  return true; // Simplified for now
};

export default HierarchySetupWizard;
