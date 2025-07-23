// Blackjack Game for Adola App
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
import WebBlackjackGame from './web/WebBlackjackGame';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 350);

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

export default function BlackjackGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebBlackjackGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<'betting' | 'playing' | 'dealer' | 'finished'>('betting');
  const [showDealerCard, setShowDealerCard] = useState(false);

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach(value => {
        let numValue = parseInt(value);
        if (value === 'A') numValue = 11;
        else if (['J', 'Q', 'K'].includes(value)) numValue = 10;
        
        deck.push({ suit, value, numValue });
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

  const calculateScore = (hand: Card[]): number => {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
      if (card.value === 'A') {
        aces++;
        score += 11;
      } else {
        score += card.numValue;
      }
    });

    // Adjust for aces
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  };

  const startGame = async (amount: number) => {
    // Check if user can place bet
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Step 1: Deduct bet amount immediately
    const betPlaced = await placeBet(amount, 'blackjack', 'Blackjack bet placed');
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setBetAmount(amount);
    setGameActive(true);
    setGamePhase('playing');
    setShowDealerCard(false);

    const deck = createDeck();
    const newPlayerHand = [deck[0], deck[2]];
    const newDealerHand = [deck[1], deck[3]];

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setPlayerScore(calculateScore(newPlayerHand));
    setDealerScore(calculateScore([newDealerHand[0]])); // Only show first card

    // Check for blackjack
    if (calculateScore(newPlayerHand) === 21) {
      setShowDealerCard(true);
      const dealerTotal = calculateScore(newDealerHand);
      if (dealerTotal === 21) {
        endGame('push');
      } else {
        endGame('blackjack');
      }
    }
  };

  const hit = () => {
    if (gamePhase !== 'playing') return;

    const deck = createDeck();
    const newCard = deck[0];
    const newPlayerHand = [...playerHand, newCard];
    const newScore = calculateScore(newPlayerHand);

    setPlayerHand(newPlayerHand);
    setPlayerScore(newScore);

    if (newScore > 21) {
      setShowDealerCard(true);
      endGame('bust');
    }
  };

  const stand = () => {
    if (gamePhase !== 'playing') return;

    setGamePhase('dealer');
    setShowDealerCard(true);
    dealerPlay();
  };

  const dealerPlay = () => {
    let currentDealerHand = [...dealerHand];
    let currentDealerScore = calculateScore(currentDealerHand);

    // Determine if player should win (20% win rate)
    const shouldPlayerWin = Math.random() < 0.2;

    const dealerHitInterval = setInterval(() => {
      if (shouldPlayerWin) {
        // Player should win - make dealer play to lose
        if (currentDealerScore < 17 || (currentDealerScore < 21 && currentDealerScore <= playerScore)) {
          const deck = createDeck();
          const newCard = deck[0];
          currentDealerHand = [...currentDealerHand, newCard];
          currentDealerScore = calculateScore(currentDealerHand);

          setDealerHand(currentDealerHand);
          setDealerScore(currentDealerScore);
        } else {
          clearInterval(dealerHitInterval);

          // Determine winner (favor player)
          if (currentDealerScore > 21) {
            endGame('dealer_bust');
          } else if (currentDealerScore < playerScore) {
            endGame('player_win');
          } else if (currentDealerScore > playerScore) {
            endGame('dealer_win');
          } else {
            endGame('push');
          }
        }
      } else {
        // Player should lose - use standard blackjack rules (favor dealer)
        if (currentDealerScore < 17) {
          const deck = createDeck();
          const newCard = deck[0];
          currentDealerHand = [...currentDealerHand, newCard];
          currentDealerScore = calculateScore(currentDealerHand);

          setDealerHand(currentDealerHand);
          setDealerScore(currentDealerScore);
        } else {
          clearInterval(dealerHitInterval);

          // Determine winner (standard rules)
          if (currentDealerScore > 21) {
            endGame('dealer_bust');
          } else if (currentDealerScore > playerScore) {
            endGame('dealer_win');
          } else if (currentDealerScore < playerScore) {
            endGame('player_win');
          } else {
            endGame('push');
          }
        }
      }
    }, 1000);
  };

  const endGame = async (result: string) => {
    setGamePhase('finished');
    let winAmount = 0;
    let isWin = false;
    let message = '';

    switch (result) {
      case 'blackjack':
        winAmount = Math.floor(betAmount * 2.5); // 3:2 payout
        isWin = true;
        message = 'Blackjack! You win!';
        break;
      case 'player_win':
        winAmount = betAmount * 2;
        isWin = true;
        message = 'You win!';
        break;
      case 'dealer_bust':
        winAmount = betAmount * 2;
        isWin = true;
        message = 'Dealer busts! You win!';
        break;
      case 'push':
        winAmount = betAmount; // Return bet
        isWin = true;
        message = 'Push! It\'s a tie!';
        break;
      case 'bust':
        message = 'Bust! You lose!';
        break;
      case 'dealer_win':
        message = 'Dealer wins!';
        break;
    }

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      await addWinnings(
        winAmount,
        'blackjack',
        `Blackjack ${result} - Player: ${playerScore}, Dealer: ${calculateScore(dealerHand)}`
      );

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    Alert.alert(
      'Game Over',
      `${message}\nPlayer: ${playerScore}, Dealer: ${calculateScore(dealerHand)}${isWin && winAmount > betAmount ? `\nYou won PKR ${winAmount - betAmount}!` : ''}`,
      [{ text: 'OK', onPress: resetGame }]
    );
  };

  const resetGame = () => {
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setShowDealerCard(false);
    setBetAmount(0);
  };

  const renderCard = (card: Card, hidden: boolean = false) => {
    return (
      <View style={styles.card}>
        {hidden ? (
          <Text style={styles.cardBack}>🂠</Text>
        ) : (
          <View style={styles.cardContent}>
            <Text style={[
              styles.cardValue,
              { color: ['♥️', '♦️'].includes(card.suit) ? '#ff4444' : '#000000' }
            ]}>
              {card.value}
            </Text>
            <Text style={styles.cardSuit}>{card.suit}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>♠️ Blackjack</Text>
      <Text style={styles.subtitle}>Get as close to 21 as possible without going over!</Text>

      {/* Game Info */}
      {gameActive && (
        <View style={styles.gameInfo}>
          <Text style={styles.infoText}>Bet: PKR {betAmount}</Text>
          <Text style={styles.infoText}>
            Goal: Beat dealer without going over 21
          </Text>
        </View>
      )}

      {/* Dealer Hand */}
      {gameActive && (
        <View style={styles.handContainer}>
          <Text style={styles.handTitle}>
            Dealer: {showDealerCard ? calculateScore(dealerHand) : '?'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {dealerHand.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  {renderCard(card, index === 1 && !showDealerCard)}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Player Hand */}
      {gameActive && (
        <View style={styles.handContainer}>
          <Text style={styles.handTitle}>Player: {playerScore}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {playerHand.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  {renderCard(card)}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Game Actions */}
      {gamePhase === 'playing' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={hit}>
            <Text style={styles.actionButtonText}>Hit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.standButton]} onPress={stand}>
            <Text style={styles.actionButtonText}>Stand</Text>
          </TouchableOpacity>
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
    marginHorizontal: 4,
  },
  card: {
    width: 60,
    height: 84,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSuit: {
    fontSize: 20,
  },
  cardBack: {
    fontSize: 40,
    color: Colors.primary.neonCyan,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
  },
  actionButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  standButton: {
    backgroundColor: Colors.primary.hotPink,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
});
