import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WalletBalanceProps {
  balance: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  onDeposit: () => void;
  onWithdraw: () => void;
  currency?: string;
}

export default function WalletBalance({
  balance,
  pendingDeposits,
  pendingWithdrawals,
  onDeposit,
  onWithdraw,
  currency = 'PKR'
}: WalletBalanceProps) {
  // Add safety checks for undefined values
  const safeBalance = typeof balance === 'number' ? balance : 0;
  const safePendingDeposits = typeof pendingDeposits === 'number' ? pendingDeposits : 0;
  const safePendingWithdrawals = typeof pendingWithdrawals === 'number' ? pendingWithdrawals : 0;

  return (
    <View style={styles.container}>
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>{currency} {safeBalance.toFixed(2)}</Text>
      </View>

      {(safePendingDeposits > 0 || safePendingWithdrawals > 0) && (
        <View style={styles.pendingSection}>
          {safePendingDeposits > 0 && (
            <View style={styles.pendingItem}>
              <Ionicons name="time-outline" size={16} color="#ffaa00" />
              <Text style={styles.pendingText}>
                Pending Deposits: PKR {safePendingDeposits.toFixed(2)}
              </Text>
            </View>
          )}
          {safePendingWithdrawals > 0 && (
            <View style={styles.pendingItem}>
              <Ionicons name="time-outline" size={16} color="#ffaa00" />
              <Text style={styles.pendingText}>
                Pending Withdrawals: PKR {safePendingWithdrawals.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={onDeposit}>
          <Ionicons name="add-circle" size={24} color="#00ff00" />
          <Text style={styles.actionText}>Deposit {currency}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onWithdraw}>
          <Ionicons name="remove-circle" size={24} color="#ff6666" />
          <Text style={styles.actionText}>Withdraw {currency}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  pendingSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#ffaa00',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    minWidth: 100,
  },
  actionText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 4,
  },
});
