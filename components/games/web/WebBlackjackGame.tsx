// Web-specific Blackjack Game - Vertically Scrollable Layout
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

export default function WebBlackjackGame() {
  console.log('♠️ WebBlackjackGame component loaded');
  
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
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
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
    console.log(`♠️ Starting Blackjack game with PKR ${amount}`);
    
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    try {
      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'blackjack', 'Blackjack bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${amount} deducted`);

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

      console.log(`🃏 Cards dealt - Player: ${calculateScore(newPlayerHand)}, Dealer: ${calculateScore([newDealerHand[0]])}`);

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
    } catch (error) {
      console.error('❌ Error starting Blackjack game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const hit = () => {
    if (gamePhase !== 'playing') return;

    console.log('🃏 Player hits');
    
    const deck = createDeck();
    const newCard = deck[0];
    const newPlayerHand = [...playerHand, newCard];
    const newScore = calculateScore(newPlayerHand);

    setPlayerHand(newPlayerHand);
    setPlayerScore(newScore);

    console.log(`🃏 Player drew ${newCard.value}${newCard.suit}, new score: ${newScore}`);

    if (newScore > 21) {
      setShowDealerCard(true);
      endGame('bust');
    }
  };

  const stand = async () => {
    if (gamePhase !== 'playing') return;

    console.log('🛑 Player stands');
    setGamePhase('dealer');
    setShowDealerCard(true);
    
    // Process dealer play immediately instead of using interval
    await dealerPlay();
  };

  const dealerPlay = async (): Promise<void> => {
    return new Promise((resolve) => {
      console.log('🤖 Dealer starts playing');
      
      let currentDealerHand = [...dealerHand];
      let currentDealerScore = calculateScore(currentDealerHand);
      
      console.log(`🤖 Dealer initial score: ${currentDealerScore}`);

      // Determine if player should win (10% win rate - REDUCED FOR HIGHER HOUSE WINS)
      const shouldPlayerWin = Math.random() < 0.1;
      console.log(`🎯 Player should win: ${shouldPlayerWin} (10% chance)`);

      const dealerTurn = () => {
        if (shouldPlayerWin) {
          // Player should win - make dealer play to lose
          if (currentDealerScore < 17 || (currentDealerScore < 21 && currentDealerScore <= playerScore)) {
            const deck = createDeck();
            const newCard = deck[0];
            currentDealerHand = [...currentDealerHand, newCard];
            currentDealerScore = calculateScore(currentDealerHand);

            console.log(`🤖 Dealer drew ${newCard.value}${newCard.suit}, new score: ${currentDealerScore}`);

            setDealerHand([...currentDealerHand]);
            setDealerScore(currentDealerScore);

            setTimeout(dealerTurn, 1000);
          } else {
            // Determine winner (favor player)
            console.log('🏁 Dealer finished playing');
            setTimeout(() => {
              if (currentDealerScore > 21) {
                endGame('dealer_bust');
              } else if (currentDealerScore < playerScore) {
                endGame('player_win');
              } else if (currentDealerScore > playerScore) {
                endGame('dealer_win');
              } else {
                endGame('push');
              }
              resolve();
            }, 500);
          }
        } else {
          // Player should lose - use standard blackjack rules
          if (currentDealerScore < 17) {
            const deck = createDeck();
            const newCard = deck[0];
            currentDealerHand = [...currentDealerHand, newCard];
            currentDealerScore = calculateScore(currentDealerHand);

            console.log(`🤖 Dealer drew ${newCard.value}${newCard.suit}, new score: ${currentDealerScore}`);

            setDealerHand([...currentDealerHand]);
            setDealerScore(currentDealerScore);

            setTimeout(dealerTurn, 1000);
          } else {
            // Determine winner (standard rules)
            console.log('🏁 Dealer finished playing');
            setTimeout(() => {
              if (currentDealerScore > 21) {
                endGame('dealer_bust');
              } else if (currentDealerScore > playerScore) {
                endGame('dealer_win');
              } else if (currentDealerScore < playerScore) {
                endGame('player_win');
              } else {
                endGame('push');
              }
              resolve();
            }, 500);
          }
        }
      };

      // Start dealer turn after a short delay
      setTimeout(dealerTurn, 1000);
    });
  };

  const endGame = async (result: string) => {
    console.log(`🏁 Game ended with result: ${result}`);
    
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

    console.log(`💰 Game result: ${message}, Win amount: ${winAmount}`);

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      const success = await addWinnings(
        winAmount,
        'blackjack',
        `Blackjack ${result} - Player: ${playerScore}, Dealer: ${calculateScore(dealerHand)}`
      );

      console.log(`💰 Add winnings result: ${success}`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    // Reset game immediately and show alert
    resetGame();

    const finalMessage = `${message}\nPlayer: ${playerScore}, Dealer: ${calculateScore(dealerHand)}${isWin && winAmount > betAmount ? `\nYou won PKR ${winAmount - betAmount}!` : ''}`;
    
    Alert.alert('Game Over', finalMessage, [{ text: 'OK' }]);
  };

  const resetGame = () => {
    console.log('🔄 Resetting Blackjack game...');
    
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setShowDealerCard(false);
    setBetAmount(0);
    
    console.log('✅ Blackjack game reset complete');
  };

  const renderCard = (card: Card, isHidden = false) => {
    if (isHidden) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardBack}>🂠</Text>
        </View>
      );
    }

    const isRed = card.suit === '♥️' || card.suit === '♦️';
    
    return (
      <View style={styles.card}>
        <Text style={[styles.cardText, isRed && styles.redCard]}>
          {card.value}
        </Text>
        <Text style={[styles.cardSuit, isRed && styles.redCard]}>
          {card.suit}
        </Text>
      </View>
    );
  };

  console.log('♠️ WebBlackjackGame rendering with balance:', balance);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>♠️ Blackjack</Text>
        <Text style={styles.gameSubtitle}>Beat the dealer without going over 21!</Text>
      </View>

      {/* Balance Display */}
      <View style={styles.section}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Game Area */}
      {gameActive && (
        <View style={styles.section}>
          {/* Dealer Hand */}
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

          {/* Player Hand */}
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

          {gamePhase === 'dealer' && (
            <View style={styles.dealerTurnContainer}>
              <Text style={styles.dealerTurnText}>🤖 Dealer's Turn...</Text>
            </View>
          )}
        </View>
      )}

      {/* Game Rules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.rulesCard}>
          <Text style={styles.ruleText}>• Get as close to 21 as possible without going over</Text>
          <Text style={styles.ruleText}>• Face cards (J, Q, K) are worth 10 points</Text>
          <Text style={styles.ruleText}>• Aces are worth 11 or 1 (whichever is better)</Text>
          <Text style={styles.ruleText}>• Dealer must hit on 16 and stand on 17</Text>
          <Text style={styles.ruleText}>• Blackjack (21 with 2 cards) pays 3:2</Text>
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
              Bet: PKR {betAmount} | {gamePhase === 'playing' ? 'Choose Hit or Stand' : 'Dealer playing...'}
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
  handContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
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
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginHorizontal: 5,
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
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  cardSuit: {
    fontSize: 20,
    marginTop: 2,
  },
  redCard: {
    color: '#DC143C',
  },
  cardBack: {
    fontSize: 30,
    color: '#4169E1',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  standButton: {
    backgroundColor: Colors.primary.gold,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  dealerTurnContainer: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  dealerTurnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  rulesCard: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  ruleText: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 8,
    lineHeight: 20,
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
