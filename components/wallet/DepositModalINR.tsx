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
import { USDT_ACCOUNTS } from '../../services/walletService';

interface DepositModalINRProps {
  visible: boolean;
  onClose: () => void;
  onDeposit: (amount: number, details: any, notes?: string, method?: 'bank_transfer' | 'usdt_trc20') => void;
}

// INR Constants
const MIN_INR_DEPOSIT = 90; // Minimum deposit in INR
const MAX_INR_DEPOSIT = 15000; // Maximum deposit in INR
const USDT_RATE_INR = 90; // 90 INR = 1 USDT
const MIN_USDT_DEPOSIT = 1; // Minimum USDT deposit

export default function DepositModalINR({ visible, onClose, onDeposit }: DepositModalINRProps) {
  const { user } = useApp();
  const [amount, setAmount] = useState('');
  const [usdtAccounts, setUsdtAccounts] = useState<any[]>([]);
  const [selectedUsdtAccount, setSelectedUsdtAccount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [loading, setLoading] = useState(false);

  // USDT conversion functions for INR
  const convertINRToUSDT = (inrAmount: number): number => {
    return inrAmount / USDT_RATE_INR;
  };

  const convertUSDTToINR = (usdtAmount: number): number => {
    return usdtAmount * USDT_RATE_INR;
  };

  const getMaxUSDTDeposit = (): number => {
    return MAX_INR_DEPOSIT / USDT_RATE_INR;
  };

  useEffect(() => {
    if (visible) {
      loadUsdtAccounts();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setAmount('');
    setSelectedUsdtAccount('');
    setTransactionHash('');
  };



  const loadUsdtAccounts = () => {
    try {
      setUsdtAccounts(USDT_ACCOUNTS);
      if (USDT_ACCOUNTS.length > 0) {
        setSelectedUsdtAccount(USDT_ACCOUNTS[0].id);
      }
    } catch (error) {
      console.error('Error loading USDT accounts:', error);
    }
  };



  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount < MIN_INR_DEPOSIT) {
      Alert.alert('Error', `Minimum deposit is ₹${MIN_INR_DEPOSIT}`);
      return;
    }

    if (depositAmount > MAX_INR_DEPOSIT) {
      Alert.alert('Error', `Maximum deposit is ₹${MAX_INR_DEPOSIT.toLocaleString()}`);
      return;
    }

    const usdtAmount = convertINRToUSDT(depositAmount);

    if (usdtAmount < MIN_USDT_DEPOSIT) {
      Alert.alert('Error', `Minimum USDT deposit is ${MIN_USDT_DEPOSIT} USDT (₹${USDT_RATE_INR})`);
      return;
    }

    if (!selectedUsdtAccount || !transactionHash.trim()) {
      Alert.alert('Error', 'Please select a USDT account and enter transaction hash');
      return;
    }

    const selectedUsdt = usdtAccounts.find(account => account.id === selectedUsdtAccount);

    onDeposit(depositAmount, {
      usdtAccountId: selectedUsdtAccount,
      usdtAccountName: selectedUsdt?.name || 'Unknown USDT Account',
      usdtAddress: selectedUsdt?.address || '',
      transactionHash: transactionHash.trim(),
      usdtAmount: usdtAmount,
      inrEquivalent: depositAmount,
    }, '', 'usdt_trc20');
  };

  const selectedUsdtData = usdtAccounts.find(account => account.id === selectedUsdtAccount);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Deposit INR</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* USDT Deposit Header */}
            <View style={styles.methodSection}>
              <Text style={styles.sectionTitle}>USDT TRC20 Deposit</Text>
              <View style={styles.cryptoHeader}>
                <Ionicons name="logo-bitcoin" size={24} color="#007AFF" />
                <Text style={styles.cryptoHeaderText}>Crypto Deposit Only</Text>
              </View>
            </View>

            {/* Amount Section */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>INR Amount to Deposit</Text>
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
              <View>
                <Text style={styles.minAmount}>
                  Minimum: ₹{MIN_INR_DEPOSIT} | Maximum: ₹{MAX_INR_DEPOSIT.toLocaleString()}
                </Text>
                <Text style={styles.conversionInfo}>
                  1 USDT = ₹{USDT_RATE_INR} | Min USDT: {MIN_USDT_DEPOSIT} USDT
                </Text>
                {parseFloat(amount) > 0 && (
                  <Text style={styles.conversionInfo}>
                    USDT Amount: {convertINRToUSDT(parseFloat(amount)).toFixed(6)} USDT
                  </Text>
                )}
              </View>
            </View>

            {/* USDT Details Section */}
            <View style={styles.usdtDetailsSection}>
              <Text style={styles.sectionTitle}>USDT Account Selection</Text>

              {usdtAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.usdtOption,
                    selectedUsdtAccount === account.id && styles.selectedUsdtOption
                  ]}
                  onPress={() => setSelectedUsdtAccount(account.id)}
                >
                  <View style={styles.usdtInfo}>
                    <Text style={styles.usdtName}>{account.name}</Text>
                    <Text style={styles.usdtAddress}>{account.address}</Text>
                    <Text style={styles.networkText}>Network: TRON (TRC20)</Text>
                  </View>
                  {selectedUsdtAccount === account.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#f7931a" />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction Hash</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionHash}
                  onChangeText={setTransactionHash}
                  placeholder="Enter USDT transaction hash"
                  placeholderTextColor="#666"
                />
              </View>

              {parseFloat(amount) > 0 && (
                <View style={styles.usdtConversionInfo}>
                  <Text style={styles.conversionTitle}>Transaction Details:</Text>
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
            </View>


          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.depositButton,
                (!amount || !selectedUsdtAccount || !transactionHash.trim()) && styles.disabledButton
              ]}
              onPress={handleDeposit}
              disabled={!amount || !selectedUsdtAccount || !transactionHash.trim()}
            >
              <Text style={styles.depositText}>Submit USDT Deposit</Text>
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
  depositButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00ff00',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  depositText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  bankDetailsSection: {
    marginBottom: 20,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedBankOption: {
    borderColor: '#00ff00',
    backgroundColor: '#1a2a1a',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bankDetails: {
    fontSize: 12,
    color: '#888',
  },
  usdtDetailsSection: {
    marginBottom: 20,
  },
  usdtOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedUsdtOption: {
    borderColor: '#f7931a',
    backgroundColor: '#2a1f1a',
  },
  usdtInfo: {
    flex: 1,
  },
  usdtName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  usdtAddress: {
    fontSize: 12,
    color: '#64ffda',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  networkText: {
    fontSize: 12,
    color: '#f7931a',
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
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 10,
  },
  receiptPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 10,
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
  cryptoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cryptoHeaderText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});
