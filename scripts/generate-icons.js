// scripts/generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Define icon sizes
const sizes = [16, 48, 128];

// Path to the SVG icon
const svgPath = path.join(__dirname, '..', 'extension', 'icons', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Generate PNG icons for each size
async function generateIcons() {
  try {
    // Generate PNG files
    for (const size of sizes) {
      const outputPath = path.join(__dirname, '..', 'extension', 'icons', `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${outputPath}`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
