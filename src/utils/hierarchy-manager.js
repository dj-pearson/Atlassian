import { storage } from "@forge/api";
import api, { route } from "@forge/api";

// Storage keys for hierarchy cache and user context
const STORAGE_KEYS = {
  HIERARCHY_CACHE: "auto-hierarchy-cache",
  USER_CONTEXT_CACHE: "user-context-cache",
  PROJECT_HIERARCHY_CACHE: "project-hierarchy-cache",
};

// Automatic hierarchy detection based on Jira permissions
const PERMISSION_HIERARCHY = {
  ENTERPRISE_ADMIN: {
    level: 0,
    name: "Enterprise Administrator",
    permissions: [
      "ADMINISTER",
      "SYSTEM_ADMIN",
      "ADMINISTER_PROJECTS",
      "ADMINISTER_PROJECT", // Common variation
      "SYSTEM_ADMINISTER", // Common variation
      "BROWSE_PROJECTS", // Admin always has this
    ],
    description: "Full system access across all projects",
    scope: "GLOBAL",
  },
  DIVISION_MANAGER: {
    level: 1,
    name: "Division/Regional Manager",
    permissions: [
      "ADMINISTER_PROJECT",
      "PROJECT_ADMIN",
      "MANAGE_PROJECTS",
      "BROWSE_PROJECTS",
      "CREATE_ISSUES",
      "EDIT_ISSUES",
    ],
    description: "Cross-project management within division",
    scope: "MULTI_PROJECT",
  },
  DEPARTMENT_MANAGER: {
    level: 2,
    name: "Department Manager",
    permissions: [
      "ADMINISTER_PROJECT",
      "PROJECT_ADMIN",
      "MANAGE_ISSUES",
      "ASSIGNABLE_USER",
      "ASSIGN_ISSUES",
      "EDIT_ISSUES",
      "BROWSE_PROJECTS",
    ],
    description: "Project-level management and team oversight",
    scope: "PROJECT",
  },
  TEAM_LEAD: {
    level: 3,
    name: "Team Lead",
    permissions: [
      "ASSIGN_ISSUES",
      "ASSIGNABLE_USER",
      "EDIT_ISSUES",
      "RESOLVE_ISSUES",
      "MANAGE_ISSUES",
      "BROWSE_PROJECTS",
    ],
    description: "Team management and issue resolution",
    scope: "TEAM",
  },
  INDIVIDUAL: {
    level: 4,
    name: "Individual Contributor",
    permissions: ["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_OWN_ISSUES"],
    description: "Personal task management",
    scope: "INDIVIDUAL",
  },
};

/**
 * Automatically detect user's hierarchy level based on Jira permissions
 */
export async function detectUserHierarchyLevel(userId, projectKey = null) {
  try {
    console.log(`🔍 Auto-detecting hierarchy level for user: ${userId}`);

    // OVERRIDE: Always fresh detection for now - ignore cache
    console.log(`🧹 Bypassing cache for fresh admin detection`);

    // First, check if user is organization admin
    const isOrgAdmin = await checkIfOrganizationAdmin(userId);
    if (isOrgAdmin) {
      console.log(`🎯 DETECTED ORGANIZATION ADMIN: ${userId}`);
      const result = {
        level: "ENTERPRISE_ADMIN",
        config: PERMISSION_HIERARCHY.ENTERPRISE_ADMIN,
        permissions: ["ORG_ADMIN", "BROWSE_PROJECTS", "ADMINISTER_PROJECT"],
        groups: ["administrators"],
        projectKey,
        detectedAt: new Date().toISOString(),
      };
      return result;
    }

    let highestLevel = PERMISSION_HIERARCHY.INDIVIDUAL;
    const userPermissions = [];

    if (projectKey) {
      // Check project-specific permissions
      const projectPerms = await getUserProjectPermissions(userId, projectKey);
      userPermissions.push(...projectPerms);
    } else {
      // Check global permissions across multiple projects
      const globalPerms = await getUserGlobalPermissions(userId);
      userPermissions.push(...globalPerms);
    }

    // Check user's groups for additional context
    const userGroups = await getUserGroups(userId);

    // Determine hierarchy level based on permissions
    for (const [levelKey, levelConfig] of Object.entries(
      PERMISSION_HIERARCHY
    )) {
      const hasRequiredPerms = levelConfig.permissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (hasRequiredPerms && levelConfig.level < highestLevel.level) {
        highestLevel = levelConfig;
      }
    }

    // Additional context from group names (common patterns)
    const groupBasedLevel = detectLevelFromGroups(userGroups);
    if (groupBasedLevel && groupBasedLevel.level < highestLevel.level) {
      highestLevel = groupBasedLevel;
    }

    const result = {
      level: Object.keys(PERMISSION_HIERARCHY).find(
        (key) => PERMISSION_HIERARCHY[key] === highestLevel
      ),
      config: highestLevel,
      permissions: userPermissions,
      groups: userGroups,
      projectKey,
      detectedAt: new Date().toISOString(),
    };

    console.log(
      `✅ Detected hierarchy level: ${result.level} (${highestLevel.name})`
    );
    return result;
  } catch (error) {
    console.error("❌ Error detecting user hierarchy level:", error);
    return {
      level: "INDIVIDUAL",
      config: PERMISSION_HIERARCHY.INDIVIDUAL,
      permissions: [],
      groups: [],
      error: error.message,
    };
  }
}

/**
 * Get users visible to current user based on hierarchy level and permissions
 */
export async function getVisibleUsersInHierarchy(userId, projectKey) {
  try {
    console.log(
      `🔍 Getting visible users for ${userId} in project ${projectKey}`
    );

    const userLevel = await detectUserHierarchyLevel(userId, projectKey);
    console.log(
      `👤 Current user level: ${userLevel.level} (${userLevel.config.level})`
    );

    const projectUsers = await getProjectUsers(projectKey);
    console.log(`📋 Found ${projectUsers.length} total project users`);

    const visibleUsers = new Set();

    // Enterprise Administrators can see ALL users globally (bypass normal hierarchy)
    if (
      userLevel.level === "ENTERPRISE_ADMINISTRATOR" ||
      userLevel.config.scope === "GLOBAL"
    ) {
      console.log(`🌐 GLOBAL scope detected - user can see ALL users`);

      // For Enterprise Admins, get users from multiple projects or organization-wide
      try {
        // Try to get organization-wide users if available
        const allUsers = await getOrganizationUsers();
        if (allUsers && allUsers.length > 0) {
          console.log(`🏢 Found ${allUsers.length} organization users`);
          allUsers.forEach((user) => visibleUsers.add(user));
        } else {
          // Fallback to project users
          projectUsers.forEach((user) => visibleUsers.add(user));
        }
      } catch (error) {
        console.log(
          `⚠️ Couldn't get org users, using project users: ${error.message}`
        );
        projectUsers.forEach((user) => visibleUsers.add(user));
      }

      console.log(
        `👀 Enterprise Admin can see ${visibleUsers.size} users in hierarchy`
      );
      return Array.from(visibleUsers);
    }

    // For other hierarchy levels, use level-based filtering
    for (const user of projectUsers) {
      const targetUserLevel = await detectUserHierarchyLevel(
        user.accountId,
        projectKey
      );

      // 🔧 FIXED: Can see users at same level or below in hierarchy
      // Lower level numbers = higher authority, so use <= instead of >=
      if (targetUserLevel.config.level >= userLevel.config.level) {
        visibleUsers.add(user);
        console.log(
          `✅ Can see user ${user.displayName}: level ${targetUserLevel.config.level} >= ${userLevel.config.level}`
        );
      } else {
        console.log(
          `❌ Cannot see user ${user.displayName}: level ${targetUserLevel.config.level} < ${userLevel.config.level}`
        );
      }

      // Special cases for cross-functional visibility
      if (shouldAllowCrossFunctionalAccess(userLevel, targetUserLevel, user)) {
        visibleUsers.add(user);
        console.log(
          `🔄 Cross-functional access granted for ${user.displayName}`
        );
      }
    }

    console.log(`👀 User can see ${visibleUsers.size} users in hierarchy`);
    return Array.from(visibleUsers);
  } catch (error) {
    console.error("❌ Error getting visible users:", error);
    return [];
  }
}

/**
 * Get teams/groups that user manages based on automatic detection
 */
export async function getAutoDetectedManagedTeams(userId, projectKey) {
  try {
    const userLevel = await detectUserHierarchyLevel(userId, projectKey);
    console.log(
      `🏢 Checking managed teams for user level: ${userLevel.level} (${userLevel.config.level})`
    );

    // 🔧 FIXED: Team leads and above can manage teams
    // Lower level numbers = higher authority, so use <= instead of >=
    if (userLevel.config.level > PERMISSION_HIERARCHY.TEAM_LEAD.level) {
      console.log(
        `❌ User level ${userLevel.config.level} > ${PERMISSION_HIERARCHY.TEAM_LEAD.level} - cannot manage teams`
      );
      return [];
    }

    console.log(
      `✅ User level ${userLevel.config.level} <= ${PERMISSION_HIERARCHY.TEAM_LEAD.level} - can manage teams`
    );
    const managedTeams = [];

    // Enterprise Administrators can manage ALL teams
    if (
      userLevel.level === "ENTERPRISE_ADMINISTRATOR" ||
      userLevel.config.scope === "GLOBAL"
    ) {
      console.log(`🌐 Enterprise Admin - can manage all teams globally`);

      try {
        // Get all organization teams/projects
        const allProjects = await getAllProjects();
        for (const project of allProjects) {
          const projectUsers = await getProjectUsers(project.key);
          managedTeams.push({
            id: `enterprise-team-${project.key}`,
            name: `${project.name} Team`,
            type: "PROJECT_TEAM",
            members: projectUsers,
            leaderId: userId,
            projectKey: project.key,
            scope: "GLOBAL",
          });
        }
      } catch (error) {
        console.log(
          `⚠️ Couldn't get all projects, using current project: ${error.message}`
        );
      }
    }

    // Get project roles where user is a lead
    const projectRoles = await getUserProjectRoles(userId, projectKey);
    console.log(`📋 Found ${projectRoles.length} project roles for user`);

    for (const role of projectRoles) {
      if (isLeadershipRole(role)) {
        console.log(`👑 Leadership role found: ${role.name}`);
        const teamMembers = await getProjectRoleMembers(projectKey, role.id);
        managedTeams.push({
          id: `auto-team-${role.id}`,
          name: role.name,
          type: "PROJECT_ROLE",
          members: teamMembers,
          leaderId: userId,
          projectKey,
          scope: userLevel.config.scope,
        });
      }
    }

    // Get groups where user is an admin
    const userGroups = await getUserManagedGroups(userId);
    console.log(`👥 Found ${userGroups.length} managed groups for user`);

    for (const group of userGroups) {
      const groupMembers = await getGroupMembers(group.name);
      managedTeams.push({
        id: `auto-group-${group.name}`,
        name: group.name,
        type: "USER_GROUP",
        members: groupMembers,
        leaderId: userId,
        scope: "GLOBAL",
      });
    }

    console.log(
      `🏢 Auto-detected ${managedTeams.length} managed teams for user`
    );
    return managedTeams;
  } catch (error) {
    console.error("❌ Error getting auto-detected managed teams:", error);
    return [];
  }
}

/**
 * Build automatic hierarchy path for user based on their permissions and groups
 */
export async function buildAutoHierarchyPath(userId, projectKey = null) {
  try {
    const userLevel = await detectUserHierarchyLevel(userId, projectKey);
    const path = [];

    // Add organization level (automatically determined)
    const orgInfo = await getOrganizationInfo();
    path.push({
      level: 0,
      name: orgInfo.name || "Organization",
      type: "ORGANIZATION",
      id: orgInfo.id || "auto-org",
    });

    // Add division/region based on user's scope
    if (userLevel.config.level <= PERMISSION_HIERARCHY.DIVISION_MANAGER.level) {
      const division = await detectUserDivision(userId);
      if (division) {
        path.push({
          level: 1,
          name: division.name,
          type: "DIVISION",
          id: division.id,
        });
      }
    }

    // Add department/project level
    if (projectKey) {
      const projectInfo = await getProjectInfo(projectKey);
      path.push({
        level: 2,
        name: projectInfo.name,
        type: "PROJECT",
        id: projectKey,
      });
    }

    // Add team level based on project roles
    const userRoles = await getUserProjectRoles(userId, projectKey);
    const primaryRole = userRoles.find((role) => isTeamRole(role));
    if (primaryRole) {
      path.push({
        level: 3,
        name: primaryRole.name,
        type: "PROJECT_ROLE",
        id: primaryRole.id,
      });
    }

    // Add individual level
    const userInfo = await getUserInfo(userId);
    path.push({
      level: userLevel.config.level,
      name: userInfo.displayName,
      type: "USER",
      id: userId,
    });

    console.log(`🗺️ Built auto hierarchy path with ${path.length} levels`);
    return path;
  } catch (error) {
    console.error("❌ Error building auto hierarchy path:", error);
    return [];
  }
}

/**
 * Get capacity dashboard filters based on user's automatic hierarchy position
 */
export async function getAutoHierarchyFilters(userId, projectKey) {
  try {
    const userLevel = await detectUserHierarchyLevel(userId, projectKey);
    const visibleUsers = await getVisibleUsersInHierarchy(userId, projectKey);

    const filters = {
      userLevel: userLevel.level,
      scope: userLevel.config.scope,
      visibleUserIds: visibleUsers.map((u) => u.accountId),
      canManageUsers:
        userLevel.config.level <= PERMISSION_HIERARCHY.TEAM_LEAD.level,
      canViewCrossProject:
        userLevel.config.level <= PERMISSION_HIERARCHY.DIVISION_MANAGER.level,
      managedTeams: await getAutoDetectedManagedTeams(userId, projectKey),
    };

    console.log(
      `🎯 Generated auto hierarchy filters: ${filters.scope} scope with ${filters.visibleUserIds.length} visible users`
    );
    return filters;
  } catch (error) {
    console.error("❌ Error getting auto hierarchy filters:", error);
    return {
      userLevel: "INDIVIDUAL",
      scope: "INDIVIDUAL",
      visibleUserIds: [userId],
      canManageUsers: false,
      canViewCrossProject: false,
      managedTeams: [],
    };
  }
}

// Helper functions for permission detection

async function getUserProjectPermissions(userId, projectKey) {
  try {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/mypermissions?projectKey=${projectKey}`);

    if (!response.ok) return [];

    const data = await response.json();
    return Object.entries(data.permissions || {})
      .filter(([key, perm]) => perm.havePermission)
      .map(([key]) => key);
  } catch (error) {
    console.error("Error getting user project permissions:", error);
    return [];
  }
}

async function getUserGlobalPermissions(userId) {
  try {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/mypermissions`);

    if (!response.ok) return [];

    const data = await response.json();
    return Object.entries(data.permissions || {})
      .filter(([key, perm]) => perm.havePermission)
      .map(([key]) => key);
  } catch (error) {
    console.error("Error getting user global permissions:", error);
    return [];
  }
}

async function getUserGroups(userId) {
  try {
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/user/groups?accountId=${userId}`);

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error getting user groups:", error);
    return [];
  }
}

async function getProjectUsers(projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=200`
      );

    if (!response.ok) return [];

    return await response.json();
  } catch (error) {
    console.error("Error getting project users:", error);
    return [];
  }
}

async function getUserProjectRoles(userId, projectKey) {
  try {
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/project/${projectKey}/role`);

    if (!response.ok) return [];

    const roles = await response.json();
    const userRoles = [];

    for (const [roleId, roleUrl] of Object.entries(roles)) {
      const roleResponse = await api.asApp().requestJira(route`${roleUrl}`);
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        const hasUser = roleData.actors?.some(
          (actor) => actor.actorUser?.accountId === userId
        );
        if (hasUser) {
          userRoles.push({
            id: roleId,
            name: roleData.name,
            description: roleData.description,
          });
        }
      }
    }

    return userRoles;
  } catch (error) {
    console.error("Error getting user project roles:", error);
    return [];
  }
}

function detectLevelFromGroups(groups) {
  const groupPatterns = {
    ENTERPRISE_ADMIN: /admin|administrator|system|global/i,
    DIVISION_MANAGER: /division|regional|director|manager/i,
    DEPARTMENT_MANAGER: /department|project.*manager|lead.*manager/i,
    TEAM_LEAD: /team.*lead|lead|supervisor/i,
  };

  for (const group of groups) {
    for (const [level, pattern] of Object.entries(groupPatterns)) {
      if (pattern.test(group.name)) {
        return PERMISSION_HIERARCHY[level];
      }
    }
  }

  return null;
}

function shouldAllowCrossFunctionalAccess(
  userLevel,
  targetUserLevel,
  targetUser
) {
  // Allow cross-functional visibility for collaboration
  // E.g., developers can see QA team members regardless of hierarchy
  const collaborativeGroups = ["developers", "qa", "design", "product"];

  // This can be enhanced based on specific organizational needs
  return false; // Conservative default
}

function isLeadershipRole(role) {
  const leadershipPatterns = /lead|manager|admin|director|supervisor/i;
  return leadershipPatterns.test(role.name);
}

function isTeamRole(role) {
  const teamPatterns = /team|group|squad|pod/i;
  return teamPatterns.test(role.name) || !isLeadershipRole(role);
}

// Utility functions for caching and data retrieval

async function getCachedData(key, maxAgeSeconds = 300) {
  try {
    const cached = await storage.get(`${STORAGE_KEYS.HIERARCHY_CACHE}:${key}`);
    if (cached && cached.timestamp) {
      const age = (Date.now() - cached.timestamp) / 1000;
      if (age < maxAgeSeconds) {
        return cached.data;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function setCachedData(key, data, maxAgeSeconds = 300) {
  try {
    await storage.set(`${STORAGE_KEYS.HIERARCHY_CACHE}:${key}`, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + maxAgeSeconds * 1000,
    });
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

async function getOrganizationInfo() {
  // This could be enhanced to detect organization from Jira instance details
  return {
    id: "auto-org",
    name: "Organization", // Could be derived from Jira instance name
  };
}

async function detectUserDivision(userId) {
  // Could be enhanced to detect from user's department field or group membership
  return null;
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

async function getUserInfo(userId) {
  try {
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/user?accountId=${userId}`);

    if (response.ok) {
      return await response.json();
    }

    return { displayName: "Unknown User", accountId: userId };
  } catch (error) {
    return { displayName: "Unknown User", accountId: userId };
  }
}

async function getUserManagedGroups(userId) {
  try {
    // Note: Group management detection would require additional permissions
    // For automatic hierarchy, we'll rely primarily on project roles and permissions
    // rather than group management which requires more administrative scopes
    console.log(
      `ℹ️ Group management detection for user ${userId} - using project roles instead`
    );
    return [];
  } catch (error) {
    console.error("Error getting user managed groups:", error);
    return [];
  }
}

async function getGroupMembers(groupName) {
  try {
    // Note: This endpoint requires "manage:jira-configuration" scope
    // For now, return empty array to avoid permission issues
    // In production, this could be enhanced with proper scope or alternative methods
    console.log(
      `⚠️ Group member lookup for '${groupName}' requires additional permissions - skipping for now`
    );
    return [];
  } catch (error) {
    console.error("Error getting group members:", error);
    return [];
  }
}

async function getProjectRoleMembers(projectKey, roleId) {
  try {
    const response = await api
      .asApp()
      .requestJira(route`/rest/api/3/project/${projectKey}/role/${roleId}`);

    if (response.ok) {
      const data = await response.json();
      return (
        data.actors
          ?.filter((actor) => actor.actorUser)
          .map((actor) => actor.actorUser) || []
      );
    }

    return [];
  } catch (error) {
    console.error("Error getting project role members:", error);
    return [];
  }
}

/**
 * Check if user is organization admin by checking their global permissions
 */
async function checkIfOrganizationAdmin(userId) {
  try {
    console.log(`🔍 Checking if ${userId} is organization admin...`);

    // Try multiple approaches to detect admin status

    // Method 0: Check if user can access admin areas (simplest test)
    try {
      console.log(`🔍 Method 0: Testing admin access...`);
      const adminTestResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/configuration`);

      console.log(`🔍 Method 0 admin access status:`, adminTestResponse.status);

      if (adminTestResponse.status === 200) {
        console.log(
          `🎯 DETECTED: User can access admin configuration - confirmed org admin!`
        );
        return true;
      } else if (adminTestResponse.status === 403) {
        console.log(`⚠️ Method 0: Access forbidden - not admin`);
      } else {
        console.log(
          `⚠️ Method 0: Unexpected status ${adminTestResponse.status}`
        );
      }
    } catch (error) {
      console.log(`⚠️ Method 0 failed:`, error.message);
    }

    // Method 1: Check all permissions (no filters)
    try {
      console.log(`🔍 Method 1: Checking specific admin permissions...`);
      const adminCheckResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/mypermissions`);

      console.log(`🔍 Method 1 response status:`, adminCheckResponse.status);

      if (adminCheckResponse.ok) {
        const adminData = await adminCheckResponse.json();
        console.log(
          `🔍 Method 1 full response:`,
          JSON.stringify(adminData, null, 2)
        );

        const permissions = adminData.permissions || {};
        console.log(`🔍 Admin permissions found:`, Object.keys(permissions));

        // Log each permission in detail
        Object.entries(permissions).forEach(([key, value]) => {
          console.log(
            `  📋 ${key}: ${value.havePermission ? "✅ YES" : "❌ NO"} - ${
              value.description || "No description"
            }`
          );
        });

        // Check for any admin permission
        if (permissions["ADMINISTER"]?.havePermission) {
          console.log(
            `🎯 DETECTED: User has ADMINISTER permission - confirmed org admin!`
          );
          return true;
        }

        if (
          permissions["ADMINISTER_PROJECT"]?.havePermission &&
          permissions["BROWSE_PROJECTS"]?.havePermission
        ) {
          console.log(
            `🎯 DETECTED: User has project admin + browse permissions - likely org admin!`
          );
          return true;
        }

        console.log(
          `⚠️ Method 1: No admin permissions detected in specific check`
        );
      } else {
        console.log(
          `❌ Method 1: Permission API call failed with status ${adminCheckResponse.status}`
        );
      }
    } catch (error) {
      console.log(
        `⚠️ Method 1 failed, trying alternative approach:`,
        error.message
      );
    }

    // Method 2: Try getting all permissions
    try {
      console.log(`🔍 Method 2: Checking all user permissions...`);
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/mypermissions`);

      console.log(`🔍 Method 2 response status:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Method 2 full response structure:`, {
          hasPermissions: !!data.permissions,
          permissionCount: data.permissions
            ? Object.keys(data.permissions).length
            : 0,
          keys: data.permissions
            ? Object.keys(data.permissions).slice(0, 5)
            : [],
        });

        const permissions = data.permissions || {};

        console.log(
          `🔍 All user permissions found (${
            Object.keys(permissions).length
          } total):`,
          Object.keys(permissions).slice(0, 15)
        ); // Log first 15

        // Look for any admin indicator and log them in detail
        const adminIndicators = Object.keys(permissions).filter(
          (key) =>
            key.includes("ADMIN") ||
            key.includes("ADMINISTER") ||
            key === "BROWSE_PROJECTS" ||
            key.includes("PROJECT_ADMIN") ||
            key.includes("SYSTEM")
        );

        console.log(
          `🔍 Admin indicators found (${adminIndicators.length}):`,
          adminIndicators
        );

        // Log the actual permission values for admin indicators
        adminIndicators.forEach((key) => {
          const perm = permissions[key];
          console.log(
            `  📋 ${key}: ${perm.havePermission ? "✅ YES" : "❌ NO"} - ${
              perm.description || "No description"
            }`
          );
        });

        if (adminIndicators.length > 0) {
          // Check if any admin permission is actually granted
          const grantedAdminPerms = adminIndicators.filter(
            (key) => permissions[key]?.havePermission
          );
          console.log(`🔍 Granted admin permissions:`, grantedAdminPerms);

          if (grantedAdminPerms.length > 0) {
            console.log(
              `🎯 DETECTED: User has ${grantedAdminPerms.length} granted admin permissions - confirmed admin!`
            );
            return true;
          } else {
            console.log(
              `⚠️ Method 2: Admin permissions exist but none are granted`
            );
          }
        } else {
          console.log(`⚠️ Method 2: No admin indicator permissions found`);
        }
      } else {
        console.log(
          `❌ Method 2: Get all permissions failed with status ${response.status}`
        );
      }
    } catch (error) {
      console.log(`⚠️ Method 2 failed:`, error.message);
    }

    // Method 3: Check project admin permissions
    try {
      console.log(`🔍 Method 3: Checking project admin capabilities...`);
      const projectResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/project`);

      console.log(`🔍 Method 3 project list status:`, projectResponse.status);

      if (projectResponse.ok) {
        const projects = await projectResponse.json();
        console.log(`🔍 Method 3: Can access ${projects.length || 0} projects`);

        // If user can see multiple projects, likely has elevated permissions
        if (projects.length >= 2) {
          console.log(
            `🎯 DETECTED: User can access multiple projects - likely admin!`
          );
          return true;
        }
      }
    } catch (error) {
      console.log(`⚠️ Method 3 failed:`, error.message);
    }

    // Method 4: Fallback - assume if we can't determine, they're not admin
    console.log(
      `🤷 Could not determine admin status - defaulting to non-admin`
    );
    return false;
  } catch (error) {
    console.error("❌ Error checking organization admin status:", error);
    return false;
  }
}

/**
 * Get organization-wide users (for Enterprise Administrators)
 */
async function getOrganizationUsers() {
  try {
    console.log(`🏢 Getting organization-wide users...`);

    // Method 1: Try getting users from all accessible projects
    const projects = await getAllProjects();
    const allUsers = new Set();

    for (const project of projects) {
      try {
        const projectUsers = await getProjectUsers(project.key);
        projectUsers.forEach((user) => allUsers.add(user));
      } catch (error) {
        console.log(
          `⚠️ Could not get users from project ${project.key}: ${error.message}`
        );
      }
    }

    console.log(
      `🏢 Found ${allUsers.size} unique organization users from ${projects.length} projects`
    );
    return Array.from(allUsers);
  } catch (error) {
    console.error("❌ Error getting organization users:", error);

    // Method 2: Fallback to user search if available
    try {
      console.log(`🔍 Trying user search as fallback...`);
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/user/search?query=@`);

      if (response.ok) {
        const users = await response.json();
        console.log(`🔍 User search found ${users.length} users`);
        return users;
      }
    } catch (searchError) {
      console.log(`⚠️ User search also failed: ${searchError.message}`);
    }

    return null;
  }
}

/**
 * Get all projects accessible to current user
 */
async function getAllProjects() {
  try {
    console.log(`📂 Getting all accessible projects...`);

    const response = await api.asUser().requestJira(route`/rest/api/3/project`);

    if (!response.ok) {
      console.log(`❌ Failed to get projects: ${response.status}`);
      return [];
    }

    const projects = await response.json();
    console.log(`📂 Found ${projects.length} accessible projects`);

    return projects;
  } catch (error) {
    console.error("❌ Error getting all projects:", error);
    return [];
  }
}
