# 🧪 Bidirectional Sync Testing Guide

## Quick Test Steps

### **1. Open Team Capacity Dashboard**

1. Go to your Jira project (ECS)
2. Navigate to **Project Settings** → **Apps** → **Team Capacity Dashboard**
3. Open browser developer console (F12)

### **2. Test Sync Status**

```javascript
// Check current sync status
getSyncStatus();

// Run comprehensive sync test
testBidirectionalSync();
```

### **3. Manual Testing Scenarios**

#### **Test A: Multi-Assignee → Default Assignee**

1. Create/edit an issue (like ECS-8)
2. Add users to **Multi Assignees** field
3. Leave **Assignee** field empty
4. Save issue
5. **Expected**: First multi-assignee should appear in default Assignee field

#### **Test B: Default Assignee → Multi-Assignee**

1. Edit an existing issue
2. Change the **Assignee** field to a different user
3. Save issue
4. **Expected**: New assignee should appear first in Multi Assignees field

#### **Test C: Remove Default Assignee**

1. Edit an issue with both assignee and multi-assignees
2. Clear the **Assignee** field (set to Unassigned)
3. Save issue
4. **Expected**: Removed user should disappear from Multi Assignees field

#### **Test D: Replace Default Assignee**

1. Edit an issue with existing assignee
2. Change **Assignee** to completely different user
3. Save issue
4. **Expected**:
   - Old assignee removed from Multi Assignees
   - New assignee added as first in Multi Assignees

### **4. Monitor Console Output**

Look for these log messages:

- `🔄 Starting bidirectional sync for [ISSUE-KEY]`
- `📝 Assignee field changed, syncing to multi-assignees`
- `➕ Added new assignee [NAME] to multi-assignees`
- `➖ Removed old assignee [ID] from multi-assignees`
- `✅ Bidirectional sync completed`

### **5. Verify Results**

1. Refresh the issue page
2. Check both fields are synchronized
3. Verify no duplicate users in multi-assignees
4. Confirm proper ordering (default assignee should be first)

## Expected Behavior Summary

| Action                                  | Default Assignee   | Multi Assignees                    | Result  |
| --------------------------------------- | ------------------ | ---------------------------------- | ------- |
| Add multi-assignees to unassigned issue | Empty → First user | Users added                        | ✅ Sync |
| Change default assignee                 | User A → User B    | User A removed, User B added first | ✅ Sync |
| Remove default assignee                 | User A → Empty     | User A removed                     | ✅ Sync |
| Add user to multi-assignees             | Empty → First user | Users updated                      | ✅ Sync |

## Troubleshooting

### **If Sync Doesn't Work:**

1. Check browser console for errors
2. Verify you have edit permissions on the issue
3. Ensure Multi Assignees field exists and is visible
4. Try refreshing the page and testing again

### **Debug Commands:**

```javascript
// Check performance metrics
getPerformanceStats();

// Clear cache if needed
clearCache();

// Get memory usage
getMemoryUsage();
```

## Success Criteria

- ✅ Default assignee automatically set from first multi-assignee
- ✅ Multi-assignees updated when default assignee changes
- ✅ Removed assignees properly cleaned up
- ✅ No duplicate users in either field
- ✅ Proper ordering maintained
- ✅ Console logs show successful sync operations

---

**🎯 This bidirectional sync ensures seamless integration between traditional Jira workflows and advanced multi-assignee functionality!**
