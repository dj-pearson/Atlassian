// Team Capacity Dashboard JavaScript
console.log("=== DASHBOARD SCRIPT LOADED ===");

// Set initial timestamp when script loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("=== DOM CONTENT LOADED ===");
  const lastUpdateElement = document.getElementById("last-update");
  if (lastUpdateElement) {
    lastUpdateElement.textContent = new Date().toLocaleTimeString();
  }

  console.log("AP available at DOM ready:", typeof AP !== "undefined");
  console.log("Current URL:", window.location.href);
});

// Function to refresh data - now loads real data from Jira
async function refreshData() {
  console.log("Loading real data from Jira...");

  const button = document.querySelector(".refresh-btn");
  const originalText = button.innerHTML;
  button.innerHTML = "⏳ Loading...";
  button.disabled = true;

  try {
    // Check if we're in a Forge environment
    if (typeof AP !== "undefined") {
      console.log("Calling capacity resolver...");
      const response = await AP.invoke("capacity-resolver");
      console.log("Resolver response:", response);

      if (response && !response.error) {
        updateDashboardWithRealData(response);
        console.log("Dashboard updated with real data");
      } else {
        throw new Error(response.error || "No data received from resolver");
      }
    } else {
      throw new Error("Not in Forge environment - AP bridge not available");
    }
  } catch (error) {
    console.error("Failed to load real data:", error);
    console.log("Keeping existing mock data display");
    // Don't show alert, just log the error and keep mock data
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
    const lastUpdateElement = document.getElementById("last-update");
    if (lastUpdateElement) {
      lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
  }
}

// Function to update dashboard with real data
function updateDashboardWithRealData(data) {
  console.log("Updating dashboard with real data:", data);

  try {
    // Update subtitle with project info
    if (data.projectKey && data.metrics) {
      const subtitleElement = document.querySelector(".dashboard-subtitle");
      if (subtitleElement) {
        subtitleElement.textContent = `Project: ${data.projectKey} • ${data.metrics.activeAssignments} total assignments`;
      }
    }

    // Update metrics cards
    if (data.metrics) {
      const teamMembersCard = document.querySelector(
        ".metrics-grid .metric-card:nth-child(1) .metric-value"
      );
      const avgUtilCard = document.querySelector(
        ".metrics-grid .metric-card:nth-child(2) .metric-value"
      );
      const totalAssignmentsCard = document.querySelector(
        ".metrics-grid .metric-card:nth-child(3) .metric-value"
      );
      const healthStatusCard = document.querySelector(
        ".metrics-grid .metric-card:nth-child(4) .metric-value"
      );

      if (teamMembersCard)
        teamMembersCard.textContent = data.metrics.totalMembers;
      if (avgUtilCard)
        avgUtilCard.textContent = data.metrics.avgUtilization + "%";
      if (totalAssignmentsCard)
        totalAssignmentsCard.textContent = data.metrics.activeAssignments;

      if (healthStatusCard) {
        healthStatusCard.textContent = data.metrics.healthStatus;
        healthStatusCard.className =
          "metric-value " + getHealthClass(data.metrics.healthStatus);
      }
    }

    // Update team capacity grid with real users
    if (data.users && data.users.length > 0) {
      const teamGrid = document.querySelector(".team-capacity-grid");
      if (teamGrid) {
        teamGrid.innerHTML = data.users
          .map((user) => createUserCard(user))
          .join("");
      }
    }

    // Update alerts section if we have alerts
    if (data.alerts && data.alerts.length > 0) {
      updateAlertsSection(data.alerts);
    }

    console.log("Dashboard successfully updated with real data");
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

// Helper function to get health status CSS class
function getHealthClass(status) {
  switch (status) {
    case "Critical":
      return "health-critical";
    case "Warning":
      return "health-warning";
    case "Good":
      return "health-good";
    default:
      return "health-good";
  }
}

// Helper function to get user initials
function getUserInitials(user) {
  if (user.displayName) {
    const names = user.displayName.split(" ");
    return names.length > 1
      ? names[0][0] + names[1][0]
      : names[0][0] + (names[0][1] || "");
  }
  return user.userAccountId
    ? user.userAccountId.substring(0, 2).toUpperCase()
    : "U";
}

// Helper function to get status CSS class
function getStatusClass(status) {
  switch (status) {
    case "optimal":
      return "status-optimal";
    case "busy":
      return "status-busy";
    case "overloaded":
      return "status-overloaded";
    default:
      return "status-optimal";
  }
}

// Helper function to get capacity bar CSS class
function getCapacityClass(utilization) {
  if (utilization >= 1.0) return "capacity-overloaded";
  if (utilization >= 0.8) return "capacity-busy";
  return "capacity-optimal";
}

// Function to create user card HTML
function createUserCard(user) {
  const utilization = Math.round(user.utilizationRate * 100);
  const totalAssignments =
    user.primary + user.secondary + user.reviewer + user.collaborator;
  const statusClass = getStatusClass(user.healthStatus);
  const capacityClass = getCapacityClass(user.utilizationRate);

  let assignmentBreakdown = "";
  if (user.primary > 0) {
    assignmentBreakdown += `<div class="assignment-type"><div class="assignment-dot primary-dot"></div><span>${user.primary}P</span></div>`;
  }
  if (user.secondary > 0) {
    assignmentBreakdown += `<div class="assignment-type"><div class="assignment-dot secondary-dot"></div><span>${user.secondary}S</span></div>`;
  }
  if (user.reviewer > 0) {
    assignmentBreakdown += `<div class="assignment-type"><div class="assignment-dot reviewer-dot"></div><span>${user.reviewer}R</span></div>`;
  }
  if (user.collaborator > 0) {
    assignmentBreakdown += `<div class="assignment-type"><div class="assignment-dot collaborator-dot"></div><span>${user.collaborator}C</span></div>`;
  }

  const avatar = user.avatarUrl
    ? `<img src="${user.avatarUrl}" alt="${user.displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
    : getUserInitials(user);

  return `
    <div class="user-capacity-card">
      <div class="user-header">
        <div class="user-avatar">${avatar}</div>
        <div class="user-info">
          <h4 class="user-name">${user.displayName}</h4>
          <span class="user-status ${statusClass}">${user.healthStatus}</span>
        </div>
      </div>
      
      <div class="capacity-details">
        <span>Utilization</span>
        <span><strong>${utilization}%</strong> (${totalAssignments}/${
    user.totalCapacity
  })</span>
      </div>
      
      <div class="capacity-bar">
        <div class="capacity-fill ${capacityClass}" style="width: ${Math.min(
    utilization,
    100
  )}%"></div>
      </div>
      
      <div class="assignment-breakdown">
        ${assignmentBreakdown}
      </div>
    </div>
  `;
}

// Function to update alerts section
function updateAlertsSection(alerts) {
  const alertsSection = document.querySelector(".alerts-section");
  if (!alertsSection) return;

  const alertsHTML = alerts
    .map((alert) => {
      const alertClass =
        alert.type === "critical" ? "alert-critical" : "alert-warning";
      const icon = alert.type === "critical" ? "🚨" : "⚠️";

      return `
      <div class="alert-item ${alertClass}">
        <span class="alert-icon">${icon}</span>
        <p class="alert-text">${alert.message}</p>
      </div>
    `;
    })
    .join("");

  alertsSection.innerHTML = `
    <h2 class="section-title">⚠️ Capacity Alerts</h2>
    ${alertsHTML}
  `;
}

// Add a test function to manually check resolver
window.testResolver = async function () {
  console.log("=== MANUAL RESOLVER TEST ===");
  console.log("AP available:", typeof AP !== "undefined");

  if (typeof AP !== "undefined") {
    try {
      console.log("Calling AP.invoke('capacity-resolver')...");
      const result = await AP.invoke("capacity-resolver");
      console.log("Resolver result:", result);
    } catch (error) {
      console.error("Resolver error:", error);
    }
  } else {
    console.log("AP bridge not available");
  }
};

// Auto-load real data after 3 seconds if in Forge environment
setTimeout(function () {
  console.log("=== AUTO-LOAD TIMER TRIGGERED ===");
  if (typeof AP !== "undefined") {
    console.log("AP bridge is available, attempting to load real data...");
    refreshData();
  } else {
    console.log("AP bridge not available - not in Forge environment");
    console.log("typeof AP:", typeof AP);
    console.log("window.AP:", window.AP);
  }
}, 3000);
