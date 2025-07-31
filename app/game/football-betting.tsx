import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import FootballBettingGame from '../../components/games/FootballBettingGame';
import WebFootballBettingGame from '../../components/games/web/WebFootballBettingGame';

const FootballBettingPage: React.FC = () => {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {isWeb ? <WebFootballBettingGame /> : <FootballBettingGame />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
});

export default FootballBettingPage;
