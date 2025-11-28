/**
 * Script to generate PNG icons from SVG for PWA
 * Run with: node scripts/generate-icons.js
 * 
 * Note: This requires the 'sharp' package to be installed:
 * npm install sharp --save-dev
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Icon sizes to generate
const sizes = [192, 512];

// Base SVG template
const createSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#3b82f6"/>
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.5}" text-anchor="middle" fill="white">🧊</text>
</svg>
`;

async function generateIcons() {
  for (const size of sizes) {
    const svgBuffer = Buffer.from(createSvg(size));
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, `icon-${size}x${size}.png`));
      
      console.log(`Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`Failed to generate ${size}x${size} icon:`, error.message);
    }
  }
  
  // Generate Apple touch icon (180x180)
  const appleSvg = Buffer.from(createSvg(180));
  try {
    await sharp(appleSvg)
      .resize(180, 180)
      .png()
      .toFile(join(publicDir, 'apple-touch-icon.png'));
    
    console.log('Generated apple-touch-icon.png');
  } catch (error) {
    console.error('Failed to generate apple-touch-icon:', error.message);
  }
}

generateIcons().catch(console.error);
