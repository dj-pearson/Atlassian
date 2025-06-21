// Team Capacity Dashboard JavaScript
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
      displayName: "Michael Chen",
      email: "michael.chen@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 2,
      secondary: 1,
      reviewer: 2,
      collaborator: 0,
      utilizationRate: 0.72,
      healthStatus: "busy",
    },
    {
      accountId: "user3",
      displayName: "Emma Davis",
      email: "emma.davis@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 1,
      secondary: 3,
      reviewer: 1,
      collaborator: 2,
      utilizationRate: 0.85,
      healthStatus: "busy",
    },
    {
      accountId: "user4",
      displayName: "Alex Rodriguez",
      email: "alex.rodriguez@company.com",
      avatarUrl: null,
      totalCapacity: 40,
      primary: 2,
      secondary: 0,
      reviewer: 1,
      collaborator: 1,
      utilizationRate: 0.55,
      healthStatus: "optimal",
    },
  ];

  const totalMembers = mockUsers.length;
  const avgUtilization =
    mockUsers.reduce((sum, user) => sum + user.utilizationRate, 0) /
    totalMembers;
  const activeAssignments = mockUsers.reduce(
    (sum, user) =>
      sum + user.primary + user.secondary + user.reviewer + user.collaborator,
    0
  );

  const overloadedUsers = mockUsers.filter(
    (user) => user.healthStatus === "overloaded"
  );
  const busyUsers = mockUsers.filter((user) => user.healthStatus === "busy");

  let healthStatus = "Good";
  if (overloadedUsers.length > 0) {
    healthStatus = "Critical";
  } else if (busyUsers.length > totalMembers * 0.5) {
    healthStatus = "Warning";
  }

  const alerts = [];
  if (overloadedUsers.length > 0) {
    alerts.push({
      type: "critical",
      message: `${
        overloadedUsers.length
      } team member(s) are overloaded: ${overloadedUsers
        .map((u) => u.displayName)
        .join(", ")}`,
    });
  }

  return {
    projectKey: projectKey || "MOCK",
    metrics: {
      totalMembers,
      avgUtilization: Math.round(avgUtilization * 100),
      activeAssignments,
      healthStatus,
    },
    users: mockUsers,
    alerts,
    lastUpdated: new Date().toISOString(),
    dataSource: "Mock Data (Fallback)",
  };
}

// Real data loading function using proper Forge bridge
async function loadRealData() {
  console.log("=== LOADING REAL DATA ===");

  try {
    // Try to dynamically import the Forge bridge
    let invoke;
    try {
      console.log("Attempting to import @forge/bridge...");
      const bridge = await import("@forge/bridge");
      invoke = bridge.invoke;
      console.log("Successfully imported @forge/bridge");
    } catch (importError) {
      console.log("Failed to import @forge/bridge:", importError.message);
      throw new Error("Forge bridge not available");
    }

    if (!invoke) {
      throw new Error("invoke function not available from @forge/bridge");
    }

    // Call the resolver with proper function key
    console.log("Calling resolver with function key: getCapacityData");
    const realData = await invoke("getCapacityData", {
      projectKey: getProjectKeyFromUrl(),
      timestamp: new Date().toISOString(),
    });

    console.log("Real data received:", realData);

    if (realData && realData.users) {
      realData.dataSource = "Real Jira Data";
      return realData;
    } else {
      throw new Error("Invalid data structure received from resolver");
    }
  } catch (error) {
    console.error("Error loading real data:", error);
    console.log("Falling back to mock data...");

    // Generate project-specific mock data as fallback
    const projectKey = getProjectKeyFromUrl() || "FALLBACK";
    const mockData = generateRealisticMockData(projectKey);
    mockData.dataSource = "Mock Data (Real data failed)";
    return mockData;
  }
}

// Extract project key from URL
function getProjectKeyFromUrl() {
  try {
    const url = window.location.href;
    console.log("Extracting project key from URL:", url);

    // Try to extract project key from various URL patterns
    const patterns = [
      /\/projects\/([A-Z0-9]+)/i,
      /\/browse\/([A-Z0-9]+)-/i,
      /projectKey=([A-Z0-9]+)/i,
      /project\/([A-Z0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const projectKey = match[1].toUpperCase();
        console.log("Found project key:", projectKey);
        return projectKey;
      }
    }

    console.log("No project key found in URL");
    return null;
  } catch (error) {
    console.error("Error extracting project key:", error);
    return null;
  }
}

// Helper functions
function getUserInitials(displayName) {
  if (!displayName) return "??";
  const names = displayName.split(" ");
  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  return (displayName[0] + (displayName[1] || "")).toUpperCase();
}

function getStatusClass(healthStatus) {
  switch (healthStatus?.toLowerCase()) {
    case "critical":
    case "overloaded":
      return "status-critical";
    case "warning":
    case "busy":
      return "status-warning";
    case "good":
    case "optimal":
      return "status-good";
    default:
      return "status-good";
  }
}

function getCapacityColor(utilizationRate) {
  if (utilizationRate >= 1.0) return "#ff4757"; // Red
  if (utilizationRate >= 0.8) return "#ffa502"; // Orange
  return "#2ed573"; // Green
}

// Update dashboard with data
function updateDashboard(data) {
  console.log("=== UPDATING DASHBOARD ===");
  console.log("Updating dashboard with data:", data);

  try {
    // Update metrics
    document.getElementById("team-members").textContent =
      data.metrics.totalMembers || 0;
    document.getElementById("avg-utilization").textContent = `${
      data.metrics.avgUtilization || 0
    }%`;
    document.getElementById("total-assignments").textContent =
      data.metrics.activeAssignments || 0;
    document.getElementById("health-status").textContent =
      data.metrics.healthStatus || "Good";
    document.getElementById("health-status").className =
      "metric-value " + getStatusClass(data.metrics.healthStatus);

    // Update data source indicator
    document.getElementById("data-source-indicator").textContent =
      data.dataSource;

    // Update alerts
    const alertsSection = document.getElementById("alerts-section");
    if (data.alerts && data.alerts.length > 0) {
      alertsSection.innerHTML = `
        <h2 class="section-title">⚠️ Capacity Alerts</h2>
        ${data.alerts
          .map(
            (alert) => `
          <div class="alert-item alert-${alert.type}">
            <span class="alert-icon">${
              alert.type === "critical" ? "🚨" : "⚠️"
            }</span>
            <p class="alert-text">${alert.message}</p>
          </div>
        `
          )
          .join("")}
      `;
    } else {
      alertsSection.innerHTML = `
        <div class="alert-item alert-success">
          <span class="alert-icon">✅</span>
          <p class="alert-text">All team members are within healthy capacity limits</p>
        </div>
      `;
    }

    // Update user cards with enhanced styling
    const usersGrid = document.getElementById("users-grid");
    usersGrid.innerHTML = data.users
      .map((user) => {
        const utilizationPercentage = Math.round(user.utilizationRate * 100);
        const hoursUsed = Math.round(user.utilizationRate * user.totalCapacity);

        return `
        <div class="user-card">
          <div class="user-header">
            <div class="user-avatar">
              ${
                user.avatarUrl
                  ? `<img src="${user.avatarUrl}" alt="${user.displayName}" />`
                  : `<div class="user-initials">${getUserInitials(
                      user.displayName
                    )}</div>`
              }
            </div>
            <div class="user-info">
              <h3 class="user-name">${user.displayName}</h3>
              <p class="user-email">${user.email}</p>
            </div>
            <div class="user-status ${getStatusClass(user.healthStatus)}">
              ${
                user.healthStatus.charAt(0).toUpperCase() +
                user.healthStatus.slice(1)
              }
            </div>
          </div>
          
          <div class="capacity-section">
            <div class="capacity-bar">
              <div class="capacity-fill" style="width: ${Math.min(
                utilizationPercentage,
                100
              )}%; background-color: ${getCapacityColor(
          user.utilizationRate
        )}"></div>
            </div>
            <div class="capacity-text">${hoursUsed}h / ${
          user.totalCapacity
        }h (${utilizationPercentage}%)</div>
          </div>
          
          <div class="role-assignments">
            <div class="role-item">
              <span class="role-dot role-primary"></span>
              <span class="role-label">Primary: ${user.primary}</span>
            </div>
            <div class="role-item">
              <span class="role-dot role-secondary"></span>
              <span class="role-label">Secondary: ${user.secondary}</span>
            </div>
            <div class="role-item">
              <span class="role-dot role-reviewer"></span>
              <span class="role-label">Reviewer: ${user.reviewer}</span>
            </div>
            <div class="role-item">
              <span class="role-dot role-collaborator"></span>
              <span class="role-label">Collaborator: ${user.collaborator}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Update timestamp
    document.getElementById("last-updated").textContent = new Date(
      data.lastUpdated
    ).toLocaleString();

    console.log("Dashboard updated successfully!");
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

// Initialize dashboard
async function initializeDashboard() {
  console.log("=== INITIALIZING DASHBOARD ===");
  console.log("Dashboard initializing...");

  try {
    // Load project capacity data
    console.log("Loading project capacity data...");
    const data = await loadRealData();

    console.log("Project data loaded successfully:", data);

    // Update the dashboard with the loaded data
    updateDashboard(data);

    // Set up auto-refresh
    setupAutoRefresh();

    console.log("Dashboard initialization complete!");
  } catch (error) {
    console.error("Error during dashboard initialization:", error);

    // Fallback to basic mock data
    const fallbackData = generateRealisticMockData("ERROR");
    fallbackData.dataSource = "Emergency Fallback Data";
    updateDashboard(fallbackData);
  }
}

// Auto-refresh functionality
function setupAutoRefresh() {
  console.log("Setting up auto-refresh (5 minutes)");
  setInterval(async () => {
    console.log("Auto-refresh triggered");
    try {
      const data = await loadRealData();
      updateDashboard(data);
    } catch (error) {
      console.error("Auto-refresh failed:", error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Manual refresh function for the refresh button
async function manualRefresh() {
  console.log("Manual refresh triggered");
  try {
    const refreshButton = document.getElementById("refresh-btn");
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing...";
    }

    const data = await loadRealData();
    updateDashboard(data);

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  } catch (error) {
    console.error("Manual refresh failed:", error);
    const refreshButton = document.getElementById("refresh-btn");
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

// Make manual refresh available globally for the refresh button
window.manualRefresh = manualRefresh;

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  console.log("DOM is loading, waiting for DOMContentLoaded");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired");
    initializeDashboard();
  });
} else {
  console.log("DOM already loaded, initializing immediately");
  initializeDashboard();
}

console.log("=== DASHBOARD SCRIPT SETUP COMPLETE ===");
