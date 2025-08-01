#!/usr/bin/env node

// Test script for correct asset paths
console.log('🔧 Testing Correct Asset Paths\n');

const fs = require('fs');
const path = require('path');

// Check if the paths are correct from components/web/ to assets/
console.log('📁 Checking path structure:');
console.log('From: components/web/SimpleAdolaWebsite.tsx');
console.log('To: assets/');
console.log('Correct path: ../../assets/\n');

// Check SimpleAdolaWebsite asset imports
console.log('📱 Checking SimpleAdolaWebsite asset imports:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check logo import
  if (content.includes("const logo = require('../../assets/logo.png');")) {
    console.log('✅ Logo path corrected: ../../assets/logo.png');
  } else {
    console.log('❌ Logo path still incorrect');
  }
  
  // Check banner imports
  if (content.includes("const banner1 = require('../../assets/banner 1-100.jpg');")) {
    console.log('✅ Banner 1 path corrected: ../../assets/banner 1-100.jpg');
  } else {
    console.log('❌ Banner 1 path still incorrect');
  }
  
  if (content.includes("const banner2 = require('../../assets/banner 2-100.jpg');")) {
    console.log('✅ Banner 2 path corrected');
  } else {
    console.log('❌ Banner 2 path still incorrect');
  }
  
  if (content.includes("const banner3 = require('../../assets/banner 3-100.jpg');")) {
    console.log('✅ Banner 3 path corrected');
  } else {
    console.log('❌ Banner 3 path still incorrect');
  }
  
  if (content.includes("const banner4 = require('../../assets/banner 4-100.jpg');")) {
    console.log('✅ Banner 4 path corrected');
  } else {
    console.log('❌ Banner 4 path still incorrect');
  }
  
  if (content.includes("const banner5 = require('../../assets/banner 5-100.jpg');")) {
    console.log('✅ Banner 5 path corrected');
  } else {
    console.log('❌ Banner 5 path still incorrect');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

// Verify actual file existence
console.log('\n📂 Verifying asset files exist:');
const assetFiles = [
  'assets/logo.png',
  'assets/banner 1-100.jpg',
  'assets/banner 2-100.jpg',
  'assets/banner 3-100.jpg',
  'assets/banner 4-100.jpg',
  'assets/banner 5-100.jpg'
];

assetFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n🎯 Path structure verification:');
console.log('components/');
console.log('  └── web/');
console.log('      └── SimpleAdolaWebsite.tsx');
console.log('assets/');
console.log('  ├── logo.png');
console.log('  ├── banner 1-100.jpg');
console.log('  ├── banner 2-100.jpg');
console.log('  ├── banner 3-100.jpg');
console.log('  ├── banner 4-100.jpg');
console.log('  └── banner 5-100.jpg');

console.log('\n🚀 To test the path fix:');
console.log('1. Try building: expo start --web');
console.log('2. Check for bundling errors');
console.log('3. If successful, refresh browser');
console.log('4. Verify logo and banners display');

console.log('\n✨ Asset paths corrected to ../../assets/!');
