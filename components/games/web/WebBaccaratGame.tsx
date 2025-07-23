// Web-specific Baccarat Game - Vertically Scrollable Layout
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

export default function WebBaccaratGame() {
  console.log('🎴 WebBaccaratGame component loaded');
  
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
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  };

  const calculateScore = (hand: Card[]): number => {
    const total = hand.reduce((sum, card) => sum + card.numValue, 0);
    return total % 10; // Baccarat scoring - only last digit matters
  };

  const needsThirdCard = (score: number, isPlayer: boolean, playerThirdCard?: Card): boolean => {
    if (score >= 8) return false; // Natural 8 or 9
    
    if (isPlayer) {
      return score <= 5; // Player draws on 0-5, stands on 6-7
    } else {
      // Banker rules are more complex
      if (score <= 2) return true;
      if (score >= 7) return false;
      
      if (!playerThirdCard) {
        return score <= 5; // If player didn't draw, banker follows player rules
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

  const getBetTypeMultiplier = (type: 'player' | 'banker' | 'tie'): string => {
    switch (type) {
      case 'player': return '2:1';
      case 'banker': return '1.95:1';
      case 'tie': return '8:1';
    }
  };

  const startGame = async (amount: number, selectedBetType: 'player' | 'banker' | 'tie') => {
    console.log(`🎴 Starting Baccarat game with PKR ${amount}, bet type: ${selectedBetType}`);
    
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    try {
      // Step 1: Deduct bet amount immediately
      const betPlaced = await placeBet(amount, 'baccarat', 'Baccarat bet placed');
      if (!betPlaced) {
        Alert.alert('Error', 'Failed to place bet. Please try again.');
        return;
      }

      console.log(`✅ Bet placed successfully: PKR ${amount} deducted, bet type: ${selectedBetType}`);

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

      console.log(`🃏 Initial cards dealt - Player: ${initialPlayerScore}, Banker: ${initialBankerScore}`);

      // Check for natural win (8 or 9)
      if (initialPlayerScore >= 8 || initialBankerScore >= 8) {
        console.log('🎯 Natural win detected');
        setTimeout(() => {
          evaluateGame(initialPlayerHand, initialBankerHand);
        }, 2000);
        return;
      }

      // Deal third cards according to Baccarat rules
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
          console.log(`🃏 Player drew third card: ${playerThirdCard.value}${playerThirdCard.suit}`);
        }

        // Banker third card
        setTimeout(() => {
          if (needsThirdCard(initialBankerScore, false, playerThirdCard)) {
            const bankerThirdCard = deck[deckIndex++];
            finalBankerHand.push(bankerThirdCard);
            setBankerHand(finalBankerHand);
            setBankerScore(calculateScore(finalBankerHand));
            console.log(`🃏 Banker drew third card: ${bankerThirdCard.value}${bankerThirdCard.suit}`);
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
    console.log('🏁 Evaluating Baccarat game...');
    
    setGamePhase('finished');

    const finalPlayerScore = calculateScore(finalPlayerHand);
    const finalBankerScore = calculateScore(finalBankerHand);

    console.log(`🃏 Final scores - Player: ${finalPlayerScore}, Banker: ${finalBankerScore}`);
    console.log(`🎯 Player bet on: ${betType}`);

    // Determine natural game outcome
    let actualWinner: 'player' | 'banker' | 'tie';
    if (finalPlayerScore > finalBankerScore) {
      actualWinner = 'player';
    } else if (finalBankerScore > finalPlayerScore) {
      actualWinner = 'banker';
    } else {
      actualWinner = 'tie';
    }

    console.log(`🎯 Natural winner: ${actualWinner}`);

    // Determine if player should win (8% win rate - REDUCED FOR HIGHER HOUSE WINS)
    const shouldPlayerWin = Math.random() < 0.08;
    console.log(`🎯 Player should win: ${shouldPlayerWin} (8% chance)`);

    let gameWinner = actualWinner;
    
    // Apply 20% win rate logic
    if (shouldPlayerWin) {
      // Player should win - make their bet the winner
      gameWinner = betType;
      console.log(`🎯 Forcing player win: ${gameWinner}`);
    } else {
      // Player should lose - if they bet on the natural winner, change the outcome
      if (betType === actualWinner) {
        // Pick a different winner
        if (betType === 'player') {
          gameWinner = Math.random() < 0.5 ? 'banker' : 'tie';
        } else if (betType === 'banker') {
          gameWinner = Math.random() < 0.5 ? 'player' : 'tie';
        } else {
          gameWinner = Math.random() < 0.5 ? 'player' : 'banker';
        }
        console.log(`🎯 Forcing player loss: changed winner from ${actualWinner} to ${gameWinner}`);
      }
    }

    // Calculate winnings
    let winAmount = 0;
    let isWin = false;
    let message = '';

    if (gameWinner === betType) {
      isWin = true;
      switch (betType) {
        case 'player':
          winAmount = betAmount * 2;
          message = 'Player wins! You win!';
          break;
        case 'banker':
          winAmount = Math.floor(betAmount * 1.95); // 5% commission
          message = 'Banker wins! You win!';
          break;
        case 'tie':
          winAmount = betAmount * 8;
          message = 'Tie! You win!';
          break;
      }
    } else {
      message = `${gameWinner.charAt(0).toUpperCase() + gameWinner.slice(1)} wins! You lose.`;
    }

    console.log(`💰 Game result: ${message}, Win amount: ${winAmount}`);

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      const success = await addWinnings(
        winAmount,
        'baccarat',
        `Baccarat ${gameWinner} wins - Player: ${finalPlayerScore}, Banker: ${finalBankerScore}, Bet: ${betType}`
      );

      console.log(`💰 Add winnings result: ${success}`);

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
    }

    // Reset game immediately and show alert
    resetGame();

    let alertMessage = `${message}\nPlayer: ${finalPlayerScore}, Banker: ${finalBankerScore}\nYour bet: ${betType.toUpperCase()}`;
    if (isWin && winAmount > betAmount) {
      alertMessage += `\nYou won PKR ${(winAmount - betAmount).toLocaleString()}!`;
    }
    
    Alert.alert('Baccarat Result', alertMessage, [{ text: 'OK' }]);
  };

  const resetGame = () => {
    console.log('🔄 Resetting Baccarat game...');
    console.log('🔍 Before reset - gameActive:', gameActive, 'gamePhase:', gamePhase, 'betAmount:', betAmount);
    
    setGameActive(false);
    setGamePhase('betting');
    setPlayerHand([]);
    setBankerHand([]);
    setPlayerScore(0);
    setBankerScore(0);
    setBetAmount(0);
    
    console.log('✅ Baccarat game reset complete');
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log('🔍 State check after timeout - gameActive:', gameActive, 'gamePhase:', gamePhase);
    }, 100);
  };

  const renderCard = (card: Card) => {
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

  console.log('🎴 WebBaccaratGame rendering with balance:', balance);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Game Title */}
      <View style={styles.section}>
        <Text style={styles.gameTitle}>🎴 Baccarat</Text>
        <Text style={styles.gameSubtitle}>Player vs Banker - Choose your side!</Text>
      </View>

      {/* Balance Display */}
      <View style={styles.section}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>PKR {balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Bet Type Selection */}
      {!gameActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Bet</Text>
          <View style={styles.betTypesContainer}>
            {(['player', 'banker', 'tie'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.betTypeButton,
                  betType === type && styles.selectedBetType
                ]}
                onPress={() => setBetType(type)}
              >
                <Text style={[styles.betTypeText, betType === type && styles.selectedBetTypeText]}>
                  {type.toUpperCase()}
                </Text>
                <Text style={[styles.betTypeMultiplier, betType === type && styles.selectedBetTypeText]}>
                  {getBetTypeMultiplier(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Game Area */}
      {gameActive && (
        <View style={styles.section}>
          {/* Game Info */}
          <View style={styles.gameInfoCard}>
            <Text style={styles.gameInfoText}>Bet: PKR {betAmount} on {betType.toUpperCase()}</Text>
            <Text style={styles.gameInfoText}>
              {gamePhase === 'dealing' ? 'Dealing cards...' : 'Game finished'}
            </Text>
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

          {/* Banker Hand */}
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
        </View>
      )}

      {/* Game Rules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Play</Text>
        <View style={styles.rulesCard}>
          <Text style={styles.ruleText}>• Choose Player, Banker, or Tie</Text>
          <Text style={styles.ruleText}>• Closest to 9 wins</Text>
          <Text style={styles.ruleText}>• Cards: A=1, 2-9=face value, 10/J/Q/K=0</Text>
          <Text style={styles.ruleText}>• Only last digit of total counts</Text>
          <Text style={styles.ruleText}>• Banker bet has 5% commission</Text>
          <Text style={styles.ruleText}>• Third card rules apply automatically</Text>
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
            onBet={(amount) => startGame(amount, betType)}
            disabled={gameActive}
          />
        ) : (
          <View style={styles.gameActiveCard}>
            <Text style={styles.gameActiveText}>🎮 Game in Progress</Text>
            <Text style={styles.gameActiveSubtext}>
              Bet: PKR {betAmount} on {betType.toUpperCase()} | {gamePhase === 'dealing' ? 'Cards being dealt...' : 'Evaluating hands...'}
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
    color: Colors.primary.hotPink,
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
  betTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  betTypeButton: {
    backgroundColor: Colors.primary.surface,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 80,
  },
  selectedBetType: {
    backgroundColor: Colors.primary.hotPink,
    borderColor: Colors.primary.hotPink,
  },
  betTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 2,
  },
  selectedBetTypeText: {
    color: Colors.primary.background,
  },
  betTypeMultiplier: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  gameInfoCard: {
    backgroundColor: Colors.primary.surface,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
    marginBottom: 15,
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
    borderColor: Colors.primary.hotPink,
  },
  gameActiveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.hotPink,
    marginBottom: 5,
  },
  gameActiveSubtext: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
