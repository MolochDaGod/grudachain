#!/usr/bin/env node

/**
 * Favicon Generator Script
 * Generates PNG favicons from the SVG source
 * 
 * Usage:
 *   npm install sharp
 *   node generate-favicons.js
 */

const fs = require('fs');
const path = require('path');

console.log('📦 Favicon Generator for grudachain');
console.log('=====================================\n');

// Check if sharp is installed
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.error('❌ Error: sharp module not found');
    console.error('Please install it by running: npm install sharp\n');
    process.exit(1);
}

const svgPath = path.join(__dirname, 'favicon.svg');
const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.ico', size: 32 }
];

async function generateFavicons() {
    try {
        // Check if SVG exists
        if (!fs.existsSync(svgPath)) {
            console.error('❌ Error: favicon.svg not found');
            process.exit(1);
        }

        console.log('✅ Found favicon.svg\n');
        console.log('Generating favicon files...\n');

        // Generate each size
        for (const { name, size } of sizes) {
            const outputPath = path.join(__dirname, name);
            
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            
            console.log(`✅ Generated ${name} (${size}x${size})`);
        }

        console.log('\n🎉 All favicons generated successfully!');
        console.log('\nGenerated files:');
        sizes.forEach(({ name }) => console.log(`  - ${name}`));
        
    } catch (error) {
        console.error('❌ Error generating favicons:', error.message);
        process.exit(1);
    }
}

generateFavicons();
