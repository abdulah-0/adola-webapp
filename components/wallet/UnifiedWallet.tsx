import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import { PaymentMethod } from '../../types/walletTypes';
import WalletBalance from './WalletBalance';
import DepositModal from './DepositModal';
import WithdrawalModal from './WithdrawalModal';
import DepositModalINR from './DepositModalINR';
import WithdrawalModalINR from './WithdrawalModalINR';
import DepositModalBDT from './DepositModalBDT';
import WithdrawalModalBDT from './WithdrawalModalBDT';
import TransactionHistory from './TransactionHistory';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

type WalletTab = 'pkr' | 'inr' | 'bdt';

interface UnifiedWalletProps {
  initialTab?: WalletTab;
}

export default function UnifiedWallet({ initialTab = 'pkr' }: UnifiedWalletProps) {
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

  const [activeTab, setActiveTab] = useState<WalletTab>(initialTab);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Convert PKR balance to INR (assuming 1 PKR = 0.3 INR for display)
  const inrBalance = balance ? balance * 0.3 : 0;
  // Convert PKR balance to BDT (approx 1 PKR = 0.44 BDT for display)
  const bdtBalance = balance ? balance * 0.44 : 0;

  // Calculate pending amounts for PKR
  const pkrPendingDeposits = transactions
    ?.filter(t => t.type === 'deposit' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const pkrPendingWithdrawals = transactions
    ?.filter(t => t.type === 'withdraw' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  // Calculate pending amounts for INR/BDT (converted from PKR)
  const inrPendingDeposits = pkrPendingDeposits * 0.3;
  const inrPendingWithdrawals = pkrPendingWithdrawals * 0.3;
  const bdtPendingDeposits = pkrPendingDeposits * 0.44;
  const bdtPendingWithdrawals = pkrPendingWithdrawals * 0.44;

  // PKR Wallet handlers
  const handlePKRDeposit = async (amount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      const depositId = await createDepositRequest(amount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes
      });

      if (depositId) {
        Alert.alert(
          'Deposit Request Submitted',
          `Your PKR ${amount} deposit request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowDepositModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
    }
  };

  const handlePKRWithdraw = async (amount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      const withdrawalId = await createWithdrawalRequest(amount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes
      });

      if (withdrawalId) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Your PKR ${amount} withdrawal request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowWithdrawalModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    }
  };

  // INR Wallet handlers (convert amounts to PKR for backend)
  const handleINRDeposit = async (inrAmount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      // Convert INR to PKR for backend storage (1 INR = 3.33 PKR approximately)
      const pkrAmount = inrAmount * 3.33;
      
      const depositId = await createDepositRequest(pkrAmount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes,
        original_currency: 'INR',
        original_amount: inrAmount
      });

      if (depositId) {
        Alert.alert(
          'Deposit Request Submitted',
          `Your ₹${inrAmount} deposit request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowDepositModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
      }
    } catch (error) {
      console.error('INR Deposit error:', error);
      Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
    }
  };

  const handleINRWithdraw = async (inrAmount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      // Convert INR to PKR for backend storage
      const pkrAmount = inrAmount * 3.33;
      
      const withdrawalId = await createWithdrawalRequest(pkrAmount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes,
        original_currency: 'INR',
        original_amount: inrAmount
      });

      if (withdrawalId) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Your ₹${inrAmount} withdrawal request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowWithdrawalModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
      }
    } catch (error) {
      console.error('INR Withdrawal error:', error);
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    }
  };

  const renderTabButton = (tab: WalletTab, title: string, icon: string, currency: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={activeTab === tab ? Colors.primary.hotPink : Colors.primary.text} 
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {title}
      </Text>
      <Text style={[styles.tabCurrency, activeTab === tab && styles.activeTabCurrency]}>
        {currency}
      </Text>
    </TouchableOpacity>
  );

  const renderPKRWallet = () => (
    <>
      <WalletBalance
        balance={balance || 0}
        pendingDeposits={pkrPendingDeposits}
        pendingWithdrawals={pkrPendingWithdrawals}
        onDeposit={() => setShowDepositModal(true)}
        onWithdraw={() => setShowWithdrawalModal(true)}
        currency="PKR"
      />
      <TransactionHistory transactions={transactions} currency="PKR" />
    </>
  );

  const renderINRWallet = () => (
    <>
      <WalletBalance
        balance={inrBalance}
        pendingDeposits={inrPendingDeposits}
        pendingWithdrawals={inrPendingWithdrawals}
        onDeposit={() => setShowDepositModal(true)}
        onWithdraw={() => setShowWithdrawalModal(true)}
        currency="INR"
      />
      <TransactionHistory transactions={transactions} currency="INR" />
    </>
  );

  // BDT Wallet handlers (BDT is crypto-only via USDT TRC20). Convert BDT to PKR for backend
  const handleBDTDeposit = async (bdtAmount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      // Convert BDT to PKR (approx 1 BDT = 2.25 PKR)
      const pkrAmount = bdtAmount * 2.25;

      const depositId = await createDepositRequest(pkrAmount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes,
        original_currency: 'BDT',
        original_amount: bdtAmount
      });

      if (depositId) {
        Alert.alert(
          'Deposit Request Submitted',
          `Your ৳${bdtAmount} deposit request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowDepositModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
      }
    } catch (error) {
      console.error('BDT Deposit error:', error);
      Alert.alert('Error', 'Failed to submit deposit request. Please try again.');
    }
  };

  const handleBDTWithdraw = async (bdtAmount: number, paymentDetails: any, notes: string, method: PaymentMethod) => {
    try {
      // Convert BDT to PKR for backend storage
      const pkrAmount = bdtAmount * 2.25;

      const withdrawalId = await createWithdrawalRequest(pkrAmount, {
        payment_method: method,
        payment_details: paymentDetails,
        notes: notes,
        original_currency: 'BDT',
        original_amount: bdtAmount
      });

      if (withdrawalId) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Your ৳${bdtAmount} withdrawal request has been submitted and is pending approval.`,
          [{ text: 'OK', onPress: () => setShowWithdrawalModal(false) }]
        );
        refreshBalance();
        refreshTransactions();
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
      }
    } catch (error) {
      console.error('BDT Withdrawal error:', error);
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    }
  };

  const renderBDTWallet = () => (
    <>
      <WalletBalance
        balance={bdtBalance}
        pendingDeposits={bdtPendingDeposits}
        pendingWithdrawals={bdtPendingWithdrawals}
        onDeposit={() => setShowDepositModal(true)}
        onWithdraw={() => setShowWithdrawalModal(true)}
        currency="BDT"
      />
      <TransactionHistory transactions={transactions} currency="BDT" />
    </>
  );

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabHeader}>
        <Text style={styles.headerTitle}>💰 My Wallet</Text>
        <View style={styles.tabContainer}>
          {renderTabButton('pkr', 'PKR Wallet', 'wallet', 'Pakistani Rupee')}
          {renderTabButton('inr', 'INR Wallet', 'card', 'Indian Rupee')}
          {renderTabButton('bdt', 'BDT Wallet', 'cash', 'Bangladeshi Taka')}
        </View>
      </View>

      {/* Wallet Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'pkr' ? renderPKRWallet() : activeTab === 'inr' ? renderINRWallet() : renderBDTWallet()}
      </ScrollView>

      {/* Modals */}
      {activeTab === 'pkr' ? (
        <>
          <DepositModal
            visible={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handlePKRDeposit}
          />
          <WithdrawalModal
            visible={showWithdrawalModal}
            onClose={() => setShowWithdrawalModal(false)}
            onWithdraw={handlePKRWithdraw}
            balance={balance || 0}
          />
        </>
      ) : activeTab === 'inr' ? (
        <>
          <DepositModalINR
            visible={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handleINRDeposit}
          />
          <WithdrawalModalINR
            visible={showWithdrawalModal}
            onClose={() => setShowWithdrawalModal(false)}
            onWithdraw={handleINRWithdraw}
            balance={inrBalance}
          />
        </>
      ) : (
        <>
          <DepositModalBDT
            visible={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handleBDTDeposit}
          />
          <WithdrawalModalBDT
            visible={showWithdrawalModal}
            onClose={() => setShowWithdrawalModal(false)}
            onWithdraw={handleBDTWithdraw}
            balance={bdtBalance}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.primary.hotPink,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.text,
    marginTop: 4,
  },
  activeTabText: {
    color: '#fff',
  },
  tabCurrency: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
    marginTop: 2,
  },
  activeTabCurrency: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
