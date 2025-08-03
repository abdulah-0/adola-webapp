import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../../contexts/AppContext';
import { ReferralService } from '../../services/referralService';
import { ReferralStats, DAILY_MILESTONES } from '../../types/referralTypes';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';

export default function ReferralScreen() {
  const { user } = useApp();
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      loadReferralData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadReferralData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const userId = user?.id || 'guest';
      console.log('🔄 Loading referral data for user:', userId);

      // Get or create referral code
      let code = await ReferralService.getUserReferralCode(userId);
      if (!code) {
        console.log('📝 Creating new referral code for user');
        const result = await ReferralService.registerUserWithReferral(
          userId,
          user?.email || 'guest@example.com',
          user?.username || 'Guest'
        );
        code = result.userReferralCode;
        console.log('✅ New referral code created:', code);
      }

      setReferralCode(code);

      // Get referral stats
      console.log('📊 Fetching referral stats...');
      const referralStats = await ReferralService.getReferralStats(userId);
      setStats(referralStats);
      console.log('✅ Referral stats loaded:', referralStats);
    } catch (error) {
      console.error('❌ Error loading referral data:', error);
      Alert.alert('Error', 'Failed to load referral data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReferralData(true);
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join Adola Gaming Platform with my referral code: ${referralCode}\n\nGet bonus rewards on your first 3 deposits!`,
        title: 'Join Adola Gaming Platform',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getMilestoneProgress = () => {
    if (!stats) return 0;
    if (stats.currentMilestone === stats.nextMilestoneTarget) return 100;
    return (stats.todayReferrals / stats.nextMilestoneTarget) * 100;
  };

  const getNextMilestoneBonus = () => {
    if (!stats) return 0;
    const nextMilestone = DAILY_MILESTONES.find(m => m.referrals === stats.nextMilestoneTarget);
    return nextMilestone?.bonus || 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DarkGradientBackground>
          <Text style={styles.loadingText}>Loading...</Text>
        </DarkGradientBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Referral Program</Text>
          <Text style={styles.subtitle}>Invite friends and earn rewards together!</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Referral Code Section */}
      <View style={styles.codeSection}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{referralCode}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeReferrals}</Text>
              <Text style={styles.statLabel}>Active Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>Rs {stats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.todayReferrals}</Text>
              <Text style={styles.statLabel}>Today's Referrals</Text>
            </View>
          </View>
        </View>
      )}

      {/* Daily Milestone Progress */}
      {stats && (
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionTitle}>Daily Milestone Progress</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {stats.todayReferrals} / {stats.nextMilestoneTarget} referrals
              </Text>
              <Text style={styles.bonusText}>
                Next bonus: Rs {getNextMilestoneBonus()}
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getMilestoneProgress()}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* How It Works */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Share your referral code with friends</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>They sign up and make their first deposit (Rs 300+)</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Both of you get bonus rewards!</Text>
          </View>
        </View>
      </View>

      {/* Bonus Structure */}
      <View style={styles.bonusSection}>
        <Text style={styles.sectionTitle}>Bonus Structure</Text>
        
        <View style={styles.bonusCard}>
          <Text style={styles.bonusTitle}>Recharge Bonuses</Text>
          <Text style={styles.bonusItem}>• 1st Recharge: Rs 10 (Friend) + Rs 20 (You)</Text>
          <Text style={styles.bonusItem}>• 2nd Recharge: Rs 15 (Friend) + Rs 30 (You)</Text>
          <Text style={styles.bonusItem}>• 3rd Recharge: Rs 20 (Friend) + Rs 40 (You)</Text>
        </View>

        <View style={styles.bonusCard}>
          <Text style={styles.bonusTitle}>Daily Milestones</Text>
          {DAILY_MILESTONES.slice(0, 4).map((milestone, index) => (
            <Text key={index} style={styles.bonusItem}>
              • {milestone.referrals} referrals: Rs {milestone.bonus}
            </Text>
          ))}
          <Text style={styles.bonusItem}>• And more...</Text>
        </View>
      </View>
        </ScrollView>
      </DarkGradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    paddingHorizontal: 20,
  },
  codeSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff00',
    letterSpacing: 2,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  statsSection: {
    margin: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  milestoneSection: {
    margin: 16,
  },
  progressContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 16,
    color: '#ffffff',
  },
  bonusText: {
    fontSize: 16,
    color: '#00ff00',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  howItWorksSection: {
    margin: 16,
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#cccccc',
  },
  bonusSection: {
    margin: 16,
    marginBottom: 32,
  },
  bonusCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  bonusItem: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
});
