// Simple Team Capacity Dashboard JavaScript
console.log("=== DASHBOARD SCRIPT LOADED ===");

// Simple function to update timestamp
function updateTimestamp() {
  const element = document.getElementById("last-update");
  if (element) {
    element.textContent = new Date().toLocaleTimeString();
  }
}

// Set initial timestamp when DOM loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("=== DOM READY ===");
  updateTimestamp();
});

// Simple refresh function
function refreshData() {
  console.log("=== REFRESH CLICKED ===");
  updateTimestamp();

  // Check if AP is available
  if (typeof AP !== "undefined") {
    console.log("AP is available, calling resolver...");
    AP.invoke("capacity-resolver")
      .then(function (response) {
        console.log("Resolver response:", response);
        alert("Got response: " + JSON.stringify(response, null, 2));
      })
      .catch(function (error) {
        console.error("Resolver error:", error);
        alert("Error: " + error.message);
      });
  } else {
    console.log("AP not available");
    alert("AP bridge not available");
  }
}

// Set initial timestamp immediately
updateTimestamp();
