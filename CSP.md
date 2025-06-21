🔐 What is CSP in Jira Forge?
CSP (Content Security Policy) is a browser security feature that controls which resources (scripts, images, fonts, etc.) your app can load inside Jira's iframe sandbox. Atlassian enforces strict CSP rules to protect Jira users from malicious scripts.

When using Forge Custom UI, your app is rendered inside an iframe in Jira. This iframe comes with a locked-down CSP header — you can't modify it. You must play by Jira’s CSP rules, or you’ll get errors like:

css
Copy
Edit
Refused to load the script/style/image... because it violates the following Content Security Policy directive...
✅ What is Allowed by Default
Inside your Forge Custom UI app, you can:

Load your own static frontend files (JS/CSS/images) from the resources folder declared in your manifest.yml

Use Atlaskit components and load fonts/styles bundled in your app

Fetch Jira data using requestJira() or resolver-based API calls

Use inline styles via CSS-in-JS (e.g. styled-components, emotion) — these are whitelisted by Atlassian

Load images from Atlassian domains (e.g. _.atlassian.net, _.cloudfront.net used by Jira)

🚫 What is Blocked by CSP (Unless Whitelisted)
You cannot do the following out of the box:

Blocked Action Notes
fetch() or axios to an external URL Blocked unless that domain is listed in permissions.external in your manifest

<script src="https://cdn.example.com">	All remote scripts are blocked
Inline <script> or eval()	Blocked for XSS protection
Loading external fonts (e.g. Google Fonts)	Blocked unless self-hosted or allowed in Forge manifest
Embedding iframes from other domains	Only *.atlassian.net iframes work
External CSS from a CDN	Same restriction as scripts

✅ How to Work Around CSP in Forge
Remote Calls – If you need to call an external API:

yaml
Copy
Edit
permissions:
  external:
    fetch:
      backend:
        - https://api.example.com
Then in your resolver:

js
Copy
Edit
const res = await api.fetch('https://api.example.com/data');
Loading Custom Fonts/Images – You must bundle them in your static folder (e.g. static/assets/) or use Atlaskit-friendly fonts.

Scripts or Libraries – Download and bundle third-party JS libraries in your app’s build (Webpack or Vite). You cannot include remote scripts.

CDNs and Fonts – Forge does not allow use of external CDNs like Google Fonts or unapproved image sources. Host them locally or inline.

Use dangerouslySetInnerHTML carefully – This React method will work for trusted HTML content, but avoid user-generated HTML due to XSS risk.

🛠 Debugging CSP Errors
Open your browser console, look for messages like:

pgsql
Copy
Edit
Refused to connect to "https://fonts.googleapis.com" because it violates the CSP
Check if you're loading fonts, scripts, or images from blocked domains.

If you're using fetch() in the frontend to a remote URL, move that call to a backend resolver and use api.fetch.

✅ Best Practices
Always bundle all third-party dependencies (JS, CSS, fonts) during your app build.

Only use requestJira or resolver-based API calls to talk to Jira.

Avoid <script>, eval, or injecting raw JavaScript into your app.

When styling, use CSS-in-JS libraries like Emotion or Styled Components (works well with Atlaskit).

Keep your iframe UI lightweight — avoid bloated scripts or huge font libraries.

Use remote resource permissions only when absolutely needed, and always specify the full URL in manifest.yml.
