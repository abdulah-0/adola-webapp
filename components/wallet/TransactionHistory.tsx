import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types/walletTypes';

interface TransactionHistoryProps {
  transactions: Transaction[];
  currency?: string;
}

export default function TransactionHistory({ transactions, currency = 'PKR' }: TransactionHistoryProps) {
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'add-circle';
      case 'deposit_bonus':
        return 'gift';
      case 'withdrawal':
        return 'remove-circle';
      case 'game_win':
        return 'trophy';
      case 'game_loss':
        return 'game-controller';
      case 'referral_bonus':
        return 'gift';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
      case 'deposit_bonus':
      case 'game_win':
      case 'referral_bonus':
        return '#00ff00';
      case 'withdrawal':
      case 'game_loss':
        return '#ff6666';
      default:
        return '#cccccc';
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return '#00ff00';
      case 'pending':
        return '#ffaa00';
      case 'rejected':
        return '#ff6666';
      default:
        return '#cccccc';
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      if (!date) return 'Unknown date';

      const dateObj = new Date(date);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date:', date);
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date:', date);
      return 'Invalid date';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <Ionicons 
          name={getTransactionIcon(item.type) as any} 
          size={24} 
          color={getTransactionColor(item.type)} 
        />
      </View>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amountText,
          { color: getTransactionColor(item.type) }
        ]}>
          {item.type === 'withdrawal' || item.type === 'game_loss' ? '-' : '+'}
          {currency === 'INR' ? '₹' : 'PKR'} {currency === 'INR'
            ? ((item.amount || 0) * 0.3).toFixed(2)
            : (item.amount || 0).toFixed(2)
          }
        </Text>
      </View>
    </View>
  );

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={48} color="#666" />
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <View style={styles.listContainer}>
        {transactions.map((item) => (
          <View key={item.id}>
            {renderTransaction({ item })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  listContainer: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
