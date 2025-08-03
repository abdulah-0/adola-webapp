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
import { NewAdminService } from '../../services/newAdminService';
import { PendingDepositRequest } from '../../types/adminTypes';
import { useApp } from '../../contexts/AppContext';

export default function PendingDeposits() {
  const { user } = useApp();
  const [deposits, setDeposits] = useState<PendingDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<PendingDepositRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPendingDeposits();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing pending deposits...');
      loadPendingDeposits();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPendingDeposits = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const pendingDeposits = await NewAdminService.getPendingDeposits();
      setDeposits(pendingDeposits);
    } catch (error) {
      console.error('Error loading pending deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered for pending deposits');
    loadPendingDeposits(true);
  };

  const handleAction = (deposit: PendingDepositRequest, action: 'approve' | 'reject') => {
    setSelectedDeposit(deposit);
    setActionType(action);
    setNotes('');
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedDeposit) return;

    console.log(`🔄 Frontend: Starting ${actionType} action for deposit:`, selectedDeposit.id);
    console.log(`🔄 Frontend: Admin ID:`, user?.id);
    console.log(`🔄 Frontend: Notes:`, notes);

    try {
      let result;
      if (actionType === 'approve') {
        console.log(`🔄 Frontend: Calling NewAdminService.approveDeposit...`);
        console.log(`🔄 Frontend: NewAdminService available:`, !!NewAdminService);
        console.log(`🔄 Frontend: approveDeposit function available:`, !!NewAdminService.approveDeposit);

        result = await NewAdminService.approveDeposit(
          selectedDeposit.id,
          user?.id || '00000000-0000-0000-0000-000000000001', // Use actual admin ID
          notes
        );
        console.log(`✅ Frontend: Approval result:`, result);
      } else {
        if (!notes.trim()) {
          Alert.alert('Error', 'Please provide a reason for rejection');
          return;
        }
        console.log(`🔄 Frontend: Calling NewAdminService.rejectDeposit...`);
        result = await NewAdminService.rejectDeposit(
          selectedDeposit.id,
          user?.id || '00000000-0000-0000-0000-000000000001',
          notes
        );
        console.log(`✅ Frontend: Rejection result:`, result);
      }

      if (result.success) {
        // Log balance update for tracking
        if (actionType === 'approve' && result.userId && result.amount) {
          console.log(`💰 Admin approved deposit: User ${result.userId} balance increased by PKR ${result.totalAmount || result.amount} (including bonus)`);
        }

        let successMessage = `Deposit ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`;

        if (actionType === 'approve' && result.amount) {
          if (result.bonusAmount && result.bonusAmount > 0) {
            successMessage += `\n\n💰 Deposit: PKR ${result.amount.toLocaleString()}`;
            successMessage += `\n🎁 5% Bonus: PKR ${result.bonusAmount.toLocaleString()}`;
            successMessage += `\n✅ Total Added: PKR ${(result.totalAmount || result.amount).toLocaleString()}`;
          } else {
            successMessage += `\n\nUser balance updated: +PKR ${result.amount.toLocaleString()}`;
          }
        }

        Alert.alert('Success', successMessage, [{ text: 'OK' }]);
        await loadPendingDeposits();
      } else {
        Alert.alert('Error', result.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('❌ Frontend: Error in confirmAction:', error);
      Alert.alert('Error', `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setShowActionModal(false);
      setSelectedDeposit(null);
      setNotes('');
    }
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

  const renderDepositItem = ({ item }: { item: PendingDepositRequest }) => (
    <View style={styles.depositCard}>
      <View style={styles.depositHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>Rs {item.amount.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.depositDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <View style={[styles.paymentMethodBadge, item.paymentMethod === 'usdt_trc20' ? styles.usdtBadge : styles.bankBadge]}>
            <Text style={styles.paymentMethodText}>
              {item.paymentMethod === 'usdt_trc20' ? 'USDT TRC20' : 'Bank Transfer'}
            </Text>
          </View>
        </View>

        {item.paymentMethod === 'usdt_trc20' ? (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>USDT Account:</Text>
              <Text style={styles.detailValue}>{item.usdtAccountName || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>USDT Address:</Text>
              <Text style={[styles.detailValue, styles.addressText]}>{item.usdtAddress || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Hash:</Text>
              <Text style={[styles.detailValue, styles.hashText]}>{item.transactionHash || 'Not provided'}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Account:</Text>
              <Text style={styles.detailValue}>{item.bankAccountName || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValue}>{item.transactionId || 'Not provided'}</Text>
            </View>
          </>
        )}

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
        <Text style={styles.loadingText}>Loading pending deposits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Deposits ({deposits.length})</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {deposits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#00ff00" />
          <Text style={styles.emptyText}>No pending deposits</Text>
          <Text style={styles.emptySubtext}>All deposit requests have been processed</Text>
        </View>
      ) : (
        <FlatList
          data={deposits}
          renderItem={renderDepositItem}
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
              {actionType === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
            </Text>
            
            {selectedDeposit && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  User: {selectedDeposit.userEmail}
                </Text>
                <Text style={styles.modalInfoText}>
                  Amount: Rs {selectedDeposit.amount.toLocaleString()}
                </Text>
                <Text style={styles.modalInfoText}>
                  Bank Account: {selectedDeposit.bankAccountName || 'Unknown'}
                </Text>
                <Text style={styles.modalInfoText}>
                  Transaction ID: {selectedDeposit.transactionId || 'Not provided'}
                </Text>
                <Text style={styles.modalInfoText}>
                  Request Time: {formatDate(selectedDeposit.createdAt)}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  },
  listContainer: {
    padding: 16,
  },
  depositCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  depositHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  depositDetails: {
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
  paymentMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bankBadge: {
    backgroundColor: '#007AFF',
  },
  usdtBadge: {
    backgroundColor: '#f7931a',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#64ffda',
  },
  hashText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ff6b6b',
  },
});
