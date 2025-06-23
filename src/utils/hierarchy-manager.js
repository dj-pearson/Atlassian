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
    // OVERRIDE: Always fresh detection for now - ignore cache
    // First, check if user is organization admin
    const isOrgAdmin = await checkIfOrganizationAdmin(userId);
    if (isOrgAdmin) {
      // Organization admin detected
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
    return result;
  } catch (error) {
    // Silently handle hierarchy detection errors in production
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
    const userLevel = await detectUserHierarchyLevel(userId, projectKey);

    const projectUsers = await getProjectUsers(projectKey);
    const visibleUsers = new Set();

    // Enterprise Administrators can see ALL users globally (bypass normal hierarchy)
    if (
      userLevel.level === "ENTERPRISE_ADMINISTRATOR" ||
      userLevel.config.scope === "GLOBAL"
    ) {
      // For Enterprise Admins, get users from multiple projects or organization-wide
      try {
        // Try to get organization-wide users if available
        const allUsers = await getOrganizationUsers();
        if (allUsers && allUsers.length > 0) {
          allUsers.forEach((user) => visibleUsers.add(user));
        } else {
          // Fallback to project users
          projectUsers.forEach((user) => visibleUsers.add(user));
        }
      } catch (error) {
        projectUsers.forEach((user) => visibleUsers.add(user));
      }

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
      } else {
      }

      // Special cases for cross-functional visibility
      if (shouldAllowCrossFunctionalAccess(userLevel, targetUserLevel, user)) {
        visibleUsers.add(user);
      }
    }

    return Array.from(visibleUsers);
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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

    // 🔧 FIXED: Team leads and above can manage teams
    // Lower level numbers = higher authority, so use <= instead of >=
    if (userLevel.config.level > PERMISSION_HIERARCHY.TEAM_LEAD.level) {
      return [];
    }

    const managedTeams = [];

    // Enterprise Administrators can manage ALL teams
    if (
      userLevel.level === "ENTERPRISE_ADMINISTRATOR" ||
      userLevel.config.scope === "GLOBAL"
    ) {
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
        // Silently handle project enumeration errors
      }
    }

    // Get project roles where user is a lead
    const projectRoles = await getUserProjectRoles(userId, projectKey);
    for (const role of projectRoles) {
      if (isLeadershipRole(role)) {
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

    return managedTeams;
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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

    return path;
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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

    return filters;
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
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
    return [];
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Error getting user managed groups:", error);
    return [];
  }
}

async function getGroupMembers(groupName) {
  try {
    // Note: This endpoint requires "manage:jira-configuration" scope
    // For now, return empty array to avoid permission issues
    // In production, this could be enhanced with proper scope or alternative methods
    return [];
  } catch (error) {
    if (process.env.NODE_ENV === "development")
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
    if (process.env.NODE_ENV === "development")
      console.error("Error getting project role members:", error);
    return [];
  }
}

/**
 * Check if user is organization admin by checking their global permissions
 */
async function checkIfOrganizationAdmin(userId) {
  try {
    // Try multiple approaches to detect admin status

    // Method 0: Check if user can access admin areas (simplest test)
    try {
      const adminTestResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/configuration`);

      if (adminTestResponse.status === 200) {
        return true;
      } else if (adminTestResponse.status === 403) {
        // Access denied - not admin
      } else {
        // Other status
      }
    } catch (error) {
      // Silently handle errors in production
    }

    // Method 1: Check all permissions (no filters)
    try {
      const adminCheckResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/mypermissions`);

      if (adminCheckResponse.ok) {
        const adminData = await adminCheckResponse.json();

        const permissions = adminData.permissions || {};

        // Check for any admin permission
        if (permissions["ADMINISTER"]?.havePermission) {
          return true;
        }

        if (
          permissions["ADMINISTER_PROJECT"]?.havePermission &&
          permissions["BROWSE_PROJECTS"]?.havePermission
        ) {
          return true;
        }
      } else {
        // Response not ok
      }
    } catch (error) {
      // Silently handle errors in production
    }

    // Method 2: Try getting all permissions
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/mypermissions`);

      if (response.ok) {
        const data = await response.json();

        const permissions = data.permissions || {};

        // Look for any admin indicator and log them in detail
        const adminIndicators = Object.keys(permissions).filter(
          (key) =>
            key.includes("ADMIN") ||
            key.includes("ADMINISTER") ||
            key === "BROWSE_PROJECTS" ||
            key.includes("PROJECT_ADMIN") ||
            key.includes("SYSTEM")
        );

        // Check admin indicators

        if (adminIndicators.length > 0) {
          // Check if any admin permission is actually granted
          const grantedAdminPerms = adminIndicators.filter(
            (key) => permissions[key]?.havePermission
          );
          if (grantedAdminPerms.length > 0) {
            return true;
          } else {
            // No granted admin permissions
          }
        } else {
          // No admin indicators found
        }
      } else {
      }
    } catch (error) {
      // Silently handle errors in production
    }

    // Method 3: Check project admin permissions
    try {
      const projectResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/project`);

      if (projectResponse.ok) {
        const projects = await projectResponse.json();
        // If user can see multiple projects, likely has elevated permissions
        if (projects.length >= 2) {
          return true;
        }
      }
    } catch (error) {
      // Silently handle errors in production
    }

    // Method 4: Fallback - assume if we can't determine, they're not admin
    return false;
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("❌ Error checking organization admin status:", error);
    return false;
  }
}

/**
 * Get organization-wide users (for Enterprise Administrators)
 */
async function getOrganizationUsers() {
  try {
    // Method 1: Try getting users from all accessible projects
    const projects = await getAllProjects();
    const allUsers = new Set();

    for (const project of projects) {
      try {
        const projectUsers = await getProjectUsers(project.key);
        projectUsers.forEach((user) => allUsers.add(user));
      } catch (error) {
        // Silently handle errors in production
      }
    }

    return Array.from(allUsers);
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("❌ Error getting organization users:", error);

    // Method 2: Fallback to user search if available
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/user/search?query=@`);

      if (response.ok) {
        const users = await response.json();
        return users;
      }
    } catch (searchError) {}

    return null;
  }
}

/**
 * Get all projects accessible to current user
 */
async function getAllProjects() {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/project`);

    if (!response.ok) {
      return [];
    }

    const projects = await response.json();
    return projects;
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("❌ Error getting all projects:", error);
    return [];
  }
}
