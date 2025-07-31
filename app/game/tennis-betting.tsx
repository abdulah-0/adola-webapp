import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import TennisBettingGame from '../../components/games/TennisBettingGame';
import WebTennisBettingGame from '../../components/games/web/WebTennisBettingGame';

const TennisBettingPage: React.FC = () => {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {isWeb ? <WebTennisBettingGame /> : <TennisBettingGame />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
});

export default TennisBettingPage;
