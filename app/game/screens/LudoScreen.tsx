// Ludo Screen for Adola App - Exact Recreation with Betting
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';
import LudoGame from '../../../components/games/LudoGame';
import { isWeb } from '../../../utils/webStyles';

export default function LudoScreen() {
  console.log('🎲 LudoScreen component loaded');

  return (
    <View style={styles.container}>
      <LudoGame />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
});
