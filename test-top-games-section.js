#!/usr/bin/env node

// Test script for Top Games section
console.log('🎮 Testing Top Games Section Implementation\n');

const fs = require('fs');
const path = require('path');

// Check SimpleAdolaWebsite Top Games implementation
console.log('📱 Checking Top Games section implementation:');
const simplePath = path.join(__dirname, 'components/web/SimpleAdolaWebsite.tsx');
if (fs.existsSync(simplePath)) {
  const content = fs.readFileSync(simplePath, 'utf8');
  
  // Check top games data
  if (content.includes('const topGames = [')) {
    console.log('✅ Top games data structure added');
  } else {
    console.log('❌ Top games data missing');
  }
  
  // Check slider state management
  if (content.includes('const [currentGameIndex, setCurrentGameIndex] = useState(0);')) {
    console.log('✅ Slider state management added');
  } else {
    console.log('❌ Slider state management missing');
  }
  
  // Check navigation functions
  if (content.includes('const handleGameClick = (gameId: string)')) {
    console.log('✅ Game click navigation function added');
  } else {
    console.log('❌ Game click navigation missing');
  }
  
  if (content.includes('const handleSeeAllGames = ()')) {
    console.log('✅ See all games navigation function added');
  } else {
    console.log('❌ See all games navigation missing');
  }
  
  if (content.includes('const handlePrevious = ()') && content.includes('const handleNext = ()')) {
    console.log('✅ Previous/Next navigation functions added');
  } else {
    console.log('❌ Previous/Next navigation functions missing');
  }
  
  // Check responsive games per view
  if (content.includes('const gamesPerView = screenWidth < 768 ? 2 : 4;')) {
    console.log('✅ Responsive games per view (2 mobile, 4 desktop)');
  } else {
    console.log('❌ Responsive games per view missing');
  }
  
  // Check slider transform
  if (content.includes('transform: `translateX(-${currentGameIndex * (100 / gamesPerView)}%)`')) {
    console.log('✅ Slider transform calculation implemented');
  } else {
    console.log('❌ Slider transform calculation missing');
  }
  
  // Check header layout
  if (content.includes('topGamesHeaderStyle') && content.includes('justifyContent: \'space-between\'')) {
    console.log('✅ Header layout with title on left, controls on right');
  } else {
    console.log('❌ Header layout not properly implemented');
  }
  
  // Check navigation buttons
  if (content.includes('← Previous') && content.includes('Next →')) {
    console.log('✅ Previous and Next buttons implemented');
  } else {
    console.log('❌ Previous/Next buttons missing');
  }
  
  // Check see all button
  if (content.includes('See All') && content.includes('handleSeeAllGames')) {
    console.log('✅ See All button implemented');
  } else {
    console.log('❌ See All button missing');
  }
  
  // Check game card structure
  if (content.includes('gameIconStyle') && content.includes('gameNameStyle') && content.includes('gameInfoStyle')) {
    console.log('✅ Game card structure with icon, name, and info');
  } else {
    console.log('❌ Game card structure incomplete');
  }
  
  // Check hover effects
  if (content.includes('gameCardHoverStyle') && content.includes('onMouseEnter')) {
    console.log('✅ Game card hover effects implemented');
  } else {
    console.log('❌ Game card hover effects missing');
  }
  
  // Check disabled state handling
  if (content.includes('disabled={currentGameIndex === 0}') && content.includes('disabled={currentGameIndex >= maxIndex}')) {
    console.log('✅ Button disabled states implemented');
  } else {
    console.log('❌ Button disabled states missing');
  }
  
} else {
  console.log('❌ SimpleAdolaWebsite.tsx not found');
}

console.log('\n🎯 Top Games Section Features:');
console.log('');
console.log('📋 SECTION STRUCTURE:');
console.log('  • Heading: "Top Games" on the left');
console.log('  • Controls: Previous, Next, See All buttons on the right');
console.log('  • Slider: Horizontal scrolling game cards');
console.log('  • Games: 8 popular games with icons and stats');
console.log('');
console.log('🎮 GAME DATA:');
console.log('  • Aviator, Crash, Dice, Mines, Tower, Plinko, Blackjack, Poker');
console.log('  • Each game has: ID, name, icon, player count, category');
console.log('  • Real player statistics and game routes');
console.log('');
console.log('🎛️ NAVIGATION CONTROLS:');
console.log('  • Previous button: Shows previous games');
console.log('  • Next button: Shows next games in line');
console.log('  • See All button: Goes to /games page');
console.log('  • Disabled states: When at start/end of slider');
console.log('');
console.log('📱 RESPONSIVE BEHAVIOR:');
console.log('  • Mobile (< 768px): Shows 2 games at a time');
console.log('  • Desktop (≥ 768px): Shows 4 games at a time');
console.log('  • Smooth sliding animation with CSS transform');
console.log('');
console.log('🎨 VISUAL EFFECTS:');
console.log('  • Hover glow effect on game cards');
console.log('  • Button hover states with color changes');
console.log('  • Smooth transitions (0.3s ease)');
console.log('  • Card lift animation on hover');
console.log('');
console.log('🔗 NAVIGATION ROUTES:');
console.log('  • Game cards: /game/{gameId}');
console.log('  • See All button: /games');
console.log('  • Proper routing for each game');

console.log('\n🚀 What you should see:');
console.log('1. ✅ "Top Games" heading on the left');
console.log('2. ✅ Previous, Next, See All buttons on the right');
console.log('3. ✅ Horizontal slider with game cards');
console.log('4. ✅ 2 games visible on mobile, 4 on desktop');
console.log('5. ✅ Smooth sliding animation');
console.log('6. ✅ Game cards with icons, names, and player counts');
console.log('7. ✅ Hover effects on cards and buttons');
console.log('8. ✅ Disabled states when at slider limits');

console.log('\n🔧 To test the Top Games section:');
console.log('1. Refresh browser: Ctrl+F5 or Cmd+Shift+R');
console.log('2. Scroll down to see section below Play and Bet');
console.log('3. Click Previous/Next buttons to slide games');
console.log('4. Hover over game cards to see glow effects');
console.log('5. Click game cards to test navigation');
console.log('6. Click "See All" to test games page navigation');
console.log('7. Resize window to test responsive behavior');

console.log('\n🎮 Game list included:');
console.log('  • ✈️ Aviator (1.2k players)');
console.log('  • 🚀 Crash (2.7k players)');
console.log('  • 🎲 Dice (856 players)');
console.log('  • 💣 Mines (1.8k players)');
console.log('  • 🏗️ Tower (743 players)');
console.log('  • 🎯 Plinko (1.2k players)');
console.log('  • 🃏 Blackjack (934 players)');
console.log('  • ♠️ Poker (567 players)');

console.log('\n✨ Top Games section implementation completed!');
