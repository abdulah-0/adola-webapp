import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DarkGradientBackground from '../common/DarkGradientBackground';

/**
 * Example component demonstrating how to use DarkGradientBackground
 * This shows the gradient background with various content types
 */
const DarkGradientExample: React.FC = () => {
  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Dark Gradient Background</Text>
            <Text style={styles.subtitle}>Beautiful deep dark theme</Text>
          </View>

          {/* Feature Cards */}
          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <Ionicons name="color-palette" size={32} color="#64ffda" />
              <Text style={styles.cardTitle}>Deep Colors</Text>
              <Text style={styles.cardDescription}>
                Rich dark palette with smooth transitions
              </Text>
            </View>

            <View style={styles.card}>
              <Ionicons name="phone-portrait" size={32} color="#ff6b6b" />
              <Text style={styles.cardTitle}>Cross Platform</Text>
              <Text style={styles.cardDescription}>
                Works seamlessly on iOS, Android, and Web
              </Text>
            </View>

            <View style={styles.card}>
              <Ionicons name="layers" size={32} color="#4ecdc4" />
              <Text style={styles.cardTitle}>Flexible</Text>
              <Text style={styles.cardDescription}>
                Easily customizable with additional styles
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Primary Action</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Secondary Action</Text>
            </TouchableOpacity>
          </View>

          {/* Gradient Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Gradient Details</Text>
            <Text style={styles.infoText}>Colors: #2e1a1a → #3e1616 → #600f0f → #2a0d0d</Text>
            <Text style={styles.infoText}>Direction: Top-left to bottom-right</Text>
            <Text style={styles.infoText}>Positioning: Absolute with flex: 1</Text>
          </View>
        </ScrollView>
      </DarkGradientBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60, // Account for status bar
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#b0b0b0',
    textAlign: 'center',
  },
  cardsContainer: {
    marginBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#64ffda',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#64ffda',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64ffda',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 6,
    fontFamily: 'monospace',
  },
});

export default DarkGradientExample;
