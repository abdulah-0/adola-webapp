import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { NewAdminService } from '../../services/newAdminService';
import { PendingWithdrawalRequest } from '../../types/adminTypes';
import { useApp } from '../../contexts/AppContext';

export default function PendingWithdrawals() {
  const { user } = useApp();
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<PendingWithdrawalRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPendingWithdrawals();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing pending withdrawals...');
      loadPendingWithdrawals();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPendingWithdrawals = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const pendingWithdrawals = await NewAdminService.getPendingWithdrawals();
      console.log('🔍 Debug - Loaded withdrawals:', pendingWithdrawals);
      if (pendingWithdrawals.length > 0) {
        console.log('🔍 Debug - First withdrawal bankDetails:', pendingWithdrawals[0].bankDetails);
      }
      setWithdrawals(pendingWithdrawals);
    } catch (error) {
      console.error('Error loading pending withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered for pending withdrawals');
    loadPendingWithdrawals(true);
  };

  const handleAction = (withdrawal: PendingWithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setNotes('');
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedWithdrawal) return;

    try {
      let result;
      if (actionType === 'approve') {
        result = await NewAdminService.approveWithdrawal(
          selectedWithdrawal.id,
          user?.id || '00000000-0000-0000-0000-000000000001',
          notes
        );
      } else {
        if (!notes.trim()) {
          Alert.alert('Error', 'Please provide a reason for rejection');
          return;
        }
        result = await NewAdminService.rejectWithdrawal(
          selectedWithdrawal.id,
          user?.id || '00000000-0000-0000-0000-000000000001',
          notes
        );
      }

      if (result.success) {
        // Log balance update for tracking
        if (actionType === 'approve' && result.userId && result.amount) {
          console.log(`💰 Admin approved withdrawal: User ${result.userId} balance decreased by PKR ${result.amount}`);
        }

        Alert.alert(
          'Success',
          `Withdrawal ${actionType === 'approve' ? 'approved' : 'rejected'} successfully${
            actionType === 'approve' && result.amount
              ? `\n\nUser balance updated: -PKR ${result.amount.toLocaleString()}`
              : ''
          }`,
          [{ text: 'OK' }]
        );
        await loadPendingWithdrawals();
      } else {
        Alert.alert('Error', result.error || 'Failed to process request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process request');
    } finally {
      setShowActionModal(false);
      setSelectedWithdrawal(null);
      setNotes('');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    try {
      if (!date) return 'Unknown date';

      const dateObj = new Date(date);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date in formatDate:', date);
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date:', date);
      return 'Invalid date';
    }
  };

  const getTimeAgo = (date: Date | string | null | undefined) => {
    try {
      if (!date) return 'Unknown time';

      const now = new Date();
      const dateObj = new Date(date);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date in getTimeAgo:', date);
        return 'Invalid time';
      }

      const diffMs = now.getTime() - dateObj.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours}h ago`;
      } else {
        return `${diffMinutes}m ago`;
      }
    } catch (error) {
      console.error('Error calculating time ago:', error, 'Date:', date);
      return 'Unknown time';
    }
  };

  const renderWithdrawalItem = ({ item }: { item: PendingWithdrawalRequest }) => (
    <View style={styles.withdrawalCard}>
      <View style={styles.withdrawalHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>Rs {item.amount.toLocaleString()}</Text>
          <Text style={styles.deduction}>-Rs {item.deductionAmount.toLocaleString()} (1%)</Text>
          <Text style={styles.finalAmount}>Rs {item.finalAmount.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.bankDetails}>
        <Text style={styles.bankTitle}>Bank Details:</Text>
        
        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>Account Title:</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(item.bankDetails?.accountTitle || '', 'Account Title')}
          >
            <Text style={styles.bankValue}>{item.bankDetails?.accountTitle || 'N/A'}</Text>
            <Ionicons name="copy-outline" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>Account Number:</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(item.bankDetails?.accountNumber || '', 'Account Number')}
          >
            <Text style={styles.bankValue}>{item.bankDetails?.accountNumber || 'N/A'}</Text>
            <Ionicons name="copy-outline" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>IBAN:</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(item.bankDetails?.iban || '', 'IBAN')}
          >
            <Text style={styles.bankValue}>{item.bankDetails?.iban || 'N/A'}</Text>
            <Ionicons name="copy-outline" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>Bank:</Text>
          <Text style={styles.bankValue}>{item.bankDetails?.bank || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.withdrawalDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Request Time:</Text>
          <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleAction(item, 'reject')}
        >
          <Ionicons name="close" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleAction(item, 'approve')}
        >
          <Ionicons name="checkmark" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading pending withdrawals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Withdrawals ({withdrawals.length})</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#00ff00" />
          <Text style={styles.emptyText}>No pending withdrawals</Text>
          <Text style={styles.emptySubtext}>All withdrawal requests have been processed</Text>
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          renderItem={renderWithdrawalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Action Modal */}
      <Modal visible={showActionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </Text>
            
            {selectedWithdrawal && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  User: {selectedWithdrawal.userEmail}
                </Text>
                <Text style={styles.modalInfoText}>
                  Amount: Rs {selectedWithdrawal.amount.toLocaleString()}
                </Text>
                <Text style={styles.modalInfoText}>
                  Final Amount: Rs {selectedWithdrawal.finalAmount.toLocaleString()}
                </Text>
                <Text style={styles.modalInfoText}>
                  Account: {selectedWithdrawal.bankDetails?.accountTitle || 'N/A'}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {actionType === 'approve' ? 'Notes (optional):' : 'Reason for rejection:'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={
                actionType === 'approve' 
                  ? 'Add any notes...' 
                  : 'Please provide a reason...'
              }
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  actionType === 'approve' ? styles.approveButton : styles.rejectButton
                ]}
                onPress={confirmAction}
              >
                <Text style={styles.confirmButtonText}>
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  listContainer: {
    padding: 16,
  },
  withdrawalCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999999',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  deduction: {
    fontSize: 12,
    color: '#ff6666',
    marginTop: 2,
  },
  finalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
    marginTop: 2,
  },
  bankDetails: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bankLabel: {
    fontSize: 12,
    color: '#cccccc',
    flex: 1,
  },
  bankValue: {
    fontSize: 12,
    color: '#ffffff',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 2,
    justifyContent: 'flex-end',
  },
  withdrawalDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#cccccc',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  statusBadge: {
    backgroundColor: '#ffaa00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#00ff00',
  },
  rejectButton: {
    backgroundColor: '#ff6666',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
