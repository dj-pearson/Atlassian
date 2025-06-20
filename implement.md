Great, I’ll look into how to implement a native-style multi-user selector in Jira using Forge, including ways to match the built-in assignee picker and possibly replace it entirely. I’ll also check how to store users in a custom field while handling everything cleanly without constraints.

I’ll get back to you with the findings shortly.

# Implementing a Multi-User Picker in a Forge Jira Cloud App

Implementing a multi-user selector in a Forge app involves creating a custom field that can store multiple users, providing a UI for picking users (with avatars and autocomplete like Jira’s assignee field), and syncing with the native assignee if needed. Below is a step-by-step guide covering field setup, UI implementation with Atlassian’s design components, hiding/replacing the default assignee, and updating fields via REST APIs.

## 1. Define a Multi-User Custom Field in Forge

Start by defining a new custom field in your Forge app’s manifest with a _collection_ of the `user` data type. This allows the field to hold a list of user account IDs (up to 100 users). For example:

```yml
modules:
  jira:customField:
    - key: multi-assignees-field
      name: Multi Assignees
      description: "Select multiple assignees for the issue"
      type: user
      collection: list # enables multiple values (list of users)
      readOnly: false
      edit:
        function: editMultiAssignees # Forge UI function for editing (UI Kit)
      view:
        function: viewMultiAssignees # Forge UI function for viewing (UI Kit)
```

In this example, `type: user` with `collection: list` defines a multi-user picker field. Jira will treat this like a standard “User Picker (multiple users)” field in terms of storage, JQL search (it’s searchable by user), and REST format. Once you deploy the app, an instance of this field is created. A Jira admin must then add it to the appropriate screens (e.g. Issue Create, Edit, View) for it to appear.

**Default vs. Custom Rendering:** By default, a user-type field will behave like Jira’s built-in people fields. On issue screens, Jira will provide a picker interface for it. However, to achieve a UI that _closely matches the native assignee field_, you can override the field’s rendering with a custom UI. This lets you use Atlassian’s design system components to mirror the assignee field’s look and behavior more precisely.

## 2. Building the User Picker UI (Autocomplete with Avatars)

You have two approach options for the UI: using Forge UI Kit or Forge Custom UI (React with Atlaskit). Both approaches can provide an assignee-like experience (autocomplete suggestions with avatars and keyboard navigation):

**Option A – Forge UI Kit:** Leverage the built-in **`UserPicker`** component from Forge UI kit. This component already provides a dropdown that searches users and displays their avatars and names, just like the native picker. It supports multi-select via a prop. For example, in your `editMultiAssignees` UI function you can render:

```jsx
import ForgeUI, {
  Form,
  UserPicker,
  useProductContext,
  render,
} from "@forge/ui";

const EditMultiAssignees = () => {
  const context = useProductContext();
  const currentValue = context.fieldValue; // current selected users (if any)

  return (
    <Form onSubmit={(formData) => formData.selectedUsers}>
      <UserPicker
        label="Assignees"
        name="selectedUsers"
        isMulti={true}
        placeholder="Select users..."
        defaultValue={currentValue}
        onChange={(users) => console.log("Selected users:", users)}
      />
    </Form>
  );
};

export const run = render(<EditMultiAssignees />);
```

In the above UI Kit example, `<UserPicker isMulti={true} />` allows multiple user selection. The component provides built-in search-as-you-type across the Jira user directory and displays each user with their avatar and name. The `onChange` handler returns an array of user objects (with `id` as accountId, plus `name`, `avatarUrl`, etc.) whenever the selection changes. By using a `<Form>` with `onSubmit`, calling `view.submit()` (implicitly via returning the form value) will save the selected account IDs as the field’s value.

**Option B – Forge Custom UI with Atlaskit:** For maximum control over styling and behavior, use Custom UI (a React frontend iframe) with Atlassian’s **Atlaskit** components. Atlaskit provides a **User Picker** component that mimics Jira’s people picker. You can also use the more generic Atlaskit **Async Select** component to implement a user picker. The idea is to fetch suggestions from Jira’s REST API as the user types, and display them with avatars.

**Fetching user suggestions:** Use Jira’s REST API to search for users. For example, you can call the _assignable user search_ API to find users who can be assigned to a given project or issue. Forge allows you to call Jira APIs from the frontend using the `requestJira` bridge. For example, using the project key or issue key from context:

```js
import React, { useState } from "react";
import { AsyncSelect } from "@atlaskit/select";
import { requestJira } from "@forge/bridge";

function MultiUserPicker({ projectKey, onChange }) {
  // Load users from Jira API based on input
  const loadUserOptions = async (inputValue) => {
    const res = await requestJira(
      `/rest/api/3/user/assignable/search?project=${projectKey}&query=${encodeURIComponent(
        inputValue
      )}`,
      { headers: { Accept: "application/json" } }
    );
    const users = await res.json();
    // Map API results to select options
    return users.map((u) => ({
      label: u.displayName,
      value: u.accountId,
      avatar: u.avatarUrls["24x24"],
    }));
  };

  // Custom render to show avatar + name in options
  const formatOptionLabel = (option) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src={option.avatar}
        alt=""
        width="16"
        height="16"
        style={{ borderRadius: "50%" }}
      />
      <span style={{ marginLeft: "8px" }}>{option.label}</span>
    </div>
  );

  return (
    <AsyncSelect
      isMulti
      cacheOptions
      defaultOptions
      loadOptions={loadUserOptions}
      formatOptionLabel={formatOptionLabel}
      placeholder="Select users..."
      onChange={(selectedOptions) =>
        onChange(selectedOptions.map((opt) => opt.value))
      }
    />
  );
}
```

In this example, Atlaskit’s `AsyncSelect` will call our `loadUserOptions` function whenever the user types into the field. That function uses `requestJira` to call Jira’s user search API with a query. The `/rest/api/3/user/assignable/search` endpoint returns users assignable in the given project whose attributes match the query. Each user object includes the `accountId`, `displayName`, and avatar URLs, etc., which we use to build the dropdown options with an avatar image. We set `isMulti` for multi-selection, and use `defaultOptions` so that it initially may show some users (e.g., recently assigned or popular) even before typing.

> **Performance tip:** Be sure to debounce the API calls while typing (the Atlaskit AsyncSelect does some internal debouncing and caching). Avoid fetching on every single keystroke without delay, to prevent hitting rate limits or flooding the network. The Jira API will return at most a certain number of matches (e.g., 50 or 100 by default), so consider adding `maxResults` in the query if needed. Also ensure your app has the proper OAuth scopes (for example, `read:jira-user` is required to search users).

**Atlaskit User Picker component:** Atlaskit also offers a higher-level `<UserPicker>` component (and a “Smart User Picker”) which are pre-configured for user search. However, in practice you still need to supply a data source or context for them. The approach with `AsyncSelect` as shown above is straightforward and leverages Atlaskit’s design for consistency.

**Displaying the selected users:** In the issue view (read-only context), you can format how the chosen users appear. By default, Jira will likely show the multi-user field as a list of names or avatars. If you want a custom display (e.g. a row of small avatars), you can implement the `viewMultiAssignees` function (for UI kit) or design your Custom UI accordingly. Forge UI kit provides components like `<User>` and `<UserGroup>` to display user mentions or groups of avatars if needed. For instance, you could map each accountId to a `<User accountId={...} />` component to show the avatar and name.

## 3. Hiding or Replacing the Native Assignee Field

If you want to **replace** the default assignee field with your multi-user field, you have a couple of strategies:

- **Manual Configuration:** In Jira’s field configuration/screen scheme, remove or hide the Assignee field from the issue screens. Then, add your custom “Multi Assignees” field to those screens in its place. This approach relies on project admin configuration and assumes unassigned issues are allowed (so that removing assignee is feasible).

- **Using Forge UI Modifications:** Forge provides a UI modifications API that can hide or modify fields at runtime. Using the `jira:uiModifications` module, you can target the assignee field on issue create/edit screens and call `setVisible(false)` to hide it. For example, in your UI modification’s `onInit` callback:

  ```js
  import { uiModificationsApi } from "@forge/jira-bridge";

  uiModificationsApi.onInit(
    ({ api }) => {
      const assigneeField = api.getFieldById("assignee");
      if (assigneeField) {
        assigneeField.setVisible(false); // hide the Assignee field in the UI
      }
    },
    ({ uiModifications }) => {
      /* register fields if needed */
    }
  );
  ```

  This will remove the assignee field from view (while still allowing its value to exist in the background). **Note:** Jira will still assign issues based on its rules if assignee is required or defaulted. If the project requires an assignee, make sure to either allow unassigned or programmatically set an assignee (explained next) to avoid validation errors.

## 4. Syncing to the Native Assignee (Optional)

If you want to **overwrite or update the native assignee field** whenever users are selected in your multi-user field, you can do so via Jira’s REST API or the UI modifications API:

- **Via Jira REST API:** After an issue is created or updated, your Forge app can call the Edit Issue API to set the assignee. For example, listen to the `jira:issue_created` and `jira:issue_updated` events in your app (Forge supports registering web triggers for these). In the event handler, retrieve the first user from your custom field’s values and call the assign API. Example (pseudo-code):

  ```js
  import api, { route } from "@forge/api";

  export async function onIssueCreated(event) {
    const issueKey = event.issue.key;
    const multiAssignees = event.issue.fields[YOUR_FIELD_ID]; // array of accountIds
    if (multiAssignees && multiAssignees.length > 0) {
      // set the first user as assignee
      await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            assignee: { id: multiAssignees[0] },
          },
        }),
      });
    }
  }
  ```

  The JSON body uses the standard Jira field format: the assignee field is set by providing an object with an `id` (accountId). (Using `accountId` or `id` is equivalent in Cloud REST APIs). If you want to clear the assignee, you can set `assignee: null` (which unassigns the issue). Make sure your app has the `write:jira` scope to edit issues.

- **Via UI Modifications (on the create screen):** You can also copy the selection to the assignee field _before_ the form is submitted. Using the UI modifications API, you may attempt to set the assignee field’s value on the issue create dialog when the user picks someone in your field. For example, on an `onChange` of your multi-user field (if accessible via `api.getFieldById('customfield_XXXXX')`), call `assigneeField.setValue(accountId)`. The UI mods reference notes that `setValue` on an assignee field expects an accountId string or `null`. An accountId of "-1" represents "Automatic" (default assignee) and `null` represents Unassigned. However, implementing this may be tricky – Forge’s UI modification events are still evolving, so a safer approach is often to use the post-create event as above.

**Important considerations:** If you hide the assignee field and _do not_ set it, and Jira does not allow unassigned issues (check your Jira settings), the issue creation might fail or Jira might auto-assign someone (e.g., the project default). To avoid confusion, ensure unassigned issues are enabled if you intend to leave the native assignee empty. Otherwise, use one of the syncing methods to set a primary assignee behind the scenes.

## 5. UX and Performance Considerations

To truly match the native assignee field behavior, keep these points in mind:

- **Autocomplete and throttling:** The user search should feel instantaneous. Use a small delay (e.g. 300ms debounce) on the API calls to avoid lag and reduce unnecessary calls. The Jira user search API can handle frequent queries, but it will rate-limit if abused (HTTP 429 errors for too many requests). Atlaskit’s AsyncSelect handles some of this for you. Also consider limiting results (e.g. top 10 matches) to keep suggestions relevant and UI performant.

- **Avatar caching:** Browser will cache avatar URLs by URL, but if you are concerned about many image requests, you can request smaller avatars (16x16 or 24x24) and leverage caching. The user objects provide multiple avatar sizes URLs – using the 24x24 (as in the example) is typical for dropdown lists.

- **Dropdown positioning in Forge iframes:** If using Custom UI, note that the dropdown menu is constrained by the iframe. By default, Atlaskit dropdowns (including UserPicker or AsyncSelect) will render the menu within the iframe, which can get cut off if the iframe is small or the menu is long. To improve this:

  - Increase the iframe height or use the `autoResize` feature of Forge if available for your module.
  - Use `menuPosition="fixed"` and a high z-index on the AsyncSelect, so the menu isn’t confined to a scrolling container.
  - Limit the menu height: Atlaskit Select provides a `maxMenuHeight` prop. Setting this to a value smaller than your iframe height ensures the dropdown will scroll internally instead of overflowing.
  - In one community workaround, developers dynamically adjusted the Forge iframe height when the dropdown opened. This can be done by injecting a placeholder element or using postMessage to the parent – though Atlassian is likely to improve this in Forge.

- **Keyboard navigation:** Atlaskit’s select components support arrow key navigation and selection by default, which aligns with the native field behavior. Ensure whatever component you use (UI Kit or Atlaskit) is focusable and test keyboard input (e.g., tab into the field, type to filter, arrow down, enter to select).

- **Multiple selections display:** Native Jira assignee field only allows one user, but it displays that user’s avatar and name. For multiple users, decide how to display them on the issue. Common patterns include showing a stack of avatars or listing names separated by commas. The Atlaskit multi-select will show selected users as lozenges (pill-shaped elements with avatar and name) inside the field input. On the issue view, you might use an avatar group component or similar. Atlaskit has an `AvatarGroup` component that could be useful if you go with Custom UI, or simply iterate through users and render `<Avatar>` components.

## 6. Updating the Field Values via REST (if needed)

Usually, if you use the Forge custom field module and UI kit form, Jira will update the field for you when the form is submitted. However, if you ever need to set or update the field value from your code (e.g., in response to some automation), you can use Jira’s REST API for custom fields. The field will have an ID like `customfield_XXXXX`. For a multi-user field, the JSON format expects an array of user identifiers. For example, to set two users in the custom field via REST, your JSON would look like:

```json
"fields": {
  "customfield_12345": [
    { "id": "abc123-accountId-111" },
    { "id": "xyz789-accountId-222" }
  ]
}
```

This is analogous to how Jira’s API expects an array of user objects for multi-user picker fields. (Using `"accountId"` instead of `"id"` is also accepted in Cloud APIs.) When reading the field via REST, you’ll get an array of user details (each with accountId, displayName, etc.).

## 7. Code Sample: End-to-End Example

Finally, here’s a simplified pseudo-code that ties the pieces together:

```yml
# Manifest excerpt (simplified)
modules:
  jira:customField:
    - key: multi-assignees
      name: "Multi Assignees"
      type: user
      collection: list
      edit:
        function: editMultiAssignees
      view:
        function: viewMultiAssignees
  jira:uiModifications:
    - key: hide-assignee-mod
      target: issue-create, issue-edit # contexts to apply
      function: hideAssigneeField
  jira:trigger:
    - key: sync-assignee-trigger
      events:
        - jira:issue_created
        - jira:issue_updated
      function: syncAssignee
app:
  runtime:
    memory: 256
permissions:
  scopes:
    - read:jira-user
    - write:jira-work
```

```js
// Forge UI kit function to render the edit form for the custom field
import { render, Form, UserPicker, useProductContext } from "@forge/ui";
export const editMultiAssignees = render(() => {
  const { fieldValue } = useProductContext(); // current value (array of accountIds)
  return (
    <Form onSubmit={(data) => data.multiUsers}>
      <UserPicker
        label="Multi Assignees"
        name="multiUsers"
        isMulti
        defaultValue={fieldValue}
      />
    </Form>
  );
});

// UI modification function to hide assignee field
import { uiModificationsApi } from "@forge/jira-bridge";
uiModificationsApi.onInit(
  ({ api }) => {
    const assignee = api.getFieldById("assignee");
    assignee?.setVisible(false); // hide the native assignee field:contentReference[oaicite:24]{index=24}
  },
  () => {}
);

// Backend function to sync first selected user to assignee
import api, { route } from "@forge/api";
export async function syncAssignee(event, context) {
  const issue = event.issue;
  const fieldId = "customfield_12345"; // your multi-assignees field ID
  const users = issue.fields[fieldId] || [];
  const firstUser = users.length ? users[0].accountId || users[0].id : null;
  await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issue.key}/assignee`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        firstUser ? { accountId: firstUser } : { accountId: null }
      ),
    });
}
```

In this end-to-end setup: when an issue is created or edited and our custom field is changed, the trigger `syncAssignee` will set the assignee to the first person (or unassign if the list is empty). We hide the original assignee field on the UI, so users only interact with our multi-user field.

## 8. Limitations and Final Notes

- **Jira Notifications & Assignee:** Keep in mind, if you rely solely on a custom field and leave the real assignee blank, Jira’s built-in notifications or features that key off the assignee might not work. If those are important, using the sync approach to always set an official assignee (perhaps the “primary” owner) is recommended.

- **Permissions:** The Forge app (if using `asApp` to assign issues) will require the proper permissions. Ensure the app user has the _Assign Issues_ permission in projects or use `asUser` if you prefer actions as the acting user. The search API results will also be filtered by the permissions of the user or app making the call (e.g. a user can only find users that they have browse permissions to, and the assignable search will only return users who can be assigned in that project).

- **Testing:** Test the picker with various scenarios – large user directories (type a common name like "John" to see performance), different browsers, keyboard-only usage, etc. Also test the behavior on the issue create screen, issue view, and in Jira’s new issue view vs old (if applicable) to ensure the UI is consistent.

By following the above approach – using Forge to create a multi-user field and Atlassian’s UI components for the selector – you can achieve a multi-user picker that looks and feels like Jira’s native assignee field. It will support avatars, autocomplete suggestions, and multiple selections, all within the Forge framework.

**References:**

- Forge UI Kit `UserPicker` component (supports `isMulti`)
- Forge Custom Field data types (user and collection for multi-user)
- Jira REST API for user search (assignable users)
- Example format for setting single vs. multi-user fields via REST
- Forge UI modifications API (hiding fields, setting values)
- Atlassian community tips on dropdown overflow in Forge iframes
