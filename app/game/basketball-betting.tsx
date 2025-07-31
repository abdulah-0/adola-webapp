import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import BasketballBettingGame from '../../components/games/BasketballBettingGame';
import WebBasketballBettingGame from '../../components/games/web/WebBasketballBettingGame';

const BasketballBettingPage: React.FC = () => {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {isWeb ? <WebBasketballBettingGame /> : <BasketballBettingGame />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
});

export default BasketballBettingPage;
