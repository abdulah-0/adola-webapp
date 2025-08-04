import React, { useState, useEffect } from 'react';
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
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';

interface WithdrawalModalProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, details: any, notes?: string, method?: 'bank_transfer' | 'usdt_trc20') => void;
  balance: number;
}

export default function WithdrawalModal({ visible, onClose, onWithdraw, balance }: WithdrawalModalProps) {
  const { user } = useApp();
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank_transfer' | 'usdt_trc20'>('bank_transfer');
  const [amount, setAmount] = useState('');

  // Bank transfer fields
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [bank, setBank] = useState('');

  // USDT fields
  const [usdtAddress, setUsdtAddress] = useState('');

  const [notes, setNotes] = useState('');
  const [hasApprovedDeposits, setHasApprovedDeposits] = useState(false);

  // Check if user has approved deposits when modal opens
  useEffect(() => {
    if (visible && user?.id) {
      checkUserDeposits();
    }
  }, [visible, user?.id]);

  const checkUserDeposits = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available for deposit check');
      return;
    }

    try {
      console.log('🔍 Checking deposits for user ID:', user.id);

      const { data: approvedDeposits, error } = await supabase
        .from('deposit_requests')
        .select('id, user_id, status, amount')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(5);

      console.log('🔍 Deposit check result:', { approvedDeposits, error });

      if (!error && approvedDeposits && approvedDeposits.length > 0) {
        console.log('✅ User has approved deposits:', approvedDeposits.length);
        setHasApprovedDeposits(true);
      } else {
        console.log('❌ No approved deposits found for user');
        setHasApprovedDeposits(false);
      }
    } catch (error) {
      console.error('Error checking user deposits:', error);
      setHasApprovedDeposits(false);
    }
  };

  const calculateDeduction = (amount: number) => {
    return Math.round(amount * 0.01 * 100) / 100;
  };

  const calculateFinalAmount = (amount: number) => {
    return amount - calculateDeduction(amount);
  };

  // USDT conversion functions
  const USDT_RATE = 270; // 270 PKR = 1 USDT
  const MIN_USDT_WITHDRAWAL = 10; // Minimum 10 USDT

  const convertPKRToUSDT = (pkrAmount: number) => {
    return Math.floor((pkrAmount / USDT_RATE) * 100) / 100; // Round down to 2 decimals
  };

  const convertUSDTToPKR = (usdtAmount: number) => {
    return usdtAmount * USDT_RATE;
  };

  const getMaxUSDTWithdrawal = () => {
    return convertPKRToUSDT(balance);
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!hasApprovedDeposits) {
      Alert.alert('Withdrawal Not Allowed', 'You must make at least one deposit before you can withdraw money. Please deposit funds first and wait for approval.');
      return;
    }

    if (withdrawalMethod === 'bank_transfer') {
      // Bank transfer validation
      if (withdrawAmount < 500) {
        Alert.alert('Error', 'Minimum withdrawal amount is PKR 500');
        return;
      }

      if (withdrawAmount > 50000) {
        Alert.alert('Error', 'Maximum withdrawal amount is PKR 50,000');
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
        bank: bank.trim()
      };

      onWithdraw(withdrawAmount, bankDetails, notes, 'bank_transfer');
    } else {
      // USDT withdrawal validation
      if (withdrawAmount < MIN_USDT_WITHDRAWAL) {
        Alert.alert('Error', `Minimum withdrawal amount is ${MIN_USDT_WITHDRAWAL} USDT`);
        return;
      }

      const maxUSDT = getMaxUSDTWithdrawal();
      if (withdrawAmount > maxUSDT) {
        Alert.alert('Error', `Maximum withdrawal amount is ${maxUSDT.toFixed(2)} USDT`);
        return;
      }

      if (!usdtAddress.trim()) {
        Alert.alert('Error', 'Please enter your USDT TRC20 wallet address');
        return;
      }

      // Basic TRC20 address validation (starts with T and is 34 characters)
      if (!usdtAddress.startsWith('T') || usdtAddress.length !== 34) {
        Alert.alert('Error', 'Please enter a valid TRC20 wallet address');
        return;
      }

      const usdtDetails = {
        usdtAddress: usdtAddress.trim(),
        usdtAmount: withdrawAmount,
        pkrEquivalent: convertUSDTToPKR(withdrawAmount)
      };

      // Convert USDT amount to PKR for internal processing
      onWithdraw(convertUSDTToPKR(withdrawAmount), usdtDetails, notes, 'usdt_trc20');
    }

    // Reset form and close modal
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setAmount('');
    setAccountTitle('');
    setAccountNumber('');
    setIban('');
    setBank('');
    setUsdtAddress('');
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

          {!hasApprovedDeposits && (
            <View style={styles.warningSection}>
              <Ionicons name="warning" size={20} color="#ff6b6b" />
              <Text style={styles.warningText}>
                You must make at least one deposit before you can withdraw money. Please deposit funds first and wait for approval.
              </Text>
            </View>
          )}

          {/* Withdrawal Method Selection */}
          <View style={styles.methodSection}>
            <Text style={styles.sectionTitle}>Withdrawal Method</Text>
            <View style={styles.methodButtons}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  withdrawalMethod === 'bank_transfer' && styles.selectedMethod
                ]}
                onPress={() => setWithdrawalMethod('bank_transfer')}
              >
                <Ionicons name="card" size={20} color={withdrawalMethod === 'bank_transfer' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.methodText,
                  withdrawalMethod === 'bank_transfer' && styles.selectedMethodText
                ]}>Bank Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  withdrawalMethod === 'usdt_trc20' && styles.selectedMethod
                ]}
                onPress={() => setWithdrawalMethod('usdt_trc20')}
              >
                <Ionicons name="logo-bitcoin" size={20} color={withdrawalMethod === 'usdt_trc20' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.methodText,
                  withdrawalMethod === 'usdt_trc20' && styles.selectedMethodText
                ]}>USDT TRC20</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>
              {withdrawalMethod === 'usdt_trc20' ? 'USDT Amount to Receive' : 'Withdrawal Amount'}
            </Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySign}>
                {withdrawalMethod === 'usdt_trc20' ? 'USDT' : 'Rs'}
              </Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            {withdrawalMethod === 'usdt_trc20' ? (
              <View>
                <Text style={styles.minAmount}>
                  Minimum: {MIN_USDT_WITHDRAWAL} USDT | Maximum: {getMaxUSDTWithdrawal().toFixed(2)} USDT
                </Text>
                <Text style={styles.conversionInfo}>
                  1 USDT = {USDT_RATE} PKR | Available: {getMaxUSDTWithdrawal().toFixed(2)} USDT
                </Text>
              </View>
            ) : (
              <Text style={styles.minAmount}>Minimum: Rs 500 | Maximum: Rs 50,000</Text>
            )}
            
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

          {/* Conditional Details Section */}
          {withdrawalMethod === 'bank_transfer' ? (
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
          ) : (
            <View style={styles.usdtDetailsSection}>
              <Text style={styles.sectionTitle}>USDT Withdrawal Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USDT TRC20 Wallet Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={usdtAddress}
                  onChangeText={setUsdtAddress}
                  placeholder="Enter your TRC20 wallet address (starts with T)"
                  placeholderTextColor="#666"
                />
                <Text style={styles.addressHint}>
                  Make sure this is a valid TRC20 address. USDT sent to wrong address cannot be recovered.
                </Text>
              </View>

              {parseFloat(amount) > 0 && (
                <View style={styles.usdtConversionInfo}>
                  <Text style={styles.conversionTitle}>Conversion Details:</Text>
                  <Text style={styles.conversionDetail}>
                    USDT Amount: {parseFloat(amount).toFixed(2)} USDT
                  </Text>
                  <Text style={styles.conversionDetail}>
                    PKR Equivalent: {convertUSDTToPKR(parseFloat(amount)).toLocaleString()} PKR
                  </Text>
                  <Text style={styles.conversionDetail}>
                    Rate: 1 USDT = {USDT_RATE} PKR
                  </Text>
                </View>
              )}

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
          )}

          <View style={styles.noticeSection}>
            <View style={styles.noticeHeader}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.noticeTitle}>Important Notice</Text>
            </View>
            <Text style={styles.noticeText}>
              • Withdrawals are processed within 24 hours
            </Text>
            {withdrawalMethod === 'bank_transfer' ? (
              <>
                <Text style={styles.noticeText}>
                  • A 1% processing fee is deducted from all withdrawals
                </Text>
                <Text style={styles.noticeText}>
                  • Ensure your bank details are correct to avoid delays
                </Text>
                <Text style={styles.noticeText}>
                  • Minimum withdrawal: Rs 500 | Maximum withdrawal: Rs 50,000
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.noticeText}>
                  • USDT will be sent to your TRC20 wallet address
                </Text>
                <Text style={styles.noticeText}>
                  • Double-check your wallet address - transactions cannot be reversed
                </Text>
                <Text style={styles.noticeText}>
                  • Minimum withdrawal: {MIN_USDT_WITHDRAWAL} USDT | Maximum: {getMaxUSDTWithdrawal().toFixed(2)} USDT
                </Text>
                <Text style={styles.noticeText}>
                  • Network: TRON (TRC20) - ensure your wallet supports TRC20 USDT
                </Text>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (
                !amount ||
                !hasApprovedDeposits ||
                (withdrawalMethod === 'bank_transfer' && (!accountTitle || !accountNumber || !iban || !bank)) ||
                (withdrawalMethod === 'usdt_trc20' && !usdtAddress) ||
                (withdrawalMethod === 'bank_transfer' && withdrawAmount > balance) ||
                (withdrawalMethod === 'usdt_trc20' && parseFloat(amount) > getMaxUSDTWithdrawal())
              ) && styles.disabledButton
            ]}
            onPress={handleWithdraw}
            disabled={
              !amount ||
              !hasApprovedDeposits ||
              (withdrawalMethod === 'bank_transfer' && (!accountTitle || !accountNumber || !iban || !bank)) ||
              (withdrawalMethod === 'usdt_trc20' && !usdtAddress) ||
              (withdrawalMethod === 'bank_transfer' && withdrawAmount > balance) ||
              (withdrawalMethod === 'usdt_trc20' && parseFloat(amount) > getMaxUSDTWithdrawal())
            }
          >
            <Text style={styles.withdrawText}>
              {!hasApprovedDeposits
                ? 'Deposit Required First'
                : `Submit ${withdrawalMethod === 'usdt_trc20' ? 'USDT' : 'Bank'} Withdrawal`
              }
            </Text>
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
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#ff6b6b',
    marginLeft: 10,
    lineHeight: 20,
  },
  methodSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2a3a',
  },
  methodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedMethodText: {
    color: '#007AFF',
  },
  conversionInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  usdtDetailsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  addressHint: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 5,
    fontStyle: 'italic',
  },
  usdtConversionInfo: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  conversionTitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conversionDetail: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 4,
  },
});
