import { invoke, requestJira } from "@forge/bridge";

console.log("=== DASHBOARD SCRIPT LOADED ===");
console.log("Current URL:", window.location.href);
console.log("Script execution time:", new Date().toISOString());

// Simple cache to prevent duplicate API calls (30-second TTL)
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Loading state management to prevent duplicate operations
const loadingStates = new Set();

function getCacheKey(type, identifier) {
  return `${type}:${identifier}`;
}

function isCacheValid(cacheEntry) {
  return cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

function getCachedData(key) {
  const cached = apiCache.get(key);
  if (isCacheValid(cached)) {
    console.log(`🚀 Using cached data for ${key}`);
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  apiCache.set(key, {
    data: data,
    timestamp: Date.now(),
  });
}

function isLoading(operationKey) {
  return loadingStates.has(operationKey);
}

function setLoading(operationKey) {
  loadingStates.add(operationKey);
  console.log(`🔄 Starting operation: ${operationKey}`);
}

function clearLoading(operationKey) {
  loadingStates.delete(operationKey);
  console.log(`✅ Completed operation: ${operationKey}`);
}

function createLoadingSpinner(size = "medium") {
  const sizeClasses = {
    small: "spinner-small",
    medium: "spinner-medium",
    large: "spinner-large",
  };

  return `
    <div class="loading-spinner ${sizeClasses[size]}">
      <div class="spinner-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  `;
}

function addSpinnerStyles() {
  if (!document.getElementById("spinner-styles")) {
    const styles = document.createElement("style");
    styles.id = "spinner-styles";
    styles.textContent = `
      .loading-spinner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .spinner-ring {
        position: relative;
      }
      
      .spinner-ring div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        border: 2px solid #0065FF;
        border-radius: 50%;
        animation: spinner-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: #0065FF transparent transparent transparent;
      }
      
      .spinner-small .spinner-ring div {
        width: 16px;
        height: 16px;
        border-width: 1px;
      }
      
      .spinner-medium .spinner-ring div {
        width: 24px;
        height: 24px;
        border-width: 2px;
      }
      
      .spinner-large .spinner-ring div {
        width: 32px;
        height: 32px;
        border-width: 3px;
      }
      
      .spinner-ring div:nth-child(1) { animation-delay: -0.45s; }
      .spinner-ring div:nth-child(2) { animation-delay: -0.3s; }
      .spinner-ring div:nth-child(3) { animation-delay: -0.15s; }
      
      @keyframes spinner-ring {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-content {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6B778C;
        font-size: 14px;
      }
    `;
    document.head.appendChild(styles);
  }
}

function showLoadingState(container, message = "Loading...", size = "medium") {
  addSpinnerStyles();

  container.innerHTML = `
    <div class="loading-content">
      ${createLoadingSpinner(size)}
      <span>${message}</span>
    </div>
  `;
}

function addErrorStyles() {
  if (!document.getElementById("error-styles")) {
    const styles = document.createElement("style");
    styles.id = "error-styles";
    styles.textContent = `
      .error-state {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
        background: #FFEBE6;
        border: 1px solid #FFBDAD;
        border-radius: 8px;
        margin: 16px 0;
      }
      
      .error-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .error-message h4 {
        margin: 0 0 8px 0;
        color: #DE350B;
        font-size: 16px;
        font-weight: 600;
      }
      
      .error-message p {
        margin: 0 0 12px 0;
        color: #6B778C;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .retry-btn {
        background: #DE350B;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .retry-btn:hover {
        background: #BF2600;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(222, 53, 11, 0.3);
      }
      
      .retry-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(styles);
  }
}

function setupFormValidation() {
  // Initial validation
  const maxCapacity =
    parseInt(document.getElementById("maxCapacity").value) || 0;
  const workingHours =
    parseFloat(document.getElementById("workingHours").value) || 0;

  validateField("maxCapacity", maxCapacity);
  validateField("workingHours", workingHours);
}

function validateField(fieldName, value) {
  const field = document.getElementById(fieldName);
  const errorDiv = document.getElementById(`${fieldName}-error`);
  const saveBtn = document.querySelector(".edit-modal .save-btn");

  let isValid = true;
  let errorMessage = "";

  if (fieldName === "maxCapacity") {
    if (value < 1 || value > 50) {
      isValid = false;
      errorMessage = "Must be between 1 and 50 assignments";
    }
  } else if (fieldName === "workingHours") {
    if (value < 1 || value > 12) {
      isValid = false;
      errorMessage = "Must be between 1 and 12 hours";
    }
  }

  // Update field styling
  if (isValid) {
    field.classList.remove("error");
    field.classList.add("valid");
    errorDiv.textContent = "";
  } else {
    field.classList.remove("valid");
    field.classList.add("error");
    errorDiv.textContent = errorMessage;
  }

  // Update save button state
  const allValid = document.querySelectorAll(".form-input.error").length === 0;
  if (
    saveBtn &&
    !isLoading(`save-${saveBtn.onclick?.toString().match(/'([^']+)'/)?.[1]}`)
  ) {
    saveBtn.disabled = !allValid;
  }
}

function addModalStyles() {
  if (!document.getElementById("modal-styles")) {
    const styles = document.createElement("style");
    styles.id = "modal-styles";
    styles.textContent = `
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #172B4D;
        font-size: 14px;
      }
      
      .form-input {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #DFE1E6;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s;
        background: white;
      }
      
      .form-input:focus {
        outline: none;
        border-color: #0065FF;
        box-shadow: 0 0 0 3px rgba(0, 101, 255, 0.1);
      }
      
      .form-input.valid {
        border-color: #00875A;
      }
      
      .form-input.error {
        border-color: #DE350B;
        background: #FFEBE6;
      }
      
      .form-help {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #6B778C;
        line-height: 1.3;
      }
      
      .form-error {
        margin-top: 4px;
        font-size: 12px;
        color: #DE350B;
        font-weight: 500;
        min-height: 16px;
      }
      
      .capacity-preview {
        background: #F4F5F7;
        padding: 16px;
        border-radius: 6px;
        border-left: 4px solid #0065FF;
        margin-top: 8px;
      }
      
      .capacity-preview strong {
        color: #172B4D;
        font-size: 16px;
      }
      
      .capacity-preview small {
        display: block;
        margin-top: 4px;
        color: #6B778C;
        font-size: 12px;
      }
      
      .edit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      
      .edit-btn:disabled:hover {
        background: #F4F5F7 !important;
        color: #6B778C !important;
      }
      
      .edit-btn.primary:disabled {
        background: #DFE1E6 !important;
        color: #6B778C !important;
      }
    `;
    document.head.appendChild(styles);
  }
}

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

  // Prevent multiple simultaneous admin panel openings
  if (isLoading("adminPanel")) {
    console.log(
      "🚫 Admin panel is already loading, ignoring duplicate request"
    );
    return;
  }

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
  const loadingKey = "adminPanel";

  // Prevent duplicate loading operations
  if (isLoading(loadingKey)) {
    console.log("🚫 Admin data is already loading, skipping duplicate request");
    return;
  }

  setLoading(loadingKey);

  const tableContainer = document.getElementById("team-settings-table");
  if (!tableContainer) {
    console.error("Admin table container not found");
    clearLoading(loadingKey);
    return;
  }

  // Show professional loading state
  showLoadingState(tableContainer, "Loading team data...", "medium");

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
      tableContainer.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">
            <h4>Failed to load team data</h4>
            <p>${error.message}</p>
            <button class="retry-btn" onclick="loadAdminData()">Try Again</button>
          </div>
        </div>
      `;
      addErrorStyles();
    }
  } finally {
    clearLoading(loadingKey);
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
          }" min="1" max="50" class="form-input">
          <small class="form-help">Maximum number of issues this user can handle simultaneously (1-50)</small>
          <div class="form-error" id="maxCapacity-error"></div>
        </div>
        <div class="form-group">
          <label for="workingHours">Working Hours per Day</label>
          <input type="number" id="workingHours" value="${
            settings?.workingHours || 8
          }" min="1" max="12" step="0.5" class="form-input">
          <small class="form-help">Daily working hours for capacity calculations (1-12)</small>
          <div class="form-error" id="workingHours-error"></div>
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
        <button class="edit-btn primary save-btn" onclick="saveUserCapacity('${userAccountId}')">Save Changes</button>
      </div>
    </div>
  `;

  document.body.appendChild(editModal);

  // Add enhanced modal styles
  addModalStyles();

  // Add form validation and real-time feedback
  setupFormValidation();

  // Update weekly capacity preview when working hours change
  document.getElementById("workingHours").addEventListener("input", (e) => {
    const hours = parseFloat(e.target.value) || 8;
    document.getElementById("weeklyCapacity").textContent = hours * 5;
    validateField("workingHours", hours);
  });

  // Add validation for max capacity
  document.getElementById("maxCapacity").addEventListener("input", (e) => {
    const capacity = parseInt(e.target.value) || 0;
    validateField("maxCapacity", capacity);
  });
}

function closeEditModal() {
  const modal = document.querySelector(".edit-modal-overlay");
  if (modal) {
    modal.remove();
  }
}

async function saveUserCapacity(userAccountId) {
  const saveKey = `save-${userAccountId}`;

  // Prevent duplicate save operations for the same user
  if (isLoading(saveKey)) {
    console.log(`🚫 Save operation already in progress for ${userAccountId}`);
    return;
  }

  setLoading(saveKey);

  // Update button state to show loading
  const saveBtn = document.querySelector(".edit-modal .save-btn");
  const originalText = saveBtn ? saveBtn.innerHTML : "";
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `${createLoadingSpinner("small")} Saving...`;
    addSpinnerStyles();
  }

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
      // Show success notification
      showNotification("Capacity settings updated successfully!", "success");

      // Close modal after brief delay to show success
      setTimeout(() => {
        closeEditModal();
      }, 800);

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
  } finally {
    clearLoading(saveKey);

    // Restore button state
    const saveBtn = document.querySelector(".edit-modal .save-btn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText || "Save Changes";
    }
  }
}

function refreshAdminData() {
  // Only refresh if not already loading
  if (!isLoading("adminPanel")) {
    loadAdminData();
  } else {
    console.log("🚫 Admin data is already loading, skipping refresh");
  }
}

function showNotification(message, type = "info", duration = 4000) {
  // Remove any existing notifications of the same type to prevent spam
  const existingNotifications = document.querySelectorAll(
    `.toast-notification.${type}`
  );
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `toast-notification ${type}`;

  // Enhanced styling and animation
  notification.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">
        ${getNotificationIcon(type)}
      </div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="toast-progress">
      <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    </div>
  `;

  // Add enhanced CSS if not already present
  if (!document.getElementById("toast-styles")) {
    addToastStyles();
  }

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add("show"), 10);

  // Auto-remove with fade out
  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, duration);

  return notification;
}

function getNotificationIcon(type) {
  const icons = {
    success: "🎉",
    error: "⚠️",
    warning: "⚡",
    info: "💡",
    loading: "⏳",
  };
  return icons[type] || icons.info;
}

function addToastStyles() {
  const styles = document.createElement("style");
  styles.id = "toast-styles";
  styles.textContent = `
    .toast-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 300px;
      max-width: 500px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transform: translateX(400px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      opacity: 0;
      border-left: 4px solid #ddd;
      overflow: hidden;
    }
    
    .toast-notification.show {
      transform: translateX(0);
      opacity: 1;
    }
    
    .toast-notification.fade-out {
      transform: translateX(400px);
      opacity: 0;
    }
    
    .toast-notification.success { border-left-color: #00875A; }
    .toast-notification.error { border-left-color: #DE350B; }
    .toast-notification.warning { border-left-color: #FF8B00; }
    .toast-notification.info { border-left-color: #0065FF; }
    .toast-notification.loading { border-left-color: #6554C0; }
    
    .toast-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }
    
    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .toast-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
      color: #172B4D;
      font-weight: 500;
    }
    
    .toast-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6B778C;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .toast-close:hover {
      background: #F4F5F7;
      color: #172B4D;
    }
    
    .toast-progress {
      height: 3px;
      background: #F4F5F7;
      overflow: hidden;
    }
    
    .toast-progress-bar {
      height: 100%;
      background: currentColor;
      width: 100%;
      transform: translateX(-100%);
      animation: toast-progress linear forwards;
      opacity: 0.3;
    }
    
    .toast-notification.success .toast-progress-bar { background: #00875A; }
    .toast-notification.error .toast-progress-bar { background: #DE350B; }
    .toast-notification.warning .toast-progress-bar { background: #FF8B00; }
    .toast-notification.info .toast-progress-bar { background: #0065FF; }
    .toast-notification.loading .toast-progress-bar { background: #6554C0; }
    
    @keyframes toast-progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0); }
    }
  `;
  document.head.appendChild(styles);
}

// Replace all resolver-based functions with direct Jira API calls
async function loadUserCapacitySettings(accountId) {
  try {
    // Check cache first
    const cacheKey = getCacheKey("userSettings", accountId);
    const cachedSettings = getCachedData(cacheKey);
    if (cachedSettings) {
      return cachedSettings;
    }

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

        // Cache the successful result
        setCachedData(cacheKey, actualSettings);
        return actualSettings;
      }
    }

    // Return defaults if no saved settings
    console.log(`📊 Using defaults for ${accountId}`);
    const defaultSettings = {
      maxCapacity: 10,
      workingHours: 8,
      totalCapacity: 40,
      notificationPreferences: {
        overloadAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
    };

    // Cache the default settings too
    setCachedData(cacheKey, defaultSettings);
    return defaultSettings;
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

      // Invalidate cache for this user so fresh data is loaded next time
      const cacheKey = getCacheKey("userSettings", accountId);
      apiCache.delete(cacheKey);

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
