// Web-specific Poker Game - Vertically Scrollable Layout
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

export default function WebPokerGame() {
  console.log('♠️ WebPokerGame component loaded');
  
  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<boolean[]>([false, false, false, false, false]);
  const [gamePhase, setGamePhase] = useState<'betting' | 'draw' | 'finished'>('betting');

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach(value => {
        let numValue = parseInt(value);
        if (value === 'A') numValue = 14;
        else if (value === 'K') numValue = 13;
        else if (value === 'Q') numValue = 12;
        else if (value === 'J') numValue = 11;
        
        deck.push({ suit, value, numValue });
      });
    });
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
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

  const getPaytable = () => {
    return [
      { hand: 'Royal Flush', payout: '250x' },
      { hand: 'Straight Flush', payout: '50x' },
      { hand: 'Four of a Kind', payout: '25x' },
      { hand: 'Full House', payout: '9x' },
      { hand: 'Flush', payout: '6x' },
      { hand: 'Straight', payout: '4x' },
      { hand: 'Three of a Kind', payout: '3x' },
      { hand: 'Two Pair', payout: '2x' },
      { hand: 'Jacks or Better', payout: '1x' },
    ];
  };

  const startGame = async (amount: number) => {
    console.log(`♠️ Starting Poker game with PKR ${amount}`);
    
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    try {
      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'poker', 'Poker bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${amount} deducted`);

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

      console.log(`🃏 Cards dealt - Player hand: ${newPlayerHand.map(c => c.value + c.suit).join(', ')}`);
    } catch (error) {
      console.error('❌ Error starting Poker game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const toggleCardSelection = (index: number) => {
    if (gamePhase !== 'draw') return;
    
    console.log(`🃏 Toggling card ${index} selection`);
    
    const newSelection = [...selectedCards];
    newSelection[index] = !newSelection[index];
    setSelectedCards(newSelection);
  };

  const drawCards = () => {
    if (gamePhase !== 'draw') return;

    console.log(`🃏 Drawing ${selectedCards.filter(Boolean).length} cards`);

    const deck = createDeck();
    let deckIndex = 10; // Skip already dealt cards
    
    const newPlayerHand = [...playerHand];
    selectedCards.forEach((selected, index) => {
      if (selected) {
        newPlayerHand[index] = deck[deckIndex++];
        console.log(`🃏 Replaced card ${index} with ${newPlayerHand[index].value}${newPlayerHand[index].suit}`);
      }
    });

    setPlayerHand(newPlayerHand);
    setGamePhase('finished');
    
    // Evaluate hands and determine winner immediately
    setTimeout(() => {
      evaluateHands(newPlayerHand);
    }, 1000);
  };

  const evaluateHands = async (finalPlayerHand: Card[]) => {
    console.log('🏁 Evaluating poker hands...');
    
    const playerResult = getHandRank(finalPlayerHand);
    const dealerResult = getHandRank(dealerHand);

    console.log(`🃏 Player hand: ${playerResult.name} (rank ${playerResult.rank})`);
    console.log(`🃏 Dealer hand: ${dealerResult.name} (rank ${dealerResult.rank})`);

    // Determine if player should win (10% win rate - REDUCED FOR HIGHER HOUSE WINS)
    const shouldPlayerWin = Math.random() < 0.1;
    console.log(`🎯 Player should win: ${shouldPlayerWin} (10% chance)`);

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
        // Allow natural wins for very strong hands (straight flush, royal flush)
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

    console.log(`💰 Game result: ${message}, Win amount: ${winAmount}`);

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      const success = await addWinnings(
        winAmount,
        'poker',
        `Poker ${message} - Player: ${playerResult.name}, Dealer: ${dealerResult.name}`
      );

      console.log(`💰 Add winnings result: ${success}`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    // Reset game immediately and show alert
    resetGame();

    const finalMessage = `${message}\nPlayer: ${playerResult.name}\nDealer: ${dealerResult.name}${isWin && winAmount > betAmount ? `\nYou won PKR ${winAmount - betAmount}!` : ''}`;
    
    Alert.alert('Poker Result', finalMessage, [{ text: 'OK' }]);
  };

  const resetGame = () => {
    console.log('🔄 Resetting Poker game...');
    console.log('🔍 Before reset - gameActive:', gameActive, 'gamePhase:', gamePhase, 'betAmount:', betAmount);
    
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setSelectedCards([false, false, false, false, false]);
    setBetAmount(0);
    
    console.log('✅ Poker game reset complete');
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log('🔍 State check after timeout - gameActive:', gameActive, 'gamePhase:', gamePhase);
    }, 100);
  };

  const renderCard = (card: Card, index: number, isSelectable = false) => {
    const isSelected = selectedCards[index];
    const isRed = card.suit === '♥️' || card.suit === '♦️';
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          isSelectable && styles.selectableCard
        ]}
        onPress={() => isSelectable && toggleCardSelection(index)}
        disabled={!isSelectable}
      >
        <Text style={[styles.cardText, isRed && styles.redCard]}>
          {card.value}
        </Text>
        <Text style={[styles.cardSuit, isRed && styles.redCard]}>
          {card.suit}
        </Text>
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Text style={styles.selectedText}>DISCARD</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  console.log('♠️ WebPokerGame rendering with balance:', balance);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>♠️ Poker</Text>
        <Text style={styles.gameSubtitle}>5-Card Draw - Beat the dealer!</Text>
      </View>

      {/* Balance Display */}
      <View style={styles.section}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Game Info */}
      {gameActive && (
        <View style={styles.section}>
          <View style={styles.gameInfoCard}>
            <Text style={styles.gameInfoText}>Bet: PKR {betAmount}</Text>
            <Text style={styles.gameInfoText}>
              {gamePhase === 'draw' ? 'Select cards to discard, then draw' : 'Game finished'}
            </Text>
          </View>
        </View>
      )}

      {/* Dealer Hand */}
      {gameActive && gamePhase === 'finished' && (
        <View style={styles.section}>
          <View style={styles.handContainer}>
            <Text style={styles.handTitle}>Dealer's Hand:</Text>
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
        </View>
      )}

      {/* Player Hand */}
      {gameActive && (
        <View style={styles.section}>
          <View style={styles.handContainer}>
            <Text style={styles.handTitle}>Your Hand:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.cardsContainer}>
                {playerHand.map((card, index) => (
                  <View key={index} style={styles.cardWrapper}>
                    {renderCard(card, index, gamePhase === 'draw')}
                  </View>
                ))}
              </View>
            </ScrollView>
            {gamePhase === 'finished' && (
              <Text style={styles.handRank}>{getHandRank(playerHand).name}</Text>
            )}
          </View>
        </View>
      )}

      {/* Draw Button */}
      {gamePhase === 'draw' && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.drawButton} onPress={drawCards}>
            <Text style={styles.drawButtonText}>
              Draw {selectedCards.filter(Boolean).length} Cards
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Paytable */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paytable</Text>
        <View style={styles.paytableCard}>
          {getPaytable().map((entry, index) => (
            <View key={index} style={styles.paytableRow}>
              <Text style={styles.paytableHand}>{entry.hand}</Text>
              <Text style={styles.paytablePayout}>{entry.payout}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Betting Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Your Bet</Text>
        {!gameActive ? (
          <BettingPanel
            balance={balance}
            minBet={10}
            maxBet={balance || 1000}
            onBet={startGame}
            disabled={gameActive}
          />
        ) : (
          <View style={styles.gameActiveCard}>
            <Text style={styles.gameActiveText}>🎮 Game in Progress</Text>
            <Text style={styles.gameActiveSubtext}>
              Bet: PKR {betAmount} | {gamePhase === 'draw' ? 'Select cards to discard' : 'Evaluating hands...'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textAlign: 'center',
    marginBottom: 5,
  },
  gameSubtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  gameInfoCard: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  gameInfoText: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 5,
    textAlign: 'center',
  },
  handContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  handTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  handRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    textAlign: 'center',
    marginTop: 10,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginHorizontal: 3,
  },
  card: {
    width: 60,
    height: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  selectableCard: {
    borderColor: Colors.primary.neonCyan,
    borderWidth: 2,
  },
  selectedCard: {
    backgroundColor: '#FFE4E1',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  cardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  cardSuit: {
    fontSize: 18,
    marginTop: 2,
  },
  redCard: {
    color: '#DC143C',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  drawButton: {
    backgroundColor: Colors.primary.gold,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  drawButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  paytableCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  paytableHand: {
    fontSize: 14,
    color: Colors.primary.text,
  },
  paytablePayout: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.gold,
  },
  gameActiveCard: {
    backgroundColor: Colors.primary.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  gameActiveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 5,
  },
  gameActiveSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
