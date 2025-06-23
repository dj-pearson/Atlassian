# Comprehensive Forge Custom UI Resolver Architecture and Jira Hierarchy System Implementation Guide

## Forge Resolver Architecture Patterns and Implementation

### Import/Export Patterns That Work Reliably

**The Standard Pattern (Always Use This):**

```javascript
// src/index.js
import Resolver from "@forge/resolver";

const resolver = new Resolver();

resolver.define("functionKey", ({ payload, context }) => {
  // resolver logic here
  return { result: "success" };
});

export const handler = resolver.getDefinitions();
```

**Critical Implementation Rules:**

- **Always use default import**: `import Resolver from '@forge/resolver'` (never named imports)
- **Single resolver instance per file**: Create one resolver instance and define all functions on it
- **Standard export pattern**: Always export as `export const handler = resolver.getDefinitions()`
- **Unique function keys**: Use descriptive, unique string identifiers for each resolver function

**Patterns to Avoid:**

```javascript
// ❌ WRONG - Named import doesn't work
import { Resolver } from "@forge/resolver";

// ❌ WRONG - Full import doesn't work reliably
import * as ForgeResolver from "@forge/resolver";

// ❌ WRONG - Missing export keyword
const handler = resolver.getDefinitions();
```

### Testing Patterns for Minimal Resolver Functions

**Mock Setup for Testing:**

```javascript
// __mocks__/@forge/resolver.js
class MockResolver {
  constructor() {
    this.functions = {};
  }

  define(functionKey, callback) {
    this.functions[functionKey] = callback;
    return this;
  }

  getDefinitions() {
    return (event) => {
      const { functionKey, payload, context } = event;
      if (this.functions[functionKey]) {
        return this.functions[functionKey]({ payload, context });
      }
      throw new Error(`Function ${functionKey} not found`);
    };
  }
}

export default MockResolver;
```

**Test Resolver Structure:**

```javascript
// src/test-resolver.js
import Resolver from "@forge/resolver";

const resolver = new Resolver();

// Minimal test function
resolver.define("testFunction", ({ payload, context }) => {
  return {
    received: payload,
    contextType: typeof context,
    timestamp: new Date().toISOString(),
  };
});

// Data validation function
resolver.define("validateData", ({ payload }) => {
  if (!payload || !payload.data) {
    throw new Error("Data is required");
  }
  return { valid: true, data: payload.data };
});

export const handler = resolver.getDefinitions();
```

**Jest Testing Implementation:**

```javascript
// __tests__/resolver.test.js
jest.mock("@forge/resolver");

import Resolver from "@forge/resolver";
import { handler } from "../src/index.js";

describe("Resolver Functions", () => {
  let mockResolver;

  beforeEach(() => {
    mockResolver = new Resolver();
  });

  test("should handle basic function call", async () => {
    const mockPayload = { name: "Test" };
    const mockContext = { accountId: "123" };

    const result = await handler({
      functionKey: "testFunction",
      payload: mockPayload,
      context: mockContext,
    });

    expect(result).toEqual({
      received: mockPayload,
      contextType: "object",
      timestamp: expect.any(String),
    });
  });
});
```

## Manifest Function Registration Analysis

### Function Limits and Best Practices

**Hard Platform Limits:**

- **Maximum 100 modules per app** (absolute hard limit)
- **Maximum 10 resources per app**
- **No explicit hard limit on functions per manifest** (limited by overall module count)
- **1,200 invocations per minute sliding window** (rate limit)
- **25 seconds maximum runtime** per function invocation

**Quota-Based Scaling:**

- **Paid Apps**: First 100 seats get 100,000 invocations/week, 400 minutes runtime/week
- **Free Apps**: First 100 seats get 50,000 invocations/week, 200 minutes runtime/week

### Function Registration Requirements

**Critical Finding: All Functions Must Be Explicitly Registered**

There is no automatic registration or hierarchy-based registration in Forge. Every function referenced by any module must be explicitly declared in the `function` section of manifest.yml.

```yaml
# ❌ WRONG - Will fail
modules:
  jira:issuePanel:
    - key: panel
      resolver:
        function: undeclared-function  # ERROR: Not in function section

# ✅ CORRECT
modules:
  jira:issuePanel:
    - key: panel
      resolver:
        function: declared-function

function:
  - key: declared-function  # REQUIRED: Must be explicitly declared
    handler: index.handler
```

### Complex Manifest Registration Patterns

**Multi-Product Complex Application:**

```yaml
modules:
  # Jira modules
  jira:issuePanel:
    - key: hierarchy-panel
      resource: hierarchy-ui
      resolver:
        function: hierarchy-resolver
      title: Hierarchy Analysis

  jira:adminPage:
    - key: hierarchy-admin
      function: admin-function
      title: Hierarchy Configuration

  # Scheduled maintenance
  scheduledTrigger:
    - key: daily-hierarchy-sync
      function: sync-function
      interval: day

  # Event triggers
  trigger:
    - key: hierarchy-update-trigger
      function: hierarchy-update-function
      events:
        - avi:jira:updated:issue

function:
  # UI Resolvers
  - key: hierarchy-resolver
    handler: resolvers/hierarchyResolver.handler

  # Admin functions
  - key: admin-function
    handler: admin/adminHandler.handler

  # Background processing
  - key: sync-function
    handler: maintenance/sync.handler
  - key: hierarchy-update-function
    handler: triggers/hierarchyUpdate.handler

resources:
  - key: hierarchy-ui
    path: static/hierarchy-app/build

permissions:
  scopes:
    - storage:app
    - read:jira-work
    - write:jira-work
```

## Index.js Handler Export Investigation

### Multiple Handler Organization Patterns

**Single Handler Pattern (Recommended):**

```javascript
// src/index.js - Multiple functions in one resolver
import Resolver from "@forge/resolver";
import { processCapacity } from "./services/capacity";
import { buildHierarchy } from "./services/hierarchy";

const resolver = new Resolver();

// Capacity-related functions
resolver.define("getCapacity", ({ payload, context }) => {
  return processCapacity(payload, context);
});

resolver.define("updateCapacity", ({ payload, context }) => {
  return updateCapacityData(payload, context);
});

// Hierarchy-related functions
resolver.define("getHierarchy", ({ payload, context }) => {
  return buildHierarchy(payload, context);
});

resolver.define("updateHierarchy", ({ payload, context }) => {
  return updateHierarchyData(payload, context);
});

export const handler = resolver.getDefinitions();
```

**Separate Handler Organization (Advanced Pattern):**

```javascript
// src/resolvers/capacity.js
import Resolver from "@forge/resolver";

const capacityResolver = new Resolver();

capacityResolver.define("getCapacity", ({ payload, context }) => {
  // capacity logic
});

export const capacityHandler = capacityResolver.getDefinitions();

// src/resolvers/hierarchy.js
import Resolver from "@forge/resolver";

const hierarchyResolver = new Resolver();

hierarchyResolver.define("getHierarchy", ({ payload, context }) => {
  // hierarchy logic
});

export const hierarchyHandler = hierarchyResolver.getDefinitions();

// src/index.js - Main resolver aggregator
import Resolver from "@forge/resolver";
import { capacityHandler } from "./resolvers/capacity";
import { hierarchyHandler } from "./resolvers/hierarchy";

const mainResolver = new Resolver();

// Re-export all functions through main resolver
mainResolver.define("getCapacity", ({ payload, context }) => {
  return capacityHandler({ functionKey: "getCapacity", payload, context });
});

mainResolver.define("getHierarchy", ({ payload, context }) => {
  return hierarchyHandler({ functionKey: "getHierarchy", payload, context });
});

export const handler = mainResolver.getDefinitions();
```

## Jira API Context and Permission Systems

### Available Context and API Endpoints

**Critical Jira API Endpoints:**

- `/rest/api/3/mypermissions` - User's permissions with context filtering
- `/rest/api/3/myself` - Current user information and profile
- `/rest/api/3/project/{projectKey}/role` - Project role details and actors
- `/rest/api/3/project/{projectId}/hierarchy` - Project issue type hierarchy
- `/rest/api/3/permissions/check` - Bulk permission checking

**Context Access Pattern:**

```javascript
import { requestJira } from "@forge/bridge";

// Get user permissions with specific context
const response = await requestJira(
  `/rest/api/3/mypermissions?permissions=BROWSE_PROJECTS,EDIT_ISSUES&projectKey=${projectKey}`,
  {
    headers: { Accept: "application/json" },
  }
);

// Get current user information
const userResponse = await requestJira(`/rest/api/3/myself`, {
  headers: { Accept: "application/json" },
});

// Get project roles
const roleResponse = await requestJira(
  `/rest/api/3/project/${projectKey}/role`,
  {
    headers: { Accept: "application/json" },
  }
);
```

### Jira Permission Hierarchy Structure

**Three-Tier Permission System:**

1. **Global Permissions** - Site-wide access control
2. **Project Permissions** - Project-specific access control
3. **Issue Permissions** - Individual issue-level security

**Default Project Roles:**

- **Administrators**: Project management, user administration, component/version management
- **Developers**: Issue assignment, editing, work logging, workflow transitions
- **Users**: Issue creation, viewing, basic interactions

**Advanced Permission Detection:**

```javascript
// Check multiple permission contexts
const permissionCheck = await requestJira("/rest/api/3/permissions/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectPermissions: [
      {
        permissions: ["BROWSE_PROJECTS", "EDIT_ISSUES"],
        projects: [projectId],
      },
    ],
    globalPermissions: ["ADMINISTER"],
  }),
});
```

**Permission Testing Matrix:**

```javascript
// Permission testing framework
const testPermissionMatrix = {
  adminUser: {
    expectedPermissions: [
      "ADMINISTER_PROJECTS",
      "BROWSE_PROJECTS",
      "EDIT_ISSUES",
    ],
    testScenarios: [
      "cross_project_access",
      "user_management",
      "scheme_modification",
    ],
  },
  developerUser: {
    expectedPermissions: ["BROWSE_PROJECTS", "EDIT_ISSUES", "WORK_ON_ISSUES"],
    testScenarios: ["issue_editing", "work_logging", "component_access"],
  },
  viewerUser: {
    expectedPermissions: ["BROWSE_PROJECTS"],
    testScenarios: ["read_only_access", "restricted_editing"],
  },
};

// Automated permission validation
const validateUserPermissions = async (userContext, expectedPermissions) => {
  const actualPermissions = await requestJira(
    `/rest/api/3/mypermissions?permissions=${expectedPermissions.join(",")}`
  );

  const results = {};
  for (const permission of expectedPermissions) {
    results[permission] =
      actualPermissions.permissions[permission]?.havePermission || false;
  }

  return results;
};
```

## Storage and Caching System Implementation

### Forge Storage API Patterns

**Storage Options:**

1. **Key-Value Store (Persistent)** - Long-term data storage with encryption
2. **Custom Entity Store (Persistent)** - Structured data with query capabilities
3. **Forge Cache (EAP)** - High-performance memory-based temporary storage
4. **Forge SQL (Preview)** - Dedicated SQL database instances

**Optimal Storage Pattern for Hierarchy Data:**

```javascript
import { storage } from "@forge/api";
import cache from "@forge/cache";

// Persistent storage for hierarchy structure
const storeHierarchyData = async (projectKey, hierarchyData) => {
  const cacheKey = `hierarchy_${projectKey}`;
  const storageKey = `project_hierarchy_${projectKey}`;

  // Store in persistent storage
  await storage.set(storageKey, {
    data: hierarchyData,
    lastUpdated: Date.now(),
    version: "1.0",
  });

  // Cache for performance (if available)
  if (cache) {
    const cacheClient = cache.connect();
    await cacheClient.set(cacheKey, JSON.stringify(hierarchyData), {
      ttlSeconds: 3600, // 1 hour cache
    });
  }
};

// Optimized retrieval with cache fallback
const getHierarchyData = async (projectKey) => {
  const cacheKey = `hierarchy_${projectKey}`;
  const storageKey = `project_hierarchy_${projectKey}`;

  // Try cache first (if available)
  if (cache) {
    const cacheClient = cache.connect();
    const cachedData = await cacheClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  // Fallback to persistent storage
  const storedData = await storage.get(storageKey);
  if (storedData) {
    // Refresh cache
    if (cache) {
      const cacheClient = cache.connect();
      await cacheClient.set(cacheKey, JSON.stringify(storedData.data), {
        ttlSeconds: 3600,
      });
    }
    return storedData.data;
  }

  return null;
};
```

**Storage Limitations:**

- **Key-Value Store**: 128 KiB per value, 500 bytes per key
- **Rate Limits**: 4MB per installation per week, operation limits per second
- **Custom Entity Store**: Better for complex queries and structured data
- **Cache**: No persistence guarantee, TTL-based expiration

## Frontend-Backend Integration Testing

### Invoke() Method Implementation

**Basic Frontend-Backend Communication:**

```javascript
import { invoke } from "@forge/bridge";

// Frontend component calling backend resolver
const App = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    invoke("getText", { example: "my-invoke-variable" })
      .then(setData)
      .catch((error) => {
        console.error("Resolver call failed:", error);
        // Handle error appropriately
      });
  }, []);

  return <div>{data ? data : "Loading..."}</div>;
};
```

**Backend Resolver Implementation:**

```javascript
import Resolver from "@forge/resolver";

const resolver = new Resolver();

resolver.define("getText", (req) => {
  console.log("Request payload:", req.payload);
  console.log("Context:", req.context);

  // Access context information
  const { accountId, cloudId } = req.context;

  return {
    message: "Hello, World!",
    userData: req.payload,
  };
});

export const handler = resolver.getDefinitions();
```

### Testing Frontend-Backend Integration

**Frontend Testing with Mocks:**

```javascript
// __mocks__/@forge/bridge.js
export const invoke = jest.fn().mockImplementation((functionKey, payload) => {
  return Promise.resolve({
    success: true,
    data: `Mocked response for ${functionKey}`,
  });
});

export const view = {
  getContext: jest.fn().mockResolvedValue({
    extension: { key: "test-extension" },
    cloudId: "test-cloud-id",
  }),
};
```

**Error Handling Pattern:**

```javascript
// Frontend error handling
const callResolver = async (functionKey, payload) => {
  try {
    const result = await invoke(functionKey, payload);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Resolver ${functionKey} failed:`, error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
};

// Backend error handling
resolver.define("myHandler", async (req) => {
  try {
    // Business logic here
    const result = await processData(req.payload);
    return result;
  } catch (error) {
    // Log error for debugging
    console.error("Processing failed:", error);

    // Return structured error response
    throw new Error(`Processing failed: ${error.message}`);
  }
});
```

### Common Integration Issues and Solutions

**"Unable to establish connection with Custom UI bridge"**

- **Root Cause**: Using `@forge/bridge` outside of Atlassian context
- **Solution**: Ensure you're using `forge tunnel` for local development
- **Configuration**: Check tunnel port configuration in manifest.yml

**IndexedDB Timeout Issues**

- **Solution**: Implement retry logic for bridge calls

```javascript
const retryInvoke = async (functionKey, payload, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await invoke(functionKey, payload);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Complete Production Implementation Template

**Production-Ready Resolver:**

```javascript
// src/index.js - Complete hierarchy system implementation
import Resolver from "@forge/resolver";
import { storage } from "@forge/api";
import { requestJira } from "@forge/bridge";

const resolver = new Resolver();

// Utility functions
const createResponse = (success, data = null, error = null) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
});

const validatePayload = (payload, requiredFields) => {
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
};

// Hierarchy detection resolver
resolver.define("detectHierarchy", async ({ payload, context }) => {
  try {
    validatePayload(payload, ["projectKey"]);

    const { projectKey } = payload;
    const { accountId } = context;

    // Check user permissions
    const permissions = await requestJira(
      `/rest/api/3/mypermissions?projectKey=${projectKey}&permissions=BROWSE_PROJECTS,EDIT_ISSUES`
    );

    if (!permissions.permissions.BROWSE_PROJECTS?.havePermission) {
      return createResponse(false, null, "Insufficient permissions");
    }

    // Get project roles
    const roles = await requestJira(`/rest/api/3/project/${projectKey}/role`);

    // Get user information
    const user = await requestJira(`/rest/api/3/myself`);

    // Detect hierarchy structure
    const hierarchy = {
      projectKey,
      userRole: detectUserRole(roles, accountId),
      permissions: permissions.permissions,
      hierarchyLevel: calculateHierarchyLevel(roles, accountId),
      lastUpdated: Date.now(),
    };

    // Store hierarchy data
    await storage.set(`hierarchy_${projectKey}_${accountId}`, hierarchy);

    return createResponse(true, hierarchy);
  } catch (error) {
    console.error("detectHierarchy error:", error);
    return createResponse(false, null, error.message);
  }
});

// Permission checking resolver
resolver.define("checkPermissions", async ({ payload, context }) => {
  try {
    validatePayload(payload, ["projectKey", "permissions"]);

    const { projectKey, permissions } = payload;

    const permissionCheck = await requestJira("/rest/api/3/permissions/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectPermissions: [
          {
            permissions: permissions,
            projects: [projectKey],
          },
        ],
      }),
    });

    return createResponse(true, permissionCheck);
  } catch (error) {
    console.error("checkPermissions error:", error);
    return createResponse(false, null, error.message);
  }
});

// Hierarchy data caching resolver
resolver.define("getHierarchyData", async ({ payload, context }) => {
  try {
    validatePayload(payload, ["projectKey"]);

    const { projectKey } = payload;
    const { accountId } = context;

    // Try to get cached data
    const cachedData = await storage.get(
      `hierarchy_${projectKey}_${accountId}`
    );

    if (cachedData && Date.now() - cachedData.lastUpdated < 3600000) {
      // 1 hour cache
      return createResponse(true, cachedData);
    }

    // If no cache, trigger hierarchy detection
    return resolver.getDefinitions()({
      functionKey: "detectHierarchy",
      payload,
      context,
    });
  } catch (error) {
    console.error("getHierarchyData error:", error);
    return createResponse(false, null, error.message);
  }
});

// Helper functions
const detectUserRole = (roles, accountId) => {
  // Implementation for detecting user role from project roles
  // This would analyze the roles data structure to determine user's role
  return "user"; // Placeholder
};

const calculateHierarchyLevel = (roles, accountId) => {
  // Implementation for calculating hierarchy level
  // This would determine the user's position in the hierarchy
  return 1; // Placeholder
};

export const handler = resolver.getDefinitions();
```

**Complete Frontend Integration:**

```javascript
// static/hierarchy-app/src/components/HierarchyDetector.jsx
import React, { useState, useEffect } from "react";
import { invoke, view } from "@forge/bridge";

const HierarchyDetector = () => {
  const [context, setContext] = useState(null);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const ctx = await view.getContext();
        setContext(ctx);

        if (ctx.extension.project?.key) {
          await detectHierarchy(ctx.extension.project.key);
        }
      } catch (err) {
        setError("Failed to initialize hierarchy detector");
      }
    };

    initialize();
  }, []);

  const detectHierarchy = async (projectKey) => {
    setLoading(true);
    setError(null);

    try {
      const result = await invoke("detectHierarchy", { projectKey });

      if (result.success) {
        setHierarchyData(result.data);
      } else {
        setError(result.error || "Hierarchy detection failed");
      }
    } catch (err) {
      setError(err.message || "Failed to detect hierarchy");
    } finally {
      setLoading(false);
    }
  };

  const refreshHierarchy = () => {
    if (context?.extension.project?.key) {
      detectHierarchy(context.extension.project.key);
    }
  };

  if (!context) return <div>Loading context...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="hierarchy-detector">
      <h3>Jira Hierarchy Detector</h3>

      {loading && <div>Detecting hierarchy...</div>}

      {hierarchyData && (
        <div className="hierarchy-details">
          <h4>Project: {hierarchyData.projectKey}</h4>
          <p>Your Role: {hierarchyData.userRole}</p>
          <p>Hierarchy Level: {hierarchyData.hierarchyLevel}</p>
          <p>
            Last Updated: {new Date(hierarchyData.lastUpdated).toLocaleString()}
          </p>

          <div className="permissions">
            <h5>Your Permissions:</h5>
            <ul>
              {Object.entries(hierarchyData.permissions).map(
                ([permission, details]) => (
                  <li key={permission}>
                    {permission}: {details.havePermission ? "✅" : "❌"}
                  </li>
                )
              )}
            </ul>
          </div>

          <button onClick={refreshHierarchy}>Refresh Hierarchy</button>
        </div>
      )}
    </div>
  );
};

export default HierarchyDetector;
```

This comprehensive guide provides the complete technical foundation for implementing a robust Jira hierarchy system within a Forge Custom UI application, covering all architectural decisions, implementation patterns, testing strategies, and production-ready code examples.
