// Web Cricket Betting Game for Adola App - Live Cricket Betting
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import { AdvancedGameLogicService } from '../../../services/advancedGameLogicService';
import { getLiveCricketMatches, getLiveOdds, calculatePayout } from '../../../services/cricketApi';
import { CricketBettingService } from '../../../services/cricketBettingService';

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

export default function WebCricketBettingGame() {
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

  // Custom alert state for web
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtonText, setAlertButtonText] = useState('OK');
  
  // Quick stake amounts
  const quickStakes = [10, 25, 50, 100];

  // Custom alert function for web
  const showCustomAlert = (title: string, message: string, buttonText: string = 'OK') => {
    // Show both custom modal and browser alert for maximum compatibility
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

  // Auto-refresh odds every 30 seconds
  const oddsInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debug environment variables
    console.log('🔧 Environment check:');
    console.log('🔑 API Key from env:', process.env.EXPO_PUBLIC_ODDS_API_KEY ? 'Present' : 'Missing');
    console.log('🌐 Node env:', process.env.NODE_ENV);

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
              { name: 'Under 6.5 Runs', price: 1.95 },
              { name: '7-9 Runs', price: 2.80 },
              { name: '10+ Runs', price: 4.20 }
            ]
          },
          {
            key: 'next_wicket',
            outcomes: [
              { name: 'Bowled', price: 4.50 },
              { name: 'Caught', price: 3.25 },
              { name: 'LBW', price: 5.00 },
              { name: 'Run Out', price: 8.00 }
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
      showCustomAlert('Error', 'Please select a bet first.');
      return;
    }

    if (stake < 10) {
      showCustomAlert('Minimum Bet', 'Minimum bet amount is PKR 10.');
      return;
    }

    if (stake > (balance || 0)) {
      showCustomAlert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }

    const success = await placeBet(
      stake, 
      'cricket-betting', 
      `Cricket Bet: ${selectedBet.selection} @ ${selectedBet.odds}`
    );

    if (!success) {
      showCustomAlert('Bet Failed', 'Unable to place bet. Please try again.');
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

    showCustomAlert(
      'Bet Placed!',
      `Bet: ${newBet.selection}\nStake: PKR ${stake}\nPotential Win: PKR ${calculatePayout(stake, newBet.odds).toFixed(2)}`,
      'OK'
    );
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
    console.log('🔍 Checking if bet won:', bet.selection, 'vs', actualResult, 'in market:', bet.market);

    let won = false;
    switch (bet.market) {
      case 'next_ball':
        won = actualResult === bet.selection;
        break;

      case 'current_over':
        if (bet.selection === 'Under 6.5 Runs') {
          won = actualResult.includes('Under 6.5');
        } else if (bet.selection === '7-9 Runs') {
          won = actualResult.includes('7-9 Range');
        } else if (bet.selection === '10+ Runs') {
          won = actualResult.includes('10+ Range');
        } else {
          won = false;
        }
        break;

      case 'next_wicket':
        won = actualResult === bet.selection;
        break;

      default:
        won = false;
    }

    console.log('🎯 Bet result:', won ? 'WON' : 'LOST');
    return won;
  };

  const settleBet = async (bet: BetSelection) => {
    console.log('🎯 Starting bet settlement for:', bet.selection);

    // Generate actual match result based on market type
    const actualResult = generateMatchResult(bet.market);
    console.log('🏏 Generated result:', actualResult);

    // Check if bet should be voided first
    if (CricketBettingService.shouldVoidBet(bet.market, bet.selection)) {
      console.log('⚠️ Bet voided');

      showCustomAlert(
        '⚠️ Bet Voided',
        `Your Bet: ${bet.selection} @ ${bet.odds.toFixed(2)}\nStake: PKR ${bet.stake}\n\nResult: Match conditions caused void\nRefund: PKR ${bet.stake}`,
        'OK'
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

      console.log('🚨 About to show win alert');

      showCustomAlert(
        '🎉 Congratulations! You Won!',
        `Your Bet: ${bet.selection} @ ${bet.odds.toFixed(2)}\nStake: PKR ${bet.stake}\n\n🏏 Actual Result: ${actualResult}\n\n💰 Gross Win: PKR ${(bet.stake * bet.odds).toFixed(2)}\n💸 Commission (5%): PKR ${commission.toFixed(2)}\n✅ Net Payout: PKR ${finalPayout.toFixed(2)}\n🎯 Profit: PKR ${profit.toFixed(2)}`,
        'Excellent!'
      );

      console.log('🚨 Win Alert.alert called');
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

      console.log('🚨 About to show alert:', alertMessage);

      showCustomAlert(
        '😔 Better Luck Next Time',
        alertMessage,
        'Try Again'
      );

      console.log('🚨 Alert.alert called');
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
      <View style={styles.webContainer}>
        
        {gamePhase === 'matches' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏏 Live Cricket Matches</Text>
            {matches.length === 0 ? (
              <Text style={styles.noMatchesText}>No live matches available</Text>
            ) : (
              <View style={styles.matchesGrid}>
                {matches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.webMatchCard}
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
                ))}
              </View>
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

            <View style={styles.marketsGrid}>
              {markets.map((market) => (
                <View key={market.key} style={styles.webMarketCard}>
                  <Text style={[styles.marketTitle, { color: getMarketColor(market.key) }]}>
                    {getMarketTitle(market.key)}
                  </Text>
                  <View style={styles.webOddsContainer}>
                    {market.outcomes.map((outcome) => (
                      <TouchableOpacity
                        key={outcome.name}
                        style={[
                          styles.webOddsButton,
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
            </View>

            {selectedBet && (
              <View style={styles.webBetSlip}>
                <Text style={styles.betSlipTitle}>🎫 Bet Slip</Text>
                <Text style={styles.betSlipSelection}>
                  {selectedBet.selection} @ {selectedBet.odds.toFixed(2)}
                </Text>
                
                <Text style={styles.stakeLabel}>Select Stake:</Text>
                <View style={styles.webQuickStakesContainer}>
                  {quickStakes.map((stake) => (
                    <TouchableOpacity
                      key={stake}
                      style={[
                        styles.webQuickStakeButton,
                        stake > (balance || 0) && styles.disabledStakeButton
                      ]}
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
            <View style={styles.activeBetsGrid}>
              {activeBets.map((bet, index) => (
                <View key={index} style={styles.webActiveBetCard}>
                  <Text style={styles.activeBetSelection}>{bet.selection}</Text>
                  <Text style={styles.activeBetStake}>Stake: PKR {bet.stake}</Text>
                  <Text style={styles.activeBetOdds}>Odds: {bet.odds.toFixed(2)}</Text>
                  <Text style={styles.activeBetStatus}>🔄 Waiting for result...</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.backToBettingButton}
              onPress={() => setGamePhase('betting')}
            >
              <Text style={styles.backToBettingText}>Place More Bets</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  webContainer: {
    maxWidth: 1400,
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
  section: {
    marginBottom: 30,
    padding: 25,
    backgroundColor: Colors.primary.cardBackground,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: Colors.primary.border,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.primary.text,
    fontSize: 14,
  },
  matchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  webMatchCard: {
    padding: 20,
    backgroundColor: Colors.primary.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 300,
    maxWidth: 350,
    cursor: 'pointer',
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  matchTime: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
    textAlign: 'center',
  },
  matchStatus: {
    fontSize: 12,
    color: Colors.primary.hotPink,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  demoStatus: {
    color: Colors.primary.gold,
  },
  matchInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  noMatchesText: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  marketsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: 20,
    marginBottom: 20,
  },
  webMarketCard: {
    backgroundColor: Colors.primary.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  webOddsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: 10,
  },
  webOddsButton: {
    backgroundColor: Colors.primary.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  selectedOddsButton: {
    borderColor: Colors.primary.neonCyan,
    backgroundColor: Colors.primary.neonCyan + '20',
  },
  selectionText: {
    fontSize: 12,
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  oddsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  webBetSlip: {
    backgroundColor: Colors.primary.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
    maxWidth: 400,
    alignSelf: 'center',
  },
  betSlipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 15,
    textAlign: 'center',
  },
  betSlipSelection: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  stakeLabel: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  webQuickStakesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginBottom: 15,
  },
  webQuickStakeButton: {
    backgroundColor: Colors.primary.neonCyan,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  disabledStakeButton: {
    backgroundColor: Colors.primary.border,
    cursor: 'not-allowed',
  },
  quickStakeText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledStakeText: {
    color: Colors.primary.textSecondary,
  },
  potentialWin: {
    fontSize: 16,
    color: Colors.primary.gold,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  commissionNote: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  activeBetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 15,
    marginBottom: 20,
  },
  webActiveBetCard: {
    backgroundColor: Colors.primary.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary.gold,
  },
  activeBetSelection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  activeBetStake: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  activeBetOdds: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    marginBottom: 8,
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
    maxWidth: 300,
    alignSelf: 'center',
  },
  backToBettingText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
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
