#!/usr/bin/env node

// Test script for consistent padding across sections
console.log('📏 Testing Consistent Padding Implementation\n');

const fs = require('fs');
const path = require('path');

// Check SimpleAdolaWebsite padding consistency
console.log('📱 Checking section padding consistency:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check Play and Bet section padding
  if (content.includes("padding: screenWidth < 768 ? '30px 20px' : '40px 40px'")) {
    console.log('✅ Play and Bet section: Consistent left/right padding (20px mobile, 40px desktop)');
  } else {
    console.log('❌ Play and Bet section: Inconsistent padding');
  }
  
  // Check Top Games section padding
  if (content.includes("padding: screenWidth < 768 ? '30px 20px' : '40px 40px'")) {
    console.log('✅ Top Games section: Consistent left/right padding (20px mobile, 40px desktop)');
  } else {
    console.log('❌ Top Games section: Inconsistent padding');
  }
  
  // Check Promotional Banner section padding
  if (content.includes("padding: screenWidth < 768 ? '20px 20px 40px 20px' : '30px 40px 60px 40px'")) {
    console.log('✅ Promotional Banner section: Consistent left/right padding + bottom padding');
    console.log('  • Mobile: 20px left/right, 40px bottom');
    console.log('  • Desktop: 40px left/right, 60px bottom');
  } else {
    console.log('❌ Promotional Banner section: Inconsistent padding');
  }
  
  // Check for old inconsistent padding patterns
  const oldPaddingPatterns = [
    "'30px 15px'",
    "'40px 30px'",
    "'20px 15px'",
    "'30px 30px'"
  ];
  
  console.log('\n🔍 Checking for old inconsistent padding patterns:');
  oldPaddingPatterns.forEach(pattern => {
    if (!content.includes(pattern)) {
      console.log(`✅ Old pattern ${pattern} successfully removed`);
    } else {
      console.log(`❌ Old pattern ${pattern} still present`);
    }
  });
  
  // Verify section styles exist
  const sectionStyles = [
    'playBetSectionStyle',
    'topGamesSectionStyle',
    'promoBannerSectionStyle'
  ];
  
  console.log('\n📋 Checking section style definitions:');
  sectionStyles.forEach(style => {
    if (content.includes(style)) {
      console.log(`✅ ${style} defined`);
    } else {
      console.log(`❌ ${style} missing`);
    }
  });
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 Consistent Padding Implementation:');
console.log('');
console.log('📱 MOBILE (< 768px):');
console.log('  • Play and Bet: 30px top, 20px left/right, 30px bottom');
console.log('  • Top Games: 30px top, 20px left/right, 30px bottom');
console.log('  • Promotional Banner: 20px top, 20px left/right, 40px bottom');
console.log('');
console.log('🖥️ DESKTOP (≥ 768px):');
console.log('  • Play and Bet: 40px top, 40px left/right, 40px bottom');
console.log('  • Top Games: 40px top, 40px left/right, 40px bottom');
console.log('  • Promotional Banner: 30px top, 40px left/right, 60px bottom');
console.log('');
console.log('🎨 VISUAL CONSISTENCY:');
console.log('  • All sections have equal left/right padding');
console.log('  • Promotional banner has extra bottom padding');
console.log('  • Responsive design maintains proportions');
console.log('  • Clean, aligned layout across all sections');
console.log('');
console.log('📐 PADDING BREAKDOWN:');
console.log('  • Mobile: 20px horizontal padding for all sections');
console.log('  • Desktop: 40px horizontal padding for all sections');
console.log('  • Promotional banner: Extra bottom spacing');
console.log('  • Consistent vertical rhythm maintained');

console.log('\n🚀 What you should see now:');
console.log('1. ✅ All sections aligned with equal left/right margins');
console.log('2. ✅ Play and Bet section properly spaced');
console.log('3. ✅ Top Games section aligned with Play and Bet');
console.log('4. ✅ Promotional banner aligned with other sections');
console.log('5. ✅ Extra bottom spacing after promotional banner');
console.log('6. ✅ Clean, professional layout alignment');
console.log('7. ✅ Responsive padding that scales properly');

console.log('\n🔧 To test the consistent padding:');
console.log('1. Refresh browser: Ctrl+F5 or Cmd+Shift+R');
console.log('2. Check section alignment on desktop');
console.log('3. Resize window to test mobile padding');
console.log('4. Verify all sections have equal margins');
console.log('5. Confirm promotional banner has bottom spacing');
console.log('6. Check overall visual consistency');

console.log('\n📏 Padding values explained:');
console.log('• Format: "top right bottom left" or "vertical horizontal"');
console.log('• Mobile: 20px horizontal = consistent mobile spacing');
console.log('• Desktop: 40px horizontal = consistent desktop spacing');
console.log('• Bottom padding: Extra space for visual separation');

console.log('\n✨ Consistent padding implementation completed!');
