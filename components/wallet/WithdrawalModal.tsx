import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WithdrawalModalProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, bankDetails: any, notes?: string) => void;
  balance: number;
}

export default function WithdrawalModal({ visible, onClose, onWithdraw, balance }: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');

  const calculateDeduction = (amount: number) => {
    return Math.round(amount * 0.01 * 100) / 100;
  };

  const calculateFinalAmount = (amount: number) => {
    return amount - calculateDeduction(amount);
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount < 500) {
      Alert.alert('Error', 'Minimum withdrawal amount is Rs 500');
      return;
    }

    if (withdrawAmount > 50000) {
      Alert.alert('Error', 'Maximum withdrawal amount is Rs 50,000');
      return;
    }
    
    if (withdrawAmount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    
    if (!accountTitle.trim() || !accountNumber.trim() || !iban.trim() || !bank.trim()) {
      Alert.alert('Error', 'Please fill in all bank details');
      return;
    }

    const bankDetails = {
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      iban: iban.trim(),
      bank: bank.trim(),
    };

    Alert.alert(
      'Confirm Withdrawal',
      `Amount: Rs ${withdrawAmount}\nDeduction (1%): Rs ${calculateDeduction(withdrawAmount)}\nYou will receive: Rs ${calculateFinalAmount(withdrawAmount)}\n\nProceed with withdrawal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            onWithdraw(withdrawAmount, bankDetails, notes);
            resetForm();
            onClose();
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setAmount('');
    setAccountTitle('');
    setAccountNumber('');
    setIban('');
    setBank('');
    setNotes('');
  };

  const withdrawAmount = parseFloat(amount) || 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Withdraw Funds</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>PKR {balance.toFixed(2)}</Text>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySign}>Rs</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.minAmount}>Minimum: Rs 500 | Maximum: Rs 50,000</Text>
            
            {withdrawAmount > 0 && (
              <View style={styles.calculationSection}>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Withdrawal Amount:</Text>
                  <Text style={styles.calculationValue}>PKR {withdrawAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Deduction (1%):</Text>
                  <Text style={styles.deductionValue}>-PKR {calculateDeduction(withdrawAmount).toFixed(2)}</Text>
                </View>
                <View style={[styles.calculationRow, styles.finalRow]}>
                  <Text style={styles.finalLabel}>You will receive:</Text>
                  <Text style={styles.finalValue}>PKR {calculateFinalAmount(withdrawAmount).toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bankDetailsSection}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Title</Text>
              <TextInput
                style={styles.textInput}
                value={accountTitle}
                onChangeText={setAccountTitle}
                placeholder="Enter account holder name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IBAN</Text>
              <TextInput
                style={styles.textInput}
                value={iban}
                onChangeText={setIban}
                placeholder="Enter IBAN (e.g., PK36SCBL0000001123456702)"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.textInput}
                value={bank}
                onChangeText={setBank}
                placeholder="Enter bank name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.noticeSection}>
            <View style={styles.noticeHeader}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.noticeTitle}>Important Notice</Text>
            </View>
            <Text style={styles.noticeText}>
              • Withdrawals are processed within 24 hours
            </Text>
            <Text style={styles.noticeText}>
              • A 1% processing fee is deducted from all withdrawals
            </Text>
            <Text style={styles.noticeText}>
              • Ensure your bank details are correct to avoid delays
            </Text>
            <Text style={styles.noticeText}>
              • Minimum withdrawal: Rs 500 | Maximum withdrawal: Rs 50,000
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.withdrawButton,
              (!amount || !accountTitle || !accountNumber || !iban || !bank || withdrawAmount > balance) && styles.disabledButton
            ]}
            onPress={handleWithdraw}
            disabled={!amount || !accountTitle || !accountNumber || !iban || !bank || withdrawAmount > balance}
          >
            <Text style={styles.withdrawText}>Submit Withdrawal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  amountSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  currencySign: {
    fontSize: 18,
    color: '#ffffff',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    paddingVertical: 16,
  },
  minAmount: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  calculationSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#cccccc',
  },
  calculationValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  deductionValue: {
    fontSize: 14,
    color: '#ff6666',
  },
  finalRow: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 8,
    marginTop: 8,
  },
  finalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  finalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  bankDetailsSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#444',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  noticeSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noticeText: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#ffffff',
  },
  withdrawButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#ff6666',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  withdrawText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
