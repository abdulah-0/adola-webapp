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

interface WithdrawalModalBDTProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, details: any, notes?: string, method?: 'usdt_trc20') => void;
  balance: number;
}

// BDT Constants (Crypto only)
const MIN_BDT_WITHDRAWAL = 500; // similar to PKR 500 eq.
const MAX_BDT_WITHDRAWAL = 200000;
const USDT_RATE_BDT = 120; // 120 BDT = 1 USDT (example)
const MIN_USDT_WITHDRAWAL = 10;

export default function WithdrawalModalBDT({ visible, onClose, onWithdraw, balance }: WithdrawalModalBDTProps) {
  const { user } = useApp();
  const [amount, setAmount] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [notes, setNotes] = useState('');

  const convertBDTToUSDT = (bdtAmount: number): number => bdtAmount / USDT_RATE_BDT;
  const getMaxUSDTWithdrawal = (): number => balance / USDT_RATE_BDT;

  useEffect(() => {
    if (visible) {
      setAmount('');
      setUsdtAddress('');
      setNotes('');
    }
  }, [visible]);

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (withdrawAmount < MIN_BDT_WITHDRAWAL) {
      Alert.alert('Error', `Minimum withdrawal is ৳${MIN_BDT_WITHDRAWAL}`);
      return;
    }

    if (withdrawAmount > MAX_BDT_WITHDRAWAL) {
      Alert.alert('Error', `Maximum withdrawal is ৳${MAX_BDT_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (withdrawAmount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    const usdtAmount = convertBDTToUSDT(withdrawAmount);

    if (usdtAmount < MIN_USDT_WITHDRAWAL) {
      Alert.alert('Error', `Minimum USDT withdrawal is ${MIN_USDT_WITHDRAWAL} USDT (৳${MIN_USDT_WITHDRAWAL * USDT_RATE_BDT})`);
      return;
    }

    if (!usdtAddress.trim()) {
      Alert.alert('Error', 'Please enter USDT wallet address');
      return;
    }

    // Basic TRC20 validation
    if (!usdtAddress.startsWith('T') || usdtAddress.length !== 34) {
      Alert.alert('Error', 'Please enter a valid TRC20 wallet address (starts with T, 34 characters)');
      return;
    }

    onWithdraw(withdrawAmount, {
      usdtAddress: usdtAddress.trim(),
      usdtAmount,
      bdtEquivalent: withdrawAmount,
    }, notes, 'usdt_trc20');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Withdraw BDT</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.methodSection}>
              <Text style={styles.sectionTitle}>USDT TRC20 Withdrawal</Text>
              <View style={styles.cryptoHeader}>
                <Ionicons name="logo-bitcoin" size={24} color="#007AFF" />
                <Text style={styles.cryptoHeaderText}>Crypto Withdrawal Only</Text>
              </View>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>BDT Amount to Withdraw</Text>
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
                  Minimum: ৳{MIN_BDT_WITHDRAWAL} | Maximum: ৳{MAX_BDT_WITHDRAWAL.toLocaleString()}
                </Text>
                <Text style={styles.conversionInfo}>
                  1 USDT = ৳{USDT_RATE_BDT} | Min USDT: {MIN_USDT_WITHDRAWAL} USDT
                </Text>
                {parseFloat(amount) > 0 && (
                  <Text style={styles.conversionInfo}>
                    USDT Amount: {convertBDTToUSDT(parseFloat(amount)).toFixed(6)} USDT
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TRC20 Wallet Address</Text>
              <TextInput
                style={styles.textInput}
                value={usdtAddress}
                onChangeText={setUsdtAddress}
                placeholder="Enter USDT TRC20 address (starts with T)"
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
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.withdrawButton, (!amount || !usdtAddress.trim()) && styles.disabledButton]}
              onPress={handleWithdraw}
              disabled={!amount || !usdtAddress.trim()}
            >
              <Text style={styles.withdrawText}>Submit USDT Withdrawal</Text>
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
  inputGroup: { marginTop: 12 },
  inputLabel: { color: '#fff', marginBottom: 6 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, color: '#fff' },
  usdtConversionInfo: { marginTop: 12 },
  conversionTitle: { color: '#fff', fontWeight: '600', marginBottom: 6 },
  conversionDetail: { color: '#ddd' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#fff' },
  withdrawButton: { backgroundColor: '#f72585', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  withdrawText: { color: '#fff', fontWeight: '600' },
});
