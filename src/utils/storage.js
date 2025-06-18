import { storage } from "@forge/api";

/**
 * Storage utility functions for Multi-Assignee Manager
 */

// Storage keys
const STORAGE_KEYS = {
  APP_SETTINGS: "app-settings",
  USER_PREFERENCES: "user-preferences",
  TEAM_CAPACITY: "team-capacity",
  ANALYTICS: "analytics",
  SUGGESTIONS_CACHE: "suggestions-cache",
};

/**
 * Get app settings with defaults
 */
export async function getAppSettings() {
  try {
    const settings = await storage.get(STORAGE_KEYS.APP_SETTINGS);

    // Return defaults if no settings found
    if (!settings) {
      const defaultSettings = {
        maxAssignees: 8,
        defaultRoles: ["primary", "secondary", "reviewer", "collaborator"],
        notificationSettings: {
          digestMode: true,
          frequency: "immediate",
        },
        capacityThresholds: {
          optimal: 0.7,
          busy: 0.9,
          overloaded: 1.0,
        },
        enableSmartSuggestions: true,
        enableAnalytics: true,
      };

      await storage.set(STORAGE_KEYS.APP_SETTINGS, defaultSettings);
      return defaultSettings;
    }

    return settings;
  } catch (error) {
    console.error("Error getting app settings:", error);
    throw error;
  }
}

/**
 * Update app settings
 */
export async function updateAppSettings(newSettings) {
  try {
    const currentSettings = await getAppSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };

    await storage.set(STORAGE_KEYS.APP_SETTINGS, updatedSettings);
    return updatedSettings;
  } catch (error) {
    console.error("Error updating app settings:", error);
    throw error;
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userAccountId) {
  try {
    const key = `${STORAGE_KEYS.USER_PREFERENCES}:${userAccountId}`;
    const preferences = await storage.get(key);

    // Return defaults if no preferences found
    if (!preferences) {
      const defaultPreferences = {
        maxPrimaryAssignments: 5,
        maxSecondaryAssignments: 8,
        preferredCollaborators: [],
        notificationSettings: {
          digestMode: false,
          frequency: "immediate",
          channels: ["email", "in-app"],
        },
        dashboardSettings: {
          showCapacityAlerts: true,
          showTeamOverview: true,
          refreshInterval: 300000, // 5 minutes
        },
      };

      await storage.set(key, defaultPreferences);
      return defaultPreferences;
    }

    return preferences;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    throw error;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userAccountId, newPreferences) {
  try {
    const key = `${STORAGE_KEYS.USER_PREFERENCES}:${userAccountId}`;
    const currentPreferences = await getUserPreferences(userAccountId);
    const updatedPreferences = { ...currentPreferences, ...newPreferences };

    await storage.set(key, updatedPreferences);
    return updatedPreferences;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
}

/**
 * Store team capacity data
 */
export async function storeTeamCapacity(projectKey, capacityData) {
  try {
    const key = `${STORAGE_KEYS.TEAM_CAPACITY}:${projectKey}`;
    const timestampedData = {
      ...capacityData,
      lastUpdated: new Date().toISOString(),
      projectKey,
    };

    await storage.set(key, timestampedData);
    return timestampedData;
  } catch (error) {
    console.error("Error storing team capacity:", error);
    throw error;
  }
}

/**
 * Get team capacity data
 */
export async function getTeamCapacity(projectKey) {
  try {
    const key = `${STORAGE_KEYS.TEAM_CAPACITY}:${projectKey}`;
    const capacityData = await storage.get(key);

    return (
      capacityData || {
        projectKey,
        users: [],
        teamMetrics: {},
        lastUpdated: null,
      }
    );
  } catch (error) {
    console.error("Error getting team capacity:", error);
    throw error;
  }
}

/**
 * Store analytics event
 */
export async function storeAnalyticsEvent(eventType, eventData) {
  try {
    const timestamp = Date.now();
    const key = `${STORAGE_KEYS.ANALYTICS}:${timestamp}:${eventType}`;

    const analyticsEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      ...eventData,
    };

    await storage.set(key, analyticsEvent);
    return analyticsEvent;
  } catch (error) {
    console.error("Error storing analytics event:", error);
    throw error;
  }
}

/**
 * Get analytics events by type and date range
 */
export async function getAnalyticsEvents(eventType, startDate, endDate) {
  try {
    // Note: In a real implementation, we would need more sophisticated querying
    // For now, this is a simplified version
    const pattern = `${STORAGE_KEYS.ANALYTICS}:*:${eventType}`;

    // This would need to be implemented with proper querying
    // For demo purposes, returning empty array
    return [];
  } catch (error) {
    console.error("Error getting analytics events:", error);
    throw error;
  }
}

/**
 * Cache assignee suggestions
 */
export async function cacheSuggestions(issueKey, suggestions) {
  try {
    const key = `${STORAGE_KEYS.SUGGESTIONS_CACHE}:${issueKey}`;
    const cacheData = {
      suggestions,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    await storage.set(key, cacheData);
    return cacheData;
  } catch (error) {
    console.error("Error caching suggestions:", error);
    throw error;
  }
}

/**
 * Get cached suggestions
 */
export async function getCachedSuggestions(issueKey) {
  try {
    const key = `${STORAGE_KEYS.SUGGESTIONS_CACHE}:${issueKey}`;
    const cacheData = await storage.get(key);

    if (!cacheData) {
      return null;
    }

    // Check if cache is expired
    const now = new Date();
    const expiresAt = new Date(cacheData.expiresAt);

    if (now > expiresAt) {
      await storage.delete(key);
      return null;
    }

    return cacheData.suggestions;
  } catch (error) {
    console.error("Error getting cached suggestions:", error);
    throw error;
  }
}

/**
 * Clear all cache data (for cleanup)
 */
export async function clearCache() {
  try {
    // Note: In a real implementation, we would need to iterate through keys
    // For now, this is a placeholder
    console.log("Cache cleared");
  } catch (error) {
    console.error("Error clearing cache:", error);
    throw error;
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  try {
    // Note: Forge storage doesn't provide direct stats API
    // This would need to be implemented by tracking our own metrics
    return {
      totalKeys: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting storage stats:", error);
    throw error;
  }
}
