// Dynamic Game Screen for Adola App - Exact Original Implementation
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

// Import original game screens (exact replicas)
import AviatorScreen from './screens/AviatorScreen';
import MinesGame from '../../components/games/MinesGame';
import DiceGame from '../../components/games/DiceGame';
import SlotsScreen from './screens/SlotsScreen';
import RouletteScreen from './screens/RouletteScreen';
import BlackjackScreen from './screens/BlackjackScreen';
import PokerScreen from './screens/PokerScreen';
import BaccaratScreen from './screens/BaccaratScreen';
import DragonTigerScreen from './screens/DragonTigerScreen';
import TowerScreen from './screens/TowerScreen';
import CrashScreen from './screens/CrashScreen';
import LimboScreen from './screens/LimboScreen';

import RollMasterScreen from './screens/RollMasterScreen';
import DiamondSlotsScreen from './screens/DiamondSlotsScreen';
import FruitMachineScreen from './screens/FruitMachineScreen';
import MegaDrawScreen from './screens/MegaDrawScreen';
import LuckyNumbersScreen from './screens/LuckyNumbersScreen';
import PowerBallScreen from './screens/PowerBallScreen';
import CricketBettingScreen from './screens/CricketBettingScreen';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Original game screen mapping (exact replicas)
  const getGameScreen = () => {
    switch (id) {

      case 'aviator':
        return <AviatorScreen />;
      case 'rollmaster':
        return <RollMasterScreen />;
      case 'mines':
        return <MinesGame />;
      case 'dice':
        return <DiceGame />;
      case 'slots':
        return <SlotsScreen />;
      case 'diamondslots':
        return <DiamondSlotsScreen />;
      case 'fruitmachine':
        return <FruitMachineScreen />;
      case 'blackjack':
        return <BlackjackScreen />;
      case 'poker':
        return <PokerScreen />;
      case 'baccarat':
        return <BaccaratScreen />;
      case 'roulette':
        return <RouletteScreen />;
      case 'dragonTiger':
        return <DragonTigerScreen />;
      case 'tower':
        return <TowerScreen />;
      case 'megadraw':
        return <MegaDrawScreen />;
      case 'luckynumbers':
        return <LuckyNumbersScreen />;
      case 'powerball':
        return <PowerBallScreen />;
      case 'crash':
        return <CrashScreen />;
      case 'limbo':
        return <LimboScreen />;
      case 'cricket-betting':
        return <CricketBettingScreen />;
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Game Not Found</Text>
            <Text style={styles.errorText}>
              The game "{id}" is not available or doesn't exist.
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Orange Gradient Header */}
      <LinearGradient
        colors={['#ff8c00', '#ff6b35', '#ff4500', '#cc3700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.gameTitle}>
            {id ? id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' ') : 'Game'}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Game Content */}
      <View style={styles.gameContent}>
        {getGameScreen()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  headerGradient: {
    paddingTop: 40, // Reduced from 50
    paddingBottom: 8, // Reduced from 15
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2, // Reduced shadow
    },
    shadowOpacity: 0.2, // Reduced shadow
    shadowRadius: 4, // Reduced shadow
    elevation: 4, // Reduced elevation
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Reduced from 20
    paddingVertical: 6, // Reduced from 10
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 40,
  },
  gameContent: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primary.background,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.hotPink,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
