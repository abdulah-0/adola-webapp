import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../services/supabaseClient';

interface WithdrawalModalINRProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, details: any, notes?: string, method?: 'bank_transfer' | 'usdt_trc20') => void;
  balance: number;
}

// INR Constants
const MIN_INR_WITHDRAWAL = 150; // Minimum withdrawal in INR (equivalent to 500 PKR)
const MAX_INR_WITHDRAWAL = 15000; // Maximum withdrawal in INR
const USDT_RATE_INR = 90; // 90 INR = 1 USDT
const MIN_USDT_WITHDRAWAL = 10; // Minimum USDT withdrawal

export default function WithdrawalModalINR({ visible, onClose, onWithdraw, balance }: WithdrawalModalINRProps) {
  const { user } = useApp();
  const [amount, setAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank_transfer' | 'usdt_trc20'>('bank_transfer');
  const [hasApprovedDeposits, setHasApprovedDeposits] = useState(false);
  
  // Bank transfer fields
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [bank, setBank] = useState('');
  
  // USDT fields
  const [usdtAddress, setUsdtAddress] = useState('');
  
  const [notes, setNotes] = useState('');

  // USDT conversion functions for INR
  const convertINRToUSDT = (inrAmount: number): number => {
    return inrAmount / USDT_RATE_INR;
  };

  const convertUSDTToINR = (usdtAmount: number): number => {
    return usdtAmount * USDT_RATE_INR;
  };

  const getMaxUSDTWithdrawal = (): number => {
    return balance / USDT_RATE_INR;
  };

  useEffect(() => {
    if (visible) {
      checkUserDeposits();
      resetForm();
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

  const resetForm = () => {
    setAmount('');
    setAccountTitle('');
    setAccountNumber('');
    setIban('');
    setBank('');
    setUsdtAddress('');
    setNotes('');
    setWithdrawalMethod('bank_transfer');
  };

  const calculateDeduction = (amount: number) => {
    return Math.round(amount * 0.01 * 100) / 100;
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (withdrawalMethod === 'bank_transfer') {
      if (withdrawAmount < MIN_INR_WITHDRAWAL) {
        Alert.alert('Error', `Minimum withdrawal is ₹${MIN_INR_WITHDRAWAL}`);
        return;
      }

      if (withdrawAmount > MAX_INR_WITHDRAWAL) {
        Alert.alert('Error', `Maximum withdrawal is ₹${MAX_INR_WITHDRAWAL.toLocaleString()}`);
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

      onWithdraw(withdrawAmount, {
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        iban: iban.trim(),
        bank: bank.trim(),
      }, notes, 'bank_transfer');
    } else {
      // USDT withdrawal
      const usdtAmount = convertINRToUSDT(withdrawAmount);
      
      if (usdtAmount < MIN_USDT_WITHDRAWAL) {
        Alert.alert('Error', `Minimum USDT withdrawal is ${MIN_USDT_WITHDRAWAL} USDT (₹${MIN_USDT_WITHDRAWAL * USDT_RATE_INR})`);
        return;
      }

      if (usdtAmount > getMaxUSDTWithdrawal()) {
        Alert.alert('Error', `Maximum USDT withdrawal is ${getMaxUSDTWithdrawal().toFixed(2)} USDT`);
        return;
      }

      if (!usdtAddress.trim()) {
        Alert.alert('Error', 'Please enter USDT wallet address');
        return;
      }

      // Basic TRC20 address validation
      if (!usdtAddress.startsWith('T') || usdtAddress.length !== 34) {
        Alert.alert('Error', 'Please enter a valid TRC20 wallet address (starts with T, 34 characters)');
        return;
      }

      onWithdraw(withdrawAmount, {
        usdtAddress: usdtAddress.trim(),
        usdtAmount: usdtAmount,
        inrEquivalent: withdrawAmount,
      }, notes, 'usdt_trc20');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Withdraw INR</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

            {/* Amount Section */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>
                {withdrawalMethod === 'usdt_trc20' ? 'INR Amount to Withdraw' : 'Withdrawal Amount'}
              </Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySign}>₹</Text>
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
                    Minimum: {MIN_USDT_WITHDRAWAL} USDT (₹{MIN_USDT_WITHDRAWAL * USDT_RATE_INR}) | Maximum: {getMaxUSDTWithdrawal().toFixed(2)} USDT
                  </Text>
                  <Text style={styles.conversionInfo}>
                    1 USDT = ₹{USDT_RATE_INR} | Available: {getMaxUSDTWithdrawal().toFixed(2)} USDT
                  </Text>
                  {parseFloat(amount) > 0 && (
                    <Text style={styles.conversionInfo}>
                      USDT Amount: {convertINRToUSDT(parseFloat(amount)).toFixed(6)} USDT
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.minAmount}>Minimum: ₹{MIN_INR_WITHDRAWAL} | Maximum: ₹{MAX_INR_WITHDRAWAL.toLocaleString()}</Text>
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
                      INR Amount: ₹{parseFloat(amount).toFixed(2)}
                    </Text>
                    <Text style={styles.conversionDetail}>
                      USDT Amount: {convertINRToUSDT(parseFloat(amount)).toFixed(6)} USDT
                    </Text>
                    <Text style={styles.conversionDetail}>
                      Rate: 1 USDT = ₹{USDT_RATE_INR}
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
                    • Minimum withdrawal: ₹{MIN_INR_WITHDRAWAL} | Maximum withdrawal: ₹{MAX_INR_WITHDRAWAL.toLocaleString()}
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
                    • Minimum withdrawal: {MIN_USDT_WITHDRAWAL} USDT (₹{MIN_USDT_WITHDRAWAL * USDT_RATE_INR}) | Maximum: {getMaxUSDTWithdrawal().toFixed(2)} USDT
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
                  (withdrawalMethod === 'bank_transfer' && parseFloat(amount) > balance) ||
                  (withdrawalMethod === 'usdt_trc20' && parseFloat(amount) > balance)
                ) && styles.disabledButton
              ]}
              onPress={handleWithdraw}
              disabled={
                !amount || 
                !hasApprovedDeposits ||
                (withdrawalMethod === 'bank_transfer' && (!accountTitle || !accountNumber || !iban || !bank)) ||
                (withdrawalMethod === 'usdt_trc20' && !usdtAddress) ||
                (withdrawalMethod === 'bank_transfer' && parseFloat(amount) > balance) ||
                (withdrawalMethod === 'usdt_trc20' && parseFloat(amount) > balance)
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
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
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 15,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  amountSection: {
    marginBottom: 20,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
  },
  currencySign: {
    fontSize: 18,
    color: '#00ff00',
    fontWeight: 'bold',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    paddingVertical: 15,
  },
  minAmount: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  conversionInfo: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ff6666',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  withdrawText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bankDetailsSection: {
    marginBottom: 20,
  },
  usdtDetailsSection: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
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
    borderLeftColor: '#f7931a',
  },
  conversionTitle: {
    fontSize: 14,
    color: '#f7931a',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conversionDetail: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 4,
  },
  noticeSection: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noticeTitle: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 5,
    lineHeight: 18,
  },
});
