import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import { PaymentMethod } from '../../types/walletTypes';
import WalletBalance from '../../components/wallet/WalletBalance';
import DepositModal from '../../components/wallet/DepositModal';
import WithdrawalModal from '../../components/wallet/WithdrawalModal';
import TransactionHistory from '../../components/wallet/TransactionHistory';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';

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

  const handleDeposit = async (amount: number, accountId: string, transactionId?: string, notes?: string, paymentMethod: PaymentMethod = 'bank_transfer') => {
    try {
      const metadata = paymentMethod === 'usdt_trc20'
        ? {
            method: 'usdt_trc20',
            usdt_account_id: accountId,
            transaction_hash: transactionId || '',
            notes: notes || ''
          }
        : {
            method: 'bank_transfer',
            bank_account_id: accountId,
            transaction_id: transactionId || '',
            notes: notes || ''
          };

      const newTransactionId = await createDepositRequest(
        amount,
        metadata,
        paymentMethod === 'usdt_trc20'
          ? `USDT deposit request for PKR ${amount.toLocaleString()}`
          : `Deposit request for PKR ${amount.toLocaleString()}`
      );

      if (newTransactionId) {
        const message = paymentMethod === 'usdt_trc20'
          ? `Your USDT deposit request for PKR ${amount.toLocaleString()} has been submitted. Please send the exact USDT amount to the selected TRC20 address. Your deposit will be processed within 24 hours.`
          : `Your deposit request for PKR ${amount.toLocaleString()} has been submitted. Please transfer the exact amount to the selected bank account. Your deposit will be processed within 24 hours.`;

        Alert.alert(
          'Deposit Request Submitted',
          message,
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

  const handleWithdraw = async (amount: number, details: any, notes?: string, method: 'bank_transfer' | 'usdt_trc20' = 'bank_transfer') => {
    try {
      // Check if user has sufficient balance
      if (!balance || balance < amount) {
        if (typeof window !== 'undefined') {
          window.alert('Error: Insufficient balance for withdrawal');
        } else {
          Alert.alert('Error', 'Insufficient balance for withdrawal');
        }
        return;
      }

      const metadata = method === 'usdt_trc20'
        ? {
            method: 'usdt_trc20',
            usdt_details: details,
            notes: notes || ''
          }
        : {
            method: 'bank_transfer',
            bank_details: details,
            notes: notes || ''
          };

      const transactionId = await createWithdrawalRequest(amount, metadata);

      if (transactionId) {
        let message = '';

        if (method === 'usdt_trc20') {
          const usdtAmount = details.usdtAmount;
          message = `USDT Withdrawal Request Submitted!\n\nYour USDT withdrawal request has been submitted successfully!\n\nUSDT Amount: ${usdtAmount} USDT\nPKR Equivalent: PKR ${amount.toLocaleString()}\nWallet Address: ${details.usdtAddress}\n\nProcessing will be completed within 24 hours.`;
        } else {
          const deductionAmount = Math.round(amount * 0.01 * 100) / 100;
          const finalAmount = amount - deductionAmount;
          message = `Bank Withdrawal Request Submitted!\n\nYour withdrawal request for PKR ${amount.toLocaleString()} has been submitted successfully!\n\nAmount deducted from balance: PKR ${amount.toLocaleString()}\nAfter 1% deduction, you will receive: PKR ${finalAmount.toLocaleString()}\n\nProcessing will be completed within 24 hours.`;
        }

        if (typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert(
            'Withdrawal Request Submitted',
            message,
            [{ text: 'OK' }]
          );
        }

        setShowWithdrawalModal(false);
      } else {
        if (typeof window !== 'undefined') {
          window.alert('Error: Failed to submit withdrawal request. You must make at least one deposit before you can withdraw money.');
        } else {
          Alert.alert('Withdrawal Not Allowed', 'You must make at least one deposit before you can withdraw money. Please deposit funds first and wait for approval.');
        }
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.alert(`Error: Failed to submit withdrawal request: ${error.message || 'Unknown error'}`);
      } else {
        Alert.alert('Error', `Failed to submit withdrawal request: ${error.message || 'Unknown error'}`);
      }
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
      <DarkGradientBackground>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <WalletBalance
            balance={balance}
            pendingDeposits={pendingDeposits}
            pendingWithdrawals={pendingWithdrawals}
            onDeposit={() => setShowDepositModal(true)}
            onWithdraw={() => setShowWithdrawalModal(true)}
            currency="PKR"
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
          balance={balance || 0}
        />
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
