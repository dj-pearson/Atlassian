import ForgeUI, {
  render,
  Fragment,
  Text,
  Strong,
  Tag,
  User,
  useState,
  useEffect,
} from "@forge/ui";

const MultiAssigneeField = () => {
  const [assignees] = useState([
    { accountId: "user-1", displayName: "John Smith", role: "Primary" },
    { accountId: "user-2", displayName: "Jane Doe", role: "Secondary" },
    { accountId: "user-3", displayName: "Bob Johnson", role: "Reviewer" },
  ]);

  return (
    <Fragment>
      {assignees.map((assignee) => (
        <Fragment key={assignee.accountId}>
          <User accountId={assignee.accountId} />
          <Tag
            text={assignee.role}
            color={assignee.role === "Primary" ? "blue" : "default"}
          />
          <Text> </Text>
        </Fragment>
      ))}
      {assignees.length === 0 && <Text>No multiple assignees set</Text>}
    </Fragment>
  );
};

export const run = render(<MultiAssigneeField />);
