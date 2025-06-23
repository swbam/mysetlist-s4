# Converting SVG Icons to PNG

The PWA currently uses SVG placeholder icons. For production, you should convert these to PNG format for better compatibility across all devices.

## Recommended Tools

1. **Online Converters:**
   - [CloudConvert](https://cloudconvert.com/svg-to-png)
   - [Convertio](https://convertio.co/svg-png/)
   - [SVG to PNG](https://svgtopng.com/)

2. **Command Line Tools:**
   ```bash
   # Using ImageMagick
   convert icon-192x192.svg icon-192x192.png
   
   # Using Inkscape
   inkscape icon-192x192.svg --export-type=png --export-filename=icon-192x192.png
   
   # Using rsvg-convert
   rsvg-convert -w 192 -h 192 icon-192x192.svg > icon-192x192.png
   ```

3. **Node.js Script:**
   ```bash
   npm install sharp
   # Then use sharp to convert SVG to PNG programmatically
   ```

## Icon Requirements

### Standard Icons
- Sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- Format: PNG with transparency
- Purpose: "any"

### Maskable Icons
- Sizes: 192x192, 512x512
- Format: PNG with safe area (icon content within 80% of the canvas)
- Purpose: "maskable"
- Test at: https://maskable.app

### Apple Touch Icons
- Size: 180x180 (for apple-touch-icon)
- Format: PNG without transparency
- Square corners (iOS will apply rounded corners)

## After Conversion

1. Replace all `.svg` references in `/public/manifest.json` with `.png`
2. Update the apple-touch-icon link in layout.tsx
3. Optimize PNGs using tools like:
   - [TinyPNG](https://tinypng.com/)
   - [ImageOptim](https://imageoptim.com/)
   - `pngquant` CLI tool

## Creating Screenshots

For the app store listing, create screenshots:

### Desktop (1280x720)
1. Homepage view
2. Shows listing
3. Artist profile
4. Setlist builder

### Mobile (720x1280)
1. Homepage mobile view
2. Shows listing mobile
3. Artist profile mobile
4. Setlist mobile view

Save these in `/public/screenshots/` and uncomment the screenshots section in manifest.json.