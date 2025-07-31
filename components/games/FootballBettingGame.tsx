import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useWallet } from '../../contexts/WalletContext';

interface FootballMatch {
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

const FootballBettingGame: React.FC = () => {
  const { balance, updateBalance } = useWallet();
  const [gamePhase, setGamePhase] = useState<'matches' | 'betting' | 'history'>('matches');
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(null);
  const [odds, setOdds] = useState<BettingMarket[]>([]);
  const [selectedBet, setSelectedBet] = useState<{ selection: string; odds: number } | null>(null);
  const [stake, setStake] = useState<string>('');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [oddsLoading, setOddsLoading] = useState(false);
  const settlementInterval = useRef<NodeJS.Timeout | null>(null);

  // Load football matches with hybrid approach (real API + demo fallback)
  const loadFootballMatches = async () => {
    console.log('⚽ Attempting to fetch live football matches...');
    setLoading(true);

    try {
      const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
      console.log('🔑 Using API key:', API_KEY ? 'Present' : 'Missing');

      // Try multiple football sports for better coverage
      const footballSports = ['soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga', 'soccer_france_ligue_one', 'soccer_uefa_champs_league'];
      let allMatches = [];

      for (const sport of footballSports) {
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
                league: sport.replace('soccer_', '').replace(/_/g, ' ').toUpperCase(),
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

      console.log(`🎯 Found ${relevantMatches.length} relevant football matches in next 24 hours`);

      // If we have real matches, use them
      if (relevantMatches.length > 0) {
        console.log('🌟 Using real football matches from API');
        setMatches(relevantMatches.slice(0, 6)); // Limit to 6 matches
      } else {
        // Fallback to demo matches
        console.log('📋 No live football matches found, using demo matches');
        setMatches(getDemoFootballMatches());
      }

    } catch (error) {
      console.error("❌ Failed to fetch live football matches:", error.message);
      console.log('📋 Falling back to demo matches');
      setMatches(getDemoFootballMatches());
    } finally {
      setLoading(false);
    }
  };

  // Generate demo football matches for fallback
  const getDemoFootballMatches = (): FootballMatch[] => {
    return [
      {
        id: 'demo_football_1',
        home_team: 'Manchester United',
        away_team: 'Liverpool',
        league: 'Premier League',
        commence_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_football_2',
        home_team: 'Barcelona',
        away_team: 'Real Madrid',
        league: 'La Liga',
        commence_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_football_3',
        home_team: 'Bayern Munich',
        away_team: 'Borussia Dortmund',
        league: 'Bundesliga',
        commence_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      },
      {
        id: 'demo_football_4',
        home_team: 'PSG',
        away_team: 'Marseille',
        league: 'Ligue 1',
        commence_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        isDemo: true
      }
    ];
  };

  // Generate demo odds for football
  const generateFootballOdds = (matchId: string): BettingMarket[] => {
    const randomFactor = () => 0.85 + (Math.random() * 0.3);
    
    return [
      {
        key: 'match_result',
        outcomes: [
          { name: 'Home Win', price: Math.max(1.20, 2.10 * randomFactor()) },
          { name: 'Draw', price: Math.max(1.20, 3.40 * randomFactor()) },
          { name: 'Away Win', price: Math.max(1.20, 2.80 * randomFactor()) }
        ]
      },
      {
        key: 'total_goals',
        outcomes: [
          { name: 'Under 2.5 Goals', price: Math.max(1.20, 1.85 * randomFactor()) },
          { name: 'Over 2.5 Goals', price: Math.max(1.20, 1.95 * randomFactor()) },
          { name: 'Over 3.5 Goals', price: Math.max(1.20, 2.60 * randomFactor()) }
        ]
      },
      {
        key: 'both_teams_score',
        outcomes: [
          { name: 'Both Teams Score', price: Math.max(1.20, 1.75 * randomFactor()) },
          { name: 'No Both Teams Score', price: Math.max(1.20, 2.05 * randomFactor()) }
        ]
      },
      {
        key: 'first_half',
        outcomes: [
          { name: 'Home Lead HT', price: Math.max(1.20, 2.40 * randomFactor()) },
          { name: 'Draw HT', price: Math.max(1.20, 2.20 * randomFactor()) },
          { name: 'Away Lead HT', price: Math.max(1.20, 3.10 * randomFactor()) }
        ]
      }
    ];
  };

  // Load odds for selected match with hybrid approach
  const loadOddsForMatch = async (match: FootballMatch) => {
    console.log('💰 Fetching odds for football match:', match.id);
    setOddsLoading(true);

    try {
      // Use demo odds for demo matches
      if (match.isDemo) {
        console.log('📋 Using demo odds for demo match');
        setOdds(generateFootballOdds(match.id));
        return;
      }

      const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;

      // Try to get real odds from API
      console.log('🔍 Attempting to fetch real football odds from API...');

      // Try different football sport categories to find the match
      const footballSports = ['soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga', 'soccer_france_ligue_one', 'soccer_uefa_champs_league'];

      for (const sport of footballSports) {
        try {
          const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/events/${match.id}/odds?apiKey=${API_KEY}&markets=h2h,totals,btts&oddsFormat=decimal&dateFormat=iso`);

          if (response.ok) {
            const data = await response.json();

            if (data && data.bookmakers && data.bookmakers.length > 0) {
              console.log(`✅ Found real odds for ${sport} match`);

              // Convert real odds to our betting markets format
              const convertedOdds = convertRealFootballOddsToOurMarkets(data.bookmakers, match.id);
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

      // If no real odds found, use demo odds
      console.log('📋 No real odds found, using demo odds');
      setOdds(generateFootballOdds(match.id));

    } catch (error) {
      console.error("❌ Failed to fetch live odds:", error.message);
      console.log('📋 Falling back to demo odds');
      setOdds(generateFootballOdds(match.id));
    } finally {
      setOddsLoading(false);
    }
  };

  // Convert real API odds to our custom betting markets
  const convertRealFootballOddsToOurMarkets = (realOdds: any[], matchId: string): BettingMarket[] => {
    console.log('🔄 Converting real football odds to custom markets');

    // Extract some real odds if available
    let baseOdds = { home: 2.0, draw: 3.5, away: 2.5 };

    if (realOdds.length > 0 && realOdds[0].markets.length > 0) {
      const h2hMarket = realOdds[0].markets.find((m: any) => m.key === 'h2h');
      if (h2hMarket && h2hMarket.outcomes.length >= 3) {
        baseOdds.home = h2hMarket.outcomes.find((o: any) => o.name === h2hMarket.outcomes[0].name)?.price || 2.0;
        baseOdds.draw = h2hMarket.outcomes.find((o: any) => o.name.toLowerCase().includes('draw'))?.price || 3.5;
        baseOdds.away = h2hMarket.outcomes.find((o: any) => o.name === h2hMarket.outcomes[2].name)?.price || 2.5;
      }
    }

    // Generate our custom markets based on real odds
    return [
      {
        key: 'match_result',
        outcomes: [
          { name: 'Home Win', price: Math.max(1.20, baseOdds.home * 0.92) },
          { name: 'Draw', price: Math.max(1.20, baseOdds.draw * 0.92) },
          { name: 'Away Win', price: Math.max(1.20, baseOdds.away * 0.92) }
        ]
      },
      {
        key: 'total_goals',
        outcomes: [
          { name: 'Under 2.5 Goals', price: Math.max(1.20, 1.85 * (0.85 + Math.random() * 0.3)) },
          { name: 'Over 2.5 Goals', price: Math.max(1.20, 1.95 * (0.85 + Math.random() * 0.3)) },
          { name: 'Over 3.5 Goals', price: Math.max(1.20, 2.60 * (0.85 + Math.random() * 0.3)) }
        ]
      },
      {
        key: 'both_teams_score',
        outcomes: [
          { name: 'Both Teams Score', price: Math.max(1.20, 1.75 * (0.85 + Math.random() * 0.3)) },
          { name: 'No Both Teams Score', price: Math.max(1.20, 2.05 * (0.85 + Math.random() * 0.3)) }
        ]
      },
      {
        key: 'first_half',
        outcomes: [
          { name: 'Home Lead HT', price: Math.max(1.20, baseOdds.home * 1.2) },
          { name: 'Draw HT', price: Math.max(1.20, 2.20 * (0.85 + Math.random() * 0.3)) },
          { name: 'Away Lead HT', price: Math.max(1.20, baseOdds.away * 1.3) }
        ]
      }
    ];
  };

  // Select match and load odds
  const selectMatch = (match: FootballMatch) => {
    setSelectedMatch(match);
    setGamePhase('betting');
    loadOddsForMatch(match);
  };

  // Calculate potential payout
  const calculatePayout = (stakeAmount: number, odds: number): number => {
    return stakeAmount * odds;
  };

  // Place bet
  const placeBet = async () => {
    if (!selectedBet || !selectedMatch) {
      Alert.alert('Error', 'Please select a bet first.');
      return;
    }

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount < 10) {
      Alert.alert('Minimum Bet', 'Minimum bet amount is PKR 10.');
      return;
    }

    if (stakeAmount > (balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    try {
      // Deduct stake from balance
      const success = await updateBalance(-stakeAmount, 'bet_placed', {
        game: 'football-betting',
        match: `${selectedMatch.home_team} vs ${selectedMatch.away_team}`,
        selection: selectedBet.selection,
        odds: selectedBet.odds
      });

      if (!success) {
        Alert.alert('Bet Failed', 'Unable to place bet. Please try again.');
        return;
      }

      // Create new bet
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
      
      Alert.alert(
        'Bet Placed!',
        `Bet: ${newBet.selection}\nStake: PKR ${stakeAmount}\nPotential Win: PKR ${calculatePayout(stakeAmount, newBet.odds).toFixed(2)}`,
        [{ text: 'OK' }]
      );

      // Auto-settle bet after 10-15 seconds
      setTimeout(() => settleBet(newBet.id), 10000 + Math.random() * 5000);

      // Reset form
      setSelectedBet(null);
      setStake('');
      
    } catch (error) {
      console.error('Error placing bet:', error);
      Alert.alert('Error', 'Failed to place bet. Please try again.');
    }
  };

  // Settle bet (simulate match result)
  const settleBet = async (betId: string) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet || bet.status !== 'pending') return;

    // Simulate match result (20% win rate as per requirements)
    const isWin = Math.random() < 0.20;
    
    setBets(prev => prev.map(b => 
      b.id === betId 
        ? { ...b, status: isWin ? 'won' : 'lost' }
        : b
    ));

    if (isWin) {
      // Calculate winnings (gross win - 5% commission)
      const grossWin = bet.potentialWin;
      const commission = grossWin * 0.05;
      const netPayout = grossWin - commission;
      const profit = netPayout - bet.stake;

      await updateBalance(netPayout, 'bet_won', {
        game: 'football-betting',
        betId: bet.id,
        grossWin,
        commission,
        netPayout,
        profit
      });

      Alert.alert(
        '🎉 Congratulations! You Won!',
        `Your Bet: ${bet.selection} @ ${bet.odds}\nStake: PKR ${bet.stake}\n\n⚽ Match Result: Your prediction was correct!\n\n💰 Gross Win: PKR ${grossWin.toFixed(2)}\n💸 Commission (5%): PKR ${commission.toFixed(2)}\n✅ Net Payout: PKR ${netPayout.toFixed(2)}\n🎯 Profit: PKR ${profit.toFixed(2)}`,
        [{ text: 'Excellent!' }]
      );
    } else {
      Alert.alert(
        '😔 Better Luck Next Time',
        `Your Bet: ${bet.selection} @ ${bet.odds}\nStake: PKR ${bet.stake}\n\n⚽ Match Result: Your prediction was incorrect\n\n❌ Result: Bet Lost\n💸 Loss: PKR ${bet.stake}\n\n🎁 Special Offer: Free PKR ${(bet.stake * 0.5).toFixed(2)} bonus bet on next match!`,
        [{ text: 'Try Again' }]
      );
    }
  };

  useEffect(() => {
    loadFootballMatches();
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
        <Text style={styles.loadingText}>Loading Football Matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚽ Football Betting</Text>
        <Text style={styles.balance}>Balance: PKR {balance?.toFixed(2) || '0.00'}</Text>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, gamePhase === 'matches' && styles.activeNavButton]}
          onPress={() => setGamePhase('matches')}
        >
          <Text style={[styles.navButtonText, gamePhase === 'matches' && styles.activeNavButtonText]}>
            Matches
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

      {/* Matches List */}
      {gamePhase === 'matches' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚽ Live Football Matches</Text>
          {matches.length === 0 ? (
            <Text style={styles.noMatchesText}>No live matches available</Text>
          ) : (
            <View style={styles.matchesGrid}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
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

      {/* Betting Interface */}
      {gamePhase === 'betting' && selectedMatch && (
        <View style={styles.section}>
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setGamePhase('matches')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.matchInfo}>
            {selectedMatch.home_team} vs {selectedMatch.away_team}
          </Text>
          <Text style={styles.leagueInfo}>{selectedMatch.league}</Text>

          {oddsLoading && (
            <ActivityIndicator size="small" color={Colors.primary.neonCyan} />
          )}

          {odds.map((market) => (
            <View key={market.key} style={styles.marketContainer}>
              <Text style={styles.marketTitle}>
                {market.key === 'match_result' && '🏆 Match Result'}
                {market.key === 'total_goals' && '⚽ Total Goals'}
                {market.key === 'both_teams_score' && '🎯 Both Teams Score'}
                {market.key === 'first_half' && '⏰ First Half Result'}
              </Text>
              <View style={styles.oddsContainer}>
                {market.outcomes.map((outcome) => (
                  <TouchableOpacity
                    key={outcome.name}
                    style={[
                      styles.oddsButton,
                      selectedBet?.selection === outcome.name && styles.selectedOddsButton
                    ]}
                    onPress={() => setSelectedBet({ selection: outcome.name, odds: outcome.price })}
                  >
                    <Text style={styles.oddsButtonText}>{outcome.name}</Text>
                    <Text style={styles.oddsValue}>{outcome.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Betting Form */}
          {selectedBet && (
            <View style={styles.bettingForm}>
              <Text style={styles.selectedBetText}>
                Selected: {selectedBet.selection} @ {selectedBet.odds.toFixed(2)}
              </Text>

              <View style={styles.stakeContainer}>
                <Text style={styles.stakeLabel}>Stake Amount (PKR):</Text>
                <TextInput
                  style={styles.stakeInput}
                  value={stake}
                  onChangeText={setStake}
                  placeholder="Enter stake amount"
                  placeholderTextColor={Colors.primary.text + '80'}
                  keyboardType="numeric"
                />
              </View>

              {stake && !isNaN(parseFloat(stake)) && (
                <Text style={styles.potentialWinText}>
                  Potential Win: PKR {calculatePayout(parseFloat(stake), selectedBet.odds).toFixed(2)}
                </Text>
              )}

              <TouchableOpacity
                style={styles.placeBetButton}
                onPress={placeBet}
              >
                <Text style={styles.placeBetButtonText}>Place Bet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Bet History */}
      {gamePhase === 'history' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 My Football Bets</Text>
          {bets.length === 0 ? (
            <Text style={styles.noBetsText}>No bets placed yet</Text>
          ) : (
            <View style={styles.betsContainer}>
              {bets.map((bet) => (
                <View key={bet.id} style={styles.betCard}>
                  <View style={styles.betHeader}>
                    <Text style={styles.betSelection}>{bet.selection}</Text>
                    <Text style={[
                      styles.betStatus,
                      bet.status === 'won' && styles.wonStatus,
                      bet.status === 'lost' && styles.lostStatus
                    ]}>
                      {bet.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.betDetails}>
                    Odds: {bet.odds.toFixed(2)} | Stake: PKR {bet.stake}
                  </Text>
                  <Text style={styles.betPotential}>
                    Potential Win: PKR {bet.potentialWin.toFixed(2)}
                  </Text>
                  <Text style={styles.betTime}>
                    {bet.timestamp.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
  },
  balance: {
    fontSize: 18,
    color: Colors.primary.gold,
    textAlign: 'center',
    marginTop: 5,
  },
  navigation: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  navButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary.cardBackground,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  navButtonText: {
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  activeNavButtonText: {
    color: Colors.primary.background,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 15,
  },
  noMatchesText: {
    color: Colors.primary.text,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  matchesGrid: {
    gap: 15,
  },
  matchCard: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan + '30',
  },
  leagueText: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 5,
  },
  matchTime: {
    fontSize: 14,
    color: Colors.primary.text + '80',
    marginBottom: 5,
  },
  matchStatus: {
    fontSize: 12,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
  },
  demoStatus: {
    color: Colors.primary.gold,
  },
  backButtonContainer: {
    marginBottom: 15,
  },
  backButton: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
  },
  matchInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  leagueInfo: {
    fontSize: 14,
    color: Colors.primary.gold,
    textAlign: 'center',
    marginBottom: 20,
  },
  marketContainer: {
    marginBottom: 20,
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 10,
  },
  oddsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  oddsButton: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan + '30',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedOddsButton: {
    backgroundColor: Colors.primary.neonCyan + '20',
    borderColor: Colors.primary.neonCyan,
  },
  oddsButtonText: {
    color: Colors.primary.text,
    fontSize: 12,
    textAlign: 'center',
  },
  oddsValue: {
    color: Colors.primary.neonCyan,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bettingForm: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  selectedBetText: {
    color: Colors.primary.neonCyan,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  stakeContainer: {
    marginBottom: 15,
  },
  stakeLabel: {
    color: Colors.primary.text,
    fontSize: 14,
    marginBottom: 5,
  },
  stakeInput: {
    backgroundColor: Colors.primary.background,
    color: Colors.primary.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan + '30',
    fontSize: 16,
  },
  potentialWinText: {
    color: Colors.primary.gold,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  placeBetButton: {
    backgroundColor: Colors.primary.neonCyan,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeBetButtonText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noBetsText: {
    color: Colors.primary.text,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  betsContainer: {
    gap: 15,
  },
  betCard: {
    backgroundColor: Colors.primary.cardBackground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan + '30',
  },
  betHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  betSelection: {
    color: Colors.primary.text,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  betStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  wonStatus: {
    color: '#00ff00',
    backgroundColor: '#00ff0020',
  },
  lostStatus: {
    color: '#ff0000',
    backgroundColor: '#ff000020',
  },
  betDetails: {
    color: Colors.primary.text + '80',
    fontSize: 14,
    marginBottom: 3,
  },
  betPotential: {
    color: Colors.primary.gold,
    fontSize: 14,
    marginBottom: 3,
  },
  betTime: {
    color: Colors.primary.text + '60',
    fontSize: 12,
  },
});

export default FootballBettingGame;
