import React from "react";
import ForgeReconciler, {
  Fragment,
  Text,
  Strong,
  Button,
  Heading,
} from "@forge/react";

const CapacityDashboard = () => {
  // Static team data
  const teamData = [
    {
      id: "user1",
      name: "John Smith",
      email: "john.smith@company.com",
      utilization: 65,
      status: "Available",
      issues: "8/12",
      storyPoints: 34,
      hours: 28,
      completion: 92,
      avgTime: 3.2,
      quality: 8.5,
      roles: ["Primary", "Secondary"],
      skills: ["Frontend", "React", "JavaScript"],
      projects: ["PROJ-123", "PROJ-456"],
    },
    {
      id: "user2",
      name: "Jane Doe",
      email: "jane.doe@company.com",
      utilization: 85,
      status: "Busy",
      issues: "12/14",
      storyPoints: 42,
      hours: 35,
      completion: 88,
      avgTime: 2.8,
      quality: 9.1,
      roles: ["Primary", "Reviewer"],
      skills: ["Backend", "Python", "API Design"],
      projects: ["PROJ-789", "PROJ-101"],
    },
    {
      id: "user3",
      name: "Mike Johnson",
      email: "mike.johnson@company.com",
      utilization: 95,
      status: "Overloaded",
      issues: "15/16",
      storyPoints: 58,
      hours: 42,
      completion: 85,
      avgTime: 4.1,
      quality: 8.8,
      roles: ["Primary", "Secondary", "Reviewer"],
      skills: ["Full Stack", "DevOps", "Cloud"],
      projects: ["PROJ-202", "PROJ-303"],
    },
    {
      id: "user4",
      name: "Sarah Wilson",
      email: "sarah.wilson@company.com",
      utilization: 45,
      status: "Available",
      issues: "6/13",
      storyPoints: 21,
      hours: 18,
      completion: 95,
      avgTime: 2.5,
      quality: 9.3,
      roles: ["Reviewer", "Collaborator"],
      skills: ["UX Design", "Research", "Prototyping"],
      projects: ["PROJ-404"],
    },
    {
      id: "user5",
      name: "Alex Chen",
      email: "alex.chen@company.com",
      utilization: 75,
      status: "Busy",
      issues: "10/13",
      storyPoints: 39,
      hours: 31,
      completion: 91,
      avgTime: 3.0,
      quality: 8.9,
      roles: ["Secondary", "Reviewer"],
      skills: ["QA", "Automation", "Testing"],
      projects: ["PROJ-505", "PROJ-606"],
    },
  ];

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <Fragment>
      <Heading size="large">🏢 Team Capacity Dashboard</Heading>

      <Button text="🔄 Refresh" onClick={handleRefresh} />

      <Heading size="medium">📊 Key Metrics</Heading>
      <Text>
        Team Utilization: <Strong>73%</Strong> (+5%)
      </Text>
      <Text>
        Active Issues: <Strong>51</Strong> of 187 total
      </Text>
      <Text>
        Story Points: <Strong>128/194</Strong> (Velocity: 42)
      </Text>
      <Text>
        Collaboration Score: <Strong>8.4/10</Strong> (+12%)
      </Text>

      <Heading size="medium">👥 Team Members ({teamData.length})</Heading>

      {teamData.map((member) => (
        <Fragment key={member.id}>
          <Heading size="small">{member.name}</Heading>
          <Text>{member.email}</Text>
          <Text>
            Status: <Strong>{member.status}</Strong> | Utilization:{" "}
            <Strong>{member.utilization}%</Strong>
          </Text>
          <Text>
            Issues: {member.issues} | Points: {member.storyPoints} | Hours:{" "}
            {member.hours}h
          </Text>
          <Text>
            Completion: {member.completion}% | Avg Time: {member.avgTime}d |
            Quality: {member.quality}/10
          </Text>
          <Text>Roles: {member.roles.join(", ")}</Text>
          <Text>Skills: {member.skills.join(", ")}</Text>
          <Text>Projects: {member.projects.join(", ")}</Text>
          <Text>---</Text>
        </Fragment>
      ))}

      <Heading size="small">⚠️ Risk Factors & Recommendations</Heading>
      <Text>• Mike Johnson is overloaded (95% utilization)</Text>
      <Text>• 136 unassigned issues in backlog</Text>
      <Text>• Sprint velocity trending upward</Text>

      <Text>
        <Strong>🎯 Multi-Assignee Integration Active</Strong>
      </Text>
      <Text>
        Version 7.5.0 - Enterprise Multi-Assignee Manager - Simplified Forge
        React
      </Text>
    </Fragment>
  );
};

ForgeReconciler.render(<CapacityDashboard />);
