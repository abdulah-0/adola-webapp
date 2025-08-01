#!/usr/bin/env node

// Test script for promotional banner section
console.log('🎯 Testing Promotional Banner Section Implementation\n');

const fs = require('fs');
const path = require('path');

// Check if promotional banner asset exists
console.log('🖼️ Checking promotional banner asset:');
const promoAssetPath = path.join(__dirname, 'assets/promotionalbanner-100.jpg');
if (fs.existsSync(promoAssetPath)) {
  console.log('✅ promotionalbanner-100.jpg exists');
} else {
  console.log('❌ promotionalbanner-100.jpg missing');
}

// Check SimpleAdolaWebsite promotional banner implementation
console.log('\n📱 Checking promotional banner implementation:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check promotional banner state
  if (content.includes('const [promoUri, setPromoUri] = useState(\'\');')) {
    console.log('✅ Promotional banner URI state added');
  } else {
    console.log('❌ Promotional banner URI state missing');
  }
  
  // Check asset loading
  if (content.includes('Asset.fromModule(require(\'../../assets/promotionalbanner-100.jpg\'))')) {
    console.log('✅ Promotional banner asset loading implemented');
  } else {
    console.log('❌ Promotional banner asset loading missing');
  }
  
  // Check fallback path
  if (content.includes('setPromoUri(\'/assets/promotionalbanner-100.jpg\');')) {
    console.log('✅ Promotional banner fallback path added');
  } else {
    console.log('❌ Promotional banner fallback path missing');
  }
  
  // Check section styles
  if (content.includes('promoBannerSectionStyle')) {
    console.log('✅ Promotional banner section styles added');
  } else {
    console.log('❌ Promotional banner section styles missing');
  }
  
  // Check container styles
  if (content.includes('promoBannerContainerStyle')) {
    console.log('✅ Promotional banner container styles added');
  } else {
    console.log('❌ Promotional banner container styles missing');
  }
  
  // Check image styles
  if (content.includes('promoBannerImageStyle')) {
    console.log('✅ Promotional banner image styles added');
  } else {
    console.log('❌ Promotional banner image styles missing');
  }
  
  // Check responsive sizing
  if (content.includes('maxHeight: screenWidth < 768 ? \'200px\' : \'300px\'')) {
    console.log('✅ Responsive max height (200px mobile, 300px desktop)');
  } else {
    console.log('❌ Responsive max height missing');
  }
  
  // Check object-fit cover
  if (content.includes("objectFit: 'cover'")) {
    console.log('✅ Object-fit cover for banner image');
  } else {
    console.log('❌ Object-fit cover missing');
  }
  
  // Check section rendering
  if (content.includes('Promotional Banner Section')) {
    console.log('✅ Promotional banner section rendering implemented');
  } else {
    console.log('❌ Promotional banner section rendering missing');
  }
  
  // Check conditional rendering
  if (content.includes('assetsLoaded && promoUri')) {
    console.log('✅ Conditional rendering based on asset loading');
  } else {
    console.log('❌ Conditional rendering missing');
  }
  
  // Check loading placeholder
  if (content.includes('Loading promotional banner...')) {
    console.log('✅ Loading placeholder implemented');
  } else {
    console.log('❌ Loading placeholder missing');
  }
  
  // Check error handling
  if (content.includes('Failed to load promotional banner')) {
    console.log('✅ Error handling for banner loading');
  } else {
    console.log('❌ Error handling missing');
  }
  
  // Check max width constraint
  if (content.includes('maxWidth: \'1200px\'')) {
    console.log('✅ Max width constraint (1200px)');
  } else {
    console.log('❌ Max width constraint missing');
  }
  
  // Check border radius
  if (content.includes('borderRadius: \'16px\'')) {
    console.log('✅ Border radius styling (16px)');
  } else {
    console.log('❌ Border radius styling missing');
  }
  
  // Check box shadow
  if (content.includes('boxShadow: \'0 8px 24px rgba(0,0,0,0.3)\'')) {
    console.log('✅ Box shadow styling');
  } else {
    console.log('❌ Box shadow styling missing');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 Promotional Banner Section Features:');
console.log('');
console.log('📋 SECTION STRUCTURE:');
console.log('  • No heading - just the banner image');
console.log('  • Positioned below Top Games section');
console.log('  • Full-width responsive container');
console.log('  • Centered with max-width constraint');
console.log('');
console.log('🖼️ IMAGE PROPERTIES:');
console.log('  • Source: promotionalbanner-100.jpg');
console.log('  • Object-fit: cover (fills container)');
console.log('  • Width: 100% (responsive)');
console.log('  • Height: auto with max height limits');
console.log('');
console.log('📱 RESPONSIVE BEHAVIOR:');
console.log('  • Mobile (< 768px):');
console.log('    - Section padding: 20px vertical, 15px horizontal');
console.log('    - Max height: 200px');
console.log('  • Desktop (≥ 768px):');
console.log('    - Section padding: 30px vertical, 30px horizontal');
console.log('    - Max height: 300px');
console.log('');
console.log('🎨 VISUAL STYLING:');
console.log('  • Border radius: 16px (rounded corners)');
console.log('  • Box shadow: Deep shadow for depth');
console.log('  • Max width: 1200px (prevents oversizing)');
console.log('  • Overflow hidden: Clean edges');
console.log('');
console.log('🔄 LOADING STATES:');
console.log('  • Loading placeholder while asset loads');
console.log('  • Error handling if image fails');
console.log('  • Conditional rendering based on asset state');
console.log('  • Fallback to direct path if needed');

console.log('\n🚀 What you should see:');
console.log('1. ✅ Promotional banner below Top Games section');
console.log('2. ✅ No heading - just the banner image');
console.log('3. ✅ Full-width responsive banner');
console.log('4. ✅ Rounded corners and shadow');
console.log('5. ✅ Proper scaling on different screen sizes');
console.log('6. ✅ Loading state while image loads');
console.log('7. ✅ Clean, professional appearance');

console.log('\n🔧 To test the promotional banner:');
console.log('1. Refresh browser: Ctrl+F5 or Cmd+Shift+R');
console.log('2. Scroll down below Top Games section');
console.log('3. Check banner displays properly');
console.log('4. Verify responsive sizing on different screens');
console.log('5. Test loading state (if visible)');
console.log('6. Check rounded corners and shadow');

console.log('\n📐 Sizing explanation:');
console.log('• width: 100% = Full container width');
console.log('• height: auto = Maintains aspect ratio');
console.log('• maxHeight = Responsive size limits');
console.log('• objectFit: cover = Fills container');
console.log('• maxWidth: 1200px = Prevents oversizing');

console.log('\n✨ Promotional banner section implementation completed!');
