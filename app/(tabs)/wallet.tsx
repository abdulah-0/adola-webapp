import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import UnifiedWallet from '../../components/wallet/UnifiedWallet';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';

export default function WalletScreen() {
  const { user } = useApp();
  const { refreshBalance, refreshTransactions } = useWallet();

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshBalance();
        refreshTransactions();
      }
    }, [user])
  );

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        <UnifiedWallet initialTab="pkr" />
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});