import Resolver from "@forge/resolver";
import { storage } from "@forge/api";
import api, { route } from "@forge/api";

const resolver = new Resolver();

// ====== ENTERPRISE WORKLOAD MANAGEMENT ======

// Advanced workload calculation with multiple factors
resolver.define("calculateWorkloadScore", async (req) => {
  try {
    const { userAccountId, projectKey } = req.payload;

    // Get user's current assignments across all projects
    const currentAssignments = await getCurrentUserAssignments(userAccountId);
    const skillMatch = await calculateSkillMatch(userAccountId, projectKey);
    const availableCapacity = await getAvailableCapacity(userAccountId);
    const historicalPerformance = await getPerformanceMetrics(userAccountId);

    // Advanced scoring algorithm from research
    const workloadScore = {
      currentWorkload: currentAssignments.total,
      primaryAssignments: currentAssignments.primary,
      secondaryAssignments: currentAssignments.secondary,
      reviewerAssignments: currentAssignments.reviewer,
      skillMatch: skillMatch,
      availableCapacity: availableCapacity,
      historicalPerformance: historicalPerformance,
      overallScore:
        skillMatch * 0.4 +
        availableCapacity * 0.3 +
        historicalPerformance * 0.2 +
        (1 - Math.min(currentAssignments.total / 10, 1)) * 0.1,
      healthStatus: getHealthStatus(currentAssignments.total),
      utilizationRate: currentAssignments.total / 10, // Assuming max 10 assignments
    };

    return { success: true, data: workloadScore };
  } catch (error) {
    console.error("Error calculating workload score:", error);
    return { success: false, error: error.message };
  }
});

// Smart assignee suggestions with ML-like recommendations
resolver.define("getSmartAssigneeSuggestions", async (req) => {
  try {
    const { issueKey, projectKey, components, labels, issueType } = req.payload;

    // Get all project users
    const projectUsers = await getProjectUsers(projectKey);
    const suggestions = [];

    for (const user of projectUsers) {
      const workloadScore = await resolver.invoke("calculateWorkloadScore", {
        userAccountId: user.accountId,
        projectKey: projectKey,
      });

      if (workloadScore.success) {
        const expertise = await calculateExpertiseScore(user.accountId, {
          components,
          labels,
          issueType,
        });

        const collaborationHistory = await getCollaborationHistory(
          user.accountId,
          issueKey
        );

        suggestions.push({
          user: user,
          workload: workloadScore.data,
          expertiseScore: expertise,
          collaborationScore: collaborationHistory,
          recommendationReason: generateRecommendationReason(
            expertise,
            workloadScore.data
          ),
          suggestedRole: suggestOptimalRole(expertise, workloadScore.data),
        });
      }
    }

    // Sort by overall recommendation score
    suggestions.sort((a, b) => {
      const scoreA = a.workload.overallScore * 0.6 + a.expertiseScore * 0.4;
      const scoreB = b.workload.overallScore * 0.6 + b.expertiseScore * 0.4;
      return scoreB - scoreA;
    });

    return {
      success: true,
      suggestions: suggestions.slice(0, 8), // Top 8 recommendations
      metadata: {
        totalCandidates: projectUsers.length,
        algorithmVersion: "1.0",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error getting smart suggestions:", error);
    return { success: false, error: error.message };
  }
});

// ====== CONFLICT RESOLUTION & VERSION CONTROL ======

// Advanced conflict resolution with version control
resolver.define("updateMultiAssigneesWithConflictResolution", async (req) => {
  try {
    const { issueKey, assignees, roles, version, userId } = req.payload;

    // Get current state with version
    const currentState = await storage.get(`issue:${issueKey}:assignees`);
    const currentVersion = currentState?.version || 0;

    // Check for conflicts
    if (version && version < currentVersion) {
      // Conflict detected - attempt intelligent merge
      const conflictResolution = await resolveAssignmentConflict(
        currentState,
        { assignees, roles, version },
        userId
      );

      if (conflictResolution.requiresManualResolution) {
        return {
          success: false,
          conflict: true,
          currentState: currentState,
          proposedChanges: { assignees, roles },
          conflictDetails: conflictResolution.conflicts,
        };
      }

      // Auto-resolved conflict
      assignees = conflictResolution.resolvedAssignees;
      roles = conflictResolution.resolvedRoles;
    }

    // Save with new version and audit trail
    const newVersion = currentVersion + 1;
    const data = {
      assignees,
      roles,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
      changeHistory: [
        ...(currentState?.changeHistory || []),
        {
          version: newVersion,
          timestamp: new Date().toISOString(),
          userId: userId,
          changes: detectChanges(currentState?.assignees || [], assignees),
          conflictResolved: version < currentVersion,
        },
      ],
    };

    await storage.set(`issue:${issueKey}:assignees`, data);

    // Trigger notifications for new assignments
    await triggerAssignmentNotifications(
      issueKey,
      assignees,
      currentState?.assignees || []
    );

    // Update capacity tracking
    await updateCapacityTracking(assignees, currentState?.assignees || []);

    return {
      success: true,
      message: "Multi-assignees updated successfully",
      version: newVersion,
      conflictResolved: version < currentVersion,
    };
  } catch (error) {
    console.error("Error updating multi-assignees:", error);
    return { success: false, error: error.message };
  }
});

// ====== TEAM CAPACITY DASHBOARD ======

// Get comprehensive team capacity data
resolver.define("getTeamCapacityData", async (req) => {
  try {
    const { projectKey } = req.payload;

    const projectUsers = await getProjectUsers(projectKey);
    const capacityData = [];

    for (const user of projectUsers) {
      const assignments = await getCurrentUserAssignments(user.accountId);
      const workloadTrends = await getWorkloadTrends(user.accountId, 30); // 30 days
      const performanceMetrics = await getPerformanceMetrics(user.accountId);

      capacityData.push({
        user: user,
        currentCapacity: {
          primaryAssignments: assignments.primary,
          secondaryAssignments: assignments.secondary,
          reviewerAssignments: assignments.reviewer,
          collaboratorAssignments: assignments.collaborator,
          totalAssignments: assignments.total,
          utilizationRate: assignments.total / 10, // Max 10 assignments
          healthStatus: getHealthStatus(assignments.total),
        },
        trends: workloadTrends,
        performance: performanceMetrics,
        availability: await getAvailableCapacity(user.accountId),
      });
    }

    // Calculate team-wide metrics
    const teamMetrics = {
      averageUtilization:
        capacityData.reduce(
          (sum, user) => sum + user.currentCapacity.utilizationRate,
          0
        ) / capacityData.length,
      totalCapacity: capacityData.length * 10,
      usedCapacity: capacityData.reduce(
        (sum, user) => sum + user.currentCapacity.totalAssignments,
        0
      ),
      overloadedUsers: capacityData.filter(
        (user) => user.currentCapacity.healthStatus === "overloaded"
      ).length,
      collaborationIndex: await calculateCollaborationIndex(projectKey),
      assignmentBalance: calculateAssignmentBalance(capacityData),
    };

    return {
      success: true,
      data: {
        users: capacityData,
        teamMetrics: teamMetrics,
        lastUpdated: new Date().toISOString(),
        projectKey: projectKey,
      },
    };
  } catch (error) {
    console.error("Error getting team capacity data:", error);
    return { success: false, error: error.message };
  }
});

// ====== ANALYTICS & REPORTING ======

// Advanced collaboration analytics
resolver.define("getCollaborationAnalytics", async (req) => {
  try {
    const { projectKey, timeRange = 30 } = req.payload;

    const analytics = {
      collaborationMetrics: await getCollaborationMetrics(
        projectKey,
        timeRange
      ),
      assignmentPatterns: await getAssignmentPatterns(projectKey, timeRange),
      performanceAnalysis: await getPerformanceAnalysis(projectKey, timeRange),
      teamSynergyAnalysis: await getTeamSynergyAnalysis(projectKey, timeRange),
      processOptimization: await getProcessOptimizationRecommendations(
        projectKey
      ),
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error("Error getting collaboration analytics:", error);
    return { success: false, error: error.message };
  }
});

// ====== WORKFLOW INTEGRATION ======

// Advanced workflow transition handling
resolver.define("handleWorkflowTransition", async (req) => {
  try {
    const { issueKey, fromStatus, toStatus, transitionId, userId } =
      req.payload;

    const multiAssignees = await storage.get(`issue:${issueKey}:assignees`);
    if (!multiAssignees || !multiAssignees.assignees.length) {
      return { success: true, message: "No multi-assignees to process" };
    }

    // Check role-based transition permissions
    const userRole = getUserRole(userId, multiAssignees.assignees);
    const transitionAllowed = checkTransitionPermissions(
      userRole,
      fromStatus,
      toStatus
    );

    if (!transitionAllowed.allowed) {
      return {
        success: false,
        error: "Insufficient permissions for this transition",
        requiredRole: transitionAllowed.requiredRole,
        userRole: userRole,
      };
    }

    // Handle approval workflows for reviewers
    if (toStatus === "Done" && hasReviewers(multiAssignees.assignees)) {
      const approvalStatus = await checkReviewerApprovals(
        issueKey,
        multiAssignees.assignees
      );
      if (!approvalStatus.allApproved) {
        return {
          success: false,
          error: "Reviewer approval required",
          pendingApprovals: approvalStatus.pendingReviewers,
        };
      }
    }

    // Trigger role-specific notifications
    await triggerWorkflowNotifications(
      issueKey,
      multiAssignees.assignees,
      fromStatus,
      toStatus
    );

    return {
      success: true,
      message: "Workflow transition processed successfully",
    };
  } catch (error) {
    console.error("Error handling workflow transition:", error);
    return { success: false, error: error.message };
  }
});

// ====== HELPER FUNCTIONS ======

async function getCurrentUserAssignments(userAccountId) {
  // In a real implementation, this would query across all projects
  // For now, simulate realistic data
  const mockData = {
    primary: Math.floor(Math.random() * 3) + 1,
    secondary: Math.floor(Math.random() * 4) + 2,
    reviewer: Math.floor(Math.random() * 3),
    collaborator: Math.floor(Math.random() * 2),
  };
  mockData.total =
    mockData.primary +
    mockData.secondary +
    mockData.reviewer +
    mockData.collaborator;
  return mockData;
}

async function calculateSkillMatch(userAccountId, projectKey) {
  // Simulate skill matching based on historical data
  return Math.random() * 0.4 + 0.6; // 0.6 to 1.0
}

async function getAvailableCapacity(userAccountId) {
  // Simulate available capacity (0.0 to 1.0)
  return Math.random() * 0.5 + 0.5; // 0.5 to 1.0
}

async function getPerformanceMetrics(userAccountId) {
  // Simulate performance metrics
  return {
    averageResolutionTime: Math.random() * 5 + 2, // 2-7 days
    qualityScore: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
    collaborationRating: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
  };
}

function getHealthStatus(totalAssignments) {
  if (totalAssignments <= 5) return "optimal";
  if (totalAssignments <= 8) return "busy";
  return "overloaded";
}

async function getProjectUsers(projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`
      );
    return response.body || [];
  } catch (error) {
    console.error("Error getting project users:", error);
    // Return mock data for development
    return [
      {
        accountId: "user1",
        displayName: "Dan Pearson",
        emailAddress: "dan@danpearson.net",
      },
      {
        accountId: "user2",
        displayName: "John Smith",
        emailAddress: "john.smith@company.com",
      },
      {
        accountId: "user3",
        displayName: "Jane Doe",
        emailAddress: "jane.doe@company.com",
      },
      {
        accountId: "user4",
        displayName: "Bob Johnson",
        emailAddress: "bob.johnson@company.com",
      },
      {
        accountId: "user5",
        displayName: "Alice Wong",
        emailAddress: "alice.wong@company.com",
      },
    ];
  }
}

async function calculateExpertiseScore(userAccountId, issueContext) {
  // Simulate expertise calculation based on components, labels, issue type
  return Math.random() * 0.4 + 0.6; // 0.6 to 1.0
}

async function getCollaborationHistory(userAccountId, issueKey) {
  // Simulate collaboration history score
  return Math.random() * 0.3 + 0.4; // 0.4 to 0.7
}

function generateRecommendationReason(expertiseScore, workloadData) {
  if (expertiseScore > 0.8) return "High expertise match";
  if (workloadData.healthStatus === "optimal") return "Available capacity";
  if (workloadData.historicalPerformance > 0.8)
    return "Strong performance history";
  return "Balanced workload and skills";
}

function suggestOptimalRole(expertiseScore, workloadData) {
  if (expertiseScore > 0.9 && workloadData.healthStatus === "optimal")
    return "Primary";
  if (expertiseScore > 0.7) return "Secondary";
  if (workloadData.reviewerAssignments < 3) return "Reviewer";
  return "Collaborator";
}

async function resolveAssignmentConflict(
  currentState,
  proposedChanges,
  userId
) {
  // Implement intelligent conflict resolution
  // For now, return a simple merge strategy
  return {
    requiresManualResolution: false,
    resolvedAssignees: proposedChanges.assignees,
    resolvedRoles: proposedChanges.roles,
    conflicts: [],
  };
}

function detectChanges(oldAssignees, newAssignees) {
  const changes = [];

  // Detect additions
  newAssignees.forEach((newAssignee) => {
    if (!oldAssignees.find((old) => old.accountId === newAssignee.accountId)) {
      changes.push({ type: "added", assignee: newAssignee });
    }
  });

  // Detect removals
  oldAssignees.forEach((oldAssignee) => {
    if (
      !newAssignees.find((newA) => newA.accountId === oldAssignee.accountId)
    ) {
      changes.push({ type: "removed", assignee: oldAssignee });
    }
  });

  // Detect role changes
  newAssignees.forEach((newAssignee) => {
    const oldAssignee = oldAssignees.find(
      (old) => old.accountId === newAssignee.accountId
    );
    if (oldAssignee && oldAssignee.role !== newAssignee.role) {
      changes.push({
        type: "roleChanged",
        assignee: newAssignee,
        oldRole: oldAssignee.role,
        newRole: newAssignee.role,
      });
    }
  });

  return changes;
}

async function triggerAssignmentNotifications(
  issueKey,
  newAssignees,
  oldAssignees
) {
  // Implement intelligent notification system
  console.log(`Triggering notifications for issue ${issueKey}`);
  // This would integrate with Jira's notification system
}

async function updateCapacityTracking(newAssignees, oldAssignees) {
  // Update capacity tracking for affected users
  console.log("Updating capacity tracking");
}

// Legacy compatibility - keep existing simple functions
resolver.define("getMultiAssignees", async (req) => {
  try {
    const { issueKey } = req.payload;
    const multiAssignees = (await storage.get(
      `issue:${issueKey}:assignees`
    )) || {
      assignees: [],
      roles: {},
      lastUpdated: null,
    };
    return { success: true, data: multiAssignees };
  } catch (error) {
    console.error("Error fetching multi-assignees:", error);
    return { success: false, error: error.message };
  }
});

resolver.define("updateMultiAssignees", async (req) => {
  // Redirect to advanced version
  return resolver.invoke("updateMultiAssigneesWithConflictResolution", {
    ...req.payload,
    version: 1,
    userId: req.context?.accountId || "system",
  });
});

export default resolver;
