// WalletCard Component for Adola App
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import Card from './ui/Card';
import Button from './ui/Button';
import { rf, rs } from '../utils/responsive';
import { isWeb, webDimensions, webStyleModifiers } from '../utils/webStyles';

const getResponsivePadding = () => isWeb ? webDimensions.spacing.md : rs(20);

const formatCurrency = (amount: number, currency: string = 'Rs') => {
  const safeAmount = typeof amount === 'number' ? amount : 0;
  return `${currency} ${safeAmount.toLocaleString()}`;
};

interface WalletCardProps {
  balance: number;
  currency?: string;
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
  onHistoryPress?: () => void;
}

export default function WalletCard({
  balance,
  currency = 'Rs',
  onDepositPress,
  onWithdrawPress,
  onHistoryPress
}: WalletCardProps) {
  return (
    <Card variant="neon" style={styles.container}>
      <Text style={styles.title}>💰 Wallet Balance</Text>
      <Text style={styles.balance}>
        {formatCurrency(balance, currency)}
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Deposit"
          variant="primary"
          size="medium"
          onPress={onDepositPress}
          icon="💳"
          style={styles.button}
        />

        <Button
          title="Withdraw"
          variant="secondary"
          size="medium"
          onPress={onWithdrawPress}
          icon="💸"
          style={styles.button}
        />
      </View>

      <Button
        title="View History"
        variant="outline"
        size="small"
        onPress={onHistoryPress}
        icon="📋"
        style={styles.historyButton}
      />

    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: getResponsivePadding(),
    alignItems: 'center',
    ...webStyleModifiers.scaleSpacing({
      marginHorizontal: getResponsivePadding(),
      marginVertical: getResponsivePadding() * 0.7,
    }),
  },
  title: {
    fontSize: isWeb ? webDimensions.fontSize.large : rf(18),
    color: Colors.primary.gold,
    marginBottom: isWeb ? webDimensions.spacing.sm : rs(10),
    fontWeight: 'bold',
  },
  balance: {
    fontSize: isWeb ? webDimensions.fontSize.title + 8 : rf(32),
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: isWeb ? webDimensions.spacing.md : rs(20),
    textShadowColor: Colors.primary.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: isWeb ? webDimensions.spacing.xs : rs(10),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: isWeb ? webDimensions.spacing.sm : rs(15),
    gap: isWeb ? webDimensions.spacing.sm : rs(10),
  },
  button: {
    flex: 1,
  },
  historyButton: {
    marginTop: isWeb ? webDimensions.spacing.xs : rs(5),
  },
});
