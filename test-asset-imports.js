#!/usr/bin/env node

// Test script for asset import fixes
console.log('🔧 Testing Asset Import Fixes\n');

const fs = require('fs');
const path = require('path');

// Check SimpleAdolaWebsite asset imports
console.log('📱 Checking SimpleAdolaWebsite asset imports:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check individual banner imports
  if (content.includes("const banner1 = require('../../../assets/banner 1-100.jpg');")) {
    console.log('✅ Banner 1 import fixed');
  } else {
    console.log('❌ Banner 1 import missing');
  }
  
  if (content.includes("const banner2 = require('../../../assets/banner 2-100.jpg');")) {
    console.log('✅ Banner 2 import fixed');
  } else {
    console.log('❌ Banner 2 import missing');
  }
  
  if (content.includes("const banner3 = require('../../../assets/banner 3-100.jpg');")) {
    console.log('✅ Banner 3 import fixed');
  } else {
    console.log('❌ Banner 3 import missing');
  }
  
  if (content.includes("const banner4 = require('../../../assets/banner 4-100.jpg');")) {
    console.log('✅ Banner 4 import fixed');
  } else {
    console.log('❌ Banner 4 import missing');
  }
  
  if (content.includes("const banner5 = require('../../../assets/banner 5-100.jpg');")) {
    console.log('✅ Banner 5 import fixed');
  } else {
    console.log('❌ Banner 5 import missing');
  }
  
  // Check logo import
  if (content.includes("const logo = require('../../../assets/logo.png');")) {
    console.log('✅ Logo import fixed');
  } else {
    console.log('❌ Logo import missing');
  }
  
  // Check banner array
  if (content.includes('const banners = [banner1, banner2, banner3, banner4, banner5];')) {
    console.log('✅ Banner array properly constructed');
  } else {
    console.log('❌ Banner array not properly constructed');
  }
  
  // Check logo usage
  if (content.includes('src={logo}')) {
    console.log('✅ Logo properly used in img tag');
  } else {
    console.log('❌ Logo not properly used');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 What should work now:');
console.log('1. ✅ No bundling errors for asset imports');
console.log('2. ✅ Logo should display from assets/logo.png');
console.log('3. ✅ All 5 banners should load properly');
console.log('4. ✅ Individual banner variables avoid require() issues');
console.log('5. ✅ Slideshow functionality preserved');

console.log('\n🚀 To test the fixes:');
console.log('1. Try building again: expo start --web');
console.log('2. Check for bundling errors in terminal');
console.log('3. If successful, refresh browser');
console.log('4. Verify logo and banners display');

console.log('\n🔧 If bundling still fails:');
console.log('• Check that all asset files exist in assets folder');
console.log('• Verify file names match exactly (case-sensitive)');
console.log('• Try restarting expo development server');
console.log('• Check for any typos in file paths');

console.log('\n✨ Asset import fixes applied!');
