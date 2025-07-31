// Cricket Betting Game for Adola App - Live Cricket Betting
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import { getLiveCricketMatches, getLiveOdds, calculatePayout } from '../../services/cricketApi';
import { CricketBettingService } from '../../services/cricketBettingService';
import WebCricketBettingGame from './web/WebCricketBettingGame';

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width - 40, 350);

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sport_title: string;
}

interface BetSelection {
  market: string;
  selection: string;
  odds: number;
  stake: number;
}

interface Market {
  key: string;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
}

export default function CricketBettingGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebCricketBettingGame />;
  }

  const { user } = useApp();
  const { balance, placeBet, addWinnings } = useWallet();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedBet, setSelectedBet] = useState<BetSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [activeBets, setActiveBets] = useState<BetSelection[]>([]);
  const [gamePhase, setGamePhase] = useState<'matches' | 'betting' | 'active'>('matches');
  const [userStats, setUserStats] = useState({
    betsPlaced: 0,
    totalWagered: 0,
    winStreak: 0,
    exposure: 0,
    lastBetTime: Date.now()
  });
  
  // Quick stake amounts
  const quickStakes = [10, 25, 50, 100];
  const [customStake, setCustomStake] = useState('');

  // Auto-refresh odds every 30 seconds
  const oddsInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLiveMatches();
    return () => {
      if (oddsInterval.current) {
        clearInterval(oddsInterval.current);
      }
    };
  }, []);

  const loadLiveMatches = async () => {
    try {
      setLoading(true);
      const liveMatches = await getLiveCricketMatches();
      setMatches(liveMatches);
    } catch (error) {
      console.error('Error loading live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectMatch = async (match: Match) => {
    setSelectedMatch(match);
    setGamePhase('betting');
    await loadOddsForMatch(match.id);
    
    // Start auto-refresh for odds
    if (oddsInterval.current) {
      clearInterval(oddsInterval.current);
    }
    oddsInterval.current = setInterval(() => {
      loadOddsForMatch(match.id);
    }, 30000); // Refresh every 30 seconds
  };

  const loadOddsForMatch = async (matchId: string) => {
    try {
      setOddsLoading(true);
      const oddsData = await getLiveOdds(matchId);
      
      if (oddsData && oddsData.length > 0) {
        setMarkets(oddsData[0].markets || []);
      } else {
        // Set demo markets if no real data
        setMarkets([
          {
            key: 'next_ball',
            outcomes: [
              { name: '0 Runs', price: CricketBettingService.calculateDynamicOdds(2.50, userStats) },
              { name: '1 Run', price: CricketBettingService.calculateDynamicOdds(3.20, userStats) },
              { name: '2 Runs', price: CricketBettingService.calculateDynamicOdds(4.50, userStats) },
              { name: '4 Runs', price: CricketBettingService.calculateDynamicOdds(3.80, userStats) },
              { name: '6 Runs', price: CricketBettingService.calculateDynamicOdds(5.50, userStats) },
              { name: 'Wicket', price: CricketBettingService.calculateDynamicOdds(6.00, userStats) }
            ]
          },
          {
            key: 'current_over',
            outcomes: [
              { name: 'Under 6.5 Runs', price: CricketBettingService.calculateDynamicOdds(1.95, userStats) },
              { name: '7-9 Runs', price: CricketBettingService.calculateDynamicOdds(2.80, userStats) },
              { name: '10+ Runs', price: CricketBettingService.calculateDynamicOdds(4.20, userStats) }
            ]
          },
          {
            key: 'next_wicket',
            outcomes: [
              { name: 'Bowled', price: CricketBettingService.calculateDynamicOdds(4.50, userStats) },
              { name: 'Caught', price: CricketBettingService.calculateDynamicOdds(3.25, userStats) },
              { name: 'LBW', price: CricketBettingService.calculateDynamicOdds(5.00, userStats) },
              { name: 'Run Out', price: CricketBettingService.calculateDynamicOdds(8.00, userStats) }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading odds:', error);
    } finally {
      setOddsLoading(false);
    }
  };

  const selectBetOption = (market: string, selection: string, odds: number) => {
    setSelectedBet({
      market,
      selection,
      odds,
      stake: 0
    });
  };

  const placeBetWithStake = async (stake: number) => {
    if (!selectedBet || !selectedMatch) {
      Alert.alert('Error', 'Please select a bet first.');
      return;
    }

    if (stake < 10) {
      Alert.alert('Minimum Bet', 'Minimum bet amount is PKR 10.');
      return;
    }

    if (stake > (balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    const success = await placeBet(
      stake, 
      'cricket-betting', 
      `Cricket Bet: ${selectedBet.selection} @ ${selectedBet.odds}`
    );

    if (!success) {
      Alert.alert('Bet Failed', 'Unable to place bet. Please try again.');
      return;
    }

    const newBet: BetSelection = {
      ...selectedBet,
      stake
    };

    setActiveBets([...activeBets, newBet]);
    setSelectedBet(null);
    setGamePhase('active');

    // Update user stats
    setUserStats(prev => ({
      ...prev,
      betsPlaced: prev.betsPlaced + 1,
      totalWagered: prev.totalWagered + stake,
      exposure: prev.exposure + stake,
      lastBetTime: Date.now()
    }));

    // Simulate bet settlement after 10-20 seconds (shorter for testing)
    const settlementTime = Math.random() * 10000 + 10000; // 10-20 seconds
    setTimeout(() => {
      console.log('🎰 Settling bet:', newBet.selection);
      settleBet(newBet);
    }, settlementTime);

    Alert.alert(
      'Bet Placed!',
      `Bet: ${newBet.selection}\nStake: PKR ${stake}\nPotential Win: PKR ${calculatePayout(stake, newBet.odds).toFixed(2)}`,
      [{ text: 'OK' }]
    );
  };

  const settleBet = async (bet: BetSelection) => {
    console.log('🎯 Starting bet settlement for:', bet.selection);

    // Generate actual match result based on market type
    const actualResult = generateMatchResult(bet.market);
    console.log('🏏 Generated result:', actualResult);

    // Check if bet should be voided first
    if (CricketBettingService.shouldVoidBet(bet.market, bet.selection)) {
      console.log('⚠️ Bet voided');

      Alert.alert(
        '⚠️ Bet Voided',
        `Your Bet: ${bet.selection} @ ${bet.odds.toFixed(2)}\nStake: PKR ${bet.stake}\n\nResult: Match conditions caused void\nRefund: PKR ${bet.stake}`,
        [{ text: 'OK' }]
      );

      // Refund the stake
      await addWinnings(bet.stake, 'cricket-betting', `Voided Bet Refund: ${bet.selection}`);

      // Remove bet from active bets using callback to ensure current state
      setActiveBets(currentBets => {
        console.log('🗑️ Removing voided bet from active bets');
        return currentBets.filter(activeBet => activeBet.selection !== bet.selection || activeBet.stake !== bet.stake);
      });
      return;
    }

    // Check if the bet actually won based on the result
    const actuallyWon = checkIfBetWon(bet, actualResult);
    console.log('🎯 Bet won?', actuallyWon);

    // Override the service result with actual match result for transparency
    const isWin = actuallyWon;
    const finalPayout = isWin ? CricketBettingService.calculatePayout(bet.stake, bet.odds) : 0;
    const commission = isWin ? (bet.stake * bet.odds - bet.stake) * 0.05 : 0;

    console.log('💰 Final payout:', finalPayout, 'Commission:', commission);

    if (isWin) {
      console.log('🎉 Processing win...');

      await addWinnings(
        finalPayout,
        'cricket-betting',
        `Cricket Win: ${bet.selection}`
      );

      // Update win streak
      setUserStats(prev => ({
        ...prev,
        winStreak: prev.winStreak + 1,
        exposure: prev.exposure - bet.stake
      }));

      const profit = finalPayout - bet.stake;

      Alert.alert(
        '🎉 Congratulations! You Won!',
        `Your Bet: ${bet.selection} @ ${bet.odds.toFixed(2)}\nStake: PKR ${bet.stake}\n\n🏏 Actual Result: ${actualResult}\n\n💰 Gross Win: PKR ${(bet.stake * bet.odds).toFixed(2)}\n💸 Commission (5%): PKR ${commission.toFixed(2)}\n✅ Net Payout: PKR ${finalPayout.toFixed(2)}\n🎯 Profit: PKR ${profit.toFixed(2)}`,
        [{ text: 'Excellent!' }]
      );
    } else {
      console.log('😔 Processing loss...');

      // Reset win streak and update stats
      setUserStats(prev => ({
        ...prev,
        winStreak: 0,
        exposure: prev.exposure - bet.stake
      }));

      // Check for loss recovery offer
      const lossOffer = CricketBettingService.generateLossRecoveryOffer(
        userStats.winStreak === 0 ? 3 : 0, // Simulate consecutive losses
        bet.stake
      );

      let alertMessage = `Your Bet: ${bet.selection} @ ${bet.odds.toFixed(2)}\nStake: PKR ${bet.stake}\n\n🏏 Actual Result: ${actualResult}\n\n❌ Result: Bet Lost\n💸 Loss: PKR ${bet.stake}`;

      if (lossOffer) {
        alertMessage += `\n\n🎁 Special Offer: ${lossOffer.description}`;
      }

      Alert.alert(
        '😔 Better Luck Next Time',
        alertMessage,
        [{ text: 'Try Again' }]
      );
    }

    // Remove settled bet from active bets using callback to ensure current state
    setActiveBets(currentBets => {
      console.log('🗑️ Removing settled bet from active bets');
      const updatedBets = currentBets.filter(activeBet =>
        activeBet.selection !== bet.selection || activeBet.stake !== bet.stake
      );

      // If no more active bets, return to betting phase
      if (updatedBets.length === 0) {
        console.log('📱 No more active bets, returning to betting phase');
        setGamePhase('betting');
      }

      return updatedBets;
    });
  };

  const getMarketTitle = (marketKey: string) => {
    switch (marketKey) {
      case 'next_ball': return '🏏 Next Ball';
      case 'current_over': return '🎯 Current Over';
      case 'next_wicket': return '🎳 Next Wicket';
      default: return marketKey.replace('_', ' ').toUpperCase();
    }
  };

  const getMarketColor = (marketKey: string) => {
    switch (marketKey) {
      case 'next_ball': return Colors.primary.neonCyan;
      case 'current_over': return Colors.primary.gold;
      case 'next_wicket': return Colors.primary.hotPink;
      default: return Colors.primary.neonCyan;
    }
  };

  const generateMatchResult = (market: string) => {
    switch (market) {
      case 'next_ball':
        const ballOutcomes = ['0 Runs', '1 Run', '2 Runs', '3 Runs', '4 Runs', '6 Runs', 'Wicket', 'Wide', 'No Ball'];
        return ballOutcomes[Math.floor(Math.random() * ballOutcomes.length)];

      case 'current_over':
        const overRuns = Math.floor(Math.random() * 25); // 0-24 runs possible
        if (overRuns <= 6) return `${overRuns} Runs (Under 6.5)`;
        if (overRuns <= 9) return `${overRuns} Runs (7-9 Range)`;
        return `${overRuns} Runs (10+ Range)`;

      case 'next_wicket':
        const wicketTypes = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'];
        return wicketTypes[Math.floor(Math.random() * wicketTypes.length)];

      default:
        return 'Unknown Result';
    }
  };

  const checkIfBetWon = (bet: BetSelection, actualResult: string) => {
    switch (bet.market) {
      case 'next_ball':
        return actualResult === bet.selection;

      case 'current_over':
        if (bet.selection === 'Under 6.5 Runs') {
          return actualResult.includes('Under 6.5');
        }
        if (bet.selection === '7-9 Runs') {
          return actualResult.includes('7-9 Range');
        }
        if (bet.selection === '10+ Runs') {
          return actualResult.includes('10+ Range');
        }
        return false;

      case 'next_wicket':
        return actualResult === bet.selection;

      default:
        return false;
    }
  };

  const goBackToMatches = () => {
    setSelectedMatch(null);
    setMarkets([]);
    setSelectedBet(null);
    setActiveBets([]);
    setGamePhase('matches');
    
    if (oddsInterval.current) {
      clearInterval(oddsInterval.current);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.neonCyan} />
        <Text style={styles.loadingText}>Loading Live Matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {gamePhase === 'matches' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏏 Live Cricket Matches</Text>
          {matches.length === 0 ? (
            <Text style={styles.noMatchesText}>No live matches available</Text>
          ) : (
            matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => selectMatch(match)}
              >
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
            ))
          )}
        </View>
      )}

      {gamePhase === 'betting' && selectedMatch && (
        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>🎯 Place Your Bets</Text>
            <TouchableOpacity onPress={goBackToMatches} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.matchInfo}>
            {selectedMatch.home_team} vs {selectedMatch.away_team}
          </Text>

          {oddsLoading && (
            <ActivityIndicator size="small" color={Colors.primary.neonCyan} />
          )}

          {markets.map((market) => (
            <View key={market.key} style={styles.marketCard}>
              <Text style={[styles.marketTitle, { color: getMarketColor(market.key) }]}>
                {getMarketTitle(market.key)}
              </Text>
              <View style={styles.oddsContainer}>
                {market.outcomes.map((outcome) => (
                  <TouchableOpacity
                    key={outcome.name}
                    style={[
                      styles.oddsButton,
                      selectedBet?.selection === outcome.name && styles.selectedOddsButton
                    ]}
                    onPress={() => selectBetOption(market.key, outcome.name, outcome.price)}
                  >
                    <Text style={styles.selectionText}>{outcome.name}</Text>
                    <Text style={styles.oddsText}>{outcome.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {selectedBet && (
            <View style={styles.betSlip}>
              <Text style={styles.betSlipTitle}>🎫 Bet Slip</Text>
              <Text style={styles.betSlipSelection}>
                {selectedBet.selection} @ {selectedBet.odds.toFixed(2)}
              </Text>
              
              <Text style={styles.stakeLabel}>Select Stake:</Text>
              <View style={styles.quickStakesContainer}>
                {quickStakes.map((stake) => (
                  <TouchableOpacity
                    key={stake}
                    style={styles.quickStakeButton}
                    onPress={() => placeBetWithStake(stake)}
                    disabled={stake > (balance || 0)}
                  >
                    <Text style={[
                      styles.quickStakeText,
                      stake > (balance || 0) && styles.disabledStakeText
                    ]}>
                      PKR {stake}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.potentialWin}>
                Potential Win: PKR {CricketBettingService.calculatePayout(quickStakes[0], selectedBet.odds).toFixed(2)}
              </Text>
              <Text style={styles.commissionNote}>
                *5% commission applies to winnings
              </Text>
            </View>
          )}
        </View>
      )}

      {gamePhase === 'active' && activeBets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Active Bets</Text>
          {activeBets.map((bet, index) => (
            <View key={index} style={styles.activeBetCard}>
              <Text style={styles.activeBetSelection}>{bet.selection}</Text>
              <Text style={styles.activeBetStake}>Stake: PKR {bet.stake}</Text>
              <Text style={styles.activeBetOdds}>Odds: {bet.odds.toFixed(2)}</Text>
              <Text style={styles.activeBetStatus}>🔄 Waiting for result...</Text>
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.backToBettingButton}
            onPress={() => setGamePhase('betting')}
          >
            <Text style={styles.backToBettingText}>Place More Bets</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

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
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: Colors.primary.cardBackground,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 15,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButton: {
    padding: 8,
    backgroundColor: Colors.primary.border,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.primary.text,
    fontSize: 14,
  },
  matchCard: {
    padding: 15,
    backgroundColor: Colors.primary.background,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 5,
  },
  matchTime: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 3,
  },
  matchStatus: {
    fontSize: 12,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
  },
  demoStatus: {
    color: Colors.primary.gold,
  },
  matchInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  noMatchesText: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  marketCard: {
    backgroundColor: Colors.primary.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  oddsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  oddsButton: {
    backgroundColor: Colors.primary.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedOddsButton: {
    borderColor: Colors.primary.neonCyan,
    backgroundColor: Colors.primary.neonCyan + '20',
  },
  selectionText: {
    fontSize: 12,
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  oddsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  betSlip: {
    backgroundColor: Colors.primary.background,
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
  },
  betSlipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 10,
    textAlign: 'center',
  },
  betSlipSelection: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  stakeLabel: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  quickStakesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickStakeButton: {
    backgroundColor: Colors.primary.neonCyan,
    borderRadius: 8,
    padding: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  quickStakeText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledStakeText: {
    color: Colors.primary.textSecondary,
  },
  potentialWin: {
    fontSize: 14,
    color: Colors.primary.gold,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  commissionNote: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  activeBetCard: {
    backgroundColor: Colors.primary.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primary.gold,
  },
  activeBetSelection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 5,
  },
  activeBetStake: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 3,
  },
  activeBetOdds: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    marginBottom: 5,
  },
  activeBetStatus: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontStyle: 'italic',
  },
  backToBettingButton: {
    backgroundColor: Colors.primary.neonCyan,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backToBettingText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
