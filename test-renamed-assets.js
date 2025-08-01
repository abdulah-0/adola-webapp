#!/usr/bin/env node

// Test script for renamed assets
console.log('🔧 Testing Renamed Assets\n');

const fs = require('fs');
const path = require('path');

// Check if renamed assets exist
console.log('📂 Checking renamed asset files:');
const renamedAssets = [
  'assets/logo.png',
  'assets/banner1.jpg',
  'assets/banner2.jpg',
  'assets/banner3.jpg',
  'assets/banner4.jpg',
  'assets/banner5.jpg'
];

let allAssetsExist = true;
renamedAssets.forEach(asset => {
  const assetPath = path.join(__dirname, asset);
  if (fs.existsSync(assetPath)) {
    console.log(`✅ ${asset} exists`);
  } else {
    console.log(`❌ ${asset} missing`);
    allAssetsExist = false;
  }
});

// Check old assets are gone
console.log('\n🗑️ Checking old assets are removed:');
const oldAssets = [
  'assets/banner 1-100.jpg',
  'assets/banner 2-100.jpg',
  'assets/banner 3-100.jpg',
  'assets/banner 4-100.jpg',
  'assets/banner 5-100.jpg'
];

oldAssets.forEach(asset => {
  const assetPath = path.join(__dirname, asset);
  if (!fs.existsSync(assetPath)) {
    console.log(`✅ ${asset} removed (good)`);
  } else {
    console.log(`⚠️ ${asset} still exists (should be removed)`);
  }
});

// Check SimpleAdolaWebsite imports
console.log('\n📱 Checking SimpleAdolaWebsite imports:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check updated imports
  if (content.includes("import logoImage from '../../assets/logo.png';")) {
    console.log('✅ Logo import: ../../assets/logo.png');
  } else {
    console.log('❌ Logo import incorrect');
  }
  
  if (content.includes("import banner1Image from '../../assets/banner1.jpg';")) {
    console.log('✅ Banner 1 import: ../../assets/banner1.jpg');
  } else {
    console.log('❌ Banner 1 import incorrect');
  }
  
  if (content.includes("import banner2Image from '../../assets/banner2.jpg';")) {
    console.log('✅ Banner 2 import: ../../assets/banner2.jpg');
  } else {
    console.log('❌ Banner 2 import incorrect');
  }
  
  if (content.includes("import banner3Image from '../../assets/banner3.jpg';")) {
    console.log('✅ Banner 3 import: ../../assets/banner3.jpg');
  } else {
    console.log('❌ Banner 3 import incorrect');
  }
  
  if (content.includes("import banner4Image from '../../assets/banner4.jpg';")) {
    console.log('✅ Banner 4 import: ../../assets/banner4.jpg');
  } else {
    console.log('❌ Banner 4 import incorrect');
  }
  
  if (content.includes("import banner5Image from '../../assets/banner5.jpg';")) {
    console.log('✅ Banner 5 import: ../../assets/banner5.jpg');
  } else {
    console.log('❌ Banner 5 import incorrect');
  }
  
  // Check no old imports with spaces
  if (!content.includes('banner 1-100.jpg') && !content.includes('banner 2-100.jpg')) {
    console.log('✅ No old imports with spaces found');
  } else {
    console.log('❌ Still contains old imports with spaces');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 Asset renaming summary:');
console.log('OLD NAMES (with spaces):');
console.log('  • banner 1-100.jpg → banner1.jpg');
console.log('  • banner 2-100.jpg → banner2.jpg');
console.log('  • banner 3-100.jpg → banner3.jpg');
console.log('  • banner 4-100.jpg → banner4.jpg');
console.log('  • banner 5-100.jpg → banner5.jpg');
console.log('  • logo.png (unchanged)');

console.log('\nNEW NAMES (no spaces):');
console.log('  • banner1.jpg');
console.log('  • banner2.jpg');
console.log('  • banner3.jpg');
console.log('  • banner4.jpg');
console.log('  • banner5.jpg');
console.log('  • logo.png');

console.log('\n🚀 To test the renamed assets:');
console.log('1. Try building: expo start --web');
console.log('2. Should see no bundling errors');
console.log('3. Refresh browser');
console.log('4. Check navbar for Adola logo');
console.log('5. Verify banner slideshow displays all 5 banners');

if (allAssetsExist) {
  console.log('\n✅ All renamed assets are ready!');
  console.log('🎮 Logo and banners should now display properly!');
} else {
  console.log('\n❌ Some assets are missing - check file operations');
}

console.log('\n✨ Asset renaming completed!');
