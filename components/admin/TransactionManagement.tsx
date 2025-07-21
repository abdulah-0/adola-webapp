// Transaction Management Component for Admin Panel
// Handles deposit and withdrawal requests approval/rejection

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { 
  getAllTransactionRequests,
  approveTransactionRequest,
  rejectTransactionRequest,
  getTransactionStatistics,
  TransactionTypes,
  TransactionStatus,
  testTransactionStorage
} from '../../services/transactionService.js';

interface Transaction {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: number;
  method: string;
  bankDetails: any;
  requestDate: Date;
  processedDate?: Date;
  processedBy?: string;
  adminNotes: string;
  userNotes: string;
  deductionAmount?: number;
  finalAmount?: number;
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    pendingDepositAmount: 0,
    pendingWithdrawalAmount: 0,
  });

  useEffect(() => {
    loadTransactions();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterStatus, filterType]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      console.log('🔄 Admin panel loading transactions...');
      const allTransactions = await getAllTransactionRequests();
      console.log('📊 Loaded transactions:', allTransactions.length, allTransactions);
      console.log('📊 Transaction details:', allTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        userId: t.userId
      })));
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getTransactionStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    await loadStatistics();
    setRefreshing(false);
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    setFilteredTransactions(filtered);
  };

  const handleApprove = async () => {
    if (!selectedTransaction) return;

    try {
      const result = await approveTransactionRequest(
        selectedTransaction.id,
        'super-admin-1',
        adminNotes
      );

      if (result.success) {
        Alert.alert('Success', 'Transaction approved successfully');
        setShowActionModal(false);
        setSelectedTransaction(null);
        setAdminNotes('');
        await loadTransactions();
        await loadStatistics();
      } else {
        Alert.alert('Error', result.error || 'Failed to approve transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve transaction');
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction) return;

    try {
      const result = await rejectTransactionRequest(
        selectedTransaction.id,
        'super-admin-1',
        adminNotes
      );

      if (result.success) {
        Alert.alert('Success', 'Transaction rejected successfully');
        setShowActionModal(false);
        setSelectedTransaction(null);
        setAdminNotes('');
        await loadTransactions();
        await loadStatistics();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject transaction');
    }
  };

  const openActionModal = (transaction: Transaction, action: 'approve' | 'reject') => {
    setSelectedTransaction(transaction);
    setActionType(action);
    setAdminNotes('');
    setShowActionModal(true);
  };

  const openDetailsModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const runTest = async () => {
    try {
      console.log('🧪 Running transaction test from admin panel...');
      const result = await testTransactionStorage();
      console.log('🧪 Test result:', result);
      Alert.alert('Test Result', `Test ${result.success ? 'passed' : 'failed'}: ${result.success ? `${result.allTransactions.length} transactions found` : result.error}`);
      if (result.success) {
        await loadTransactions();
        await loadStatistics();
      }
    } catch (error) {
      console.error('🧪 Test error:', error);
      Alert.alert('Test Error', error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TransactionStatus.PENDING:
        return Colors.primary.gold;
      case TransactionStatus.APPROVED:
        return Colors.primary.neonCyan;
      case TransactionStatus.REJECTED:
        return Colors.primary.hotPink;
      default:
        return Colors.primary.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === TransactionTypes.DEPOSIT ? '💰' : '💸';
  };

  const renderStatistics = () => (
    <View style={styles.statisticsContainer}>
      <Text style={styles.sectionTitle}>📊 Transaction Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.pendingRequests}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.approvedRequests}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.rejectedRequests}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Rs {statistics.pendingDepositAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Pending Deposits</Text>
        </View>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Text style={styles.sectionTitle}>🔍 Filters</Text>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.activeFilterButton
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.activeFilterButtonText
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.filterButtons}>
            {['all', 'deposit', 'withdrawal'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.activeFilterButton
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === type && styles.activeFilterButtonText
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderTransactionCard = (transaction: Transaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>
            {getTypeIcon(transaction.type)} {transaction.type.toUpperCase()}
          </Text>
          <Text style={styles.transactionAmount}>
            Rs {transaction.amount.toLocaleString()}
          </Text>
          {transaction.type === TransactionTypes.WITHDRAWAL && transaction.finalAmount && (
            <Text style={styles.finalAmount}>
              Final: Rs {transaction.finalAmount.toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.transactionStatus}>
          <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
            {transaction.status.toUpperCase()}
          </Text>
          <Text style={styles.transactionDate}>
            {transaction.requestDate.toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <Text style={styles.detailText}>User ID: {transaction.userId}</Text>
        <Text style={styles.detailText}>
          Bank: {transaction.bankDetails?.bankName || 'N/A'}
        </Text>
        <Text style={styles.detailText}>
          Account: {transaction.bankDetails?.accountName || 'N/A'}
        </Text>
        {transaction.userNotes && (
          <Text style={styles.detailText}>Notes: {transaction.userNotes}</Text>
        )}
      </View>

      <View style={styles.transactionActions}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => openDetailsModal(transaction)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {transaction.status === TransactionStatus.PENDING && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => openActionModal(transaction, 'approve')}
            >
              <Text style={styles.actionButtonText}>✅ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openActionModal(transaction, 'reject')}
            >
              <Text style={styles.actionButtonText}>❌ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatistics()}

        {/* Test Button for Debugging */}
        <View style={styles.testContainer}>
          <TouchableOpacity style={styles.testButton} onPress={runTest}>
            <Text style={styles.testButtonText}>🧪 Test Transaction System</Text>
          </TouchableOpacity>
        </View>

        {renderFilters()}
        
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>
            💳 Transaction Requests ({filteredTransactions.length})
          </Text>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            filteredTransactions.map(renderTransactionCard)
          )}
        </View>
      </ScrollView>

      {/* Transaction Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            {selectedTransaction && (
              <ScrollView style={styles.detailsScroll}>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID: </Text>
                  {selectedTransaction.id}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type: </Text>
                  {selectedTransaction.type.toUpperCase()}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount: </Text>
                  PKR {selectedTransaction.amount.toLocaleString()}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status: </Text>
                  {selectedTransaction.status.toUpperCase()}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User ID: </Text>
                  {selectedTransaction.userId}
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Request Date: </Text>
                  {selectedTransaction.requestDate.toLocaleString()}
                </Text>
                
                {selectedTransaction.bankDetails && (
                  <>
                    <Text style={styles.detailSectionTitle}>Bank Details:</Text>
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Name: </Text>
                      {selectedTransaction.bankDetails.accountName}
                    </Text>
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Number: </Text>
                      {selectedTransaction.bankDetails.accountNumber}
                    </Text>
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bank: </Text>
                      {selectedTransaction.bankDetails.bankName}
                    </Text>
                    {selectedTransaction.bankDetails.iban && (
                      <Text style={styles.detailRow}>
                        <Text style={styles.detailLabel}>IBAN: </Text>
                        {selectedTransaction.bankDetails.iban}
                      </Text>
                    )}
                  </>
                )}
                
                {selectedTransaction.userNotes && (
                  <>
                    <Text style={styles.detailSectionTitle}>User Notes:</Text>
                    <Text style={styles.detailRow}>{selectedTransaction.userNotes}</Text>
                  </>
                )}
                
                {selectedTransaction.adminNotes && (
                  <>
                    <Text style={styles.detailSectionTitle}>Admin Notes:</Text>
                    <Text style={styles.detailRow}>{selectedTransaction.adminNotes}</Text>
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? '✅ Approve' : '❌ Reject'} Transaction
            </Text>
            {selectedTransaction && (
              <View style={styles.actionModalContent}>
                <Text style={styles.actionModalText}>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} {selectedTransaction.type} request for PKR {selectedTransaction.amount.toLocaleString()}?
                </Text>
                
                <Text style={styles.inputLabel}>Admin Notes:</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Enter admin notes (optional)"
                  placeholderTextColor={Colors.primary.textSecondary}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                />
                
                <View style={styles.actionModalButtons}>
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
                    onPress={actionType === 'approve' ? handleApprove : handleReject}
                  >
                    <Text style={styles.confirmButtonText}>
                      {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.text,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
  },
  statisticsContainer: {
    marginBottom: 20,
  },
  testContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterRow: {
    gap: 15,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary.surface,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.primary.text,
  },
  activeFilterButtonText: {
    color: Colors.primary.background,
    fontWeight: 'bold',
  },
  transactionsContainer: {
    marginBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
  },
  transactionCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 2,
  },
  finalAmount: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  transactionDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 2,
  },
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary.border,
  },
  detailsButtonText: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  rejectButton: {
    backgroundColor: Colors.primary.hotPink,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary.background,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  detailRow: {
    fontSize: 14,
    color: Colors.primary.text,
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 12,
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: Colors.primary.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  actionModalContent: {
    marginBottom: 16,
  },
  actionModalText: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.primary.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.primary.text,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  actionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.primary.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
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
    color: Colors.primary.background,
  },
});
