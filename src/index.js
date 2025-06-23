// Main entry point for the Forge app
export { handler as capacityResolver } from "./resolvers/capacity-dashboard.js";
export { default as issueEventsHandler } from "./handlers/issue-events.js";

// Import hierarchy resolver to register its functions
import "./resolvers/hierarchy-resolver.js";
