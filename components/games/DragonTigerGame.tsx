// Dragon vs Tiger Game for Adola App
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import BettingPanel from '../BettingPanel';
import WebDragonTigerGame from './web/WebDragonTigerGame';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 350);

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

export default function DragonTigerGame() {
  // Use web-specific layout if on web platform
  if (Platform.OS === 'web') {
    return <WebDragonTigerGame />;
  }

  const { user } = useApp();
  const { balance, canPlaceBet, placeBet, addWinnings, refreshBalance } = useWallet();
  const [gameActive, setGameActive] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [betType, setBetType] = useState<'dragon' | 'tiger' | 'tie'>('dragon');
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [gamePhase, setGamePhase] = useState<'betting' | 'dealing' | 'finished'>('betting');
  const [gameHistory, setGameHistory] = useState<string[]>([]);

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

  const generateStrategicCards = (betType: 'dragon' | 'tiger' | 'tie', shouldWin: boolean): { dragonCard: Card, tigerCard: Card } => {
    const deck = createDeck();

    if (shouldWin) {
      // Player should win - generate favorable outcome
      if (betType === 'dragon') {
        // Dragon should win - Dragon card > Tiger card
        const dragonCard = deck.find(card => card.numValue >= 8) || deck[0]; // High card for Dragon
        const tigerCard = deck.find(card => card.numValue < dragonCard.numValue) || deck[1]; // Lower card for Tiger
        console.log(`🐉 Forcing Dragon win: Dragon ${dragonCard.numValue} > Tiger ${tigerCard.numValue}`);
        return { dragonCard, tigerCard };
      } else if (betType === 'tiger') {
        // Tiger should win - Tiger card > Dragon card
        const tigerCard = deck.find(card => card.numValue >= 8) || deck[0]; // High card for Tiger
        const dragonCard = deck.find(card => card.numValue < tigerCard.numValue) || deck[1]; // Lower card for Dragon
        console.log(`🐅 Forcing Tiger win: Tiger ${tigerCard.numValue} > Dragon ${dragonCard.numValue}`);
        return { dragonCard, tigerCard };
      } else {
        // Tie should win - Same value cards
        const value = Math.floor(Math.random() * 13) + 1;
        const dragonCard = deck.find(card => card.numValue === value) || deck[0];
        const tigerCard = deck.find(card => card.numValue === value && card.suit !== dragonCard.suit) || { ...dragonCard, suit: '♠️' };
        console.log(`🤝 Forcing Tie: Dragon ${dragonCard.numValue} = Tiger ${tigerCard.numValue}`);
        return { dragonCard, tigerCard };
      }
    } else {
      // Player should lose - generate unfavorable outcome
      if (betType === 'dragon') {
        // Dragon should lose - Tiger card > Dragon card
        const tigerCard = deck.find(card => card.numValue >= 8) || deck[0]; // High card for Tiger
        const dragonCard = deck.find(card => card.numValue < tigerCard.numValue) || deck[1]; // Lower card for Dragon
        console.log(`🐅 Forcing Dragon loss: Tiger ${tigerCard.numValue} > Dragon ${dragonCard.numValue}`);
        return { dragonCard, tigerCard };
      } else if (betType === 'tiger') {
        // Tiger should lose - Dragon card > Tiger card
        const dragonCard = deck.find(card => card.numValue >= 8) || deck[0]; // High card for Dragon
        const tigerCard = deck.find(card => card.numValue < dragonCard.numValue) || deck[1]; // Lower card for Tiger
        console.log(`🐉 Forcing Tiger loss: Dragon ${dragonCard.numValue} > Tiger ${tigerCard.numValue}`);
        return { dragonCard, tigerCard };
      } else {
        // Tie should lose - Different value cards
        const dragonCard = deck[0];
        const tigerCard = deck.find(card => card.numValue !== dragonCard.numValue) || deck[1];
        console.log(`❌ Forcing Tie loss: Dragon ${dragonCard.numValue} ≠ Tiger ${tigerCard.numValue}`);
        return { dragonCard, tigerCard };
      }
    }
  };

  const startGame = async (amount: number, selectedBetType: 'dragon' | 'tiger' | 'tie') => {
    // Check if user can place bet
    if (!canPlaceBet(amount)) {
      Alert.alert('Insufficient Balance', 'You do not have enough PKR to place this bet.');
      return;
    }

    // Step 1: Deduct bet amount immediately
    console.log(`Placing Dragon Tiger bet: PKR ${amount} on ${selectedBetType}`);
    const betPlaced = await placeBet(amount, 'dragonTiger', `Dragon Tiger bet - ${selectedBetType}`);
    if (!betPlaced) {
      Alert.alert('Error', 'Failed to place bet. Please try again.');
      return;
    }
    console.log(`Bet placed successfully: PKR ${amount} deducted`);

    // Force balance refresh to ensure UI updates
    setTimeout(() => refreshBalance(), 500);

    setBetAmount(amount);
    setBetType(selectedBetType);
    setGameActive(true);
    setGamePhase('dealing');

    // Determine if player should win (20% win rate)
    const shouldPlayerWin = Math.random() < 0.2;

    // Generate cards based on win rate requirement
    const { dragonCard: newDragonCard, tigerCard: newTigerCard } = generateStrategicCards(selectedBetType, shouldPlayerWin);

    console.log(`Dragon Tiger: Should win: ${shouldPlayerWin}, Bet: ${selectedBetType}, Dragon: ${newDragonCard.value}${newDragonCard.suit} (${newDragonCard.numValue}), Tiger: ${newTigerCard.value}${newTigerCard.suit} (${newTigerCard.numValue})`);

    setTimeout(() => {
      setDragonCard(newDragonCard);
    }, 1000);

    setTimeout(() => {
      setTigerCard(newTigerCard);
      evaluateGame(newDragonCard, newTigerCard, selectedBetType, amount);
    }, 2000);
  };

  const evaluateGame = async (dragon: Card, tiger: Card, bet: string, amount: number) => {
    setGamePhase('finished');

    let winAmount = 0;
    let isWin = false;
    let message = '';
    let result = '';

    if (dragon.numValue > tiger.numValue) {
      // Dragon wins
      result = 'D';
      if (bet === 'dragon') {
        winAmount = amount * 2; // 1:1 payout
        isWin = true;
        message = 'Dragon wins!';
      } else {
        message = 'Dragon wins - you lose';
      }
    } else if (tiger.numValue > dragon.numValue) {
      // Tiger wins
      result = 'T';
      if (bet === 'tiger') {
        winAmount = amount * 2; // 1:1 payout
        isWin = true;
        message = 'Tiger wins!';
      } else {
        message = 'Tiger wins - you lose';
      }
    } else {
      // Tie
      result = 'Tie';
      if (bet === 'tie') {
        winAmount = amount * 9; // 8:1 payout
        isWin = true;
        message = 'Tie wins!';
      } else {
        // On tie, Dragon and Tiger bets lose half (house rule)
        winAmount = Math.floor(amount / 2);
        isWin = true;
        message = 'Tie - half bet returned';
      }
    }

    // Add to history
    setGameHistory(prev => [result, ...prev.slice(0, 9)]);

    // Step 2: Add winnings if player won
    if (isWin && winAmount > 0) {
      console.log(`Adding Dragon Tiger winnings: PKR ${winAmount}`);
      const winningsAdded = await addWinnings(
        winAmount,
        'dragonTiger',
        `Dragon vs Tiger ${result} - Dragon: ${dragon.value}${dragon.suit}, Tiger: ${tiger.value}${tiger.suit}, Bet: ${bet}`
      );

      if (winningsAdded) {
        console.log(`Winnings added successfully: PKR ${winAmount}`);
      } else {
        console.log('Failed to add winnings');
      }

      // Force balance refresh to ensure UI updates
      setTimeout(() => refreshBalance(), 500);
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

  const renderCard = (card: Card | null, label: string) => {
    return (
      <View style={styles.cardContainer}>
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.card}>
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐉 Dragon vs Tiger</Text>
      <Text style={styles.subtitle}>Simple card game - highest card wins!</Text>

      {/* Game History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Results:</Text>
        <View style={styles.historyList}>
          {gameHistory.map((result, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                { backgroundColor: getHistoryColor(result) }
              ]}
            >
              <Text style={styles.historyText}>{result}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bet Type Selection */}
      {!gameActive && (
        <View style={styles.betTypeContainer}>
          <Text style={styles.sectionTitle}>Choose Your Bet:</Text>
          <View style={styles.betTypes}>
            {(['dragon', 'tiger', 'tie'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.betTypeButton,
                  betType === type && styles.selectedBetType
                ]}
                onPress={() => setBetType(type)}
              >
                <Text style={styles.betTypeText}>
                  {type === 'dragon' ? '🐉 DRAGON' : type === 'tiger' ? '🐅 TIGER' : '🤝 TIE'}
                </Text>
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

      {/* Cards Display */}
      {gameActive && (
        <View style={styles.cardsDisplay}>
          {renderCard(dragonCard, '🐉 Dragon')}
          <Text style={styles.vsText}>VS</Text>
          {renderCard(tigerCard, '🐅 Tiger')}
        </View>
      )}

      {/* Rules */}
      {!gameActive && (
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>How to Play:</Text>
          <Text style={styles.rulesText}>• Choose Dragon, Tiger, or Tie</Text>
          <Text style={styles.rulesText}>• One card dealt to each side</Text>
          <Text style={styles.rulesText}>• Highest card wins (A=1, K=13)</Text>
          <Text style={styles.rulesText}>• Tie: Dragon/Tiger bets lose half</Text>
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
  historyContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 8,
  },
  historyList: {
    flexDirection: 'row',
    gap: 8,
  },
  historyItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
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
    gap: 8,
  },
  betTypeButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
    flex: 1,
  },
  selectedBetType: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  betTypeText: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  betTypeMultiplier: {
    fontSize: 10,
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
  cardsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    width: '90%',
  },
  cardContainer: {
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  card: {
    width: 80,
    height: 112,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSuit: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 12,
    color: '#666666',
  },
  cardBack: {
    fontSize: 40,
    color: Colors.primary.neonCyan,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginHorizontal: 16,
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
