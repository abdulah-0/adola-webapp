// Dynamic Game Screen for Adola App - Exact Original Implementation
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';

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
          <DarkGradientBackground>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Game Not Found</Text>
              <Text style={styles.errorText}>
                The game "{id}" is not available or doesn't exist.
              </Text>
            </View>
          </DarkGradientBackground>
        );
    }
  };

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        {getGameScreen()}
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
