// Simple Adola Website Component - Guaranteed to scroll on web
import React, { useState, useEffect } from 'react';
import { Colors } from '../../constants/Colors';
import { Asset } from 'expo-asset';

interface SimpleAdolaWebsiteProps {
  onSignOut?: () => void;
  playerName?: string;
}

export default function SimpleAdolaWebsite({ onSignOut, playerName = 'Player' }: SimpleAdolaWebsiteProps) {
  // Game categories data
  const gameCategories = [
    {
      id: 'sports',
      name: 'Sports',
      description: 'Bet on your favorite sports',
      route: '/games?category=sports'
    },
    {
      id: 'slots',
      name: 'Slots',
      description: 'Spin and win big jackpots',
      route: '/games?category=slots'
    },
    {
      id: 'casino',
      name: 'Casino',
      description: 'Classic casino games',
      route: '/games?category=casino'
    },
    {
      id: 'cards',
      name: 'Cards',
      description: 'Poker, Blackjack & more',
      route: '/games?category=cards'
    }
  ];

  // Top games data
  const topGames = [
    {
      id: 'aviator',
      name: 'Aviator',
      icon: '✈️',
      players: '1.2k',
      category: 'Crash',
      route: '/game/aviator'
    },
    {
      id: 'crash',
      name: 'Crash',
      icon: '🚀',
      players: '2.7k',
      category: 'Crash',
      route: '/game/crash'
    },
    {
      id: 'dice',
      name: 'Dice',
      icon: '🎲',
      players: '856',
      category: 'Casino',
      route: '/game/dice'
    },
    {
      id: 'mines',
      name: 'Mines',
      icon: '💣',
      players: '1.8k',
      category: 'Casino',
      route: '/game/mines'
    },
    {
      id: 'tower',
      name: 'Tower',
      icon: '🏗️',
      players: '743',
      category: 'Casino',
      route: '/game/tower'
    },
    {
      id: 'plinko',
      name: 'Plinko',
      icon: '🎯',
      players: '1.2k',
      category: 'Casino',
      route: '/game/plinko'
    },
    {
      id: 'blackjack',
      name: 'Blackjack',
      icon: '🃏',
      players: '934',
      category: 'Cards',
      route: '/game/blackjack'
    },
    {
      id: 'poker',
      name: 'Poker',
      icon: '♠️',
      players: '567',
      category: 'Cards',
      route: '/game/poker'
    }
  ];
  const [currentBanner, setCurrentBanner] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [logoUri, setLogoUri] = useState('');
  const [bannerUris, setBannerUris] = useState<string[]>([]);
  const [categoryUris, setCategoryUris] = useState<string[]>([]);
  const [promoUri, setPromoUri] = useState('');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // Navigation function for category cards
  const handleCategoryClick = (categoryId: string) => {
    // Navigate to games tab with category filter
    if (typeof window !== 'undefined') {
      window.location.href = `/games?category=${categoryId}`;
    }
  };

  // Navigation functions for top games slider
  const handleGameClick = (gameId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/game/${gameId}`;
    }
  };

  const handleSeeAllGames = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/games';
    }
  };

  const gamesPerView = screenWidth < 768 ? 2 : 4;
  const maxIndex = Math.max(0, topGames.length - gamesPerView);

  const handlePrevious = () => {
    setCurrentGameIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentGameIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Handle screen resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Load assets using Expo Asset API
  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Load logo
        const logoAsset = Asset.fromModule(require('../../assets/logo.png'));
        await logoAsset.downloadAsync();
        setLogoUri(logoAsset.uri);

        // Load banners
        const bannerAssets = [
          Asset.fromModule(require('../../assets/banner1.jpg')),
          Asset.fromModule(require('../../assets/banner2.jpg')),
          Asset.fromModule(require('../../assets/banner3.jpg')),
          Asset.fromModule(require('../../assets/banner4.jpg')),
          Asset.fromModule(require('../../assets/banner5.jpg')),
        ];

        // Load category images
        const categoryAssets = [
          Asset.fromModule(require('../../assets/sports-100.jpg')),
          Asset.fromModule(require('../../assets/slots-100.jpg')),
          Asset.fromModule(require('../../assets/casino-100.jpg')),
          Asset.fromModule(require('../../assets/cards-100.jpg')),
        ];

        // Load promotional banner
        const promoAsset = Asset.fromModule(require('../../assets/promotionalbanner-100.jpg'));

        await Promise.all([
          ...bannerAssets.map(asset => asset.downloadAsync()),
          ...categoryAssets.map(asset => asset.downloadAsync()),
          promoAsset.downloadAsync()
        ]);

        setBannerUris(bannerAssets.map(asset => asset.uri));
        setCategoryUris(categoryAssets.map(asset => asset.uri));
        setPromoUri(promoAsset.uri);
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Error loading assets:', error);
        // Fallback to direct paths
        setLogoUri('/assets/logo.png');
        setBannerUris([
          '/assets/banner1.jpg',
          '/assets/banner2.jpg',
          '/assets/banner3.jpg',
          '/assets/banner4.jpg',
          '/assets/banner5.jpg'
        ]);
        setCategoryUris([
          '/assets/sports-100.jpg',
          '/assets/slots-100.jpg',
          '/assets/casino-100.jpg',
          '/assets/cards-100.jpg'
        ]);
        setPromoUri('/assets/promotionalbanner-100.jpg');
        setAssetsLoaded(true);
      }
    };

    loadAssets();
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    if (!assetsLoaded || bannerUris.length === 0) return;

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerUris.length);
    }, 4000); // Change banner every 4 seconds

    return () => clearInterval(interval);
  }, [assetsLoaded, bannerUris.length]);
  
  const containerStyle = {
    backgroundColor: Colors.primary.background,
    color: Colors.primary.text,
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    margin: 0,
    padding: 0,
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100vw',
    overflowX: 'hidden' as const,
    overflowY: 'auto' as const,
    boxSizing: 'border-box' as const
  };

  const sectionStyle = {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const navbarStyle = {
    backgroundColor: Colors.primary.surface,
    borderBottom: `2px solid ${Colors.primary.border}`,
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    minHeight: '80px',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden' as const
  };

  const logoStyle = {
    height: screenWidth < 768 ? '50px' : '70px',
    width: 'auto',
    maxWidth: screenWidth < 768 ? '150px' : '250px'
  };

  const userSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  const playerNameStyle = {
    color: Colors.primary.text,
    fontSize: '16px',
    fontWeight: 'bold'
  };

  const signOutButtonStyle = {
    backgroundColor: Colors.primary.hotPink,
    color: Colors.primary.background,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  };

  const slideshowStyle = {
    position: 'relative' as const,
    width: '100%',
    minHeight: screenWidth < 768 ? '150px' : '200px',
    maxHeight: screenWidth < 768 ? '250px' : '400px',
    overflow: 'hidden',
    borderRadius: '12px',
    margin: '20px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.surface
  };

  const bannerImageStyle = {
    maxWidth: '100%',
    maxHeight: screenWidth < 768 ? '250px' : '400px',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain' as const,
    borderRadius: '12px',
    display: 'block'
  };

  const dotsContainerStyle = {
    position: 'absolute' as const,
    bottom: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px'
  };

  const dotStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid white',
    cursor: 'pointer'
  };

  const activeDotStyle = {
    ...dotStyle,
    backgroundColor: Colors.primary.neonCyan
  };

  const inactiveDotStyle = {
    ...dotStyle,
    backgroundColor: 'transparent'
  };

  // Play and Bet section styles
  const playBetSectionStyle = {
    padding: screenWidth < 768 ? '30px 20px' : '40px 40px',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden' as const
  };

  const playBetTitleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'left' as const,
    marginBottom: '30px'
  };

  const categoryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: screenWidth < 768 ? '10px' : '20px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden' as const
  };

  const categoryCardStyle = {
    backgroundColor: Colors.primary.surface,
    borderRadius: screenWidth < 768 ? '12px' : '16px',
    padding: screenWidth < 768 ? '6px' : '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: `2px solid ${Colors.primary.border}`,
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const categoryCardHoverStyle = {
    ...categoryCardStyle,
    transform: 'translateY(-5px)',
    boxShadow: `0 8px 25px ${Colors.primary.neonCyan}40`,
    borderColor: Colors.primary.neonCyan,
    background: `linear-gradient(135deg, ${Colors.primary.surface} 0%, ${Colors.primary.neonCyan}10 100%)`
  };

  const categoryImageStyle = {
    width: 'auto',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: screenWidth < 768 ? '150px' : '200px',
    objectFit: 'contain' as const,
    borderRadius: screenWidth < 768 ? '8px' : '12px',
    display: 'block'
  };

  // Top Games section styles
  const topGamesSectionStyle = {
    padding: screenWidth < 768 ? '30px 20px' : '40px 40px',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden' as const
  };

  const topGamesHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const topGamesTitleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'left' as const
  };

  const topGamesControlsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const navButtonStyle = {
    backgroundColor: Colors.primary.surface,
    border: `2px solid ${Colors.primary.border}`,
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: Colors.primary.text,
    fontSize: '14px',
    fontWeight: 'bold'
  };

  const navButtonHoverStyle = {
    ...navButtonStyle,
    borderColor: Colors.primary.neonCyan,
    backgroundColor: Colors.primary.neonCyan,
    color: Colors.primary.background
  };

  const seeAllButtonStyle = {
    backgroundColor: Colors.primary.hotPink,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: Colors.primary.background,
    fontSize: '14px',
    fontWeight: 'bold'
  };

  const sliderContainerStyle = {
    position: 'relative' as const,
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const
  };

  const sliderStyle = {
    display: 'flex',
    transform: `translateX(-${currentGameIndex * (100 / gamesPerView)}%)`,
    transition: 'transform 0.3s ease',
    gap: '20px'
  };

  const gameCardStyle = {
    backgroundColor: Colors.primary.surface,
    borderRadius: '12px',
    padding: '16px',
    border: `2px solid ${Colors.primary.border}`,
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: `calc(${100 / gamesPerView}% - ${20 * (gamesPerView - 1) / gamesPerView}px)`,
    maxWidth: `calc(${100 / gamesPerView}% - ${20 * (gamesPerView - 1) / gamesPerView}px)`,
    flex: '0 0 auto',
    boxSizing: 'border-box' as const
  };

  const gameCardHoverStyle = {
    ...gameCardStyle,
    transform: 'translateY(-5px)',
    boxShadow: `0 8px 25px ${Colors.primary.neonCyan}40`,
    borderColor: Colors.primary.neonCyan
  };

  const gameIconStyle = {
    fontSize: '32px',
    textAlign: 'center' as const,
    marginBottom: '12px'
  };

  const gameNameStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center' as const,
    marginBottom: '8px'
  };

  const gameInfoStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: Colors.primary.textSecondary
  };

  // Promotional Banner section styles
  const promoBannerSectionStyle = {
    padding: screenWidth < 768 ? '20px 20px 40px 20px' : '30px 40px 60px 40px',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden' as const
  };

  const promoBannerContainerStyle = {
    position: 'relative' as const,
    width: '100%',
    maxWidth: 'min(1200px, 100%)',
    margin: '0 auto',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    boxSizing: 'border-box' as const
  };

  const promoBannerImageStyle = {
    width: '100%',
    height: 'auto',
    maxHeight: screenWidth < 768 ? '200px' : '300px',
    objectFit: 'cover' as const,
    display: 'block'
  };



  const titleStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    marginBottom: '20px',
    color: Colors.primary.text
  };

  const subtitleStyle = {
    fontSize: '24px',
    textAlign: 'center' as const,
    marginBottom: '40px',
    color: Colors.primary.neonCyan
  };

  const cardStyle = {
    backgroundColor: Colors.primary.surface,
    border: `2px solid ${Colors.primary.border}`,
    borderRadius: '12px',
    padding: '30px',
    margin: '20px 0',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
  };

  const buttonStyle = {
    backgroundColor: Colors.primary.neonCyan,
    color: Colors.primary.background,
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    margin: '10px',
    display: 'inline-block'
  };

  return (
    <div style={containerStyle}>
      {/* Navigation Bar */}
      <nav style={navbarStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {assetsLoaded && logoUri ? (
            <img
              src={logoUri}
              alt="Adola Gaming"
              style={logoStyle}
              onError={(e) => {
                // Fallback if logo doesn't load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'block';
              }}
            />
          ) : null}
          <span
            style={{
              display: (!assetsLoaded || !logoUri) ? 'block' : 'none',
              color: Colors.primary.neonCyan,
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            🎮 Adola Gaming
          </span>
        </div>

        <div style={userSectionStyle}>
          <span style={playerNameStyle}>Welcome, {playerName}!</span>
          {onSignOut && (
            <button
              style={signOutButtonStyle}
              onClick={onSignOut}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = Colors.primary.hotPinkDark}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = Colors.primary.hotPink}
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      {/* Banner Slideshow */}
      <div style={sectionStyle}>
        <div style={slideshowStyle}>
          {assetsLoaded && bannerUris.length > 0 ? (
            <>
              {/* Show only current banner */}
              <img
                src={bannerUris[currentBanner]}
                alt={`Banner ${currentBanner + 1}`}
                style={bannerImageStyle}
                onError={(e) => {
                  console.error(`Failed to load banner ${currentBanner + 1}:`, bannerUris[currentBanner]);
                  e.currentTarget.style.display = 'none';
                }}
              />

              {/* Navigation Dots */}
              <div style={dotsContainerStyle}>
                {bannerUris.map((_, index) => (
                  <div
                    key={index}
                    style={index === currentBanner ? activeDotStyle : inactiveDotStyle}
                    onClick={() => setCurrentBanner(index)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: Colors.primary.surface,
              color: Colors.primary.text,
              fontSize: '18px'
            }}>
              Loading banners...
            </div>
          )}
        </div>
      </div>

      {/* Play and Bet Section */}
      <div style={playBetSectionStyle}>
        <h2 style={playBetTitleStyle}>Play and Bet</h2>
        <div style={categoryGridStyle}>
          {gameCategories.map((category, index) => (
            <div
              key={category.id}
              style={hoveredCard === category.id ? categoryCardHoverStyle : categoryCardStyle}
              onClick={() => handleCategoryClick(category.id)}
              onMouseEnter={() => setHoveredCard(category.id)}
              onMouseLeave={() => setHoveredCard(null)}
              title={category.name} // Show name on hover tooltip
            >
              {assetsLoaded && categoryUris[index] ? (
                <img
                  src={categoryUris[index]}
                  alt={category.name}
                  style={categoryImageStyle}
                  onError={(e) => {
                    console.error(`Failed to load category image: ${category.name}`);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: 'auto',
                  height: 'auto',
                  minWidth: screenWidth < 768 ? '100px' : '120px',
                  minHeight: screenWidth < 768 ? '100px' : '120px',
                  backgroundColor: Colors.primary.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: screenWidth < 768 ? '20px' : '24px',
                  color: Colors.primary.text,
                  borderRadius: screenWidth < 768 ? '8px' : '12px'
                }}>
                  {category.name.charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Games Section */}
      <div style={topGamesSectionStyle}>
        <div style={topGamesHeaderStyle}>
          <h2 style={topGamesTitleStyle}>Top Games</h2>
          <div style={topGamesControlsStyle}>
            <button
              style={navButtonStyle}
              onClick={handlePrevious}
              disabled={currentGameIndex === 0}
              onMouseOver={(e) => {
                if (currentGameIndex !== 0) {
                  Object.assign(e.currentTarget.style, navButtonHoverStyle);
                }
              }}
              onMouseOut={(e) => {
                Object.assign(e.currentTarget.style, navButtonStyle);
              }}
            >
              ← Previous
            </button>
            <button
              style={navButtonStyle}
              onClick={handleNext}
              disabled={currentGameIndex >= maxIndex}
              onMouseOver={(e) => {
                if (currentGameIndex < maxIndex) {
                  Object.assign(e.currentTarget.style, navButtonHoverStyle);
                }
              }}
              onMouseOut={(e) => {
                Object.assign(e.currentTarget.style, navButtonStyle);
              }}
            >
              Next →
            </button>
            <button
              style={seeAllButtonStyle}
              onClick={handleSeeAllGames}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = Colors.primary.hotPinkDark || '#e91e63';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = Colors.primary.hotPink;
              }}
            >
              See All
            </button>
          </div>
        </div>

        <div style={sliderContainerStyle}>
          <div style={sliderStyle}>
            {topGames.map((game, index) => (
              <div
                key={game.id}
                style={hoveredCard === game.id ? gameCardHoverStyle : gameCardStyle}
                onClick={() => handleGameClick(game.id)}
                onMouseEnter={() => setHoveredCard(game.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={gameIconStyle}>{game.icon}</div>
                <h3 style={gameNameStyle}>{game.name}</h3>
                <div style={gameInfoStyle}>
                  <span>{game.category}</span>
                  <span>👥 {game.players}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promotional Banner Section */}
      <div style={promoBannerSectionStyle}>
        <div style={promoBannerContainerStyle}>
          {assetsLoaded && promoUri ? (
            <img
              src={promoUri}
              alt="Promotional Banner"
              style={promoBannerImageStyle}
              onError={(e) => {
                console.error('Failed to load promotional banner');
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: screenWidth < 768 ? '200px' : '300px',
              backgroundColor: Colors.primary.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: Colors.primary.textSecondary,
              fontSize: '18px',
              borderRadius: '16px'
            }}>
              Loading promotional banner...
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
