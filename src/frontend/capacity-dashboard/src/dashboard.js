import { invoke, requestJira } from "@forge/bridge";

console.log("=== DASHBOARD SCRIPT LOADED ===");
console.log("Current URL:", window.location.href);
console.log("Script execution time:", new Date().toISOString());

// Mock data generator for fallback
function generateRealisticMockData(projectKey) {
  console.log("Generating mock data for project:", projectKey);

  const mockUsers = [
    {
      accountId: "user1",
      displayName: "Sarah Johnson",
      email: "sarah.johnson@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 3,
      secondary: 2,
      reviewer: 1,
      collaborator: 1,
      utilizationRate: 0.95,
      healthStatus: "overloaded",
    },
    {
      accountId: "user2",
      displayName: "Mike Chen",
      email: "mike.chen@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 2,
      secondary: 3,
      reviewer: 2,
      collaborator: 0,
      utilizationRate: 0.875,
      healthStatus: "high",
    },
    {
      accountId: "user3",
      displayName: "Emily Rodriguez",
      email: "emily.rodriguez@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 1,
      secondary: 1,
      reviewer: 1,
      collaborator: 2,
      utilizationRate: 0.625,
      healthStatus: "optimal",
    },
    {
      accountId: "user4",
      displayName: "David Kim",
      email: "david.kim@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 4,
      secondary: 1,
      reviewer: 0,
      collaborator: 1,
      utilizationRate: 1.0,
      healthStatus: "critical",
    },
  ];

  const totalMembers = mockUsers.length;
  const totalAssignments = mockUsers.reduce(
    (sum, user) =>
      sum + user.primary + user.secondary + user.reviewer + user.collaborator,
    0
  );
  const averageUtilization =
    mockUsers.reduce((sum, user) => sum + user.utilizationRate, 0) /
    totalMembers;

  let healthStatus = "good";
  if (averageUtilization > 0.9) healthStatus = "critical";
  else if (averageUtilization > 0.8) healthStatus = "warning";

  return {
    success: true,
    data: {
      users: mockUsers,
      metrics: {
        totalMembers,
        totalAssignments,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
        healthStatus,
      },
    },
  };
}

// Real data loading function using proper @forge/bridge import
async function loadRealData() {
  console.log("=== ATTEMPTING TO LOAD REAL DATA ===");

  try {
    console.log("Using @forge/bridge import for invoke");

    // Extract project key from URL
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    const projectKey = urlMatch ? urlMatch[1] : "DEMO";

    console.log("Calling capacity resolver with project key:", projectKey);

    // Use the imported invoke function
    const result = await invoke("getCapacityData", {
      projectKey: projectKey,
      timestamp: new Date().toISOString(),
    });

    console.log("Real data loaded successfully:", result);
    return result;
  } catch (error) {
    console.error("Error loading real data:", error);
    console.log("Falling back to mock data...");

    // Extract project key for mock data
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    const projectKey = urlMatch ? urlMatch[1] : "DEMO";

    return generateRealisticMockData(projectKey);
  }
}

// Helper functions
function getUserInitials(displayName) {
  return displayName
    .split(" ")
    .map((name) => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getStatusClass(healthStatus) {
  const statusMap = {
    optimal: "status-optimal",
    good: "status-good",
    high: "status-high",
    warning: "status-warning",
    overloaded: "status-overloaded",
    critical: "status-critical",
  };
  return statusMap[healthStatus] || "status-good";
}

function getCapacityColor(utilizationRate) {
  if (utilizationRate >= 1.0) return "#DE350B"; // Critical red
  if (utilizationRate >= 0.8) return "#FF8B00"; // Warning orange
  return "#36B37E"; // Good green
}

// Dashboard update function
function updateDashboard(data) {
  console.log("=== UPDATING DASHBOARD ===");

  if (!data) {
    console.error("No data provided to updateDashboard");
    return;
  }

  // Handle error case
  if (data.error) {
    console.error("Error in data:", data.error);
    // Show error state but continue with any available data
  }

  // Extract data - resolver returns data directly, not wrapped in data.data
  const { users = [], metrics = {}, alerts = [] } = data;

  console.log("Processing data:", {
    userCount: users.length,
    metrics,
    alertCount: alerts.length,
  });

  // Update metrics - handle the resolver's metric structure
  document.getElementById("total-members").textContent =
    metrics.totalMembers || 0;
  document.getElementById("avg-utilization").textContent = `${
    metrics.avgUtilization || 0
  }%`;
  document.getElementById("total-assignments").textContent =
    metrics.activeAssignments || 0;
  document.getElementById("health-status").textContent =
    metrics.healthStatus || "Unknown";
  document.getElementById(
    "health-status"
  ).className = `health-badge ${getStatusClass(
    metrics.healthStatus?.toLowerCase() || "unknown"
  )}`;

  // Update user cards
  const usersContainer = document.getElementById("users-container");
  if (users.length === 0) {
    usersContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6B778C;">
        <h3>No team members found</h3>
        <p>No active assignments in this project, or the multi-assignees field is not configured.</p>
      </div>
    `;
  } else {
    usersContainer.innerHTML = users
      .map(
        (user) => `
      <div class="user-card">
        <div class="user-header">
          <div class="user-avatar">
            ${
              user.avatarUrl
                ? `<img src="${user.avatarUrl}" alt="${user.displayName}" />`
                : `<div class="avatar-initials">${getUserInitials(
                    user.displayName
                  )}</div>`
            }
          </div>
          <div class="user-info">
            <div class="user-name">${user.displayName}</div>
            <div class="user-email">${user.email || user.userAccountId}</div>
          </div>
          <div class="user-status ${getStatusClass(user.healthStatus)}">
            ${
              user.healthStatus?.charAt(0).toUpperCase() +
                user.healthStatus?.slice(1) || "Unknown"
            }
          </div>
        </div>
        <div class="capacity-info">
          <div class="capacity-bar">
            <div class="capacity-fill" style="width: ${Math.min(
              user.utilizationRate * 100,
              100
            )}%; background-color: ${getCapacityColor(
          user.utilizationRate
        )};"></div>
          </div>
          <div class="capacity-text">${Math.round(
            user.utilizationRate * 100
          )}% utilized</div>
        </div>
        <div class="assignment-breakdown">
          <div class="assignment-item">
            <span class="assignment-dot primary"></span>
            <span>Primary: ${user.primary || 0}</span>
          </div>
          <div class="assignment-item">
            <span class="assignment-dot secondary"></span>
            <span>Secondary: ${user.secondary || 0}</span>
          </div>
          <div class="assignment-item">
            <span class="assignment-dot reviewer"></span>
            <span>Reviewer: ${user.reviewer || 0}</span>
          </div>
          <div class="assignment-item">
            <span class="assignment-dot collaborator"></span>
            <span>Collaborator: ${user.collaborator || 0}</span>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  // Update alerts - handle the resolver's alert structure
  const alertsContainer = document.getElementById("alerts-container");
  if (alerts.length === 0 && !data.error) {
    alertsContainer.innerHTML = `
      <div class="alert alert-success">
        <div class="alert-icon">✅</div>
        <div class="alert-content">
          <div class="alert-title">All Clear</div>
          <div class="alert-description">Team capacity is well balanced</div>
        </div>
      </div>
    `;
  } else {
    let alertsHtml = "";

    // Show error alert if present
    if (data.error) {
      alertsHtml += `
        <div class="alert alert-critical">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <div class="alert-title">Data Loading Error</div>
            <div class="alert-description">${data.error}</div>
          </div>
        </div>
      `;
    }

    // Show capacity alerts
    alerts.forEach((alert) => {
      const alertClass =
        alert.type === "critical"
          ? "alert-critical"
          : alert.type === "warning"
          ? "alert-warning"
          : "alert-success";
      const alertIcon =
        alert.type === "critical"
          ? "🚨"
          : alert.type === "warning"
          ? "⚡"
          : "ℹ️";

      alertsHtml += `
        <div class="alert ${alertClass}">
          <div class="alert-icon">${alertIcon}</div>
          <div class="alert-content">
            <div class="alert-title">${
              alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
            } Alert</div>
            <div class="alert-description">${alert.message}</div>
          </div>
        </div>
      `;
    });

    alertsContainer.innerHTML = alertsHtml;
  }

  console.log("Dashboard updated successfully!");
}

// Manual refresh function
async function manualRefresh() {
  console.log("Manual refresh triggered");
  const data = await loadRealData();
  updateDashboard(data);
}

let adminPanelOpen = false;

// Initialize dashboard with admin functionality
async function initializeDashboard() {
  console.log("=== INITIALIZING DASHBOARD WITH ADMIN FEATURES ===");

  try {
    // Extract project key from URL
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    currentProjectKey = urlMatch ? urlMatch[1] : "DEMO";
    console.log("Project key set to:", currentProjectKey);

    // Check if current user has admin privileges
    await checkAdminPrivileges();

    // Add admin button to header if user is admin
    const headerActions = document.querySelector(".header-actions");
    if (
      headerActions &&
      !document.querySelector(".admin-btn") &&
      currentUserIsAdmin
    ) {
      const adminButton = document.createElement("button");
      adminButton.className = "admin-btn";
      adminButton.innerHTML = "⚙️ Admin Settings";
      adminButton.onclick = openAdminPanel;
      headerActions.insertBefore(adminButton, headerActions.firstChild);
      console.log("Admin button added for privileged user");
    }

    // Load initial data
    const data = await loadRealData();
    updateDashboard(data);

    // Set up auto-refresh every 5 minutes
    console.log("Setting up auto-refresh (5 minutes)");
    setInterval(async () => {
      console.log("Auto-refresh triggered");
      const refreshData = await loadRealData();
      updateDashboard(refreshData);
    }, 5 * 60 * 1000);

    console.log("Dashboard initialization complete!");
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
  }
}

// Global variables
let currentProjectKey = "DEMO";
let currentUserIsAdmin = false;

// Export functions for global access
window.manualRefresh = manualRefresh;
window.initializeDashboard = initializeDashboard;
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.runBulkAutoAssignment = runBulkAutoAssignment;
window.refreshAdminData = refreshAdminData;
window.editUserCapacity = editUserCapacity;
window.closeEditModal = closeEditModal;
window.saveUserCapacity = saveUserCapacity;

// Check if current user has admin privileges
async function checkAdminPrivileges() {
  try {
    // Check user permissions - for now, we'll check if they can access project admin functions
    const response = await invoke("checkUserPermissions", {
      projectKey: currentProjectKey,
    });

    currentUserIsAdmin = response.isAdmin || false;
    console.log("User admin status:", currentUserIsAdmin);
  } catch (error) {
    console.log("Could not verify admin status, defaulting to false:", error);
    currentUserIsAdmin = false;
  }
}

function openAdminPanel() {
  if (adminPanelOpen) return;

  // Security check
  if (!currentUserIsAdmin) {
    showNotification("Access denied. Admin privileges required.", "error");
    return;
  }

  adminPanelOpen = true;

  // Create admin panel modal
  const modal = document.createElement("div");
  modal.className = "admin-modal-overlay";
  modal.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <div class="header-content">
          <h2>⚙️ Team Capacity Management</h2>
          <p>Project: ${currentProjectKey}</p>
        </div>
        <button class="close-btn" onclick="closeAdminPanel()">×</button>
      </div>
      <div class="admin-modal-content">
        <div class="admin-section">
          <div class="section-header">
            <h3>🤖 Auto-Assignment from Multi-Assignees</h3>
            <p>Automatically set the first multi-assignee as the default assignee for issues without current assignees.</p>
          </div>
          <div class="admin-actions">
            <button class="admin-action-btn primary" onclick="runBulkAutoAssignment()">
              <span class="btn-text">🚀 Run Auto-Assignment</span>
              <span class="btn-loading" style="display: none;">🔄 Processing...</span>
            </button>
          </div>
          <div id="auto-assignment-results" class="results-section" style="display: none;"></div>
        </div>
        
        <div class="admin-section">
          <h3>👥 Team Capacity Settings</h3>
          <p>Configure individual capacity settings for team members.</p>
          <div id="team-settings-table" class="team-table">
            <div class="loading">Loading team data...</div>
          </div>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn secondary" onclick="closeAdminPanel()">Close</button>
        <button class="admin-btn primary" onclick="refreshAdminData()">Refresh Data</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  loadAdminData();
}

function closeAdminPanel() {
  const modal = document.querySelector(".admin-modal-overlay");
  if (modal) {
    modal.remove();
  }
  adminPanelOpen = false;
}

async function loadAdminData() {
  const tableContainer = document.getElementById("team-settings-table");
  if (!tableContainer) {
    console.error("Admin table container not found");
    return;
  }

  // Show loading state
  tableContainer.innerHTML = '<div class="loading">Loading team data...</div>';

  try {
    console.log("Loading admin data for project:", currentProjectKey);

    // Test direct API call
    console.log("🧪 Testing direct API...");
    const testResult = await testSimpleAPI();
    console.log("🧪 Direct API test response:", testResult);

    // Load main capacity data (this still uses resolver since it works)
    const capacityData = await invoke("getCapacityData", {
      projectKey: currentProjectKey,
    });
    console.log("Admin data loaded:", capacityData);

    // Load individual user settings using direct API calls
    const usersWithSettings = await Promise.all(
      capacityData.users.map(async (user) => {
        const settings = await loadUserCapacitySettings(user.userAccountId);
        return {
          ...user,
          capacitySettings: settings,
        };
      })
    );

    console.log("Users with settings:", usersWithSettings);

    // Log individual user settings for debugging
    usersWithSettings.forEach((user) => {
      console.log(`User ${user.displayName} settings:`, {
        maxCapacity: user.capacitySettings.maxCapacity,
        workingHours: user.capacitySettings.workingHours,
        totalCapacity: user.capacitySettings.totalCapacity,
        fullSettings: user.capacitySettings,
      });
    });

    // Render the admin table
    renderAdminTable(usersWithSettings);
  } catch (error) {
    console.error("Error loading admin data:", error);
    if (tableContainer) {
      tableContainer.innerHTML = `<div class="error">Failed to load team data: ${error.message}</div>`;
    }
  }
}

function renderAdminTable(users) {
  const tableContainer = document.getElementById("team-settings-table");

  // Safety check - if container doesn't exist, don't try to render
  if (!tableContainer) {
    console.warn("Team settings table container not found, skipping render");
    return;
  }

  console.log(
    "Rendering table with users:",
    users.map((u) => ({
      name: u.displayName,
      maxCapacity: u.capacitySettings.maxCapacity,
      workingHours: u.capacitySettings.workingHours,
      totalCapacity: u.capacitySettings.totalCapacity,
      settings: u.capacitySettings,
    }))
  );

  const tableHTML = `
    <table class="capacity-table">
      <thead>
        <tr>
          <th>Team Member</th>
          <th>Current Utilization</th>
          <th>Capacity Settings</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (user) => `
          <tr>
            <td>
              <div class="user-info">
                <div class="user-name">${user.displayName}</div>
                <div class="user-email">${
                  user.email || user.userAccountId
                }</div>
              </div>
            </td>
            <td>
              <div class="utilization-info">
                <div class="utilization-percentage">${Math.round(
                  user.utilizationRate * 100
                )}%</div>
                <div class="utilization-details">
                  ${
                    user.primary +
                    user.secondary +
                    user.reviewer +
                    user.collaborator
                  }/${user.capacitySettings.totalCapacity}h
                </div>
                <div class="utilization-badge ${getUtilizationClass(
                  user.utilizationRate
                )}">
                  ${Math.round(user.utilizationRate * 100)}%
                </div>
              </div>
            </td>
            <td>
              <div class="capacity-settings">
                <div>Max: ${user.capacitySettings.maxCapacity} assignments</div>
                <div>Hours: ${user.capacitySettings.workingHours}h/day</div>
                <div>Capacity: ${
                  user.capacitySettings.totalCapacity
                }h/week</div>
              </div>
            </td>
            <td>
              <span class="status-badge ${getStatusClass(user.healthStatus)}">
                ${
                  user.healthStatus?.charAt(0).toUpperCase() +
                  user.healthStatus?.slice(1)
                }
              </span>
            </td>
            <td>
              <button class="edit-btn" onclick="editUserCapacity('${
                user.userAccountId
              }', '${user.displayName}', ${JSON.stringify(
              user.capacitySettings
            ).replace(/"/g, "&quot;")})">
                Edit
              </button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = tableHTML;
}

function getUtilizationClass(utilization) {
  if (utilization >= 1.0) return "overloaded";
  if (utilization >= 0.8) return "busy";
  return "optimal";
}

async function runBulkAutoAssignment() {
  const button = document.querySelector(".admin-action-btn.primary");
  const btnText = button.querySelector(".btn-text");
  const btnLoading = button.querySelector(".btn-loading");
  const resultsDiv = document.getElementById("auto-assignment-results");

  // Show loading state
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  button.disabled = true;

  try {
    const response = await invoke("bulkAutoAssignFromMultiAssignee", {
      projectKey: currentProjectKey,
    });

    // Show results
    resultsDiv.style.display = "block";
    resultsDiv.innerHTML = `
      <div class="results-content ${response.success ? "success" : "error"}">
        <h4>${
          response.success
            ? "✅ Auto-Assignment Completed"
            : "❌ Auto-Assignment Failed"
        }</h4>
        <div class="results-stats">
          <div>Issues processed: ${response.processedCount || 0}</div>
          <div>Issues assigned: ${response.assignedCount || 0}</div>
          <div>Skipped (already assigned): ${response.skippedCount || 0}</div>
        </div>
        ${
          response.message
            ? `<div class="results-message">${response.message}</div>`
            : ""
        }
      </div>
    `;

    // Refresh the main dashboard data
    if (response.success && response.assignedCount > 0) {
      setTimeout(() => {
        loadCapacityData();
      }, 1000);
    }
  } catch (error) {
    console.error("Error running auto-assignment:", error);
    resultsDiv.style.display = "block";
    resultsDiv.innerHTML = `
      <div class="results-content error">
        <h4>❌ Auto-Assignment Failed</h4>
        <div class="results-message">Error: ${error.message}</div>
      </div>
    `;
  } finally {
    // Reset button state
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    button.disabled = false;
  }
}

function editUserCapacity(userAccountId, displayName, settings) {
  // Create edit modal
  const editModal = document.createElement("div");
  editModal.className = "edit-modal-overlay";
  editModal.innerHTML = `
    <div class="edit-modal">
      <div class="edit-modal-header">
        <h3>Edit Capacity Settings: ${displayName}</h3>
        <button class="close-btn" onclick="closeEditModal()">×</button>
      </div>
      <div class="edit-modal-content">
        <div class="form-group">
          <label for="maxCapacity">Maximum Concurrent Assignments</label>
          <input type="number" id="maxCapacity" value="${
            settings?.maxCapacity || 10
          }" min="1" max="50">
          <small>Maximum number of issues this user can handle simultaneously</small>
        </div>
        <div class="form-group">
          <label for="workingHours">Working Hours per Day</label>
          <input type="number" id="workingHours" value="${
            settings?.workingHours || 8
          }" min="1" max="12" step="0.5">
          <small>Daily working hours for capacity calculations</small>
        </div>
        <div class="capacity-preview">
          <strong>Weekly Capacity: <span id="weeklyCapacity">${
            (settings?.workingHours || 8) * 5
          }</span> hours</strong>
          <small>Based on working hours × 5 days/week</small>
        </div>
      </div>
      <div class="edit-modal-footer">
        <button class="edit-btn secondary" onclick="closeEditModal()">Cancel</button>
        <button class="edit-btn primary" onclick="saveUserCapacity('${userAccountId}')">Save Settings</button>
      </div>
    </div>
  `;

  document.body.appendChild(editModal);

  // Update weekly capacity preview when working hours change
  document.getElementById("workingHours").addEventListener("input", (e) => {
    const hours = parseFloat(e.target.value) || 8;
    document.getElementById("weeklyCapacity").textContent = hours * 5;
  });
}

function closeEditModal() {
  const modal = document.querySelector(".edit-modal-overlay");
  if (modal) {
    modal.remove();
  }
}

async function saveUserCapacity(userAccountId) {
  const maxCapacity =
    parseInt(document.getElementById("maxCapacity").value) || 10;
  const workingHours =
    parseFloat(document.getElementById("workingHours").value) || 8;

  const settings = {
    maxCapacity: Math.max(1, Math.min(50, maxCapacity)),
    workingHours: Math.max(1, Math.min(12, workingHours)),
  };

  try {
    console.log("Saving capacity settings for user:", userAccountId, settings);

    const result = await saveUserCapacitySettings(userAccountId, settings);
    console.log("Save response:", result);

    if (result && result.success) {
      closeEditModal();

      // Show success notification
      showNotification("Capacity settings updated successfully!", "success");

      // Refresh data only if admin panel is still open
      setTimeout(async () => {
        // Check if admin panel is still open before refreshing
        const adminModal = document.querySelector(".admin-modal-overlay");
        if (adminModal) {
          console.log("Refreshing admin data after save...");
          await loadAdminData(currentProjectKey);
        }

        // Always refresh the main dashboard
        console.log("Refreshing main dashboard after save...");
        const newData = await loadRealData();
        if (newData) {
          updateDashboard(newData);
        }
      }, 500);
    } else {
      const errorMessage =
        result?.error || result?.message || "Failed to update settings";
      showNotification(errorMessage, "error");
    }
  } catch (error) {
    console.error("Error saving capacity settings:", error);
    showNotification(
      `Failed to save capacity settings: ${error.message}`,
      "error"
    );
  }
}

function refreshAdminData() {
  loadAdminData();
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${
        type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"
      }</span>
      <span class="notification-message">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Replace all resolver-based functions with direct Jira API calls
async function loadUserCapacitySettings(accountId) {
  try {
    console.log(`🔍 Loading capacity settings for ${accountId} via direct API`);

    const response = await requestJira(
      `/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`📋 Raw API response for ${accountId}:`, data);

      // Process the saved settings
      let savedSettings = null;
      if (data.value) {
        savedSettings =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        console.log(`📊 Raw parsed settings for ${accountId}:`, savedSettings);
        console.log(`🔍 Saved settings type:`, typeof savedSettings);
        console.log(`🔍 Saved settings keys:`, Object.keys(savedSettings));
        console.log(`🔍 MaxCapacity value:`, savedSettings.maxCapacity);
        console.log(`🔍 WorkingHours value:`, savedSettings.workingHours);

        // Extract the actual saved values - data is nested in savedSettings.value
        const nestedSettings = savedSettings.value || savedSettings;
        console.log(`🔍 Nested settings:`, nestedSettings);

        const actualSettings = {
          maxCapacity:
            nestedSettings.maxCapacity !== undefined
              ? nestedSettings.maxCapacity
              : 10,
          workingHours:
            nestedSettings.workingHours !== undefined
              ? nestedSettings.workingHours
              : 8,
          totalCapacity:
            nestedSettings.totalCapacity !== undefined
              ? nestedSettings.totalCapacity
              : (nestedSettings.workingHours || 8) * 5,
          notificationPreferences: nestedSettings.notificationPreferences || {
            overloadAlert: true,
            dailyDigest: false,
            weeklyReport: true,
          },
        };

        console.log(
          `✅ Final extracted settings for ${accountId}:`,
          actualSettings
        );
        return actualSettings;
      }
    }

    // Return defaults if no saved settings
    console.log(`📊 Using defaults for ${accountId}`);
    return {
      maxCapacity: 10,
      workingHours: 8,
      totalCapacity: 40,
      notificationPreferences: {
        overloadAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
    };
  } catch (error) {
    console.error(`❌ Error loading settings for ${accountId}:`, error);
    return {
      maxCapacity: 10,
      workingHours: 8,
      totalCapacity: 40,
      notificationPreferences: {
        overloadAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
    };
  }
}

async function saveUserCapacitySettings(accountId, settings) {
  try {
    console.log(
      `💾 Saving capacity settings for ${accountId} via direct API:`,
      settings
    );

    // Calculate total capacity
    const totalCapacity = settings.workingHours * 5;
    const updatedSettings = {
      ...settings,
      totalCapacity,
    };

    const response = await requestJira(
      `/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: updatedSettings,
        }),
      }
    );

    if (response.ok || response.status === 200 || response.status === 201) {
      console.log(`✅ Settings saved successfully for ${accountId}`);
      return { success: true, data: updatedSettings };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`❌ Error saving settings for ${accountId}:`, error);
    return { success: false, error: error.message };
  }
}

async function testSimpleAPI() {
  try {
    console.log("🧪 Testing direct API call...");
    const response = await requestJira("/rest/api/3/myself");

    if (response.ok) {
      const userData = await response.json();
      console.log("✅ Direct API test successful:", userData.displayName);
      return {
        success: true,
        test: "working",
        timestamp: new Date().toISOString(),
        user: userData.displayName,
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error("❌ Direct API test failed:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
