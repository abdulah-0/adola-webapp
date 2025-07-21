import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import WalletBalance from '../../components/wallet/WalletBalance';
import DepositModal from '../../components/wallet/DepositModal';
import WithdrawalModal from '../../components/wallet/WithdrawalModal';
import TransactionHistory from '../../components/wallet/TransactionHistory';

export default function WalletScreen() {
  const { user } = useApp();
  const {
    balance,
    transactions,
    isLoading,
    refreshBalance,
    refreshTransactions,
    createDepositRequest,
    createWithdrawalRequest
  } = useWallet();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Refresh data when screen comes into focus (less frequently)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        // Always refresh when screen comes into focus
        refreshBalance();
        refreshTransactions();
      }
    }, [user])
  );

  // No longer needed - using WalletContext

  const handleDeposit = async (amount: number, bankAccountId: string, transactionId?: string, notes?: string) => {
    try {
      const newTransactionId = await createDepositRequest(
        amount,
        {
          method: 'bank_transfer',
          bank_account_id: bankAccountId,
          transaction_id: transactionId || '',
          notes: notes || ''
        },
        `Deposit request for PKR ${amount.toLocaleString()}`
      );

      if (newTransactionId) {
        Alert.alert(
          'Deposit Request Submitted',
          `Your deposit request for PKR ${amount.toLocaleString()} has been submitted. Please transfer the exact amount to the selected bank account. Your deposit will be processed within 24 hours.`,
          [{ text: 'OK' }]
        );
        setShowDepositModal(false);
      } else {
        Alert.alert('Error', 'Failed to submit deposit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit deposit request');
    }
  };

  const handleWithdraw = async (amount: number, bankDetails: any, notes?: string) => {
    try {
      const transactionId = await createWithdrawalRequest(
        amount,
        {
          method: 'bank_transfer',
          bank_details: bankDetails,
          notes: notes
        },
        `Withdrawal request for Rs ${amount.toLocaleString()}`
      );

      if (transactionId) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Your withdrawal request for Rs ${amount.toLocaleString()} has been submitted. After 1% deduction, you will receive Rs ${(amount * 0.99).toLocaleString()}. Processing will be completed within 24 hours.`,
          [{ text: 'OK' }]
        );
        setShowWithdrawalModal(false);
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit withdrawal request');
    }
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  // Calculate pending amounts from transactions
  const pendingDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingWithdrawals = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <WalletBalance
          balance={balance}
          pendingDeposits={pendingDeposits}
          pendingWithdrawals={pendingWithdrawals}
          onDeposit={() => setShowDepositModal(true)}
          onWithdraw={() => setShowWithdrawalModal(true)}
        />

        <TransactionHistory transactions={transactions} />
      </ScrollView>

      <DepositModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDeposit={handleDeposit}
      />

      <WithdrawalModal
        visible={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onWithdraw={handleWithdraw}
        balance={balance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
});
