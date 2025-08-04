import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../hooks/useWallet';
import DarkGradientBackground from '../../components/ui/DarkGradientBackground';
import WalletBalance from '../../components/wallet/WalletBalance';
import TransactionHistory from '../../components/wallet/TransactionHistory';
import DepositModalINR from '../../components/wallet/DepositModalINR';
import WithdrawalModalINR from '../../components/wallet/WithdrawalModalINR';

export default function WalletINR() {
  const { user } = useApp();
  const { balance, transactions, createDepositRequest, createWithdrawalRequest } = useWallet();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Convert PKR balance to INR (assuming 1 PKR = 0.3 INR for display)
  const inrBalance = balance * 0.3;

  const handleDeposit = async (amount: number, details: any, notes?: string, method: 'bank_transfer' | 'usdt_trc20' = 'bank_transfer') => {
    try {
      // Convert INR amount to PKR for storage (1 INR = 3.33 PKR approximately)
      const pkrAmount = amount * 3.33;
      
      // Check minimum deposit
      if (pkrAmount < 300) {
        if (typeof window !== 'undefined') {
          window.alert('Error: Minimum deposit is ₹90 (equivalent to PKR 300)');
        } else {
          Alert.alert('Error', 'Minimum deposit is ₹90 (equivalent to PKR 300)');
        }
        return;
      }

      const metadata = method === 'usdt_trc20' 
        ? {
            method: 'usdt_trc20',
            usdt_details: details,
            notes: notes || '',
            currency: 'INR',
            original_inr_amount: amount
          }
        : {
            method: 'bank_transfer',
            bank_details: details,
            notes: notes || '',
            currency: 'INR',
            original_inr_amount: amount
          };

      const transactionId = await createDepositRequest(pkrAmount, metadata);

      if (transactionId) {
        let message = '';
        if (method === 'usdt_trc20') {
          message = `USDT Deposit Request Submitted!\n\nINR Amount: ₹${amount.toLocaleString()}\nPKR Equivalent: PKR ${pkrAmount.toLocaleString()}\nUSDT Amount: ${details.usdtAmount} USDT\nTransaction Hash: ${details.transactionHash}\n\nYour deposit will be processed within 24 hours after admin verification.`;
        } else {
          message = `Bank Deposit Request Submitted!\n\nINR Amount: ₹${amount.toLocaleString()}\nPKR Equivalent: PKR ${pkrAmount.toLocaleString()}\nBank Account: ${details.bankAccountName}\nTransaction ID: ${details.transactionId}\n\nYour deposit will be processed within 24 hours after admin verification.`;
        }

        if (typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert('Deposit Request Submitted', message, [{ text: 'OK' }]);
        }

        setShowDepositModal(false);
      } else {
        if (typeof window !== 'undefined') {
          window.alert('Error: Failed to submit deposit request. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
        }
      }
    } catch (error) {
      console.error('Deposit error:', error);
      if (typeof window !== 'undefined') {
        window.alert('Error: Failed to submit deposit request. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
      }
    }
  };

  const handleWithdraw = async (amount: number, details: any, notes?: string, method: 'bank_transfer' | 'usdt_trc20' = 'bank_transfer') => {
    try {
      // Convert INR amount to PKR for processing (1 INR = 3.33 PKR approximately)
      const pkrAmount = amount * 3.33;
      
      // Check if user has sufficient balance
      if (!balance || balance < pkrAmount) {
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
            notes: notes || '',
            currency: 'INR',
            original_inr_amount: amount
          }
        : {
            method: 'bank_transfer',
            bank_details: details,
            notes: notes || '',
            currency: 'INR',
            original_inr_amount: amount
          };

      const transactionId = await createWithdrawalRequest(pkrAmount, metadata);

      if (transactionId) {
        let message = '';
        
        if (method === 'usdt_trc20') {
          message = `USDT Withdrawal Request Submitted!\n\nINR Amount: ₹${amount.toLocaleString()}\nPKR Equivalent: PKR ${pkrAmount.toLocaleString()}\nUSDT Amount: ${details.usdtAmount} USDT\nWallet Address: ${details.usdtAddress}\n\nProcessing will be completed within 24 hours.`;
        } else {
          const deductionAmount = Math.round(pkrAmount * 0.01 * 100) / 100;
          const finalAmount = pkrAmount - deductionAmount;
          const finalINRAmount = finalAmount * 0.3;
          message = `Bank Withdrawal Request Submitted!\n\nINR Amount: ₹${amount.toLocaleString()}\nPKR Equivalent: PKR ${pkrAmount.toLocaleString()}\nAfter 1% deduction, you will receive: ₹${finalINRAmount.toLocaleString()}\n\nProcessing will be completed within 24 hours.`;
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
      console.error('Withdrawal error:', error);
      if (typeof window !== 'undefined') {
        window.alert('Error: Failed to submit withdrawal request. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
      }
    }
  };

  // Calculate pending amounts from transactions (convert to INR)
  const pendingDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount * 0.3), 0);

  const pendingWithdrawals = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount * 0.3), 0);

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <WalletBalance
            balance={inrBalance}
            pendingDeposits={pendingDeposits}
            pendingWithdrawals={pendingWithdrawals}
            onDeposit={() => setShowDepositModal(true)}
            onWithdraw={() => setShowWithdrawalModal(true)}
            currency="INR"
          />

          <TransactionHistory transactions={transactions} currency="INR" />
        </ScrollView>

        <DepositModalINR
          visible={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onDeposit={handleDeposit}
        />

        <WithdrawalModalINR
          visible={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          onWithdraw={handleWithdraw}
          balance={inrBalance}
        />
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
});
