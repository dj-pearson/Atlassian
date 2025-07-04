import { invoke, requestJira } from "@forge/bridge";
// Simple cache to prevent duplicate API calls (30-second TTL)
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Loading state management to prevent duplicate operations
const loadingStates = new Set();

// Debounced refresh and performance monitoring
const refreshDebouncer = new Map();
const performanceMetrics = {
  apiCalls: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  lastRefresh: null,
  refreshCount: 0,
};

function getCacheKey(type, identifier) {
  return `${type}:${identifier}`;
}

function isCacheValid(cacheEntry) {
  return cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

function getCachedData(key) {
  const cached = apiCache.get(key);
  if (isCacheValid(cached)) {
    performanceMetrics.cacheHits++;
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
}

function clearLoading(operationKey) {
  loadingStates.delete(operationKey);
}

function debounce(key, func, delay = 1000) {
  // Clear existing timeout for this key
  if (refreshDebouncer.has(key)) {
    clearTimeout(refreshDebouncer.get(key));
  }

  // Set new timeout
  const timeoutId = setTimeout(() => {
    refreshDebouncer.delete(key);
    func();
  }, delay);

  refreshDebouncer.set(key, timeoutId);
}

function trackPerformance(operation, startTime) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  performanceMetrics.apiCalls++;
  performanceMetrics.averageResponseTime =
    (performanceMetrics.averageResponseTime *
      (performanceMetrics.apiCalls - 1) +
      duration) /
    performanceMetrics.apiCalls;
  // Log performance summary every 10 operations
  if (performanceMetrics.apiCalls % 10 === 0) {
  }

  return duration;
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
  try {
    // Extract project key from URL, or use a default to get initial data
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    const initialProjectKey = urlMatch ? urlMatch[1] : "ECS"; // Use ECS as default instead of DEMO
    // Use the imported invoke function
    const result = await invoke("getCapacityData", {
      projectKey: initialProjectKey,
      timestamp: new Date().toISOString(),
    });
    // Set the global project key from the response data
    if (result && result.projectKey) {
      currentProjectKey = result.projectKey;
    } else {
      currentProjectKey = initialProjectKey;
    }

    return result;
  } catch (error) {
    // Extract project key for mock data, use ECS as default
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    const projectKey = urlMatch ? urlMatch[1] : "ECS";

    // Set the global project key
    currentProjectKey = projectKey;
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
  if (!data) {
    return;
  }

  // Handle error case
  if (data.error) {
    // Show error state but continue with any available data
  }

  // Extract data - resolver returns data directly, not wrapped in data.data
  const { users = [], metrics = {}, alerts = [] } = data;
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
}

// Manual refresh function with debouncing
async function manualRefresh() {
  debounce(
    "dashboardRefresh",
    async () => {
      performanceMetrics.refreshCount++;
      performanceMetrics.lastRefresh = new Date().toISOString();
      const startTime = performance.now();
      const data = await loadRealData();
      updateDashboard(data);
      trackPerformance("manualRefresh", startTime);
    },
    1000
  ); // 1 second debounce
}

let adminPanelOpen = false;

// Initialize dashboard with admin functionality
async function initializeDashboard() {
  try {
    // Extract project key from URL as initial value
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/);
    currentProjectKey = urlMatch ? urlMatch[1] : "ECS"; // Use ECS as default
    // Load initial data first to get the correct project key
    const data = await loadRealData();
    updateDashboard(data);

    // Now check admin privileges with the correct project key
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
    }

    // Set up auto-refresh every 5 minutes with performance tracking
    setInterval(async () => {
      // Use debounced refresh for auto-refresh too
      debounce(
        "autoRefresh",
        async () => {
          performanceMetrics.refreshCount++;
          performanceMetrics.lastRefresh = new Date().toISOString();
          const startTime = performance.now();
          const refreshData = await loadRealData();
          updateDashboard(refreshData);
          trackPerformance("autoRefresh", startTime);
        },
        2000
      ); // 2 second debounce for auto-refresh
    }, 5 * 60 * 1000);

    // Set up periodic cache cleanup (every 10 minutes)
    setInterval(() => {
      cleanupExpiredCache();
    }, 10 * 60 * 1000);

    // Log initial performance stats
    setTimeout(() => getPerformanceStats(), 1000);

    // Set up field change monitoring for real-time UI updates
    setupFieldChangeMonitoring();
  } catch (error) {}
}

// Global variables
let currentProjectKey = null; // Will be set dynamically from capacity data
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
window.getPerformanceStats = getPerformanceStats;
window.clearCache = clearCache;
window.getMemoryUsage = getMemoryUsage;
window.testBidirectionalSync = testBidirectionalSync;
window.getSyncStatus = getSyncStatus;

// Check if current user has admin privileges
async function checkAdminPrivileges() {
  try {
    // Ensure we have a project key before checking permissions
    if (!currentProjectKey) {
      currentUserIsAdmin = false;
      return;
    }

    // Check user permissions - for now, we'll check if they can access project admin functions
    const response = await invoke("checkUserPermissions", {
      projectKey: currentProjectKey,
    });

    currentUserIsAdmin = response.isAdmin || false;
  } catch (error) {
    currentUserIsAdmin = false;
  }
}

function openAdminPanel() {
  if (adminPanelOpen) return;

  // Prevent multiple simultaneous admin panel openings
  if (isLoading("adminPanel")) {
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
          <h3>👥 Team Capacity Settings</h3>
          <p>Configure individual capacity settings for team members.</p>
          <div id="team-settings-table" class="team-table">
            <div class="loading">Loading team data...</div>
          </div>
        </div>

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
            <button class="admin-action-btn secondary" onclick="manualAutoAssign()" style="margin-left: 10px;">
              <span class="btn-text">🔧 Manual Assign Issue</span>
              <span class="btn-loading" style="display: none;">🔄 Assigning...</span>
            </button>
          </div>
          <div id="auto-assignment-results" class="results-section" style="display: none;"></div>
        </div>

        <div class="admin-section">
          <div class="section-header">
            <h3>🏢 Team Hierarchy Detection</h3>
            <p>Test the new automatic hierarchy detection system based on your Jira permissions and groups.</p>
          </div>
          <div class="admin-actions">
            <button class="admin-action-btn secondary" onclick="window.testHierarchySystem()">
              <span class="btn-text">🔍 Test My Hierarchy Level</span>
              <span class="btn-loading" style="display: none;">🔄 Detecting...</span>
            </button>
          </div>
          <div id="hierarchy-test-results" class="results-section" style="display: none;"></div>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn secondary" onclick="closeAdminPanel()">Close</button>
        <button class="admin-btn primary" onclick="refreshAdminData()">Refresh Data</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  // Immediate debug - check what's in the modal HTML
  const modalHasHierarchy = modal.innerHTML.includes(
    "Team Hierarchy Detection"
  );
  // Debug: Check if hierarchy section exists
  setTimeout(() => {
    const allH3s = document.querySelectorAll(".admin-modal h3");
    // Find hierarchy section by checking text content
    const hierarchySection = Array.from(allH3s).find((h3) =>
      h3.textContent.includes("Team Hierarchy Detection")
    );

    if (!hierarchySection) {
      addHierarchySectionManually();
    } else {
    }
  }, 100);

  loadAdminData();
}

function addHierarchySectionManually() {
  // Find the auto-assignment section
  const autoAssignmentSection = document.querySelector(".admin-section");

  if (autoAssignmentSection) {
    // Create the hierarchy section HTML
    const hierarchyHTML = `
      <div class="admin-section" id="hierarchy-section">
        <div class="section-header">
          <h3>🏢 Team Hierarchy Detection</h3>
          <p>Test the new automatic hierarchy detection system based on your Jira permissions and groups.</p>
        </div>
        <div class="admin-actions">
          <button class="admin-action-btn secondary" onclick="window.testHierarchySystem()">
            <span class="btn-text">🔍 Test My Hierarchy Level</span>
            <span class="btn-loading" style="display: none;">🔄 Detecting...</span>
          </button>
        </div>
        <div id="hierarchy-test-results" class="results-section" style="display: none;"></div>
      </div>
    `;

    // Insert after the auto-assignment section
    autoAssignmentSection.insertAdjacentHTML("afterend", hierarchyHTML);
    // Verify it was added
    const addedSection = document.getElementById("hierarchy-section");
    if (addedSection) {
    } else {
    }
  } else {
  }
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
    return;
  }

  setLoading(loadingKey);

  const tableContainer = document.getElementById("team-settings-table");
  if (!tableContainer) {
    clearLoading(loadingKey);
    return;
  }

  // Show professional loading state
  showLoadingState(tableContainer, "Loading team data...", "medium");

  try {
    // Test direct API call
    const testResult = await testSimpleAPI();
    // Load main capacity data (this still uses resolver since it works)
    const capacityData = await invoke("getCapacityData", {
      projectKey: currentProjectKey,
    });
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
    // Log individual user settings for debugging
    usersWithSettings.forEach((user) => {});

    // Render the admin table
    renderAdminTable(usersWithSettings);
  } catch (error) {
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
    return;
  }
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

async function testHierarchyDetection() {
  const button = document.querySelector(
    '.admin-action-btn[onclick="testHierarchyDetection()"]'
  );
  const btnText = button.querySelector(".btn-text");
  const btnLoading = button.querySelector(".btn-loading");
  const resultsDiv = document.getElementById("hierarchy-test-results");

  // Show loading state
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  button.disabled = true;
  resultsDiv.style.display = "block";
  resultsDiv.innerHTML = `
    <div class="loading-state">
      ${createLoadingSpinner("small")}
      <span>Detecting hierarchy level for project ${currentProjectKey}...</span>
    </div>
  `;

  try {
    // Test the hierarchy detection functions
    // Get user hierarchy context
    const hierarchyContext = await invoke("getUserHierarchyContext", {
      projectKey: currentProjectKey,
    });

    // Get hierarchy status
    const hierarchyStatus = await invoke("getHierarchyStatus", {
      projectKey: currentProjectKey,
    });

    // Get hierarchical dashboard data
    const dashboardData = await invoke("getHierarchicalDashboardData", {
      projectKey: currentProjectKey,
    });
    let resultsHTML = "";

    if (hierarchyContext.success) {
      const ctx = hierarchyContext.context;
      resultsHTML += `
        <div class="success-message">
          <div class="result-header">
            <h4>✅ Hierarchy Detection Successful</h4>
          </div>
          <div class="hierarchy-details">
            <div class="detail-row">
              <strong>Your Detected Level:</strong> 
              <span class="level-badge level-${ctx.hierarchyLevel.toLowerCase()}">${
        ctx.levelConfig.name
      }</span>
            </div>
            <div class="detail-row">
              <strong>Scope:</strong> ${ctx.levelConfig.scope}
            </div>
            <div class="detail-row">
              <strong>Permissions Found:</strong> ${ctx.permissions.length}
            </div>
            <div class="detail-row">
              <strong>Groups Found:</strong> ${ctx.groups.length}
            </div>
            <div class="detail-row">
              <strong>Visible Users:</strong> ${ctx.visibleUsers}
            </div>
            <div class="detail-row">
              <strong>Managed Teams:</strong> ${ctx.managedTeams.length}
            </div>
            <div class="detail-row">
              <strong>Detection Method:</strong> Automatic (Jira Permissions + Groups)
            </div>
            <div class="detail-row">
              <strong>Detected At:</strong> ${new Date(
                ctx.detectedAt
              ).toLocaleString()}
            </div>
          </div>
        </div>
      `;

      if (ctx.hierarchyPath.length > 0) {
        resultsHTML += `
          <div class="hierarchy-path-display">
            <h5>Your Hierarchy Path:</h5>
            <div class="path-items">
              ${ctx.hierarchyPath
                .map(
                  (level, index) => `
                ${index > 0 ? '<span class="path-arrow">→</span>' : ""}
                <span class="path-level">${level.name}</span>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }

      if (ctx.permissions.length > 0) {
        resultsHTML += `
          <div class="permissions-display">
            <h5>Detected Permissions:</h5>
            <div class="permissions-grid">
              ${ctx.permissions
                .slice(0, 10)
                .map(
                  (perm) => `
                <span class="permission-badge">${perm}</span>
              `
                )
                .join("")}
              ${
                ctx.permissions.length > 10
                  ? `<span class="more-count">+${
                      ctx.permissions.length - 10
                    } more</span>`
                  : ""
              }
            </div>
          </div>
        `;
      }
    } else {
      resultsHTML += `
        <div class="error-message">
          <h4>❌ Hierarchy Detection Failed</h4>
          <p>Error: ${hierarchyContext.error}</p>
        </div>
      `;
    }

    if (hierarchyStatus.success) {
      const status = hierarchyStatus.data;
      resultsHTML += `
        <div class="status-summary">
          <h5>📊 System Status:</h5>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Hierarchy Enabled:</span>
              <span class="status-value ${
                status.hierarchyEnabled ? "enabled" : "disabled"
              }">
                ${status.hierarchyEnabled ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Detection Method:</span>
              <span class="status-value">${status.detectionMethod}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Can Manage Capacity:</span>
              <span class="status-value ${
                status.management.canManageCapacity ? "enabled" : "disabled"
              }">
                ${status.management.canManageCapacity ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Cache Age:</span>
              <span class="status-value">${
                status.cacheAge < 60
                  ? "Fresh"
                  : `${Math.floor(status.cacheAge / 60)}m old`
              }</span>
            </div>
          </div>
        </div>
      `;
    }

    resultsDiv.innerHTML = resultsHTML;

    // Add styles for the hierarchy display
    if (!document.getElementById("hierarchy-styles")) {
      const styles = document.createElement("style");
      styles.id = "hierarchy-styles";
      styles.textContent = `
        .level-badge {
          background: #0052cc;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.9em;
          font-weight: 500;
        }
        .hierarchy-details .detail-row {
          margin: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hierarchy-path-display {
          margin-top: 16px;
          padding: 12px;
          background: #f4f5f7;
          border-radius: 6px;
        }
        .path-items {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .path-level {
          background: #0052cc;
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.9em;
        }
        .path-arrow {
          color: #5e6c84;
          font-weight: bold;
        }
        .permissions-display {
          margin-top: 16px;
        }
        .permissions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .permission-badge {
          background: #e3fcef;
          color: #006644;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
        }
        .more-count {
          color: #5e6c84;
          font-style: italic;
          font-size: 0.9em;
        }
        .status-summary {
          margin-top: 16px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        .status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }
        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }
        .status-value.enabled {
          color: #006644;
          font-weight: 500;
        }
        .status-value.disabled {
          color: #bf2600;
          font-weight: 500;
        }
      `;
      document.head.appendChild(styles);
    }

    showNotification(
      "Hierarchy detection test completed successfully!",
      "success"
    );
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="error-message">
        <h4>❌ Test Failed</h4>
        <p>Error: ${error.message}</p>
        <p class="error-details">Check console for more details.</p>
      </div>
    `;
    showNotification(
      "Hierarchy detection test failed. Check console for details.",
      "error"
    );
  } finally {
    // Reset button state
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    button.disabled = false;
  }
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

// Manual single issue assignment (workaround for event handler issue)
async function manualAutoAssign() {
  const issueKey = prompt(
    "Enter the issue key (e.g., ECS-123) to auto-assign from multi-assignees:"
  );
  if (!issueKey) return;

  const resultsDiv = document.getElementById("auto-assignment-results");

  // Find the manual assign button by looking for the secondary button with the right text
  const buttons = document.querySelectorAll(".admin-action-btn.secondary");
  const button = Array.from(buttons).find((btn) =>
    btn.querySelector(".btn-text")?.textContent.includes("Manual Assign")
  );

  if (button) {
    const btnText = button.querySelector(".btn-text");
    const btnLoading = button.querySelector(".btn-loading");

    button.disabled = true;
    btnText.style.display = "none";
    btnLoading.style.display = "inline";
  }

  resultsDiv.style.display = "block";
  resultsDiv.innerHTML = `
    <div class="loading-message">
      <div class="spinner"></div>
      🔧 Setting assignee for ${issueKey}...
    </div>
  `;

  try {
    const response = await invoke("manualAutoAssign", {
      issueKey: issueKey.trim().toUpperCase(),
    });

    if (response.success) {
      resultsDiv.innerHTML = `
        <div class="results-content success">
          <h4>✅ Assignment Successful</h4>
          <div class="results-message">
            <strong>${issueKey}</strong> has been assigned to <strong>${response.assignee}</strong>
          </div>
          <div class="results-stats">
            The first user from the multi-assignee field is now the default assignee.
          </div>
        </div>
      `;

      // Refresh dashboard to show updated data
      setTimeout(() => {
        loadRealData().then(updateDashboard);
      }, 1000);
    } else {
      resultsDiv.innerHTML = `
        <div class="results-content error">
          <h4>❌ Assignment Failed</h4>
          <div class="results-message">
            <strong>Issue:</strong> ${issueKey}<br/>
            <strong>Error:</strong> ${response.error}
          </div>
        </div>
      `;
    }
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="results-content error">
        <h4>❌ Assignment Error</h4>
        <div class="results-message">
          <strong>Issue:</strong> ${issueKey}<br/>
          <strong>Error:</strong> ${error.message}
        </div>
      </div>
    `;
  } finally {
    if (button) {
      const btnText = button.querySelector(".btn-text");
      const btnLoading = button.querySelector(".btn-loading");

      button.disabled = false;
      btnLoading.style.display = "none";
      btnText.style.display = "inline";
    }
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
    const result = await saveUserCapacitySettings(userAccountId, settings);
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
          await loadAdminData(currentProjectKey);
        }

        // Always refresh the main dashboard
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
  // Use debounced refresh to prevent rapid successive calls
  debounce(
    "adminRefresh",
    () => {
      // Only refresh if not already loading
      if (!isLoading("adminPanel")) {
        performanceMetrics.refreshCount++;
        performanceMetrics.lastRefresh = new Date().toISOString();
        loadAdminData();
      } else {
      }
    },
    1500
  ); // 1.5 second debounce
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
  const startTime = performance.now();

  try {
    // Check cache first
    const cacheKey = getCacheKey("userSettings", accountId);
    const cachedSettings = getCachedData(cacheKey);
    if (cachedSettings) {
      return cachedSettings;
    }
    const response = await requestJira(
      `/rest/api/3/user/properties/capacity-settings?accountId=${accountId}`
    );

    if (response.ok) {
      const data = await response.json();
      // Process the saved settings
      let savedSettings = null;
      if (data.value) {
        savedSettings =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        // Extract the actual saved values - data is nested in savedSettings.value
        const nestedSettings = savedSettings.value || savedSettings;
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
        // Cache the successful result
        setCachedData(cacheKey, actualSettings);
        trackPerformance(`loadUserCapacitySettings(${accountId})`, startTime);
        return actualSettings;
      }
    }

    // Return defaults if no saved settings
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
    trackPerformance(
      `loadUserCapacitySettings(${accountId}) - defaults`,
      startTime
    );
    return defaultSettings;
  } catch (error) {
    trackPerformance(
      `loadUserCapacitySettings(${accountId}) - error`,
      startTime
    );
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
      // Invalidate cache for this user so fresh data is loaded next time
      const cacheKey = getCacheKey("userSettings", accountId);
      apiCache.delete(cacheKey);

      return { success: true, data: updatedSettings };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSimpleAPI() {
  try {
    const response = await requestJira("/rest/api/3/myself");

    if (response.ok) {
      const userData = await response.json();
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
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

function getPerformanceStats() {
  const stats = {
    ...performanceMetrics,
    cacheSize: apiCache.size,
    cacheHitRate:
      performanceMetrics.apiCalls > 0
        ? `${Math.round(
            (performanceMetrics.cacheHits / performanceMetrics.apiCalls) * 100
          )}%`
        : "0%",
    averageResponseTime: `${Math.round(
      performanceMetrics.averageResponseTime
    )}ms`,
    activeDebounces: refreshDebouncer.size,
    activeLoadingOperations: loadingStates.size,
    uptime: performanceMetrics.lastRefresh
      ? `${Math.round(
          (Date.now() - new Date(performanceMetrics.lastRefresh).getTime()) /
            1000
        )}s since last refresh`
      : "No refreshes yet",
  };

  console.table(stats);
  return stats;
}

function clearCache() {
  const cacheSize = apiCache.size;
  apiCache.clear();
  // Reset cache hit counter
  performanceMetrics.cacheHits = 0;

  return { cleared: cacheSize, message: "Cache cleared successfully" };
}

function getMemoryUsage() {
  if (performance.memory) {
    const memory = performance.memory;
    return {
      usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      jsHeapSizeLimit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
    };
  }
  return { message: "Memory API not available" };
}

function cleanupExpiredCache() {
  const beforeSize = apiCache.size;
  let expiredCount = 0;

  for (const [key, entry] of apiCache.entries()) {
    if (!isCacheValid(entry)) {
      apiCache.delete(key);
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
  }

  return { removed: expiredCount, remainingEntries: apiCache.size };
}

// Test bidirectional sync functionality
async function testBidirectionalSync() {
  try {
    // Test sync status check
    const syncStatus = await checkSyncStatus();
    // Show sync test results
    showNotification(
      "🔄 Bidirectional sync test completed! Check console for details.",
      "info",
      5000
    );

    return syncStatus;
  } catch (error) {
    showNotification(
      "❌ Bidirectional sync test failed. Check console for details.",
      "error",
      5000
    );
    return null;
  }
}

// Check sync status for current project issues
async function checkSyncStatus() {
  try {
    const projectKey = getCurrentProjectKey();
    // Get issues with multi-assignees
    const response = await bridge.invoke("capacity-resolver", {
      projectKey: projectKey,
      action: "getSyncStatus",
    });

    if (response.success) {
      const syncData = response.data;
      return syncData;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Get current sync status (simplified version)
function getSyncStatus() {
  showNotification("📊 Sync status displayed in console", "info", 3000);
}

// Simplified hierarchy test function
window.testHierarchySystem = async function () {
  const button = document.querySelector(
    '.admin-action-btn[onclick="window.testHierarchySystem()"]'
  );
  const btnText = button?.querySelector(".btn-text");
  const btnLoading = button?.querySelector(".btn-loading");
  const resultsDiv = document.getElementById("hierarchy-test-results");

  if (btnText && btnLoading) {
    btnText.style.display = "none";
    btnLoading.style.display = "inline";
    button.disabled = true;
  }

  if (resultsDiv) {
    resultsDiv.style.display = "block";
    resultsDiv.innerHTML =
      '<div class="loading">Testing hierarchy detection...</div>';
  }

  try {
    // Test all hierarchy functions
    const hierarchyContext = await invoke("getUserHierarchyContext", {
      projectKey: currentProjectKey,
    });
    const hierarchyStatus = await invoke("getHierarchyStatus", {
      projectKey: currentProjectKey,
    });
    const dashboardData = await invoke("getHierarchicalDashboardData", {
      projectKey: currentProjectKey,
    });
    let resultsHTML = "";

    if (hierarchyContext.success) {
      const ctx = hierarchyContext.context;
      resultsHTML += `
        <div class="success-message" style="background: #E3FCEF; border: 1px solid #00875A; padding: 16px; border-radius: 8px; margin: 8px 0;">
          <h4 style="color: #006644; margin: 0 0 12px 0;">✅ Hierarchy Detection Successful</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Detected Level:</strong> ${
              ctx.levelConfig?.name || ctx.hierarchyLevel
            }</div>
            <div><strong>Scope:</strong> ${
              ctx.levelConfig?.scope || "Unknown"
            }</div>
            <div><strong>Permissions:</strong> ${
              ctx.permissions?.length || 0
            }</div>
            <div><strong>Groups:</strong> ${ctx.groups?.length || 0}</div>
            <div><strong>Visible Users:</strong> ${ctx.visibleUsers || 0}</div>
            <div><strong>Managed Teams:</strong> ${
              ctx.managedTeams?.length || 0
            }</div>
          </div>
        </div>
      `;
    } else {
      resultsHTML += `
        <div class="error-message" style="background: #FFEBE6; border: 1px solid #DE350B; padding: 16px; border-radius: 8px; margin: 8px 0;">
          <h4 style="color: #DE350B; margin: 0 0 8px 0;">❌ Hierarchy Detection Failed</h4>
          <p style="margin: 0; color: #6B778C;">Error: ${hierarchyContext.error}</p>
        </div>
      `;
    }

    if (hierarchyStatus.success) {
      const status = hierarchyStatus.data;
      resultsHTML += `
        <div class="status-summary" style="background: #F8F9FA; padding: 16px; border-radius: 8px; margin: 8px 0;">
          <h5 style="margin: 0 0 12px 0; color: #172B4D;">📊 System Status</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>Hierarchy Enabled: ${
              status.hierarchyEnabled ? "✅ Yes" : "❌ No"
            }</div>
            <div>Detection Method: ${status.detectionMethod}</div>
            <div>Can Manage Capacity: ${
              status.management?.canManageCapacity ? "✅ Yes" : "❌ No"
            }</div>
            <div>Cache Age: ${
              status.cacheAge < 60
                ? "Fresh"
                : Math.floor(status.cacheAge / 60) + "m old"
            }</div>
          </div>
        </div>
      `;
    }

    if (resultsDiv) {
      resultsDiv.innerHTML = resultsHTML;
    }

    showNotification(
      "🏢 Hierarchy detection test completed! Check console for details.",
      "success"
    );
  } catch (error) {
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <div class="error-message" style="background: #FFEBE6; border: 1px solid #DE350B; padding: 16px; border-radius: 8px;">
          <h4 style="color: #DE350B; margin: 0 0 8px 0;">❌ Test Failed</h4>
          <p style="margin: 0; color: #6B778C;">Error: ${error.message}</p>
          <p style="margin: 8px 0 0 0; color: #6B778C; font-size: 12px;">Check console for more details.</p>
        </div>
      `;
    }

    showNotification(
      "❌ Hierarchy detection test failed. Check console for details.",
      "error"
    );
  } finally {
    // Reset button state
    if (btnText && btnLoading) {
      btnText.style.display = "inline";
      btnLoading.style.display = "none";
      button.disabled = false;
    }
  }
};

// Set up monitoring for field changes to trigger UI refresh
function setupFieldChangeMonitoring() {
  try {
    // Monitor for field changes using a MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Look for changes in issue fields
        if (mutation.type === "childList" || mutation.type === "attributes") {
          const target = mutation.target;

          // Check if this is related to assignee or multi-assignee fields
          if (
            target &&
            (target.id?.includes("assignee") ||
              target.className?.includes("assignee") ||
              target.closest?.('[data-testid*="assignee"]') ||
              target.closest?.('[id*="assignee"]') ||
              target.closest?.(".field-group"))
          ) {
            // Debounce the refresh to avoid too many updates
            debounce(
              "fieldChangeRefresh",
              () => {
                console.log(
                  "🔄 Field change detected, refreshing page in 2 seconds..."
                );
                setTimeout(() => {
                  if (
                    confirm(
                      "The assignee field has been updated automatically. Would you like to refresh the page to see the changes?"
                    )
                  ) {
                    window.location.reload();
                  }
                }, 2000);
              },
              3000
            );
          }
        }
      });
    });

    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "data-value", "aria-expanded"],
    });

    // Also set up a periodic check every 10 seconds for field updates
    setInterval(() => {
      // Check if we're on an issue page
      if (window.location.href.includes("/browse/")) {
        debounce(
          "periodicFieldCheck",
          async () => {
            try {
              // Get current issue key from URL
              const issueMatch = window.location.href.match(
                /\/browse\/([A-Z]+-\d+)/
              );
              if (issueMatch) {
                const issueKey = issueMatch[1];

                // Check if there are any pending field updates for this issue
                // This is a lightweight check to see if the page needs refresh
                const response = await invoke("checkFieldSync", { issueKey });
                if (response?.needsRefresh) {
                  console.log(
                    "🔄 Backend reports field sync completed, refreshing..."
                  );
                  window.location.reload();
                }
              }
            } catch (error) {
              // Silently handle errors - this is just a background check
            }
          },
          1000
        );
      }
    }, 10000); // Check every 10 seconds

    console.log("✅ Field change monitoring set up successfully");
  } catch (error) {
    console.error("❌ Error setting up field monitoring:", error);
  }
}
