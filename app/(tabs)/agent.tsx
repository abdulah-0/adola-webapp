import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { AgentService } from '../../services/agentService';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';
import { Colors } from '../../constants/Colors';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

interface AgentStats {
  totalReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  thisMonthCommissions: number;
  referralCode: string;
}

export default function AgentScreen() {
  const { user } = useApp();
  const [agentStatus, setAgentStatus] = useState<'not_applied' | 'pending' | 'approved' | 'rejected'>('not_applied');
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationReason, setApplicationReason] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadAgentData();
    }
  }, [user?.id]);

  const loadAgentData = async () => {
    try {
      setLoading(true);

      const status = await AgentService.getAgentStatus(user.id);
      setAgentStatus(status);

      if (status === 'approved') {
        const stats = await AgentService.getAgentStats(user.id);
        const referralList = await AgentService.getAgentReferrals(user.id);
        setAgentStats(stats);
        setReferrals(referralList);
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleApplyForAgent = async () => {
    if (!applicationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your agent application');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    try {
      const success = await AgentService.applyForAgent(user.id, applicationReason.trim());

      if (success) {
        Alert.alert(
          'Success',
          'Application submitted successfully',
          [{ text: 'OK', onPress: () => {
            setAgentStatus('pending');
            loadAgentData();
          }}]
        );
        setApplicationReason('');
      } else {
        Alert.alert('Error', 'Failed to submit agent application. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to submit agent application: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCopyReferralCode = async () => {
    if (agentStats?.referralCode) {
      await Clipboard.setStringAsync(agentStats.referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    }
  };

  const handleShareReferralCode = async () => {
    if (agentStats?.referralCode) {
      try {
        await Share.share({
          message: `Join Adola Gaming Platform using my referral code: ${agentStats.referralCode}\n\nGet amazing bonuses and start playing exciting games!`,
          title: 'Join Adola Gaming Platform',
        });
      } catch (error) {
        console.error('Error sharing referral code:', error);
      }
    }
  };

  const renderNotApplied = () => (
    <View style={styles.applicationContainer}>
      <View style={styles.headerSection}>
        <Ionicons name="people" size={48} color={Colors.primary.hotPink} />
        <Text style={styles.headerTitle}>Become an Agent</Text>
        <Text style={styles.headerSubtitle}>
          Join our agent program and earn 5% commission on every deposit made by your referrals!
        </Text>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Agent Benefits:</Text>
        <View style={styles.benefitItem}>
          <Ionicons name="cash" size={20} color="#00ff00" />
          <Text style={styles.benefitText}>5% commission on all referral deposits</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="people" size={20} color="#00ff00" />
          <Text style={styles.benefitText}>Build your own referral network</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="trending-up" size={20} color="#00ff00" />
          <Text style={styles.benefitText}>Unlimited earning potential</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={20} color="#00ff00" />
          <Text style={styles.benefitText}>Reliable monthly payouts</Text>
        </View>
      </View>

      <View style={styles.applicationForm}>
        <Text style={styles.inputLabel}>Why do you want to become an agent?</Text>
        <TextInput
          style={styles.textArea}
          value={applicationReason}
          onChangeText={setApplicationReason}
          placeholder="Tell us about your experience, network, and why you'd be a great agent..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.applyButton} onPress={handleApplyForAgent}>
          <Ionicons name="send" size={20} color="#fff" />
          <Text style={styles.applyButtonText}>Submit Application</Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  const renderPending = () => (
    <View style={styles.statusContainer}>
      <Ionicons name="time" size={48} color="#ffa500" />
      <Text style={styles.statusTitle}>Application Pending</Text>
      <Text style={styles.statusSubtitle}>
        Your agent application is under review. You will be notified once it's approved.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadAgentData}>
        <Ionicons name="refresh" size={20} color={Colors.primary.hotPink} />
        <Text style={styles.refreshButtonText}>Check Status</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRejected = () => (
    <View style={styles.statusContainer}>
      <Ionicons name="close-circle" size={48} color="#ff4444" />
      <Text style={styles.statusTitle}>Application Rejected</Text>
      <Text style={styles.statusSubtitle}>
        Your agent application was not approved. You can apply again after improving your qualifications.
      </Text>
      <TouchableOpacity style={styles.reapplyButton} onPress={() => setAgentStatus('not_applied')}>
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.reapplyButtonText}>Apply Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderApproved = () => (
    <View style={styles.agentDashboard}>
      {/* Agent Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.dashboardTitle}>Agent Dashboard</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{agentStats?.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>PKR {agentStats?.totalCommissions?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>PKR {agentStats?.pendingCommissions?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>PKR {agentStats?.thisMonthCommissions?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      </View>

      {/* Referral Code Section */}
      <View style={styles.referralSection}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCode}>{agentStats?.referralCode}</Text>
          <View style={styles.referralActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyReferralCode}>
              <Ionicons name="copy" size={20} color={Colors.primary.hotPink} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareReferralCode}>
              <Ionicons name="share" size={20} color={Colors.primary.hotPink} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recent Referrals */}
      <View style={styles.referralsSection}>
        <Text style={styles.sectionTitle}>Recent Referrals ({referrals.length})</Text>
        {referrals.length > 0 ? (
          referrals.slice(0, 5).map((referral, index) => (
            <View key={index} style={styles.referralItem}>
              <View style={styles.referralInfo}>
                <Text style={styles.referralName}>{referral.username || 'User'}</Text>
                <Text style={styles.referralDate}>
                  Joined: {new Date(referral.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.referralStats}>
                <Text style={styles.referralDeposits}>
                  {referral.total_deposits} deposits
                </Text>
                <Text style={styles.referralCommission}>
                  PKR {referral.total_commission?.toLocaleString() || 0}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noReferrals}>No referrals yet. Start sharing your code!</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <DarkGradientBackground>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </DarkGradientBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {agentStatus === 'not_applied' && renderNotApplied()}
          {agentStatus === 'pending' && renderPending()}
          {agentStatus === 'rejected' && renderRejected()}
          {agentStatus === 'approved' && renderApproved()}
        </ScrollView>
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.primary.text,
    fontSize: 16,
  },
  applicationContainer: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: Colors.primary.text,
    marginLeft: 12,
  },
  applicationForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: Colors.primary.text,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  applyButton: {
    backgroundColor: Colors.primary.hotPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 20,
    marginBottom: 12,
  },
  statusSubtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.hotPink,
  },
  refreshButtonText: {
    color: Colors.primary.hotPink,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reapplyButton: {
    backgroundColor: Colors.primary.hotPink,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  reapplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  agentDashboard: {
    flex: 1,
  },
  statsContainer: {
    marginBottom: 30,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.hotPink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  referralSection: {
    marginBottom: 30,
  },
  referralCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    flex: 1,
  },
  referralActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  referralsSection: {
    marginBottom: 20,
  },
  referralItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  referralStats: {
    alignItems: 'flex-end',
  },
  referralDeposits: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
  referralCommission: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  noReferrals: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
});
