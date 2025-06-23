import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import {
  detectUserHierarchyLevel,
  getVisibleUsersInHierarchy,
  getAutoDetectedManagedTeams,
  buildAutoHierarchyPath,
  getAutoHierarchyFilters,
} from "../utils/hierarchy-manager.js";

const resolver = new Resolver();

/**
 * Get user's automatic hierarchy context based on Jira permissions
 */
resolver.define("getUserHierarchyContext", async ({ payload, context }) => {
  try {
    const { userId, projectKey } = payload;

    // Get current user info if userId not provided
    let targetUserId = userId;
    if (!targetUserId) {
      const userResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/myself`);
      const currentUser = await userResponse.json();
      targetUserId = currentUser.accountId;
    }

    console.log(`🔍 Getting auto hierarchy context for user: ${targetUserId}`);

    // Automatically detect user's hierarchy level
    const hierarchyLevel = await detectUserHierarchyLevel(
      targetUserId,
      projectKey
    );

    // Get visible users based on automatic hierarchy detection
    const visibleUsers = await getVisibleUsersInHierarchy(
      targetUserId,
      projectKey
    );

    // Get automatically detected managed teams
    const managedTeams = await getAutoDetectedManagedTeams(
      targetUserId,
      projectKey
    );

    // Build automatic hierarchy path
    const hierarchyPath = await buildAutoHierarchyPath(
      targetUserId,
      projectKey
    );

    // Get dashboard filters based on automatic hierarchy
    const dashboardFilters = await getAutoHierarchyFilters(
      targetUserId,
      projectKey
    );

    // Get user's actual Jira permissions for verification
    const jiraPermissions = await getUserJiraPermissions(
      targetUserId,
      projectKey
    );

    return {
      success: true,
      context: {
        userId: targetUserId,
        projectKey,
        automatic: true, // Flag indicating this is auto-detected
        hierarchyLevel: hierarchyLevel.level,
        levelConfig: hierarchyLevel.config,
        permissions: hierarchyLevel.permissions,
        groups: hierarchyLevel.groups,
        hierarchyPath,
        managedTeams,
        visibleUsers: visibleUsers.length,
        visibleUserIds: visibleUsers.map((u) => u.accountId),
        dashboardFilters,
        jiraPermissions,
        detectedAt: hierarchyLevel.detectedAt,
        cacheInfo: {
          cacheUsed: Boolean(hierarchyLevel.detectedAt),
          autoDetected: true,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error getting auto hierarchy context:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Get dashboard data filtered by automatic hierarchy
 */
resolver.define(
  "getHierarchicalDashboardData",
  async ({ payload, context }) => {
    try {
      const { projectKey } = payload;

      // Get current user
      const userResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/myself`);
      const currentUser = await userResponse.json();

      console.log(
        `📊 Getting hierarchical dashboard data for ${currentUser.displayName}`
      );

      // Get user's hierarchy filters
      const filters = await getAutoHierarchyFilters(
        currentUser.accountId,
        projectKey
      );

      // Get capacity data for visible users only
      const visibleUsers = await getVisibleUsersInHierarchy(
        currentUser.accountId,
        projectKey
      );

      const dashboardData = {
        userLevel: filters.userLevel,
        scope: filters.scope,
        totalVisibleUsers: visibleUsers.length,
        managedTeamCount: filters.managedTeams.length,
        canManageUsers: filters.canManageUsers,
        canViewCrossProject: filters.canViewCrossProject,
        visibleUsers: visibleUsers.map((user) => ({
          accountId: user.accountId,
          displayName: user.displayName,
          emailAddress: user.emailAddress,
          avatarUrls: user.avatarUrls,
        })),
        managedTeams: filters.managedTeams.map((team) => ({
          id: team.id,
          name: team.name,
          type: team.type,
          memberCount: team.members?.length || 0,
          scope: team.scope,
        })),
        hierarchyInfo: {
          automatic: true,
          detectionMethod: "jira-permissions",
          lastUpdated: new Date().toISOString(),
        },
      };

      console.log(
        `✅ Returning hierarchical dashboard data: ${filters.scope} scope with ${visibleUsers.length} users`
      );

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      console.error("❌ Error getting hierarchical dashboard data:", error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * Get team members that user can manage (auto-detected)
 */
resolver.define("getManageableTeamMembers", async ({ payload, context }) => {
  try {
    const { projectKey } = payload;

    const userResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/myself`);
    const currentUser = await userResponse.json();

    console.log(
      `👥 Getting manageable team members for ${currentUser.displayName}`
    );

    const managedTeams = await getAutoDetectedManagedTeams(
      currentUser.accountId,
      projectKey
    );

    const allManagedUsers = new Map();

    for (const team of managedTeams) {
      for (const member of team.members || []) {
        if (!allManagedUsers.has(member.accountId)) {
          allManagedUsers.set(member.accountId, {
            ...member,
            teams: [team.name],
            managementSource: team.type,
          });
        } else {
          allManagedUsers.get(member.accountId).teams.push(team.name);
        }
      }
    }

    const manageableUsers = Array.from(allManagedUsers.values());

    return {
      success: true,
      data: {
        totalManageableUsers: manageableUsers.length,
        managedTeamsCount: managedTeams.length,
        users: manageableUsers,
        teams: managedTeams.map((team) => ({
          id: team.id,
          name: team.name,
          type: team.type,
          memberCount: team.members?.length || 0,
        })),
        autoDetected: true,
      },
    };
  } catch (error) {
    console.error("❌ Error getting manageable team members:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Check if user can perform hierarchy actions (based on auto-detected level)
 */
resolver.define("checkHierarchyPermissions", async ({ payload, context }) => {
  try {
    const { action, targetUserId, projectKey } = payload;

    const userResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/myself`);
    const currentUser = await userResponse.json();

    const userLevel = await detectUserHierarchyLevel(
      currentUser.accountId,
      projectKey
    );
    const targetLevel = targetUserId
      ? await detectUserHierarchyLevel(targetUserId, projectKey)
      : null;

    let allowed = false;
    let reason = "";

    switch (action) {
      case "MANAGE_CAPACITY":
        allowed = userLevel.config.level <= 3; // Team Lead and above
        reason = allowed
          ? "User has team management permissions"
          : "Requires team lead or higher permissions";
        break;

      case "VIEW_TEAM_DATA":
        allowed = userLevel.config.level <= 3; // Team Lead and above
        reason = allowed
          ? "User has team visibility permissions"
          : "Individual contributors can only see own data";
        break;

      case "ASSIGN_TO_USER":
        if (targetLevel) {
          allowed = userLevel.config.level <= targetLevel.config.level;
          reason = allowed
            ? "User can assign to subordinates or peers"
            : "Cannot assign to users at higher hierarchy level";
        } else {
          allowed = userLevel.config.level <= 3;
          reason = allowed
            ? "User has assignment permissions"
            : "Requires team lead permissions for assignments";
        }
        break;

      case "VIEW_CROSS_PROJECT":
        allowed = userLevel.config.level <= 1; // Division Manager and above
        reason = allowed
          ? "User has cross-project visibility"
          : "Limited to single project scope";
        break;

      default:
        allowed = false;
        reason = "Unknown action";
    }

    return {
      success: true,
      data: {
        allowed,
        reason,
        userLevel: userLevel.level,
        userScope: userLevel.config.scope,
        targetLevel: targetLevel?.level || null,
        autoDetected: true,
      },
    };
  } catch (error) {
    console.error("❌ Error checking hierarchy permissions:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Get hierarchy status and statistics
 */
resolver.define("getHierarchyStatus", async ({ payload, context }) => {
  try {
    const { projectKey } = payload;

    const userResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/myself`);
    const currentUser = await userResponse.json();

    const userLevel = await detectUserHierarchyLevel(
      currentUser.accountId,
      projectKey
    );
    const hierarchyPath = await buildAutoHierarchyPath(
      currentUser.accountId,
      projectKey
    );
    const managedTeams = await getAutoDetectedManagedTeams(
      currentUser.accountId,
      projectKey
    );
    const visibleUsers = await getVisibleUsersInHierarchy(
      currentUser.accountId,
      projectKey
    );

    // Get project statistics
    const projectUsers = await getProjectUsers(projectKey);
    const projectInfo = await getProjectInfo(projectKey);

    const status = {
      hierarchyEnabled: true,
      automatic: true,
      detectionMethod: "jira-permissions-and-groups",
      user: {
        level: userLevel.level,
        levelName: userLevel.config.name,
        scope: userLevel.config.scope,
        permissions: userLevel.permissions.length,
        groups: userLevel.groups.length,
      },
      project: {
        key: projectKey,
        name: projectInfo.name,
        totalUsers: projectUsers.length,
        visibleToUser: visibleUsers.length,
      },
      management: {
        managedTeams: managedTeams.length,
        managedUsers: managedTeams.reduce(
          (sum, team) => sum + (team.members?.length || 0),
          0
        ),
        canManageCapacity: userLevel.config.level <= 3,
      },
      hierarchy: {
        path: hierarchyPath,
        depth: hierarchyPath.length,
      },
      lastDetected: userLevel.detectedAt,
      cacheAge: userLevel.detectedAt
        ? Math.floor(
            (Date.now() - new Date(userLevel.detectedAt).getTime()) / 1000
          )
        : 0,
    };

    return {
      success: true,
      data: status,
    };
  } catch (error) {
    console.error("❌ Error getting hierarchy status:", error);
    return { success: false, error: error.message };
  }
});

// Helper functions

async function getUserJiraPermissions(userId, projectKey) {
  try {
    let permissions = {};

    if (projectKey) {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/mypermissions?projectKey=${projectKey}`);
      if (response.ok) {
        const data = await response.json();
        permissions.project = data.permissions;
      }
    }

    const globalResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/mypermissions`);
    if (globalResponse.ok) {
      const data = await globalResponse.json();
      permissions.global = data.permissions;
    }

    return permissions;
  } catch (error) {
    console.error("Error getting Jira permissions:", error);
    return {};
  }
}

async function getProjectUsers(projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=200`
      );

    if (response.ok) {
      return await response.json();
    }

    return [];
  } catch (error) {
    console.error("Error getting project users:", error);
    return [];
  }
}

async function getProjectInfo(projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/project/${projectKey}`);

    if (response.ok) {
      return await response.json();
    }

    return { name: projectKey, key: projectKey };
  } catch (error) {
    return { name: projectKey, key: projectKey };
  }
}

export const handler = resolver.getDefinitions();
export default resolver;
