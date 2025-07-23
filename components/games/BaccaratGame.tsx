// Baccarat Game for Adola App
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
import WebBaccaratGame from './web/WebBaccaratGame';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 350);

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

export default function BaccaratGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebBaccaratGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [betType, setBetType] = useState<'player' | 'banker' | 'tie'>('player');
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [bankerScore, setBankerScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<'betting' | 'dealing' | 'finished'>('betting');
  const [gameWinProbability, setGameWinProbability] = useState(0);
  const [engagementBonus, setEngagementBonus] = useState<string>('');

  const gameLogicService = AdvancedGameLogicService.getInstance();

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach(value => {
        let numValue = parseInt(value);
        if (value === 'A') numValue = 1;
        else if (['J', 'Q', 'K'].includes(value)) numValue = 0;
        else if (value === '10') numValue = 0;
        
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
    const total = hand.reduce((sum, card) => sum + card.numValue, 0);
    return total % 10; // Baccarat score is always 0-9
  };

  const needsThirdCard = (score: number, isPlayer: boolean, playerThirdCard?: Card): boolean => {
    if (isPlayer) {
      return score <= 5;
    } else {
      // Banker rules are more complex
      if (score <= 2) return true;
      if (score >= 7) return false;
      
      if (!playerThirdCard) {
        return score <= 5;
      }
      
      const playerThirdValue = playerThirdCard.numValue;
      
      switch (score) {
        case 3: return playerThirdValue !== 8;
        case 4: return [2, 3, 4, 5, 6, 7].includes(playerThirdValue);
        case 5: return [4, 5, 6, 7].includes(playerThirdValue);
        case 6: return [6, 7].includes(playerThirdValue);
        default: return false;
      }
    }
  };

  const startGame = async (amount: number, selectedBetType: 'player' | 'banker' | 'tie') => {
    try {
      // Check if user can place bet using advanced game logic
      if (!gameLogicService.canPlayGame(amount, balance || 0, 'baccarat')) {
        const message = gameLogicService.getBalanceValidationMessage(amount, balance || 0, 'baccarat');
        Alert.alert('Cannot Place Bet', message);
        return;
      }

      if (!user?.id) {
        Alert.alert('Error', 'User not found. Please try again.');
        return;
      }

      // Calculate win probability using advanced game logic
      const basePayout = selectedBetType === 'tie' ? 8 : selectedBetType === 'banker' ? 1.95 : 2;
      const { probability, engagementBonus: bonus } = await gameLogicService.calculateWinProbability({
        betAmount: amount,
        basePayout,
        gameType: 'baccarat',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { betType: selectedBetType }
      });

      setGameWinProbability(probability);
      setEngagementBonus(bonus);

      console.log(`🎯 Baccarat Game: Win probability ${(probability * 100).toFixed(1)}%, Bet: ${selectedBetType}`);
      if (bonus) {
        console.log(`🎯 Engagement bonus: ${bonus}`);
      }

      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'baccarat', `Baccarat bet - ${selectedBetType}`);
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);

    setBetAmount(amount);
    setBetType(selectedBetType);
    setGameActive(true);
    setGamePhase('dealing');

    const deck = createDeck();
    let deckIndex = 0;

    // Deal initial cards
    const initialPlayerHand = [deck[deckIndex++], deck[deckIndex++]];
    const initialBankerHand = [deck[deckIndex++], deck[deckIndex++]];

    setPlayerHand(initialPlayerHand);
    setBankerHand(initialBankerHand);

    const initialPlayerScore = calculateScore(initialPlayerHand);
    const initialBankerScore = calculateScore(initialBankerHand);

    setPlayerScore(initialPlayerScore);
    setBankerScore(initialBankerScore);

    // Check for natural win (8 or 9)
    if (initialPlayerScore >= 8 || initialBankerScore >= 8) {
      setTimeout(() => {
        evaluateGame(initialPlayerHand, initialBankerHand);
      }, 2000);
      return;
    }

    // Third card rules
    setTimeout(() => {
      let finalPlayerHand = [...initialPlayerHand];
      let finalBankerHand = [...initialBankerHand];
      let playerThirdCard: Card | undefined;

      // Player third card
      if (needsThirdCard(initialPlayerScore, true)) {
        playerThirdCard = deck[deckIndex++];
        finalPlayerHand.push(playerThirdCard);
        setPlayerHand(finalPlayerHand);
        setPlayerScore(calculateScore(finalPlayerHand));
      }

      // Banker third card
      setTimeout(() => {
        if (needsThirdCard(initialBankerScore, false, playerThirdCard)) {
          finalBankerHand.push(deck[deckIndex++]);
          setBankerHand(finalBankerHand);
          setBankerScore(calculateScore(finalBankerHand));
        }

        setTimeout(() => {
          evaluateGame(finalPlayerHand, finalBankerHand);
        }, 1000);
      }, 1000);
    }, 2000);
    } catch (error) {
      console.error('❌ Error starting Baccarat game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const evaluateGame = async (finalPlayerHand: Card[], finalBankerHand: Card[]) => {
    setGamePhase('finished');

    const finalPlayerScore = calculateScore(finalPlayerHand);
    const finalBankerScore = calculateScore(finalBankerHand);

    if (!user?.id) {
      console.error('❌ User ID not found for Baccarat game evaluation');
      return;
    }

    try {
      // Use advanced game logic to determine win/loss
      const basePayout = betType === 'tie' ? 8 : betType === 'banker' ? 1.95 : 2;
      const gameResult = await gameLogicService.calculateAdvancedGameResult({
        betAmount,
        basePayout,
        gameType: 'baccarat',
        userId: user.id,
        currentBalance: balance || 0,
        gameSpecificData: { betType, finalPlayerScore, finalBankerScore }
      });

      let actualWinner: 'player' | 'banker' | 'tie';
      let naturalResult = false;

      // Determine natural game outcome
      if (finalPlayerScore > finalBankerScore) {
        actualWinner = 'player';
        naturalResult = true;
      } else if (finalBankerScore > finalPlayerScore) {
        actualWinner = 'banker';
        naturalResult = true;
      } else {
        actualWinner = 'tie';
        naturalResult = true;
      }

      // Apply advanced game logic - override natural result if needed for house edge
      let gameWinner = actualWinner;
      if (!naturalResult || Math.random() < (1 - gameWinProbability)) {
        // Use advanced logic to determine winner based on user behavior
        if (gameResult.won) {
          gameWinner = betType; // Player wins their bet
        } else {
          // Player loses - pick a different winner
          if (betType === 'player') {
            gameWinner = Math.random() < 0.5 ? 'banker' : 'tie';
          } else if (betType === 'banker') {
            gameWinner = Math.random() < 0.5 ? 'player' : 'tie';
          } else {
            gameWinner = Math.random() < 0.5 ? 'player' : 'banker';
          }
        }
      }

      let winAmount = 0;
      let isWin = false;
      let message = '';

      // Calculate winnings based on final game winner
      if (gameWinner === betType) {
        isWin = true;
        if (gameResult.won) {
          winAmount = gameResult.winAmount;
        } else {
          // Fallback calculation
          winAmount = betType === 'tie' ? betAmount * 9 :
                     betType === 'banker' ? Math.floor(betAmount * 1.95) :
                     betAmount * 2;
        }
        message = `${gameWinner.charAt(0).toUpperCase() + gameWinner.slice(1)} wins!`;
      } else if (gameWinner === 'tie' && betType !== 'tie') {
        // Tie returns bet for player/banker bets
        winAmount = betAmount;
        isWin = true;
        message = 'Tie - bet returned';
      } else {
        message = `${gameWinner.charAt(0).toUpperCase() + gameWinner.slice(1)} wins - you lose`;
      }

      console.log(`🃏 Baccarat: Win probability: ${(gameWinProbability * 100).toFixed(1)}%, Bet: ${betType}, Winner: ${gameWinner}, Won: ${isWin}`);
      console.log(`📊 Adjusted probability: ${((gameResult.adjustedProbability || 0) * 100).toFixed(1)}%, House edge: ${((gameResult.houseEdge || 0) * 100).toFixed(1)}%`);

      // Log the game result for analytics
      await gameLogicService.logGameResult(user.id, 'baccarat', {
        ...gameResult,
        won: isWin,
        winAmount: isWin ? winAmount : 0
      }, {
        betType,
        gameWinner,
        naturalWinner: actualWinner,
        finalPlayerScore,
        finalBankerScore,
        adjustedProbability: gameResult.adjustedProbability,
        houseEdge: gameResult.houseEdge
      });

      // Step 2: Add winnings if player won
      if (isWin && winAmount > 0) {
        await addWinnings(
          winAmount,
          'baccarat',
          `Baccarat ${gameWinner} wins - Player: ${finalPlayerScore}, Banker: ${finalBankerScore}, Bet: ${betType}`
        );

        // Force balance refresh to ensure UI updates
        setTimeout(() => refreshBalance(), 500);
      }

      let alertMessage = `${message}\nPlayer: ${finalPlayerScore}, Banker: ${finalBankerScore}\nYour bet: ${betType.toUpperCase()}`;
      if (isWin && winAmount > betAmount) {
        alertMessage += `\nYou won PKR ${(winAmount - betAmount).toLocaleString()}!`;
      }
      if (gameResult.engagementBonus) {
        alertMessage += `\n\n🎯 ${gameResult.engagementBonus}`;
      }

      Alert.alert('Baccarat Result', alertMessage, [{ text: 'OK', onPress: resetGame }]);
    } catch (error) {
      console.error('❌ Error in Baccarat evaluateGame:', error);
      Alert.alert('Error', 'An error occurred while evaluating the game.', [{ text: 'OK', onPress: resetGame }]);
    }
  };

  const resetGame = () => {
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setBankerHand([]);
    setPlayerScore(0);
    setBankerScore(0);
    setBetAmount(0);
    setGameWinProbability(0);
    setEngagementBonus('');
  };

  const renderCard = (card: Card) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={[
            styles.cardValue,
            { color: ['♥️', '♦️'].includes(card.suit) ? '#ff4444' : '#000000' }
          ]}>
            {card.value}
          </Text>
          <Text style={styles.cardSuit}>{card.suit}</Text>
        </View>
      </View>
    );
  };

  const getBetTypeMultiplier = (type: 'player' | 'banker' | 'tie') => {
    switch (type) {
      case 'player': return '1:1';
      case 'banker': return '0.95:1';
      case 'tie': return '8:1';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎴 Baccarat</Text>
      <Text style={styles.subtitle}>Player vs Banker - Choose your side!</Text>

      {/* Bet Type Selection */}
      {!gameActive && (
        <View style={styles.betTypeContainer}>
          <Text style={styles.sectionTitle}>Choose Your Bet:</Text>
          <View style={styles.betTypes}>
            {(['player', 'banker', 'tie'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.betTypeButton,
                  betType === type && styles.selectedBetType
                ]}
                onPress={() => setBetType(type)}
              >
                <Text style={styles.betTypeText}>{type.toUpperCase()}</Text>
                <Text style={styles.betTypeMultiplier}>{getBetTypeMultiplier(type)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Game Info */}
      {gameActive && (
        <View style={styles.gameInfo}>
          <Text style={styles.infoText}>Bet: PKR {betAmount} on {betType.toUpperCase()}</Text>
          <Text style={styles.infoText}>
            {gamePhase === 'dealing' ? 'Dealing cards...' : 'Game finished'}
          </Text>
        </View>
      )}

      {/* Banker Hand */}
      {gameActive && (
        <View style={styles.handContainer}>
          <Text style={styles.handTitle}>Banker: {bankerScore}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {bankerHand.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  {renderCard(card)}
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

      {/* Rules */}
      {!gameActive && (
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>How to Play:</Text>
          <Text style={styles.rulesText}>• Choose Player, Banker, or Tie</Text>
          <Text style={styles.rulesText}>• Closest to 9 wins</Text>
          <Text style={styles.rulesText}>• Cards: A=1, 2-9=face value, 10/J/Q/K=0</Text>
          <Text style={styles.rulesText}>• Banker bet has 5% commission</Text>
        </View>
      )}

      {/* Betting Panel */}
      {!gameActive && (
        <BettingPanel
          balance={balance}
          minBet={10}
          maxBet={balance || 1000}
          onBet={(amount) => startGame(amount, betType)}
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
  betTypeContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  betTypes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  betTypeButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  selectedBetType: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  betTypeText: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  betTypeMultiplier: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
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
  rulesContainer: {
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  rulesText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
});
