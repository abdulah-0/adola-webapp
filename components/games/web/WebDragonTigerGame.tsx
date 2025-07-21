// Web-specific Dragon vs Tiger Game - Vertically Scrollable Layout
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useApp } from '../../../contexts/AppContext';
import { useWallet } from '../../../contexts/WalletContext';
import BettingPanel from '../../BettingPanel';

const { width } = Dimensions.get('window');

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

export default function WebDragonTigerGame() {
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [betType, setBetType] = useState<'dragon' | 'tiger' | 'tie'>('dragon');
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [gamePhase, setGamePhase] = useState<'betting' | 'dealing' | 'finished'>('betting');
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [gameStats, setGameStats] = useState({
    dragonWins: 0,
    tigerWins: 0,
    ties: 0,
    totalGames: 0
  });

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach((value, index) => {
        deck.push({ suit, value, numValue: index + 1 }); // A=1, K=13
      });
    });
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startGame = async (amount: number, bet: 'dragon' | 'tiger' | 'tie') => {
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    console.log(`🐉 Starting Dragon vs Tiger game with PKR ${amount} on ${bet}`);

    const betPlaced = await placeBet(amount, 'dragonTiger', `Dragon vs Tiger bet on ${bet}`);
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    setBetAmount(amount);
    setBetType(bet);
    setGameActive(true);
    setGamePhase('dealing');

    // Deal cards after a short delay
    setTimeout(() => {
      dealCards(amount, bet);
    }, 1000);
  };

  const dealCards = async (amount: number, bet: 'dragon' | 'tiger' | 'tie') => {
    const deck = createDeck();
    const dragon = deck[0];
    const tiger = deck[1];

    setDragonCard(dragon);
    setTigerCard(tiger);
    setGamePhase('finished');

    // Determine winner
    let result: string;
    let isWin = false;
    let winAmount = 0;

    if (dragon.numValue > tiger.numValue) {
      result = 'Dragon wins!';
      isWin = bet === 'dragon';
      if (isWin) winAmount = amount * 2; // 1:1 payout
    } else if (tiger.numValue > dragon.numValue) {
      result = 'Tiger wins!';
      isWin = bet === 'tiger';
      if (isWin) winAmount = amount * 2; // 1:1 payout
    } else {
      result = 'It\'s a tie!';
      if (bet === 'tie') {
        isWin = true;
        winAmount = amount * 9; // 8:1 payout
      } else {
        // Dragon/Tiger bets lose half on tie
        winAmount = Math.floor(amount / 2);
        isWin = false; // Still a loss, but get half back
      }
    }

    // Update history and stats
    const historyResult = dragon.numValue > tiger.numValue ? 'D' : 
                         tiger.numValue > dragon.numValue ? 'T' : 'Tie';
    setGameHistory(prev => [historyResult, ...prev.slice(0, 9)]);
    
    setGameStats(prev => ({
      dragonWins: prev.dragonWins + (historyResult === 'D' ? 1 : 0),
      tigerWins: prev.tigerWins + (historyResult === 'T' ? 1 : 0),
      ties: prev.ties + (historyResult === 'Tie' ? 1 : 0),
      totalGames: prev.totalGames + 1
    }));

    let message = result;
    if (isWin && winAmount > 0) {
      const winningsAdded = await addWinnings(
        winAmount,
        'dragonTiger',
        `Dragon vs Tiger ${result} - Dragon: ${dragon.value}${dragon.suit}, Tiger: ${tiger.value}${tiger.suit}, Bet: ${bet}`
      );

      if (winningsAdded) {
        console.log(`Winnings added successfully: PKR ${winAmount}`);
      }

      setTimeout(() => refreshBalance(), 500);
    } else if (bet !== 'tie' && dragon.numValue === tiger.numValue) {
      // Return half bet on tie for Dragon/Tiger bets
      const halfBack = await addWinnings(
        winAmount,
        'dragonTiger',
        `Dragon vs Tiger tie - Half bet returned`
      );
      if (halfBack) {
        message += `\nHalf bet returned: PKR ${winAmount}`;
      }
    }

    Alert.alert(
      'Dragon vs Tiger Result',
      `${message}\nDragon: ${dragon.value}${dragon.suit} (${dragon.numValue})\nTiger: ${tiger.value}${tiger.suit} (${tiger.numValue})\nYour bet: ${bet.toUpperCase()}${isWin && winAmount > amount ? `\nYou won PKR ${winAmount - amount}!` : ''}`,
      [{ text: 'OK', onPress: resetGame }]
    );
  };

  const resetGame = () => {
    setGameActive(false);
    setGamePhase('betting');
    setDragonCard(null);
    setTigerCard(null);
    setBetAmount(0);
  };

  const renderCard = (card: Card | null, label: string, color: string) => {
    return (
      <View style={styles.cardContainer}>
        <Text style={[styles.cardLabel, { color }]}>{label}</Text>
        <View style={[styles.card, { borderColor: color }]}>
          {card ? (
            <View style={styles.cardContent}>
              <Text style={[
                styles.cardValue,
                { color: ['♥️', '♦️'].includes(card.suit) ? '#ff4444' : '#000000' }
              ]}>
                {card.value}
              </Text>
              <Text style={styles.cardSuit}>{card.suit}</Text>
              <Text style={styles.cardNumber}>({card.numValue})</Text>
            </View>
          ) : (
            <Text style={styles.cardBack}>🂠</Text>
          )}
        </View>
      </View>
    );
  };

  const getBetTypeMultiplier = (type: 'dragon' | 'tiger' | 'tie') => {
    switch (type) {
      case 'dragon': return '1:1';
      case 'tiger': return '1:1';
      case 'tie': return '8:1';
    }
  };

  const getHistoryColor = (result: string) => {
    switch (result) {
      case 'D': return Colors.primary.hotPink;
      case 'T': return Colors.primary.neonCyan;
      case 'Tie': return Colors.primary.gold;
      default: return Colors.primary.textMuted;
    }
  };

  const getWinPercentage = (wins: number, total: number) => {
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>🐉 Dragon vs Tiger</Text>
        <Text style={styles.subtitle}>Simple card game - highest card wins!</Text>
      </View>

      {/* Game Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Statistics</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary.hotPink }]}>
                {gameStats.dragonWins}
              </Text>
              <Text style={styles.statLabel}>Dragon Wins</Text>
              <Text style={styles.statPercentage}>
                {getWinPercentage(gameStats.dragonWins, gameStats.totalGames)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary.neonCyan }]}>
                {gameStats.tigerWins}
              </Text>
              <Text style={styles.statLabel}>Tiger Wins</Text>
              <Text style={styles.statPercentage}>
                {getWinPercentage(gameStats.tigerWins, gameStats.totalGames)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary.gold }]}>
                {gameStats.ties}
              </Text>
              <Text style={styles.statLabel}>Ties</Text>
              <Text style={styles.statPercentage}>
                {getWinPercentage(gameStats.ties, gameStats.totalGames)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary.text }]}>
                {gameStats.totalGames}
              </Text>
              <Text style={styles.statLabel}>Total Games</Text>
              <Text style={styles.statPercentage}>100%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Game History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Results</Text>
        <View style={styles.historyCard}>
          <View style={styles.historyGrid}>
            {gameHistory.length > 0 ? gameHistory.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.historyItem,
                  { backgroundColor: getHistoryColor(result) }
                ]}
              >
                <Text style={styles.historyText}>{result}</Text>
              </View>
            )) : (
              <Text style={styles.noHistoryText}>No games played yet</Text>
            )}
          </View>
        </View>
      </View>

      {/* Current Game Section */}
      {gameActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Game</Text>
          <View style={styles.gameInfoCard}>
            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoLabel}>Bet Amount:</Text>
              <Text style={styles.gameInfoValue}>PKR {betAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoLabel}>Bet Type:</Text>
              <Text style={[styles.gameInfoValue, {
                color: betType === 'dragon' ? Colors.primary.hotPink :
                       betType === 'tiger' ? Colors.primary.neonCyan : Colors.primary.gold
              }]}>
                {betType === 'dragon' ? '🐉 DRAGON' : betType === 'tiger' ? '🐅 TIGER' : '🤝 TIE'}
              </Text>
            </View>
            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoLabel}>Potential Win:</Text>
              <Text style={styles.gameInfoValue}>
                PKR {(betAmount * (betType === 'tie' ? 9 : 2)).toLocaleString()}
              </Text>
            </View>
            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoLabel}>Status:</Text>
              <Text style={styles.gameInfoValue}>
                {gamePhase === 'dealing' ? 'Dealing cards...' : 'Game finished'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Game Arena Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Arena</Text>
        <View style={styles.gameArena}>
          {gameActive ? (
            <View style={styles.cardsDisplay}>
              {renderCard(dragonCard, '🐉 Dragon', Colors.primary.hotPink)}
              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              {renderCard(tigerCard, '🐅 Tiger', Colors.primary.neonCyan)}
            </View>
          ) : (
            <View style={styles.waitingArea}>
              <Text style={styles.waitingText}>🎴 Ready for Battle</Text>
              <Text style={styles.waitingSubtext}>Place your bet to start the game</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bet Selection Section */}
      {!gameActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Bet</Text>
          <View style={styles.betSelectionCard}>
            <View style={styles.betTypes}>
              {(['dragon', 'tiger', 'tie'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.betTypeButton,
                    betType === type && styles.selectedBetType,
                    { borderColor: type === 'dragon' ? Colors.primary.hotPink :
                                   type === 'tiger' ? Colors.primary.neonCyan : Colors.primary.gold }
                  ]}
                  onPress={() => setBetType(type)}
                >
                  <Text style={[
                    styles.betTypeEmoji,
                    betType === type && styles.selectedBetTypeText
                  ]}>
                    {type === 'dragon' ? '🐉' : type === 'tiger' ? '🐅' : '🤝'}
                  </Text>
                  <Text style={[
                    styles.betTypeText,
                    betType === type && styles.selectedBetTypeText
                  ]}>
                    {type.toUpperCase()}
                  </Text>
                  <Text style={[
                    styles.betTypeMultiplier,
                    betType === type && styles.selectedBetTypeText
                  ]}>
                    {getBetTypeMultiplier(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Betting Panel Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        {!gameActive ? (
          <BettingPanel
            balance={balance}
            minBet={10}
            maxBet={balance || 1000}
            onBet={(amount) => startGame(amount, betType)}
            disabled={gameActive}
          />
        ) : (
          <View style={styles.gameActiveCard}>
            <Text style={styles.gameActiveText}>🎮 Game in Progress</Text>
            <Text style={styles.gameActiveSubtext}>
              {gamePhase === 'dealing' ? 'Cards are being dealt...' : 'Game completed! Check the results above.'}
            </Text>
          </View>
        )}
      </View>

      {/* Game Rules Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.rulesCard}>
          <Text style={styles.ruleText}>• Choose Dragon, Tiger, or Tie before placing your bet</Text>
          <Text style={styles.ruleText}>• One card is dealt to Dragon side, one to Tiger side</Text>
          <Text style={styles.ruleText}>• Highest card wins (Ace = 1, King = 13)</Text>
          <Text style={styles.ruleText}>• Dragon/Tiger bets pay 1:1 when you win</Text>
          <Text style={styles.ruleText}>• Tie bets pay 8:1 when both cards are equal</Text>
          <Text style={styles.ruleText}>• On a tie, Dragon/Tiger bets lose half (50% returned)</Text>
        </View>
      </View>

      {/* Strategy Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategy Tips</Text>
        <View style={styles.tipsCard}>
          <Text style={styles.tipText}>🎯 <Text style={styles.tipBold}>Safe Play:</Text> Stick to Dragon or Tiger bets for better odds</Text>
          <Text style={styles.tipText}>💰 <Text style={styles.tipBold}>High Risk:</Text> Tie bets offer 8:1 payout but are rare</Text>
          <Text style={styles.tipText}>📊 <Text style={styles.tipBold}>Statistics:</Text> Watch the history for patterns</Text>
          <Text style={styles.tipText}>🎲 <Text style={styles.tipBold}>Bankroll:</Text> Manage your bets wisely</Text>
          <Text style={styles.tipText}>⚡ <Text style={styles.tipBold}>Quick Games:</Text> Fast-paced action, perfect for quick sessions</Text>
        </View>
      </View>

      {/* Payout Table Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout Table</Text>
        <View style={styles.payoutCard}>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutBet}>🐉 Dragon Wins</Text>
            <Text style={styles.payoutOdds}>1:1</Text>
            <Text style={styles.payoutExample}>Bet PKR 100 → Win PKR 200</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutBet}>🐅 Tiger Wins</Text>
            <Text style={styles.payoutOdds}>1:1</Text>
            <Text style={styles.payoutExample}>Bet PKR 100 → Win PKR 200</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutBet}>🤝 Tie</Text>
            <Text style={styles.payoutOdds}>8:1</Text>
            <Text style={styles.payoutExample}>Bet PKR 100 → Win PKR 900</Text>
          </View>
          <View style={styles.payoutNote}>
            <Text style={styles.payoutNoteText}>
              * On a tie, Dragon/Tiger bets return 50% of the bet amount
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 15,
    paddingLeft: 5,
  },
  statsCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    marginBottom: 3,
  },
  statPercentage: {
    fontSize: 10,
    color: Colors.primary.textMuted,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  historyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    minWidth: 40,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  noHistoryText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gameInfoCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameInfoLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  gameInfoValue: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  gameArena: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 30,
    borderWidth: 2,
    borderColor: Colors.primary.border,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  cardContainer: {
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    width: 100,
    height: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSuit: {
    fontSize: 32,
    marginBottom: 5,
  },
  cardNumber: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  cardBack: {
    fontSize: 48,
    color: Colors.primary.neonCyan,
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  waitingArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 24,
    color: Colors.primary.text,
    marginBottom: 10,
  },
  waitingSubtext: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  betSelectionCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  betTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  betTypeButton: {
    backgroundColor: Colors.primary.card,
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    flex: 1,
    // Web-specific hover effects
    ...(typeof window !== 'undefined' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        transform: 'scale(1.05)',
      },
    }),
  },
  selectedBetType: {
    backgroundColor: Colors.primary.neonCyan + '20',
  },
  betTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  betTypeText: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  betTypeMultiplier: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
  selectedBetTypeText: {
    color: Colors.primary.neonCyan,
  },
  gameActiveCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
    alignItems: 'center',
  },
  gameActiveText: {
    fontSize: 16,
    color: Colors.primary.neonCyan,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameActiveSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  rulesCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  ruleText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  tipText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  payoutCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  payoutBet: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: 'bold',
    flex: 1,
  },
  payoutOdds: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    flex: 0.5,
    textAlign: 'center',
  },
  payoutExample: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    flex: 1.5,
    textAlign: 'right',
  },
  payoutNote: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  payoutNoteText: {
    fontSize: 12,
    color: Colors.primary.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
