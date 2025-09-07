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

interface DepositModalBDTProps {
  visible: boolean;
  onClose: () => void;
  onDeposit: (amount: number, details: any, notes?: string, method?: 'usdt_trc20') => void;
}

// BDT Constants (Crypto only)
const MIN_BDT_DEPOSIT = 300; // similar lower bound like PKR 300
const MAX_BDT_DEPOSIT = 150000; // cap for safety
const USDT_RATE_BDT = 120; // 120 BDT = 1 USDT (example rate)
const MIN_USDT_DEPOSIT = 1; // Minimum USDT deposit

export default function DepositModalBDT({ visible, onClose, onDeposit }: DepositModalBDTProps) {
  const { user } = useApp();
  const [amount, setAmount] = useState('');
  const [usdtAccounts, setUsdtAccounts] = useState<any[]>([]);
  const [selectedUsdtAccount, setSelectedUsdtAccount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');

  const convertBDTToUSDT = (bdtAmount: number): number => bdtAmount / USDT_RATE_BDT;

  useEffect(() => {
    if (visible) {
      setAmount('');
      setSelectedUsdtAccount('');
      setTransactionHash('');
      setUsdtAccounts(USDT_ACCOUNTS);
      if (USDT_ACCOUNTS.length > 0) setSelectedUsdtAccount(USDT_ACCOUNTS[0].id);
    }
  }, [visible]);

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount < MIN_BDT_DEPOSIT) {
      Alert.alert('Error', `Minimum deposit is ৳${MIN_BDT_DEPOSIT}`);
      return;
    }

    if (depositAmount > MAX_BDT_DEPOSIT) {
      Alert.alert('Error', `Maximum deposit is ৳${MAX_BDT_DEPOSIT.toLocaleString()}`);
      return;
    }

    const usdtAmount = convertBDTToUSDT(depositAmount);
    if (usdtAmount < MIN_USDT_DEPOSIT) {
      Alert.alert('Error', `Minimum USDT deposit is ${MIN_USDT_DEPOSIT} USDT (৳${USDT_RATE_BDT})`);
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
      usdtAmount,
      bdtEquivalent: depositAmount,
    }, '', 'usdt_trc20');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Deposit BDT</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.methodSection}>
              <Text style={styles.sectionTitle}>USDT TRC20 Deposit</Text>
              <View style={styles.cryptoHeader}>
                <Ionicons name="logo-bitcoin" size={24} color="#007AFF" />
                <Text style={styles.cryptoHeaderText}>Crypto Deposit Only</Text>
              </View>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>BDT Amount to Deposit</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySign}>৳</Text>
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
                  Minimum: ৳{MIN_BDT_DEPOSIT} | Maximum: ৳{MAX_BDT_DEPOSIT.toLocaleString()}
                </Text>
                <Text style={styles.conversionInfo}>
                  1 USDT = ৳{USDT_RATE_BDT} | Min USDT: {MIN_USDT_DEPOSIT} USDT
                </Text>
                {parseFloat(amount) > 0 && (
                  <Text style={styles.conversionInfo}>
                    USDT Amount: {convertBDTToUSDT(parseFloat(amount)).toFixed(6)} USDT
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.usdtDetailsSection}>
              <Text style={styles.sectionTitle}>USDT Account Selection</Text>

              {usdtAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.usdtOption, selectedUsdtAccount === account.id && styles.selectedUsdtOption]}
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
                  <Text style={styles.conversionDetail}>BDT Amount: ৳{parseFloat(amount).toFixed(2)}</Text>
                  <Text style={styles.conversionDetail}>USDT Amount: {convertBDTToUSDT(parseFloat(amount)).toFixed(6)} USDT</Text>
                  <Text style={styles.conversionDetail}>Rate: 1 USDT = ৳{USDT_RATE_BDT}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.depositButton, (!amount || !selectedUsdtAccount || !transactionHash.trim()) && styles.disabledButton]}
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
  container: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#1e1e1e', borderRadius: 12, width: '90%', maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', padding: 16 },
  closeButton: { padding: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  methodSection: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  cryptoHeader: { flexDirection: 'row', alignItems: 'center' },
  cryptoHeaderText: { marginLeft: 8, color: '#aaa' },
  amountSection: { marginVertical: 12 },
  amountInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 },
  currencySign: { color: '#fff', fontWeight: '600', paddingLeft: 12 },
  input: { color: '#fff', padding: 12, fontSize: 16, flex: 1 },
  minAmount: { color: '#aaa', marginTop: 8 },
  conversionInfo: { color: '#aaa', marginTop: 6 },
  usdtDetailsSection: { marginTop: 16 },
  usdtOption: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  selectedUsdtOption: { borderWidth: 1, borderColor: '#f7931a' },
  usdtInfo: {},
  usdtName: { color: '#fff', fontWeight: '600' },
  usdtAddress: { color: '#bbb', marginTop: 2 },
  networkText: { color: '#bbb', marginTop: 2 },
  inputGroup: { marginTop: 12 },
  inputLabel: { color: '#fff', marginBottom: 6 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, color: '#fff' },
  usdtConversionInfo: { marginTop: 12 },
  conversionTitle: { color: '#fff', fontWeight: '600', marginBottom: 6 },
  conversionDetail: { color: '#ddd' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#fff' },
  depositButton: { backgroundColor: '#f72585', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  depositText: { color: '#fff', fontWeight: '600' },
});
