import ForgeUI, {
  render,
  Fragment,
  Text,
  Strong,
  Tag,
  User,
  useState,
  useEffect,
  Button,
  Modal,
  Form,
  Select,
  Option,
  UserPicker,
  Stack,
  Box,
} from "@forge/ui";
import { invoke } from "@forge/bridge";

const MultiAssigneeField = () => {
  const [assignees, setAssignees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("Secondary");
  const [context, setContext] = useState(null);

  const roleOptions = [
    { label: "Primary", value: "Primary" },
    { label: "Secondary", value: "Secondary" },
    { label: "Reviewer", value: "Reviewer" },
    { label: "Collaborator", value: "Collaborator" },
  ];

  useEffect(async () => {
    // Load existing assignees for this issue
    try {
      const issueContext = await invoke("getIssueContext", {});
      if (issueContext.success && issueContext.issue) {
        setContext(issueContext.issue);

        // Load existing multi-assignees
        const multiAssignees = await invoke("getMultiAssignees", {
          issueKey: issueContext.issue.key,
        });

        if (multiAssignees.success && multiAssignees.data.assignees) {
          setAssignees(multiAssignees.data.assignees);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error loading assignees:", error);
    }
  }, []);

  const handleAddAssignee = async (formData) => {
    if (!formData.user || !formData.role) {
      return;
    }

    // Check if user is already assigned
    if (assignees.some((a) => a.accountId === formData.user)) {
      return; // User already assigned
    }

    const newAssignee = {
      accountId: formData.user,
      role: formData.role,
      assignedDate: new Date().toISOString(),
    };

    const updatedAssignees = [...assignees, newAssignee];
    setAssignees(updatedAssignees);

    // Save to storage
    if (context) {
      try {
        await invoke("updateMultiAssignees", {
          issueKey: context.key,
          assignees: updatedAssignees,
          roles: updatedAssignees.reduce((acc, assignee) => {
            acc[assignee.accountId] = assignee.role;
            return acc;
          }, {}),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error("Error saving assignees:", error);
      }
    }

    setIsModalOpen(false);
    setSelectedUser("");
    setSelectedRole("Secondary");
  };

  const handleRemoveAssignee = async (accountId) => {
    const updatedAssignees = assignees.filter((a) => a.accountId !== accountId);
    setAssignees(updatedAssignees);

    // Save to storage
    if (context) {
      try {
        await invoke("updateMultiAssignees", {
          issueKey: context.key,
          assignees: updatedAssignees,
          roles: updatedAssignees.reduce((acc, assignee) => {
            acc[assignee.accountId] = assignee.role;
            return acc;
          }, {}),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error("Error saving assignees:", error);
      }
    }
  };

  const AddAssigneeModal = () => (
    <Modal onClose={() => setIsModalOpen(false)} header="Add Assignee">
      <Form onSubmit={handleAddAssignee}>
        <UserPicker label="Select User" name="user" isRequired />
        <Select label="Role" name="role" defaultValue="Secondary" isRequired>
          {roleOptions.map((option) => (
            <Option
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Select>
      </Form>
    </Modal>
  );

  return (
    <Fragment>
      <Stack space="space.100">
        <Box>
          <Stack space="space.050" direction="horizontal">
            <Strong>Multiple Assignees</Strong>
            <Button
              text="+ Add"
              appearance="primary"
              onClick={() => setIsModalOpen(true)}
            />
          </Stack>
        </Box>

        {assignees.length > 0 ? (
          <Stack space="space.100">
            {assignees.map((assignee) => (
              <Box key={assignee.accountId}>
                <Stack space="space.050" direction="horizontal">
                  <User accountId={assignee.accountId} />
                  <Tag
                    text={assignee.role}
                    color={assignee.role === "Primary" ? "blue" : "default"}
                  />
                  <Button
                    text="Remove"
                    appearance="subtle"
                    onClick={() => handleRemoveAssignee(assignee.accountId)}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Text appearance="subtle">
            No multiple assignees set. Click "Add" to assign team members.
          </Text>
        )}

        <Text size="small" appearance="subtle">
          {assignees.length} assignee{assignees.length !== 1 ? "s" : ""}
        </Text>
      </Stack>

      {isModalOpen && <AddAssigneeModal />}
    </Fragment>
  );
};

export const run = render(<MultiAssigneeField />);
