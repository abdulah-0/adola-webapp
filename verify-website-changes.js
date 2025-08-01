#!/usr/bin/env node

// Verification script for Adola website changes
console.log('🔍 Verifying Adola Website Changes...\n');

const fs = require('fs');
const path = require('path');

// Check if all new component files exist
const newComponents = [
  'components/web/AdolaHeroSection.tsx',
  'components/web/AdolaFeaturedGames.tsx',
  'components/web/AdolaPromoBanner.tsx',
  'components/web/AdolaGameStats.tsx',
  'components/web/AdolaFooter.tsx',
  'components/web/AdolaWebsite.tsx'
];

console.log('📁 Checking new component files:');
let allFilesExist = true;
newComponents.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
});

// Check WebHomepage integration
console.log('\n🏠 Checking WebHomepage integration:');
const webHomePath = path.join(__dirname, 'components/web/WebHomepage.tsx');
if (fs.existsSync(webHomePath)) {
  const content = fs.readFileSync(webHomePath, 'utf8');
  
  if (content.includes('AdolaWebsite')) {
    console.log('✅ AdolaWebsite component imported');
  } else {
    console.log('❌ AdolaWebsite component NOT imported');
  }
  
  if (content.includes('TEMPORARY: Show new Adola website')) {
    console.log('✅ Temporary override active (should show new website)');
  } else {
    console.log('❌ Temporary override NOT active');
  }
} else {
  console.log('❌ WebHomepage.tsx not found');
}

// Check if main index.tsx uses WebHomepage for web
console.log('\n📱 Checking main index.tsx:');
const indexPath = path.join(__dirname, 'app/(tabs)/index.tsx');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  
  if (content.includes('if (isWeb)') && content.includes('WebHomepage')) {
    console.log('✅ Web routing to WebHomepage is active');
  } else {
    console.log('❌ Web routing NOT properly configured');
  }
} else {
  console.log('❌ app/(tabs)/index.tsx not found');
}

// Check verification banner in AdolaWebsite
console.log('\n🎯 Checking verification banner:');
const adolaWebsitePath = path.join(__dirname, 'components/web/AdolaWebsite.tsx');
if (fs.existsSync(adolaWebsitePath)) {
  const content = fs.readFileSync(adolaWebsitePath, 'utf8');
  
  if (content.includes('NEW ADOLA WEBSITE LOADED')) {
    console.log('✅ Verification banner is present');
  } else {
    console.log('❌ Verification banner NOT found');
  }
  
  if (content.includes('testSection')) {
    console.log('✅ Test section is present');
  } else {
    console.log('❌ Test section NOT found');
  }
} else {
  console.log('❌ AdolaWebsite.tsx not found');
}

console.log('\n🚀 Instructions to see the changes:');
console.log('1. Make sure you are running the web version: expo start --web');
console.log('2. Open your browser and go to the localhost URL');
console.log('3. You should see a bright cyan banner saying "NEW ADOLA WEBSITE LOADED!"');
console.log('4. Below that should be the new Adola website content');

console.log('\n🔧 Troubleshooting:');
console.log('- If you don\'t see changes, try clearing browser cache (Ctrl+F5)');
console.log('- Make sure you\'re viewing the web version, not mobile');
console.log('- Check browser console for any JavaScript errors');
console.log('- Try restarting the expo development server');

console.log('\n📋 What you should see:');
console.log('- Bright cyan banner at the top');
console.log('- "🎮 Adola Gaming Platform" title');
console.log('- "Premium Mobile Gaming Experience" subtitle');
console.log('- Description mentioning 19 games, PKR 50 bonus, 5% deposit bonus');
console.log('- New hero section, promotional banners, game listings, etc.');

if (allFilesExist) {
  console.log('\n✅ All component files are present!');
  console.log('🎯 The website should now show the updated Adola content.');
} else {
  console.log('\n❌ Some component files are missing!');
  console.log('🔧 Please check the file paths and ensure all components were created.');
}

console.log('\n🎮 Happy testing!');
