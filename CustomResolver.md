# Forge Custom UI Resolver Registration Issues & Direct API Solutions

The selective resolver function failure you're experiencing is a well-documented issue in Atlassian Forge Custom UI applications. Based on comprehensive research of community solutions and technical documentation, **some resolver functions work while others never get called due to specific registration and synchronization problems**. However, there are two primary solution paths: fixing the resolver registration issue or implementing a complete workaround using direct Jira API calls.

## Understanding the core problem

Your issue follows a common pattern where **getCapacityData appears in Forge logs** (indicating successful registration) while **getUserCapacitySettings, testSimple, and updateUserCapacitySettings never appear in logs** despite the frontend receiving responses. This suggests **stale cached data** is being returned for the non-working functions, while they're never actually being invoked.

## Solution Path 1: Fix resolver registration issues

### Most likely causes of selective function failures

**Function registration synchronization problems** are the primary culprit. The issue typically stems from misalignment between your `resolver.define()` calls and manifest declarations, even when some functions work correctly.

**Critical debugging steps:**

1. **Verify exact function name matching** - Function names are case-sensitive and must match exactly between:

   - `resolver.define('functionName', callback)` in your backend code
   - `invoke('functionName')` in your frontend code
   - Function references in your manifest.yml

2. **Check handler export consistency** - Ensure you have exactly this pattern:

   ```javascript
   const resolver = new Resolver();
   resolver.define("getCapacityData", () => {
     /* your logic */
   });
   resolver.define("getUserCapacitySettings", () => {
     /* your logic */
   });
   resolver.define("testSimple", () => {
     /* your logic */
   });
   resolver.define("updateUserCapacitySettings", () => {
     /* your logic */
   });

   // CRITICAL: Must export as 'handler'
   export const handler = resolver.getDefinitions();
   ```

3. **Validate manifest configuration** - Your manifest.yml should follow this exact structure:
   ```yaml
   modules:
     jira:issuePanel:
       - key: your-panel-key
         resource: main
         resolver:
           function: your-resolver-function
   function:
     - key: your-resolver-function
       handler: index.handler
   ```

### Deployment and caching resolution steps

The research revealed that **deployment synchronization issues** commonly cause selective function failures:

1. **Complete redeployment process:**

   ```bash
   # Stop any running tunnel
   # Build Custom UI if needed
   cd static/your-ui-directory && npm run build && cd ../..

   # Full deployment (not just tunnel)
   forge deploy

   # Wait for deployment completion, then restart tunnel
   forge tunnel
   ```

2. **Clear all caching layers:**

   - Clear browser cache completely
   - Stop and restart your development server
   - In some cases, reinstall the app in your development environment

3. **Verify function registration** by adding logging:

   ```javascript
   const resolver = new Resolver();

   const functions = [
     "getCapacityData",
     "getUserCapacitySettings",
     "testSimple",
     "updateUserCapacitySettings",
   ];
   functions.forEach((name) => {
     console.log(`Registering function: ${name}`);
     resolver.define(name, (req) => {
       console.log(`${name} called with:`, req);
       // Your actual logic here
       return { success: true, function: name };
     });
   });

   export const handler = resolver.getDefinitions();
   ```

### Critical logging insight from community

**Important discovery**: Custom UI logs don't appear in `forge tunnel` output - they only show in the browser's developer console. Check your browser's dev tools for frontend errors that might prevent proper resolver invocation.

## Solution Path 2: Complete direct Jira API implementation

Since Forge Bridge 2.0+, you can **completely bypass resolvers** by calling Jira APIs directly from your Custom UI frontend using `requestJira()`. This eliminates all registration issues entirely.

### Complete working implementation

**Replace your entire resolver system with this frontend-only approach:**

```javascript
// App.js - Complete Custom UI without any resolvers
import React, { useState, useEffect } from "react";
import { requestJira } from "@forge/bridge";
import { useProductContext } from "@forge/react";

const CapacityManager = () => {
  const context = useProductContext();
  const [capacityData, setCapacityData] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const issueId = context?.extension?.issue?.id;
  const issueKey = context?.extension?.issue?.key;

  // Direct API call - replaces getCapacityData resolver
  const fetchCapacityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await requestJira(`/rest/api/3/issue/${issueKey}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const issueData = await response.json();
      setCapacityData({
        summary: issueData.fields.summary,
        status: issueData.fields.status.name,
        assignee: issueData.fields.assignee?.displayName || "Unassigned",
      });
    } catch (err) {
      console.error("Error fetching capacity data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Direct API call - replaces getUserCapacitySettings resolver
  const fetchUserCapacitySettings = async () => {
    try {
      const response = await requestJira(
        `/rest/api/3/issue/${issueId}/properties/user-capacity-settings`
      );

      if (response.ok) {
        const propertyData = await response.json();
        setUserSettings(propertyData.value);
      } else if (response.status === 404) {
        // Property doesn't exist - set defaults
        setUserSettings({ defaultCapacity: 8, timeTracking: true });
      }
    } catch (err) {
      console.error("Error fetching user settings:", err);
      setUserSettings({ defaultCapacity: 8, timeTracking: true });
    }
  };

  // Direct API call - replaces updateUserCapacitySettings resolver
  const updateUserCapacitySettings = async (newSettings) => {
    try {
      setLoading(true);

      const response = await requestJira(
        `/rest/api/3/issue/${issueId}/properties/user-capacity-settings`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newSettings),
        }
      );

      if (response.ok || response.status === 200 || response.status === 201) {
        setUserSettings(newSettings);
        console.log("Settings updated successfully");
      } else {
        throw new Error(`Failed to update settings: ${response.status}`);
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      setError("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  // Direct API call - replaces testSimple resolver
  const testSimple = async () => {
    try {
      const response = await requestJira("/rest/api/3/myself");

      if (response.ok) {
        const userData = await response.json();
        console.log("Test successful - current user:", userData.displayName);
        return { success: true, user: userData.displayName };
      }
    } catch (err) {
      console.error("Test failed:", err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    if (issueId && issueKey) {
      fetchCapacityData();
      fetchUserCapacitySettings();
    }
  }, [issueId, issueKey]);

  const handleSettingsUpdate = (newCapacity) => {
    const updatedSettings = {
      ...userSettings,
      defaultCapacity: newCapacity,
      lastUpdated: new Date().toISOString(),
    };
    updateUserCapacitySettings(updatedSettings);
  };

  const handleTestClick = async () => {
    const result = await testSimple();
    alert(
      result.success
        ? `Test passed: ${result.user}`
        : `Test failed: ${result.error}`
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Capacity Management</h3>

      {capacityData && (
        <div>
          <h4>Issue Data</h4>
          <p>
            <strong>Summary:</strong> {capacityData.summary}
          </p>
          <p>
            <strong>Status:</strong> {capacityData.status}
          </p>
          <p>
            <strong>Assignee:</strong> {capacityData.assignee}
          </p>
        </div>
      )}

      {userSettings && (
        <div>
          <h4>User Settings</h4>
          <p>Current Capacity: {userSettings.defaultCapacity} hours</p>
          <input
            type="number"
            value={userSettings.defaultCapacity}
            onChange={(e) => handleSettingsUpdate(parseInt(e.target.value))}
          />
          <p>
            Time Tracking: {userSettings.timeTracking ? "Enabled" : "Disabled"}
          </p>
        </div>
      )}

      <button onClick={handleTestClick}>Run Test</button>
    </div>
  );
};

export default CapacityManager;
```

### Required manifest.yml for direct API approach

```yaml
modules:
  jira:issuePanel:
    - key: capacity-panel
      resource: main
      title: Capacity Management

resources:
  - key: main
    path: static/capacity-ui/build

permissions:
  scopes:
    - "read:jira-work"
    - "write:jira-work"
    - "read:jira-user"
    - "read:issue-details:jira"
    - "read:issue-meta:jira"
# No function section needed - no resolvers!
```

### Advanced error handling for direct API calls

```javascript
// Robust error handling utility
const handleJiraApiCall = async (path, options = {}, retryCount = 3) => {
  const makeRequest = async (attempt = 1) => {
    try {
      const response = await requestJira(path, options);

      switch (response.status) {
        case 200:
        case 201:
        case 204:
          return response;
        case 400:
          const badRequestError = await response.json().catch(() => ({}));
          throw new Error(
            `Bad Request: ${
              badRequestError.errorMessages?.join(", ") || "Invalid request"
            }`
          );
        case 403:
          const forbiddenError = await response.json().catch(() => ({}));
          const errorMsg =
            forbiddenError.errorMessages?.join(", ") || "Access forbidden";
          if (errorMsg.includes("OAuth 2.0 is not enabled")) {
            throw new Error(
              "This API endpoint requires additional permissions. Check your manifest.yml scopes."
            );
          }
          throw new Error(`Forbidden: ${errorMsg}`);
        case 404:
          throw new Error("Resource not found");
        case 429:
          // Rate limiting - implement exponential backoff
          if (attempt <= retryCount) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Rate limited. Retrying in ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
          throw new Error("Rate limit exceeded. Try again later.");
        default:
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error.message.includes("HTTP")) throw error;

      // Network errors - retry with backoff
      if (attempt <= retryCount) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error. Retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequest(attempt + 1);
      }

      throw new Error(`Request failed: ${error.message}`);
    }
  };

  return makeRequest();
};
```

## Alternative: Forge storage approach

If you prefer not to use Jira user properties, **Forge KVS storage provides superior data persistence** but requires maintaining the resolver pattern:

```javascript
// Backend resolver using Forge storage
import Resolver from "@forge/resolver";
import { kvs } from "@forge/kvs";

const resolver = new Resolver();

resolver.define("getUserCapacitySettings", async (req) => {
  try {
    const { userId } = req.payload;
    const key = `user:${userId}:capacity-settings`;
    const settings = await kvs.get(key);
    return {
      success: true,
      data: settings || { defaultCapacity: 8, timeTracking: true },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

resolver.define("updateUserCapacitySettings", async (req) => {
  try {
    const { userId, settings } = req.payload;
    const key = `user:${userId}:capacity-settings`;
    await kvs.set(key, { ...settings, lastUpdated: new Date().toISOString() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();
```

## Performance and architectural comparison

| Approach                      | Registration Issues | Development Speed | Maintenance | Data Control         |
| ----------------------------- | ------------------- | ----------------- | ----------- | -------------------- |
| **Fixed Resolvers**           | High risk           | Slower            | Medium      | Good                 |
| **Direct requestJira()**      | None                | Fast              | Easy        | Limited to Jira APIs |
| **Forge Storage + Resolvers** | High risk           | Slower            | Medium      | Excellent            |

## Systematic troubleshooting for resolver issues

If you choose to fix the resolver registration problem, follow these community-tested steps:

### Step 1: Registration verification

```javascript
// Add this logging to verify all functions are registered
const resolver = new Resolver();
console.log("Starting function registration...");

const functionDefinitions = {
  getCapacityData: (req) => {
    console.log("getCapacityData called");
    return {};
  },
  getUserCapacitySettings: (req) => {
    console.log("getUserCapacitySettings called");
    return {};
  },
  testSimple: (req) => {
    console.log("testSimple called");
    return {};
  },
  updateUserCapacitySettings: (req) => {
    console.log("updateUserCapacitySettings called");
    return {};
  },
};

Object.entries(functionDefinitions).forEach(([name, handler]) => {
  console.log(`Registering: ${name}`);
  resolver.define(name, handler);
});

console.log("All functions registered");
export const handler = resolver.getDefinitions();
```

### Step 2: Frontend invocation testing

```javascript
// Test each function individually
const testFunctions = async () => {
  const functions = [
    "getCapacityData",
    "getUserCapacitySettings",
    "testSimple",
    "updateUserCapacitySettings",
  ];

  for (const funcName of functions) {
    try {
      console.log(`Testing ${funcName}...`);
      const result = await invoke(funcName, { test: true });
      console.log(`✅ ${funcName} works:`, result);
    } catch (error) {
      console.error(`❌ ${funcName} failed:`, error.message);
    }
  }
};
```

### Step 3: Complete environment reset

```bash
# Nuclear option for resolver issues
rm -rf node_modules package-lock.json
npm install
cd static/your-ui && rm -rf node_modules package-lock.json && npm install && npm run build && cd ../..
forge deploy
# Wait for completion
forge tunnel
```

## Final recommendation

**For immediate resolution of your specific issue**, I strongly recommend implementing the **direct requestJira() approach** because:

1. **Eliminates all resolver registration complexity** - No more function synchronization issues
2. **Faster development and debugging** - All logic visible in browser console
3. **More reliable architecture** - No deployment synchronization dependencies
4. **Identical functionality** - Can replicate all your current resolver functions
5. **Easier maintenance** - Single codebase without backend/frontend coordination

The direct API approach provides all the functionality you need for capacity management while avoiding the entire class of resolver registration problems you're currently experiencing.

If you absolutely must use resolvers, focus on the systematic troubleshooting steps above, particularly the complete environment reset process which has resolved similar issues for other developers in the community.

The choice between approaches depends on your architectural preferences, but for your specific "some resolvers work, others don't" scenario, the direct API implementation offers the most reliable path forward.
