// This script generates placeholder PWA icons
// In production, replace these with actual branded icons

const fs = require('fs');
const path = require('path');

// SVG template for icon
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="#ffffff"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size/4}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#000000">TS</text>
</svg>
`;

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icons
iconSizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated ${filename}`);
});

// Generate maskable icons (with padding)
[192, 512].forEach(size => {
  const svg = createSvgIcon(size * 0.8); // 80% of size for safe area
  const maskableSvg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <g transform="translate(${size * 0.1}, ${size * 0.1})">
    ${svg}
  </g>
</svg>
  `;
  const filename = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}-maskable.svg`);
  fs.writeFileSync(filename, maskableSvg);
  console.log(`Generated ${filename}`);
});

// Note for production
console.log('\n⚠️  These are placeholder icons. For production:');
console.log('1. Create proper PNG icons with your brand');
console.log('2. Use a tool like https://maskable.app to create maskable icons');
console.log('3. Optimize with tools like pngquant or optipng');