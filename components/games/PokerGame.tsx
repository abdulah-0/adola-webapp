// Poker Game for Adola App (5-Card Draw)
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import { AdvancedGameLogicService } from '../../services/advancedGameLogicService';
import WebPokerGame from './web/WebPokerGame';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 350);

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

export default function PokerGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebPokerGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<boolean[]>([false, false, false, false, false]);
  const [gamePhase, setGamePhase] = useState<'betting' | 'draw' | 'finished'>('betting');
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach((value, index) => {
        deck.push({ suit, value, numValue: index + 2 });
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

  const getHandRank = (hand: Card[]): { rank: number; name: string; multiplier: number } => {
    const sortedHand = [...hand].sort((a, b) => a.numValue - b.numValue);
    const values = sortedHand.map(card => card.numValue);
    const suits = sortedHand.map(card => card.suit);
    
    // Count occurrences
    const valueCounts: { [key: number]: number } = {};
    values.forEach(value => {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    const isFlush = suits.every(suit => suit === suits[0]);
    const isStraight = values.every((value, index) => index === 0 || value === values[index - 1] + 1) ||
                     (values.join(',') === '2,3,4,5,14'); // A-2-3-4-5 straight

    // Royal Flush
    if (isFlush && isStraight && values[0] === 10) {
      return { rank: 9, name: 'Royal Flush', multiplier: 250 };
    }
    
    // Straight Flush
    if (isFlush && isStraight) {
      return { rank: 8, name: 'Straight Flush', multiplier: 50 };
    }
    
    // Four of a Kind
    if (counts[0] === 4) {
      return { rank: 7, name: 'Four of a Kind', multiplier: 25 };
    }
    
    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: 6, name: 'Full House', multiplier: 9 };
    }
    
    // Flush
    if (isFlush) {
      return { rank: 5, name: 'Flush', multiplier: 6 };
    }
    
    // Straight
    if (isStraight) {
      return { rank: 4, name: 'Straight', multiplier: 4 };
    }
    
    // Three of a Kind
    if (counts[0] === 3) {
      return { rank: 3, name: 'Three of a Kind', multiplier: 3 };
    }
    
    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: 2, name: 'Two Pair', multiplier: 2 };
    }
    
    // Pair of Jacks or Better
    if (counts[0] === 2) {
      const pairValue = Object.keys(valueCounts).find(key => valueCounts[parseInt(key)] === 2);
      if (pairValue && parseInt(pairValue) >= 11) { // J, Q, K, A
        return { rank: 1, name: 'Jacks or Better', multiplier: 1 };
      }
    }
    
    return { rank: 0, name: 'High Card', multiplier: 0 };
  };

  const startGame = async (amount: number) => {
    // Check if user can place bet using advanced game logic
    if (!gameLogicService.canPlayGame(amount, balance || 0, 'poker')) {
      const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'poker');
      Alert.alert('Cannot Place Bet', message);
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    // Calculate win probability using advanced game logic
    const { probability, engagementBonus: bonus } = await gameLogicService.calculateWinProbability({
      betAmount: amount,
      basePayout: 2.0, // Standard poker payout
      gameType: 'poker',
      userId: user.id,
      currentBalance: balance || 0,
    });

    setGameWinProbability(probability);
    setEngagementBonus(bonus);

    // Step 1: Deduct bet amount immediately
    const betPlaced = await placeBet(amount, 'poker', 'Poker bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setBetAmount(amount);
    setGameActive(true);
    setGamePhase('draw');
    setSelectedCards([false, false, false, false, false]);

    const deck = createDeck();
    const newPlayerHand = deck.slice(0, 5);
    const newDealerHand = deck.slice(5, 10);

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
  };

  const toggleCardSelection = (index: number) => {
    if (gamePhase !== 'draw') return;
    
    const newSelection = [...selectedCards];
    newSelection[index] = !newSelection[index];
    setSelectedCards(newSelection);
  };

  const drawCards = () => {
    if (gamePhase !== 'draw') return;

    const deck = createDeck();
    let deckIndex = 10; // Skip already dealt cards
    
    const newPlayerHand = [...playerHand];
    selectedCards.forEach((selected, index) => {
      if (selected) {
        newPlayerHand[index] = deck[deckIndex++];
      }
    });

    setPlayerHand(newPlayerHand);
    setGamePhase('finished');
    
    // Evaluate hands and determine winner
    setTimeout(() => {
      evaluateHands(newPlayerHand);
    }, 1000);
  };

  const evaluateHands = async (finalPlayerHand: Card[]) => {
    const playerResult = getHandRank(finalPlayerHand);
    const dealerResult = getHandRank(dealerHand);

    // Determine if player should win using advanced game logic
    const shouldPlayerWin = Math.random() < gameWinProbability;

    let winAmount = 0;
    let isWin = false;
    let message = '';

    if (shouldPlayerWin) {
      // Player should win - force win regardless of actual hands
      winAmount = betAmount * (Math.max(playerResult.multiplier, 1) + 1);
      isWin = true;
      message = `You win with ${playerResult.name}!`;
    } else {
      // Player should lose - check if natural win, otherwise force loss
      if (playerResult.rank > dealerResult.rank && playerResult.rank >= 8) {
        // Allow natural wins for very strong hands (straight flush, four of a kind, etc.)
        winAmount = betAmount * (playerResult.multiplier + 1);
        isWin = true;
        message = `You win with ${playerResult.name}!`;
      } else if (playerResult.rank === dealerResult.rank) {
        // Natural tie - return bet
        winAmount = betAmount;
        isWin = true;
        message = `Tie! Both have ${playerResult.name}`;
      } else {
        // Force dealer win
        message = `Dealer wins with ${dealerResult.name}`;
      }
    }

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      await addWinnings(
        winAmount,
        'poker',
        `Poker ${message} - Player: ${playerResult.name}, Dealer: ${dealerResult.name}`
      );

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    // Log the game result for analytics
    if (user?.id) {
      await gameLogicService.logGameResult(user.id, 'poker', {
        won: isWin,
        multiplier: isWin ? winAmount / betAmount : 0,
        winAmount: isWin ? winAmount : 0,
        betAmount,
        newBalance: isWin ? (balance || 0) + winAmount - betAmount : (balance || 0) - betAmount,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('poker').houseEdge,
        engagementBonus
      }, {
        playerHand: finalPlayerHand.map(c => `${c.value}${c.suit}`),
        dealerHand: dealerHand.map(c => `${c.value}${c.suit}`),
        playerResult: playerResult.name,
        dealerResult: dealerResult.name,
        playerRank: playerResult.rank,
        dealerRank: dealerResult.rank,
        adjustedProbability: gameWinProbability,
        houseEdge: gameLogicService.getGameConfig('poker').houseEdge
      });
    }

    Alert.alert(
      'Poker Result',
      `${message}\nPlayer: ${playerResult.name}\nDealer: ${dealerResult.name}${isWin && winAmount > betAmount ? `\nYou won PKR ${winAmount - betAmount}!` : ''}`,
      [{ text: 'OK', onPress: resetGame }]
    );
  };

  const resetGame = () => {
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setSelectedCards([false, false, false, false, false]);
    setBetAmount(0);
  };

  const renderCard = (card: Card, index: number, isPlayer: boolean = true) => {
    const isSelected = isPlayer && selectedCards[index];
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.card,
          isSelected && styles.selectedCard
        ]}
        onPress={() => isPlayer && toggleCardSelection(index)}
        disabled={!isPlayer || gamePhase !== 'draw'}
      >
        <View style={styles.cardContent}>
          <Text style={[
            styles.cardValue,
            { color: ['♥️', '♦️'].includes(card.suit) ? '#ff4444' : '#000000' }
          ]}>
            {card.value}
          </Text>
          <Text style={styles.cardSuit}>{card.suit}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Text style={styles.selectedText}>HOLD</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getPaytable = () => {
    return [
      { hand: 'Royal Flush', payout: '250:1' },
      { hand: 'Straight Flush', payout: '50:1' },
      { hand: 'Four of a Kind', payout: '25:1' },
      { hand: 'Full House', payout: '9:1' },
      { hand: 'Flush', payout: '6:1' },
      { hand: 'Straight', payout: '4:1' },
      { hand: 'Three of a Kind', payout: '3:1' },
      { hand: 'Two Pair', payout: '2:1' },
      { hand: 'Jacks or Better', payout: '1:1' },
    ];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>♠️ Poker</Text>
      <Text style={styles.subtitle}>5-Card Draw - Beat the dealer!</Text>

      {/* Game Info */}
      {gameActive && (
        <View style={styles.gameInfo}>
          <Text style={styles.infoText}>Bet: PKR {betAmount}</Text>
          <Text style={styles.infoText}>
            {gamePhase === 'draw' ? 'Select cards to discard, then draw' : 'Game finished'}
          </Text>
        </View>
      )}

      {/* Dealer Hand */}
      {gameActive && gamePhase === 'finished' && (
        <View style={styles.handContainer}>
          <Text style={styles.handTitle}>Dealer Hand:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {dealerHand.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  {renderCard(card, index, false)}
                </View>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.handRank}>{getHandRank(dealerHand).name}</Text>
        </View>
      )}

      {/* Player Hand */}
      {gameActive && (
        <View style={styles.handContainer}>
          <Text style={styles.handTitle}>Your Hand:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {playerHand.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  {renderCard(card, index, true)}
                </View>
              ))}
            </View>
          </ScrollView>
          {gamePhase === 'finished' && (
            <Text style={styles.handRank}>{getHandRank(playerHand).name}</Text>
          )}
        </View>
      )}

      {/* Draw Button */}
      {gamePhase === 'draw' && (
        <TouchableOpacity style={styles.drawButton} onPress={drawCards}>
          <Text style={styles.drawButtonText}>
            Draw {selectedCards.filter(Boolean).length} Cards
          </Text>
        </TouchableOpacity>
      )}

      {/* Paytable */}
      {!gameActive && (
        <View style={styles.paytableContainer}>
          <Text style={styles.paytableTitle}>Paytable</Text>
          <View style={styles.paytable}>
            {getPaytable().map((entry, index) => (
              <View key={index} style={styles.paytableRow}>
                <Text style={styles.paytableHand}>{entry.hand}</Text>
                <Text style={styles.paytablePayout}>{entry.payout}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Betting Panel */}
      {!gameActive && (
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={startGame}
          disabled={gameActive}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  gameInfo: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 4,
  },
  handContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  handTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cardWrapper: {
    marginHorizontal: 2,
  },
  card: {
    width: 50,
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  selectedCard: {
    borderColor: Colors.primary.gold,
    borderWidth: 3,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardSuit: {
    fontSize: 16,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  handRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textAlign: 'center',
    marginTop: 8,
  },
  drawButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  drawButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  paytableContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    padding: 16,
    width: '90%',
  },
  paytableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  paytable: {
    gap: 6,
  },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paytableHand: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  paytablePayout: {
    fontSize: 14,
    color: Colors.primary.gold,
    fontWeight: 'bold',
  },
});
