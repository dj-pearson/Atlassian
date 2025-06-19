# Icon Configuration Options

## Available Icon Files

### SVG Icons (Vector - Scalable)

- `static/app-icon.svg` - Full marketplace icon (512x512 equivalent)
- `static/tab-icon24.svg` - Optimized 24x24 tab icon (your custom design)
- `static/tab-icon.svg` - Simple 24x24 tab icon (basic design)

### PNG Icons (Raster - Fixed Size)

- `static/icon.png` - Full-size PNG version of your icon
- `static/icon-24.png` - 24x24 PNG version for tabs

## Current Configuration

**Manifest.yml currently uses**: `./static/tab-icon24.svg`

## Troubleshooting Icon Display Issues

### If SVG icons don't display in Jira tabs:

1. **Try PNG format** (more universally supported):

   ```yaml
   icon: ./static/icon-24.png
   ```

2. **Try different SVG** (simpler design):

   ```yaml
   icon: ./static/tab-icon.svg
   ```

3. **Verify SVG format** - Ensure proper XML declaration and namespace

### Icon Requirements (Based on Atlassian Documentation)

**For Jira Tabs:**

- Recommended: 24x24 pixels
- Format: SVG (preferred) or PNG
- Should be simple and recognizable at small sizes

**For Marketplace:**

- Size: 512x512 pixels
- Format: PNG required for marketplace listings
- High contrast and clear at various sizes

**For Favicons:**

- Size: 32x32 pixels
- Format: PNG only
- 8-bit color depth

## Testing Different Options

To test different icons, update the manifest.yml:

```yaml
modules:
  jira:projectPage:
    - key: team-capacity-dashboard
      title: Team Capacity Dashboard
      icon: ./static/[ICON-FILE-NAME] # Change this line
      render: native
      resource: capacity-dashboard
```

Then deploy with:

```bash
forge deploy -e production
```

## Current Status

- ✅ Custom app-icon.svg (your design)
- ✅ Custom tab-icon24.svg (your design, 24x24)
- ✅ PNG backups available (icon.png, icon-24.png)
- 🔄 Testing tab-icon24.svg in production

If the current SVG doesn't display, we can quickly switch to PNG format.
