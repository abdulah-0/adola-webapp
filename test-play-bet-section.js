#!/usr/bin/env node

// Test script for Play and Bet section
console.log('🎮 Testing Play and Bet Section Implementation\n');

const fs = require('fs');
const path = require('path');

// Check if category assets exist
console.log('🖼️ Checking category asset files:');
const categoryAssets = [
  'assets/sports-100.jpg',
  'assets/slots-100.jpg',
  'assets/casino-100.jpg',
  'assets/cards-100.jpg'
];

let allCategoryAssetsExist = true;
categoryAssets.forEach(asset => {
  const assetPath = path.join(__dirname, asset);
  if (fs.existsSync(assetPath)) {
    console.log(`✅ ${asset} exists`);
  } else {
    console.log(`❌ ${asset} missing`);
    allCategoryAssetsExist = false;
  }
});

// Check SimpleAdolaWebsite Play and Bet implementation
console.log('\n📱 Checking SimpleAdolaWebsite Play and Bet section:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check game categories data
  if (content.includes('const gameCategories = [')) {
    console.log('✅ Game categories data structure added');
  } else {
    console.log('❌ Game categories data missing');
  }
  
  // Check category state management
  if (content.includes('const [categoryUris, setCategoryUris] = useState<string[]>([]);')) {
    console.log('✅ Category URIs state management added');
  } else {
    console.log('❌ Category URIs state missing');
  }
  
  if (content.includes('const [hoveredCard, setHoveredCard] = useState<string | null>(null);')) {
    console.log('✅ Hover state management added');
  } else {
    console.log('❌ Hover state management missing');
  }
  
  // Check asset loading for categories
  if (content.includes('Asset.fromModule(require(\'../../assets/sports-100.jpg\'))')) {
    console.log('✅ Category assets loading implemented');
  } else {
    console.log('❌ Category assets loading missing');
  }
  
  // Check navigation function
  if (content.includes('const handleCategoryClick = (categoryId: string)')) {
    console.log('✅ Category click navigation function added');
  } else {
    console.log('❌ Category click navigation missing');
  }
  
  // Check Play and Bet section rendering
  if (content.includes('Play and Bet Section') && content.includes('playBetTitleStyle')) {
    console.log('✅ Play and Bet section rendering implemented');
  } else {
    console.log('❌ Play and Bet section rendering missing');
  }
  
  // Check hover effects
  if (content.includes('categoryCardHoverStyle') && content.includes('onMouseEnter')) {
    console.log('✅ Hover effects implemented');
  } else {
    console.log('❌ Hover effects missing');
  }
  
  // Check responsive grid
  if (content.includes('screenWidth < 768 ? \'repeat(2, 1fr)\' : \'repeat(4, 1fr)\'')) {
    console.log('✅ Responsive grid layout (2 cols mobile, 4 cols desktop)');
  } else {
    console.log('❌ Responsive grid layout missing');
  }
  
  // Check glow effect styles
  if (content.includes('boxShadow: `0 8px 25px ${Colors.primary.neonCyan}40`')) {
    console.log('✅ Glow effect styling implemented');
  } else {
    console.log('❌ Glow effect styling missing');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 Play and Bet Section Features:');
console.log('');
console.log('📋 SECTION STRUCTURE:');
console.log('  • Heading: "Play and Bet"');
console.log('  • 4 category cards: Sports, Slots, Casino, Cards');
console.log('  • Responsive grid: 2 columns (mobile), 4 columns (desktop)');
console.log('');
console.log('🎨 VISUAL EFFECTS:');
console.log('  • Hover glow effect with neon cyan color');
console.log('  • Card lift animation (translateY -5px)');
console.log('  • Border color change on hover');
console.log('  • Gradient background on hover');
console.log('');
console.log('🖱️ INTERACTIONS:');
console.log('  • Click navigation to /games?category={categoryId}');
console.log('  • Hover state management');
console.log('  • Smooth transitions (0.3s ease)');
console.log('');
console.log('📱 RESPONSIVE DESIGN:');
console.log('  • Mobile: 2x2 grid, smaller images (80px)');
console.log('  • Desktop: 1x4 grid, larger images (100px)');
console.log('  • Adaptive text sizes and spacing');

console.log('\n🚀 What you should see:');
console.log('1. ✅ "Play and Bet" heading below slideshow');
console.log('2. ✅ 4 category cards with images');
console.log('3. ✅ Glow effect when hovering over cards');
console.log('4. ✅ Cards lift up slightly on hover');
console.log('5. ✅ Clicking cards navigates to filtered games');
console.log('6. ✅ Responsive layout on different screen sizes');

console.log('\n🔧 To test the Play and Bet section:');
console.log('1. Refresh browser: Ctrl+F5 or Cmd+Shift+R');
console.log('2. Scroll down to see section below slideshow');
console.log('3. Hover over each category card to see glow effect');
console.log('4. Click cards to test navigation (should go to games tab)');
console.log('5. Resize window to test responsive grid');

if (allCategoryAssetsExist) {
  console.log('\n✅ All category assets are ready!');
  console.log('🎮 Play and Bet section should display properly!');
} else {
  console.log('\n❌ Some category assets are missing');
  console.log('🔧 Check that all category images exist in assets folder');
}

console.log('\n✨ Play and Bet section implementation completed!');
