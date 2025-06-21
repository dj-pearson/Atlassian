import { invoke } from "@forge/bridge";

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

// Initialize dashboard
async function initializeDashboard() {
  console.log("=== INITIALIZING DASHBOARD ===");

  try {
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

// Export functions for global access
window.manualRefresh = manualRefresh;
window.initializeDashboard = initializeDashboard;

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDashboard);
} else {
  initializeDashboard();
}

console.log("=== DASHBOARD SCRIPT SETUP COMPLETE ===");
