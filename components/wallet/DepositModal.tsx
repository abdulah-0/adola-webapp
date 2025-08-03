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
import * as Clipboard from 'expo-clipboard';
import { BankAccount, USDTAccount, PaymentMethod } from '../../types/walletTypes';
import { BANK_ACCOUNTS, USDT_ACCOUNTS } from '../../services/walletService';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onDeposit: (amount: number, accountId: string, transactionId?: string, notes?: string, paymentMethod?: PaymentMethod) => void;
}

export default function DepositModal({ visible, onClose, onDeposit }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [selectedUSDT, setSelectedUSDT] = useState<USDTAccount | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  // Debug: Log bank accounts to check if they're properly loaded
  React.useEffect(() => {
    console.log('🏦 BANK_ACCOUNTS loaded:', BANK_ACCOUNTS);
    if (!BANK_ACCOUNTS || BANK_ACCOUNTS.length === 0) {
      console.error('❌ BANK_ACCOUNTS is empty or undefined');
    }
  }, []);

  const handleCopyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'bank_transfer') {
      if (depositAmount < 300) {
        Alert.alert('Error', 'Minimum deposit amount is PKR 300');
        return;
      }

      if (!selectedBank) {
        Alert.alert('Error', 'Please select a bank account');
        return;
      }

      onDeposit(depositAmount, selectedBank.id, transactionId, notes, paymentMethod);
    } else if (paymentMethod === 'usdt_trc20') {
      if (depositAmount < 5) {
        Alert.alert('Error', 'Minimum deposit amount is 5 USDT');
        return;
      }

      if (!selectedUSDT) {
        Alert.alert('Error', 'Please select a USDT account');
        return;
      }

      // Convert USDT to PKR for internal processing
      const pkrAmount = depositAmount * selectedUSDT.conversionRate;
      onDeposit(pkrAmount, selectedUSDT.id, transactionId, notes, paymentMethod);
    }

    // Reset form
    setAmount('');
    setSelectedBank(null);
    setSelectedUSDT(null);
    setTransactionId('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Deposit Funds</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Payment Method Selection */}
          <View style={styles.paymentMethodSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethodButtons}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'bank_transfer' && styles.selectedPaymentMethod
                ]}
                onPress={() => {
                  setPaymentMethod('bank_transfer');
                  setSelectedUSDT(null);
                }}
              >
                <Ionicons name="card" size={20} color={paymentMethod === 'bank_transfer' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === 'bank_transfer' && styles.selectedPaymentMethodText
                ]}>Bank Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'usdt_trc20' && styles.selectedPaymentMethod
                ]}
                onPress={() => {
                  setPaymentMethod('usdt_trc20');
                  setSelectedBank(null);
                }}
              >
                <Ionicons name="logo-bitcoin" size={20} color={paymentMethod === 'usdt_trc20' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === 'usdt_trc20' && styles.selectedPaymentMethodText
                ]}>USDT TRC20</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>Deposit Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySign}>
                {paymentMethod === 'usdt_trc20' ? 'USDT' : 'PKR'}
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
            <Text style={styles.minAmount}>
              {paymentMethod === 'usdt_trc20'
                ? 'Minimum deposit: 5 USDT (≈ 1,350 PKR)'
                : 'Minimum deposit: PKR 300'
              }
            </Text>
            {paymentMethod === 'usdt_trc20' && (
              <Text style={styles.conversionRate}>
                1 USDT = 270 PKR
              </Text>
            )}
          </View>

          {/* Account Selection */}
          {paymentMethod === 'bank_transfer' ? (
            <View style={styles.bankSection}>
              <Text style={styles.sectionTitle}>Select Bank Account</Text>
              {(!BANK_ACCOUNTS || BANK_ACCOUNTS.length === 0) ? (
                <Text style={styles.errorText}>No bank accounts available</Text>
              ) : (
                BANK_ACCOUNTS.filter(bank => bank && bank.id).map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.bankCard,
                  selectedBank?.id === bank.id && styles.selectedBank
                ]}
                onPress={() => setSelectedBank(bank)}
              >
                <View style={styles.bankHeader}>
                  <Text style={styles.bankName}>{bank.name || 'Unknown Bank'}</Text>
                  <View style={[
                    styles.radioButton,
                    selectedBank?.id === bank.id && styles.radioSelected
                  ]} />
                </View>

                <View style={styles.bankDetails}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Title:</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopyToClipboard(bank.accountTitle || bank.name || '', 'Account Title')}
                    >
                      <Text style={styles.bankValue}>{bank.accountTitle || bank.name || 'N/A'}</Text>
                      <Ionicons name="copy-outline" size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Number:</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopyToClipboard(bank.accountNumber || '', 'Account Number')}
                    >
                      <Text style={styles.bankValue}>{bank.accountNumber || 'N/A'}</Text>
                      <Ionicons name="copy-outline" size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>IBAN:</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopyToClipboard(bank.iban || '', 'IBAN')}
                    >
                      <Text style={styles.bankValue}>{bank.iban || 'N/A'}</Text>
                      <Ionicons name="copy-outline" size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.bankName}>{bank.bank || 'Unknown Bank'}</Text>
                </View>
              </TouchableOpacity>
              ))
            )}
            </View>
          ) : (
            <View style={styles.bankSection}>
              <Text style={styles.sectionTitle}>Select USDT TRC20 Account</Text>
              {(!USDT_ACCOUNTS || USDT_ACCOUNTS.length === 0) ? (
                <Text style={styles.errorText}>No USDT accounts available</Text>
              ) : (
                USDT_ACCOUNTS.filter(account => account && account.id).map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.bankCard,
                      selectedUSDT?.id === account.id && styles.selectedBank
                    ]}
                    onPress={() => setSelectedUSDT(account)}
                  >
                    <View style={styles.bankHeader}>
                      <Text style={styles.bankName}>{account.name}</Text>
                      <View style={[
                        styles.radioButton,
                        selectedUSDT?.id === account.id && styles.radioSelected
                      ]} />
                    </View>

                    <View style={styles.bankDetails}>
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Network:</Text>
                        <Text style={styles.bankValue}>{account.network}</Text>
                      </View>

                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Address:</Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => handleCopyToClipboard(account.address, 'USDT Address')}
                        >
                          <Text style={styles.bankValue}>{account.address}</Text>
                          <Ionicons name="copy-outline" size={16} color="#007AFF" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Rate:</Text>
                        <Text style={styles.bankValue}>1 USDT = {account.conversionRate} PKR</Text>
                      </View>

                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Min Deposit:</Text>
                        <Text style={styles.bankValue}>{account.minDeposit} USDT</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <View style={styles.transactionSection}>
            <Text style={styles.sectionTitle}>Transaction Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Transaction ID (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={transactionId}
                onChangeText={setTransactionId}
                placeholder={paymentMethod === 'usdt_trc20' ? 'Enter USDT transaction hash' : 'Enter your bank transaction ID'}
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

          <View style={styles.instructionsSection}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {paymentMethod === 'bank_transfer' ? (
              <>
                <Text style={styles.instruction}>
                  1. Transfer the exact amount to the selected bank account
                </Text>
                <Text style={styles.instruction}>
                  2. Keep the transaction receipt/screenshot
                </Text>
                <Text style={styles.instruction}>
                  3. Enter transaction ID and click "Submit Deposit Request"
                </Text>
                <Text style={styles.instruction}>
                  4. Your deposit will be processed within 24 hours
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.instruction}>
                  1. Send the exact USDT amount to the selected TRC20 address
                </Text>
                <Text style={styles.instruction}>
                  2. Copy the transaction hash from your wallet
                </Text>
                <Text style={styles.instruction}>
                  3. Enter transaction hash and click "Submit Deposit Request"
                </Text>
                <Text style={styles.instruction}>
                  4. You will receive {selectedUSDT?.conversionRate || 270} PKR per USDT
                </Text>
                <Text style={styles.instruction}>
                  5. Your deposit will be processed within 24 hours
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
              styles.depositButton,
              (!amount || (paymentMethod === 'bank_transfer' && !selectedBank) || (paymentMethod === 'usdt_trc20' && !selectedUSDT)) && styles.disabledButton
            ]}
            onPress={handleDeposit}
            disabled={!amount || (paymentMethod === 'bank_transfer' && !selectedBank) || (paymentMethod === 'usdt_trc20' && !selectedUSDT)}
          >
            <Text style={styles.depositText}>Submit Deposit Request</Text>
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
  bankSection: {
    marginBottom: 24,
  },
  bankCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedBank: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2332',
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  bankDetails: {
    gap: 8,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 14,
    color: '#cccccc',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 2,
    justifyContent: 'flex-end',
  },
  bankValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  transactionSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  instructionsSection: {
    marginBottom: 24,
  },
  instruction: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    paddingLeft: 8,
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
  depositButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  depositText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
    padding: 20,
  },
  paymentMethodSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
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
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2a3a',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedPaymentMethodText: {
    color: '#007AFF',
  },
  conversionRate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
