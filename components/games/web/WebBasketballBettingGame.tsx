import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useWallet } from '../../../contexts/WalletContext';

interface BasketballMatch {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  commence_time: string;
  isDemo?: boolean;
}

interface BettingMarket {
  key: string;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
}

interface Bet {
  id: string;
  matchId: string;
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost';
}

const WebBasketballBettingGame: React.FC = () => {
  const { balance, updateBalance } = useWallet();
  const [gamePhase, setGamePhase] = useState<'matches' | 'betting' | 'history'>('matches');
  const [matches, setMatches] = useState<BasketballMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<BasketballMatch | null>(null);
  const [odds, setOdds] = useState<BettingMarket[]>([]);
  const [selectedBet, setSelectedBet] = useState<{ selection: string; odds: number } | null>(null);
  const [stake, setStake] = useState<string>('');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [oddsLoading, setOddsLoading] = useState(false);
  const settlementInterval = useRef<NodeJS.Timeout | null>(null);

  // Custom alert state for web
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtonText, setAlertButtonText] = useState('OK');

  // Custom alert function for web
  const showCustomAlert = (title: string, message: string, buttonText: string = 'OK') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtonText(buttonText);
    setAlertVisible(true);
    
    // Also show browser alert as fallback
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`${title}\n\n${message}`);
      }
    }, 100);
  };

  const hideCustomAlert = () => {
    setAlertVisible(false);
  };

  // Load basketball matches with hybrid approach (real API + demo fallback)
  const loadBasketballMatches = async () => {
    console.log('🏀 Attempting to fetch live basketball matches...');
    setLoading(true);
    
    try {
      const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
      console.log('🔑 Using API key:', API_KEY ? 'Present' : 'Missing');
      
      // Try multiple basketball sports for better coverage
      const basketballSports = ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague'];
      let allMatches = [];
      
      for (const sport of basketballSports) {
        try {
          console.log(`🔍 Fetching ${sport} matches...`);
          const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${API_KEY}&dateFormat=iso&oddsFormat=decimal`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found ${data.length} ${sport} matches`);
            
            if (data && data.length > 0) {
              // Convert API format to our format
              const convertedMatches = data.map((match: any) => ({
                id: match.id,
                home_team: match.home_team,
                away_team: match.away_team,
                league: sport.replace('basketball_', '').toUpperCase(),
                commence_time: match.commence_time,
                isDemo: false
              }));
              allMatches = [...allMatches, ...convertedMatches];
            }
          } else {
            console.log(`⚠️ No ${sport} matches available:`, response.status);
          }
        } catch (sportError) {
          console.log(`❌ Error fetching ${sport}:`, sportError.message);
        }
      }
      
      // Filter for upcoming matches (within next 24 hours)
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      let relevantMatches = allMatches.filter((match: any) => {
        const matchTime = new Date(match.commence_time);
        return matchTime >= now && matchTime <= next24Hours;
      });
      
      console.log(`🎯 Found ${relevantMatches.length} relevant basketball matches in next 24 hours`);
      
      // If we have real matches, use them
      if (relevantMatches.length > 0) {
        console.log('🌟 Using real basketball matches from API');
        setMatches(relevantMatches.slice(0, 6)); // Limit to 6 matches
      } else {
        // Fallback to demo matches
        console.log('📋 No live basketball matches found, using demo matches');
        setMatches(getDemoBasketballMatches());
      }
      
    } catch (error) {
      console.error("❌ Failed to fetch live basketball matches:", error.message);
      console.log('📋 Falling back to demo matches');
      setMatches(getDemoBasketballMatches());
    } finally {
      setLoading(false);
    }
  };

  // Generate demo basketball matches for fallback
  const getDemoBasketballMatches = (): BasketballMatch[] => {
    return [
      {
        id: 'demo_basketball_1',
        home_team: 'Los Angeles Lakers',
        away_team: 'Boston Celtics',
        league: 'NBA',
        commence_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_basketball_2',
        home_team: 'Golden State Warriors',
        away_team: 'Miami Heat',
        league: 'NBA',
        commence_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_basketball_3',
        home_team: 'Chicago Bulls',
        away_team: 'New York Knicks',
        league: 'NBA',
        commence_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_basketball_4',
        home_team: 'Duke Blue Devils',
        away_team: 'North Carolina Tar Heels',
        league: 'NCAA',
        commence_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      }
    ];
  };

  // Generate demo odds for basketball with realistic variations
  const generateBasketballOdds = (matchId: string): BettingMarket[] => {
    console.log('🎲 Generating demo basketball odds for match:', matchId);
    
    const randomFactor = () => 0.85 + (Math.random() * 0.3);
    
    return [
      {
        key: 'match_result',
        outcomes: [
          { name: 'Home Win', price: Math.max(1.20, 1.90 * randomFactor()) },
          { name: 'Away Win', price: Math.max(1.20, 1.90 * randomFactor()) }
        ]
      },
      {
        key: 'total_points',
        outcomes: [
          { name: 'Under 220.5 Points', price: Math.max(1.20, 1.90 * randomFactor()) },
          { name: 'Over 220.5 Points', price: Math.max(1.20, 1.90 * randomFactor()) },
          { name: 'Over 240.5 Points', price: Math.max(1.20, 2.40 * randomFactor()) }
        ]
      },
      {
        key: 'point_spread',
        outcomes: [
          { name: 'Home -5.5', price: Math.max(1.20, 1.90 * randomFactor()) },
          { name: 'Away +5.5', price: Math.max(1.20, 1.90 * randomFactor()) }
        ]
      },
      {
        key: 'quarter_result',
        outcomes: [
          { name: 'Home Leads 1Q', price: Math.max(1.20, 2.10 * randomFactor()) },
          { name: 'Away Leads 1Q', price: Math.max(1.20, 2.10 * randomFactor()) },
          { name: 'Tied 1Q', price: Math.max(1.20, 8.00 * randomFactor()) }
        ]
      }
    ];
  };

  // Load odds for selected match with hybrid approach
  const loadOddsForMatch = async (match: BasketballMatch) => {
    console.log('💰 Fetching odds for basketball match:', match.id);
    setOddsLoading(true);

    try {
      if (match.isDemo) {
        console.log('📋 Using demo odds for demo match');
        setOdds(generateBasketballOdds(match.id));
        return;
      }

      const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
      console.log('🔍 Attempting to fetch real basketball odds from API...');

      const basketballSports = ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague'];

      for (const sport of basketballSports) {
        try {
          const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/events/${match.id}/odds?apiKey=${API_KEY}&markets=h2h,spreads,totals&oddsFormat=decimal&dateFormat=iso`);

          if (response.ok) {
            const data = await response.json();

            if (data && data.bookmakers && data.bookmakers.length > 0) {
              console.log(`✅ Found real odds for ${sport} match`);
              const convertedOdds = convertRealBasketballOddsToOurMarkets(data.bookmakers, match.id);
              setOdds(convertedOdds);
              return;
            }
          } else {
            console.log(`⚠️ No odds found in ${sport}:`, response.status);
          }
        } catch (sportError) {
          console.log(`⚠️ No odds found in ${sport}:`, sportError.message);
        }
      }

      console.log('📋 No real odds found, using demo odds');
      setOdds(generateBasketballOdds(match.id));

    } catch (error) {
      console.error("❌ Failed to fetch live odds:", error.message);
      console.log('📋 Falling back to demo odds');
      setOdds(generateBasketballOdds(match.id));
    } finally {
      setOddsLoading(false);
    }
  };

  // Convert real API odds to our custom betting markets
  const convertRealBasketballOddsToOurMarkets = (realOdds: any[], matchId: string): BettingMarket[] => {
    console.log('🔄 Converting real basketball odds to custom markets');

    let baseOdds = { home: 1.90, away: 1.90 };

    if (realOdds.length > 0 && realOdds[0].markets.length > 0) {
      const h2hMarket = realOdds[0].markets.find((m: any) => m.key === 'h2h');
      if (h2hMarket && h2hMarket.outcomes.length >= 2) {
        baseOdds.home = h2hMarket.outcomes[0].price || 1.90;
        baseOdds.away = h2hMarket.outcomes[1].price || 1.90;
      }
    }

    return [
      {
        key: 'match_result',
        outcomes: [
          { name: 'Home Win', price: Math.max(1.20, baseOdds.home * 0.92) },
          { name: 'Away Win', price: Math.max(1.20, baseOdds.away * 0.92) }
        ]
      },
      {
        key: 'total_points',
        outcomes: [
          { name: 'Under 220.5 Points', price: Math.max(1.20, 1.90 * (0.85 + Math.random() * 0.3)) },
          { name: 'Over 220.5 Points', price: Math.max(1.20, 1.90 * (0.85 + Math.random() * 0.3)) },
          { name: 'Over 240.5 Points', price: Math.max(1.20, 2.40 * (0.85 + Math.random() * 0.3)) }
        ]
      },
      {
        key: 'point_spread',
        outcomes: [
          { name: 'Home -5.5', price: Math.max(1.20, baseOdds.home * 1.05) },
          { name: 'Away +5.5', price: Math.max(1.20, baseOdds.away * 1.05) }
        ]
      },
      {
        key: 'quarter_result',
        outcomes: [
          { name: 'Home Leads 1Q', price: Math.max(1.20, 2.10 * (0.85 + Math.random() * 0.3)) },
          { name: 'Away Leads 1Q', price: Math.max(1.20, 2.10 * (0.85 + Math.random() * 0.3)) },
          { name: 'Tied 1Q', price: Math.max(1.20, 8.00 * (0.85 + Math.random() * 0.3)) }
        ]
      }
    ];
  };

  // Component logic (simplified for web)
  const selectMatch = (match: BasketballMatch) => {
    setSelectedMatch(match);
    setGamePhase('betting');
    loadOddsForMatch(match);
  };

  const calculatePayout = (stakeAmount: number, odds: number): number => {
    return stakeAmount * odds;
  };

  const placeBet = async () => {
    if (!selectedBet || !selectedMatch) {
      showCustomAlert('Error', 'Please select a bet first.');
      return;
    }

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount < 10) {
      showCustomAlert('Minimum Bet', 'Minimum bet amount is PKR 10.');
      return;
    }

    if (stakeAmount > (balance || 0)) {
      showCustomAlert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    try {
      const success = await updateBalance(-stakeAmount, 'bet_placed', {
        game: 'basketball-betting',
        match: `${selectedMatch.home_team} vs ${selectedMatch.away_team}`,
        selection: selectedBet.selection,
        odds: selectedBet.odds
      });

      if (!success) {
        showCustomAlert('Bet Failed', 'Unable to place bet. Please try again.');
        return;
      }

      const newBet: Bet = {
        id: Date.now().toString(),
        matchId: selectedMatch.id,
        selection: selectedBet.selection,
        odds: selectedBet.odds,
        stake: stakeAmount,
        potentialWin: calculatePayout(stakeAmount, selectedBet.odds),
        timestamp: new Date(),
        status: 'pending'
      };

      setBets(prev => [newBet, ...prev]);

      showCustomAlert(
        'Bet Placed!',
        `Bet: ${newBet.selection}\nStake: PKR ${stakeAmount}\nPotential Win: PKR ${calculatePayout(stakeAmount, newBet.odds).toFixed(2)}`,
        'OK'
      );

      setTimeout(() => settleBet(newBet.id), 10000 + Math.random() * 5000);
      setSelectedBet(null);
      setStake('');

    } catch (error) {
      console.error('Error placing bet:', error);
      showCustomAlert('Error', 'Failed to place bet. Please try again.');
    }
  };

  const settleBet = async (betId: string) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet || bet.status !== 'pending') return;

    const isWin = Math.random() < 0.20;

    setBets(prev => prev.map(b =>
      b.id === betId
        ? { ...b, status: isWin ? 'won' : 'lost' }
        : b
    ));

    if (isWin) {
      const grossWin = bet.potentialWin;
      const commission = grossWin * 0.05;
      const netPayout = grossWin - commission;
      const profit = netPayout - bet.stake;

      await updateBalance(netPayout, 'bet_won', {
        game: 'basketball-betting',
        betId: bet.id,
        grossWin,
        commission,
        netPayout,
        profit
      });

      showCustomAlert(
        '🎉 Congratulations! You Won!',
        `Your Bet: ${bet.selection} @ ${bet.odds}\nStake: PKR ${bet.stake}\n\n🏀 Game Result: Your prediction was correct!\n\n💰 Gross Win: PKR ${grossWin.toFixed(2)}\n💸 Commission (5%): PKR ${commission.toFixed(2)}\n✅ Net Payout: PKR ${netPayout.toFixed(2)}\n🎯 Profit: PKR ${profit.toFixed(2)}`,
        'Excellent!'
      );
    } else {
      showCustomAlert(
        '😔 Better Luck Next Time',
        `Your Bet: ${bet.selection} @ ${bet.odds}\nStake: PKR ${bet.stake}\n\n🏀 Game Result: Your prediction was incorrect\n\n❌ Result: Bet Lost\n💸 Loss: PKR ${bet.stake}\n\n🎁 Special Offer: Free PKR ${(bet.stake * 0.5).toFixed(2)} bonus bet on next game!`,
        'Try Again'
      );
    }
  };

  useEffect(() => {
    loadBasketballMatches();
    return () => {
      if (settlementInterval.current) {
        clearInterval(settlementInterval.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.neonCyan} />
        <Text style={styles.loadingText}>Loading Basketball Games...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.webContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🏀 Basketball Betting</Text>
          <Text style={styles.balance}>Balance: PKR {balance?.toFixed(2) || '0.00'}</Text>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, gamePhase === 'matches' && styles.activeNavButton]}
            onPress={() => setGamePhase('matches')}
          >
            <Text style={[styles.navButtonText, gamePhase === 'matches' && styles.activeNavButtonText]}>
              Games
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, gamePhase === 'history' && styles.activeNavButton]}
            onPress={() => setGamePhase('history')}
          >
            <Text style={[styles.navButtonText, gamePhase === 'history' && styles.activeNavButtonText]}>
              My Bets ({bets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Games List */}
        {gamePhase === 'matches' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏀 Live Basketball Games</Text>
            {matches.length === 0 ? (
              <Text style={styles.noMatchesText}>No live games available</Text>
            ) : (
              <View style={styles.matchesGrid}>
                {matches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.webMatchCard}
                    onPress={() => selectMatch(match)}
                  >
                    <Text style={styles.leagueText}>{match.league}</Text>
                    <Text style={styles.matchTeams}>
                      {match.home_team} vs {match.away_team}
                    </Text>
                    <Text style={styles.matchTime}>
                      {new Date(match.commence_time).toLocaleString()}
                    </Text>
                    <Text style={[styles.matchStatus, match.isDemo && styles.demoStatus]}>
                      {match.isDemo ? '🎮 DEMO' : '🔴 LIVE'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Custom Alert Modal for Web */}
        {alertVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>{alertTitle}</Text>
              <Text style={styles.alertMessage}>{alertMessage}</Text>
              <TouchableOpacity style={styles.alertButton} onPress={hideCustomAlert}>
                <Text style={styles.alertButtonText}>{alertButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  webContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary.background,
  },
  loadingText: {
    color: Colors.primary.text,
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.cardBackground,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
  },
  balance: {
    fontSize: 20,
    color: Colors.primary.gold,
    textAlign: 'center',
    marginTop: 8,
  },
  navigation: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 15,
  },
  navButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: Colors.primary.cardBackground,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  navButtonText: {
    color: Colors.primary.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  activeNavButtonText: {
    color: Colors.primary.background,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 20,
  },
  noMatchesText: {
    color: Colors.primary.text,
    textAlign: 'center',
    fontSize: 18,
    marginTop: 40,
  },
  matchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  webMatchCard: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan + '30',
    minWidth: 280,
    flex: 1,
    maxWidth: 350,
  },
  leagueText: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  matchTime: {
    fontSize: 14,
    color: Colors.primary.text + '80',
    marginBottom: 8,
  },
  matchStatus: {
    fontSize: 12,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
  },
  demoStatus: {
    color: Colors.primary.gold,
  },
  // Custom Alert Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  alertContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 25,
    minWidth: 350,
    maxWidth: 500,
    borderWidth: 2,
    borderColor: '#00d4ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d4ff',
    textAlign: 'center',
    marginBottom: 15,
  },
  alertMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    whiteSpace: 'pre-line',
  },
  alertButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    minWidth: 120,
  },
  alertButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WebBasketballBettingGame;
