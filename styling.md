Framework Recommendations
Best Framework Choice: Custom UI with @forge/bridge
Custom UI gives you more room to use Atlassian-supplied and third-party hooks, components and such, while also allowing you to employ more complex HTML, CSS, static resources (such as images) and source code Jira Cloud Apps: Publishing my first Forge app (part 2 of 3). Custom UI imposes fewer limitations on you, the developer Jira Cloud Apps: Publishing my first Forge app (part 2 of 3).
UI Kit 2 vs Custom UI
UI Kit 2 (Current):

You must be on @forge/react major version 10 or higher to use the latest version of UI Kit components UI Kit components
Tabs component is available with TabList, Tab, and TabPanel components Tabs - Forge
Limited styling customization
You also still cannot use arbitrary HTML, and are restricted to using the components exported from @forge/react 10 Free Tailwind CSS UI Kits & Component Libraries 2024

Custom UI:

Full control over HTML, CSS, JavaScript
Can integrate Atlaskit components
Custom UI runs within an iframe, providing an isolated environment for the app's interface to be displayed GitHub - anilkk/ui-component-with-forge-ui: It's a list of common UI components using Forge UI components
Better for beautiful, highly customized interfaces

Styling Limitations & Capabilities
UI Kit Limitations:

No way to add CSS style to certain Forge UI kit components e.g. 20% width to a column in a Table or border radius to Image or float right to a Button How to add CSS style to Forge UI kit components - Forge - The Atlassian Developer Community
You can't style using CSS and so use 3rd party services like cloudinary to customize your image if possible How to apply Atlaskit CSS styles in Forge Custom UI app? - Forge UI Kit and Custom UI - The Atlassian Developer Community

Custom UI Styling:

Full CSS control with proper CSP configuration
To include inline CSS in your app, follow the instructions on how to use custom content security policies Extend UI with custom options
Can use external CSS frameworks
Styling like margins, padding or overflow had to be applied to make the entire form look good. But on the other hand, Custom UI provided opportunities for a better user experience Why Use Atlassian Forge? Benefits, Pricing & Use Cases - Titanapps

Dashboard Implementation
Jira Dashboard Gadgets:

We've introduced the jira:dashboardGadget Forge module as part of the Early Access Program (EAP) Support for UI Kit Jira Dashboard Gadgets - Forge Announcements - The Atlassian Developer Community
jira:dashboardGadget supported with UI Kit 2 Forge UI Kit 2, dashboardGadget - Forge UI Kit and Custom UI - The Atlassian Developer Community but with limitations

Some Examples:
// manifest.yml configuration
modules:
jira:dashboardGadget: - key: beautiful-tabs-gadget
title: Beautiful Dashboard Tabs
description: Seamless tabbed interface for your Jira dashboard
resource: dashboard-resource
edit:
function: edit-gadget
resolver:
function: resolver

resources:

- key: dashboard-resource
  path: static/dashboard/build

permissions:
content:
styles: - 'unsafe-inline' - 'unsafe-hashes'
external:
fetch:
backend: - '\*.atlassian.com'

// src/resolvers/index.js - Backend resolver
import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

resolver.define('getTabs', async (req) => {
const { context } = req;
const gadgetKey = `tabs-${context.extension.gadgetConfiguration.id}`;

try {
const tabs = await storage.get(gadgetKey) || [];
return { success: true, tabs };
} catch (error) {
return { success: false, error: error.message };
}
});

resolver.define('saveTabs', async (req) => {
const { tabs, context } = req.payload;
const gadgetKey = `tabs-${context.extension.gadgetConfiguration.id}`;

try {
await storage.set(gadgetKey, tabs);
return { success: true };
} catch (error) {
return { success: false, error: error.message };
}
});

export const handler = resolver.getDefinitions();

// static/dashboard/src/App.jsx - Frontend Custom UI
import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import './styles/TabStyles.css';

const BeautifulTabs = () => {
const [activeTab, setActiveTab] = useState(0);
const [tabs, setTabs] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
loadTabs();
}, []);

const loadTabs = async () => {
try {
const response = await invoke('getTabs');
if (response.success) {
setTabs(response.tabs);
}
} catch (error) {
console.error('Failed to load tabs:', error);
} finally {
setLoading(false);
}
};

const saveTabs = async (newTabs) => {
try {
await invoke('saveTabs', { tabs: newTabs });
setTabs(newTabs);
} catch (error) {
console.error('Failed to save tabs:', error);
}
};

const addTab = () => {
const newTab = {
id: Date.now(),
title: `Tab ${tabs.length + 1}`,
content: 'New tab content...',
type: 'content'
};
saveTabs([...tabs, newTab]);
};

const updateTab = (tabId, updates) => {
const updatedTabs = tabs.map(tab =>
tab.id === tabId ? { ...tab, ...updates } : tab
);
saveTabs(updatedTabs);
};

const removeTab = (tabId) => {
const filteredTabs = tabs.filter(tab => tab.id !== tabId);
saveTabs(filteredTabs);
if (activeTab >= filteredTabs.length) {
setActiveTab(Math.max(0, filteredTabs.length - 1));
}
};

if (loading) {
return (

<div className="tab-loading">
<div className="loading-spinner"></div>
<span>Loading dashboard...</span>
</div>
);
}

return (

<div className="beautiful-tabs-container">
<div className="tab-header">
<div className="tab-list" role="tablist">
{tabs.map((tab, index) => (
<button
key={tab.id}
className={`tab-button ${activeTab === index ? 'active' : ''}`}
onClick={() => setActiveTab(index)}
role="tab"
aria-selected={activeTab === index}
aria-controls={`tabpanel-${tab.id}`} >
<span className="tab-title">{tab.title}</span>
<button
className="tab-close"
onClick={(e) => {
e.stopPropagation();
removeTab(tab.id);
}}
aria-label={`Close ${tab.title}`} >
×
</button>
</button>
))}
<button 
            className="tab-add-button"
            onClick={addTab}
            aria-label="Add new tab"
          > +
</button>
</div>
</div>

      <div className="tab-content">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            className={`tab-panel ${activeTab === index ? 'active' : ''}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== index}
          >
            <TabContent
              tab={tab}
              onUpdate={(updates) => updateTab(tab.id, updates)}
            />
          </div>
        ))}

        {tabs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No tabs yet</h3>
            <p>Create your first tab to get started</p>
            <button onClick={addTab} className="primary-button">
              Create Tab
            </button>
          </div>
        )}
      </div>
    </div>

);
};

const TabContent = ({ tab, onUpdate }) => {
const [isEditing, setIsEditing] = useState(false);
const [title, setTitle] = useState(tab.title);
const [content, setContent] = useState(tab.content);

const handleSave = () => {
onUpdate({ title, content });
setIsEditing(false);
};

if (isEditing) {
return (

<div className="tab-editor">
<div className="editor-header">
<input
type="text"
value={title}
onChange={(e) => setTitle(e.target.value)}
className="title-input"
placeholder="Tab title..."
/>
<div className="editor-actions">
<button onClick={handleSave} className="save-button">
Save
</button>
<button
onClick={() => setIsEditing(false)}
className="cancel-button" >
Cancel
</button>
</div>
</div>
<textarea
value={content}
onChange={(e) => setContent(e.target.value)}
className="content-editor"
placeholder="Tab content..."
rows={10}
/>
</div>
);
}

return (

<div className="tab-content-view">
<div className="content-header">
<h2>{tab.title}</h2>
<button
onClick={() => setIsEditing(true)}
className="edit-button"
aria-label="Edit tab" >
✏️
</button>
</div>
<div className="content-body">
{tab.content ? (
<div className="content-text">
{tab.content.split('\n').map((line, i) => (
<p key={i}>{line}</p>
))}
</div>
) : (
<div className="empty-content">
<p>This tab is empty. Click edit to add content.</p>
</div>
)}
</div>
</div>
);
};

export default BeautifulTabs;
css:
/_ static/dashboard/src/styles/TabStyles.css _/

/_ CSS Custom Properties for theming _/
:root {
--primary-color: #0052cc;
--primary-hover: #0747a6;
--secondary-color: #f4f5f7;
--border-color: #dfe1e6;
--text-primary: #172b4d;
--text-secondary: #5e6c84;
--success-color: #00875a;
--warning-color: #ff8b00;
--danger-color: #de350b;
--border-radius: 8px;
--transition: all 0.2s ease;
--shadow-light: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
}

/_ Dark mode support _/
[data-theme="dark"] {
--primary-color: #579dff;
--primary-hover: #85b8ff;
--secondary-color: #1d2125;
--border-color: #a1bdd914;
--text-primary: #b3d4ff;
--text-secondary: #9fadbc;
--success-color: #1f845a;
--warning-color: #f79009;
--danger-color: #f87462;
}

/_ Base container styling _/
.beautiful-tabs-container {
width: 100%;
min-height: 400px;
background: white;
border-radius: var(--border-radius);
box-shadow: var(--shadow-light);
overflow: hidden;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
font-size: 14px;
line-height: 1.5;
}

/_ Tab header with gradient background _/
.tab-header {
background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
border-bottom: 2px solid var(--border-color);
padding: 0;
position: relative;
overflow-x: auto;
overflow-y: hidden;
}

.tab-header::before {
content: '';
position: absolute;
bottom: 0;
left: 0;
right: 0;
height: 2px;
background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
opacity: 0.1;
}

/_ Tab list with smooth scrolling _/
.tab-list {
display: flex;
align-items: center;
min-height: 48px;
padding: 0 var(--spacing-md);
gap: var(--spacing-xs);
white-space: nowrap;
}

/_ Individual tab button styling _/
.tab-button {
display: flex;
align-items: center;
gap: var(--spacing-sm);
padding: var(--spacing-sm) var(--spacing-md);
background: transparent;
border: 1px solid transparent;
border-radius: var(--border-radius) var(--border-radius) 0 0;
color: var(--text-secondary);
cursor: pointer;
transition: var(--transition);
font-size: 14px;
font-weight: 500;
min-width: 120px;
max-width: 200px;
position: relative;
overflow: hidden;
}

.tab-button::before {
content: '';
position: absolute;
bottom: 0;
left: 0;
right: 0;
height: 2px;
background: var(--primary-color);
transform: scaleX(0);
transition: transform 0.2s ease;
}

.tab-button:hover {
background: rgba(0, 82, 204, 0.04);
color: var(--text-primary);
border-color: var(--border-color);
}

.tab-button:hover::before {
transform: scaleX(0.5);
}

.tab-button.active {
background: white;
color: var(--primary-color);
border-color: var(--border-color);
border-bottom-color: white;
font-weight: 600;
box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button.active::before {
transform: scaleX(1);
}

/_ Tab title with ellipsis for long text _/
.tab-title {
flex: 1;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

/_ Close button with hover effects _/
.tab-close {
width: 20px;
height: 20px;
border: none;
background: transparent;
border-radius: 50%;
color: var(--text-secondary);
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
font-size: 16px;
line-height: 1;
transition: var(--transition);
opacity: 0;
}

.tab-button:hover .tab-close {
opacity: 1;
}

.tab-close:hover {
background: var(--danger-color);
color: white;
transform: scale(1.1);
}

/_ Add tab button _/
.tab-add-button {
width: 32px;
height: 32px;
border: 2px dashed var(--border-color);
background: transparent;
border-radius: 50%;
color: var(--text-secondary);
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
font-size: 18px;
font-weight: bold;
transition: var(--transition);
margin-left: var(--spacing-sm);
}

.tab-add-button:hover {
border-color: var(--primary-color);
color: var(--primary-color);
background: rgba(0, 82, 204, 0.04);
transform: scale(1.05);
}

/_ Tab content area _/
.tab-content {
min-height: 350px;
padding: var(--spacing-lg);
background: white;
}

.tab-panel {
display: none;
animation: fadeIn 0.3s ease-in-out;
}

.tab-panel.active {
display: block;
}

@keyframes fadeIn {
from { opacity: 0; transform: translateY(10px); }
to { opacity: 1; transform: translateY(0); }
}

/_ Content view styling _/
.tab-content-view {
height: 100%;
}

.content-header {
display: flex;
align-items: center;
justify-content: between;
margin-bottom: var(--spacing-lg);
padding-bottom: var(--spacing-md);
border-bottom: 1px solid var(--border-color);
}

.content-header h2 {
flex: 1;
margin: 0;
color: var(--text-primary);
font-size: 20px;
font-weight: 600;
}

.edit-button {
padding: var(--spacing-sm);
background: transparent;
border: 1px solid var(--border-color);
border-radius: var(--border-radius);
cursor: pointer;
transition: var(--transition);
font-size: 16px;
}

.edit-button:hover {
background: var(--secondary-color);
border-color: var(--primary-color);
}

.content-body {
color: var(--text-primary);
line-height: 1.6;
}

.content-text p {
margin: 0 0 var(--spacing-md) 0;
}

.empty-content {
text-align: center;
padding: var(--spacing-xl);
color: var(--text-secondary);
font-style: italic;
}

/_ Editor styling _/
.tab-editor {
height: 100%;
}

.editor-header {
display: flex;
align-items: center;
gap: var(--spacing-md);
margin-bottom: var(--spacing-lg);
padding-bottom: var(--spacing-md);
border-bottom: 1px solid var(--border-color);
}

.title-input {
flex: 1;
padding: var(--spacing-sm) var(--spacing-md);
border: 1px solid var(--border-color);
border-radius: var(--border-radius);
font-size: 16px;
font-weight: 600;
transition: var(--transition);
}

.title-input:focus {
outline: none;
border-color: var(--primary-color);
box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
}

.editor-actions {
display: flex;
gap: var(--spacing-sm);
}

.save-button, .cancel-button, .primary-button {
padding: var(--spacing-sm) var(--spacing-md);
border: 1px solid;
border-radius: var(--border-radius);
cursor: pointer;
font-size: 14px;
font-weight: 500;
transition: var(--transition);
}

.save-button, .primary-button {
background: var(--primary-color);
border-color: var(--primary-color);
color: white;
}

.save-button:hover, .primary-button:hover {
background: var(--primary-hover);
border-color: var(--primary-hover);
transform: translateY(-1px);
box-shadow: var(--shadow-medium);
}

.cancel-button {
background: transparent;
border-color: var(--border-color);
color: var(--text-secondary);
}

.cancel-button:hover {
background: var(--secondary-color);
border-color: var(--text-secondary);
}

.content-editor {
width: 100%;
padding: var(--spacing-md);
border: 1px solid var(--border-color);
border-radius: var(--border-radius);
font-family: inherit;
font-size: 14px;
line-height: 1.5;
resize: vertical;
transition: var(--transition);
}

.content-editor:focus {
outline: none;
border-color: var(--primary-color);
box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
}

/_ Empty state styling _/
.empty-state {
text-align: center;
padding: var(--spacing-xl) var(--spacing-lg);
color: var(--text-secondary);
}

.empty-icon {
font-size: 48px;
margin-bottom: var(--spacing-md);
opacity: 0.7;
}

.empty-state h3 {
margin: 0 0 var(--spacing-sm) 0;
color: var(--text-primary);
font-size: 18px;
}

.empty-state p {
margin: 0 0 var(--spacing-lg) 0;
font-size: 14px;
}

/_ Loading state _/
.tab-loading {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: var(--spacing-xl);
color: var(--text-secondary);
}

.loading-spinner {
width: 32px;
height: 32px;
border: 3px solid var(--border-color);
border-top-color: var(--primary-color);
border-radius: 50%;
animation: spin 1s linear infinite;
margin-bottom: var(--spacing-md);
}

@keyframes spin {
to { transform: rotate(360deg); }
}

/_ Responsive design _/
@media (max-width: 768px) {
.beautiful-tabs-container {
border-radius: 0;
box-shadow: none;
}

.tab-content {
padding: var(--spacing-md);
}

.tab-button {
min-width: 100px;
padding: var(--spacing-sm);
}

.editor-header {
flex-direction: column;
align-items: stretch;
}

.editor-actions {
justify-content: flex-end;
}
}

/_ Accessibility enhancements _/
@media (prefers-reduced-motion: reduce) {

- {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  }
  }

/_ Focus indicators for keyboard navigation _/
.tab-button:focus,
.tab-add-button:focus,
.edit-button:focus,
.save-button:focus,
.cancel-button:focus,
.primary-button:focus {
outline: 2px solid var(--primary-color);
outline-offset: 2px;
}

/_ High contrast mode support _/
@media (prefers-contrast: high) {
.tab-button {
border: 2px solid;
}

.tab-button.active {
background: var(--primary-color);
color: white;
}
}
ntegration with Atlaskit
For maximum compatibility with Jira's design system:
Atlaskit components can be integrated but require proper CSS reset and styled-components configuration Atlassian Design System. Key steps:

Install required packages:

bashnpm install @atlaskit/css-reset @atlaskit/tokens @atlaskit/button @atlaskit/tabs

Configure CSP properly:

yamlpermissions:
content:
styles: - 'unsafe-inline' - 'unsafe-hashes'

Import Atlaskit CSS reset in your index.js:

javascriptimport '@atlaskit/css-reset';
Key Limitations to Know
UI Kit 2 Restrictions:

You won't have access to any of the underlying DOM, so features that depend on that will not work 10 Free Tailwind CSS UI Kits & Component Libraries 2024
Limited styling customization
Using TypeScript for resolver files causes deployment failures Help with Forge Custom UI AtlasKit and Styling - Forge - The Atlassian Developer Community

Custom UI Advantages:

Custom UI provided opportunities for a better user experience Why Use Atlassian Forge? Benefits, Pricing & Use Cases - Titanapps
Full control over styling and animations
Can integrate third-party libraries
Component and fix version fields could be added which change their selection values immediately Why Use Atlassian Forge? Benefits, Pricing & Use Cases - Titanapps

Recommendations

Use Custom UI for beautiful, highly interactive dashboard tabs
Leverage @forge/bridge for seamless communication between UI and backend
Implement proper CSP for Atlaskit integration
Focus on accessibility with proper ARIA attributes
Design for responsiveness across different screen sizes
Consider performance with lazy loading and efficient re-renders

The provided code examples show a complete implementation that creates beautiful, functional tabs that integrate seamlessly with Jira's ecosystem while maintaining excellent user experience and accessibility standards.
