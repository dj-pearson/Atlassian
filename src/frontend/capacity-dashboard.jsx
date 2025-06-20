import React from "react";
import ForgeReconciler from "@forge/react";

// Simple capacity dashboard without complex React hooks
const CapacityDashboard = () => {
  // Static team data - no useState needed
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

  const analytics = {
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

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "#36B37E";
      case "Busy":
        return "#0065FF";
      case "Overloaded":
        return "#DE350B";
      default:
        return "#6B778C";
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#FAFBFC",
        color: "#172B4D",
        lineHeight: "1.4",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          borderBottom: "2px solid #DFE1E6",
          paddingBottom: "15px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
          🏢 Team Capacity Dashboard
        </h1>
        <button
          onClick={handleRefresh}
          style={{
            padding: "8px 16px",
            background: "#0052CC",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div
        style={{
          background: "#F4F5F7",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{ margin: "0 0 15px 0", fontSize: "18px", fontWeight: "600" }}
        >
          📊 Key Metrics
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #DFE1E6",
            }}
          >
            <div
              style={{
                color: "#6B778C",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              Team Utilization
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              73%
            </div>
            <span
              style={{
                background: "#E3FCEF",
                color: "#006644",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
              }}
            >
              +5%
            </span>
          </div>

          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #DFE1E6",
            }}
          >
            <div
              style={{
                color: "#6B778C",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              Active Issues
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              51
            </div>
            <div style={{ color: "#6B778C", fontSize: "12px" }}>
              of 187 total
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #DFE1E6",
            }}
          >
            <div
              style={{
                color: "#6B778C",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              Story Points
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              128/194
            </div>
            <div style={{ color: "#6B778C", fontSize: "12px" }}>
              Velocity: 42
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #DFE1E6",
            }}
          >
            <div
              style={{
                color: "#6B778C",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              Collaboration Score
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              8.4/10
            </div>
            <span
              style={{
                background: "#E3FCEF",
                color: "#006644",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
              }}
            >
              +12%
            </span>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{ margin: "0 0 15px 0", fontSize: "18px", fontWeight: "600" }}
        >
          👥 Team Members ({teamData.length})
        </h2>

        {teamData.map((member) => (
          <div
            key={member.id}
            style={{
              background: "#F4F5F7",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "15px",
              border: "1px solid #DFE1E6",
            }}
          >
            {/* Member Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 2px 0",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  {member.name}
                </h3>
                <div style={{ color: "#6B778C", fontSize: "12px" }}>
                  {member.email}
                </div>
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    background: getStatusColor(member.status),
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                >
                  {member.status}
                </span>
                <span
                  style={{
                    background: "#0052CC",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                >
                  {member.utilization}% Utilized
                </span>
              </div>
            </div>

            {/* Workload Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: "15px",
                marginBottom: "12px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  ACTIVE ISSUES
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.issues}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  STORY POINTS
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.storyPoints}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  HOURS LOGGED
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.hours}h
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  COMPLETION RATE
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.completion}%
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  AVG COMPLETION
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.avgTime}d
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#6B778C",
                    fontSize: "10px",
                    marginBottom: "2px",
                  }}
                >
                  QUALITY SCORE
                </div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {member.quality}/10
                </div>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: "8px" }}>
              <span
                style={{
                  color: "#6B778C",
                  fontSize: "11px",
                  marginRight: "8px",
                }}
              >
                Roles:
              </span>
              {member.roles.map((role) => (
                <span
                  key={role}
                  style={{
                    background: "#EAE6FF",
                    color: "#5E4DB2",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    marginRight: "5px",
                  }}
                >
                  {role}
                </span>
              ))}
            </div>

            <div style={{ marginBottom: "8px" }}>
              <span
                style={{
                  color: "#6B778C",
                  fontSize: "11px",
                  marginRight: "8px",
                }}
              >
                Skills:
              </span>
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    background: "#E6FCFF",
                    color: "#0C66E4",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    marginRight: "5px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>

            <div>
              <span
                style={{
                  color: "#6B778C",
                  fontSize: "11px",
                  marginRight: "8px",
                }}
              >
                Projects:
              </span>
              {member.projects.map((project) => (
                <span
                  key={project}
                  style={{
                    background: "#DEEBFF",
                    color: "#0052CC",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    marginRight: "5px",
                  }}
                >
                  {project}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factors */}
      <div
        style={{
          background: "#FFFAE6",
          borderLeft: "4px solid #FFAB00",
          padding: "15px",
          borderRadius: "4px",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "600" }}
        >
          ⚠️ Risk Factors & Recommendations
        </h3>
        <div style={{ fontSize: "14px", marginBottom: "5px" }}>
          • Mike Johnson is overloaded (95% utilization)
        </div>
        <div style={{ fontSize: "14px", marginBottom: "5px" }}>
          • 136 unassigned issues in backlog
        </div>
        <div style={{ fontSize: "14px" }}>
          • Sprint velocity trending upward
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#F4F5F7",
          padding: "15px",
          borderRadius: "8px",
          textAlign: "center",
          border: "1px solid #DFE1E6",
        }}
      >
        <div
          style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}
        >
          🎯 Multi-Assignee Integration Active
        </div>
        <div
          style={{ color: "#6B778C", fontSize: "12px", marginBottom: "5px" }}
        >
          • Real-time capacity tracking across all assignee roles • Workload
          balancing with AI-powered suggestions • Cross-project collaboration
          analytics
        </div>
        <div
          style={{ color: "#6B778C", fontSize: "11px", fontStyle: "italic" }}
        >
          Version 7.3.0 - Enterprise Multi-Assignee Manager - Simple React
          Dashboard
        </div>
      </div>
    </div>
  );
};

ForgeReconciler.render(<CapacityDashboard />);
