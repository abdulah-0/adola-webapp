#!/usr/bin/env node

// Test script for ES6 import approach
console.log('🔧 Testing ES6 Import Approach for Assets\n');

const fs = require('fs');
const path = require('path');

// Check SimpleAdolaWebsite ES6 imports
console.log('📱 Checking SimpleAdolaWebsite ES6 imports:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check ES6 imports at top level
  if (content.includes("import logoImage from '../../assets/logo.png';")) {
    console.log('✅ Logo ES6 import: import logoImage from \'../../assets/logo.png\'');
  } else {
    console.log('❌ Logo ES6 import missing');
  }
  
  if (content.includes("import banner1Image from '../../assets/banner 1-100.jpg';")) {
    console.log('✅ Banner 1 ES6 import');
  } else {
    console.log('❌ Banner 1 ES6 import missing');
  }
  
  if (content.includes("import banner2Image from '../../assets/banner 2-100.jpg';")) {
    console.log('✅ Banner 2 ES6 import');
  } else {
    console.log('❌ Banner 2 ES6 import missing');
  }
  
  if (content.includes("import banner3Image from '../../assets/banner 3-100.jpg';")) {
    console.log('✅ Banner 3 ES6 import');
  } else {
    console.log('❌ Banner 3 ES6 import missing');
  }
  
  if (content.includes("import banner4Image from '../../assets/banner 4-100.jpg';")) {
    console.log('✅ Banner 4 ES6 import');
  } else {
    console.log('❌ Banner 4 ES6 import missing');
  }
  
  if (content.includes("import banner5Image from '../../assets/banner 5-100.jpg';")) {
    console.log('✅ Banner 5 ES6 import');
  } else {
    console.log('❌ Banner 5 ES6 import missing');
  }
  
  // Check usage
  if (content.includes('src={logoImage}')) {
    console.log('✅ Logo properly used: src={logoImage}');
  } else {
    console.log('❌ Logo not properly used');
  }
  
  if (content.includes('const banners = [banner1Image, banner2Image, banner3Image, banner4Image, banner5Image];')) {
    console.log('✅ Banner array properly constructed with imported images');
  } else {
    console.log('❌ Banner array not properly constructed');
  }
  
  // Check no require() statements
  if (!content.includes('require(')) {
    console.log('✅ No require() statements (using ES6 imports only)');
  } else {
    console.log('⚠️ Still contains require() statements');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 ES6 Import Approach Benefits:');
console.log('1. ✅ Better bundler compatibility');
console.log('2. ✅ Proper static analysis');
console.log('3. ✅ Works with file names containing spaces');
console.log('4. ✅ Standard React/React Native approach');
console.log('5. ✅ Better tree shaking support');

console.log('\n🚀 To test the import fix:');
console.log('1. Try building: expo start --web');
console.log('2. Should see no bundling errors');
console.log('3. If successful, refresh browser');
console.log('4. Verify logo and banners display properly');

console.log('\n🔧 If still having issues:');
console.log('• Check that TypeScript is configured for asset imports');
console.log('• Verify metro.config.js supports image imports');
console.log('• Try restarting expo development server');
console.log('• Check expo documentation for asset handling');

console.log('\n✨ ES6 import approach implemented!');
