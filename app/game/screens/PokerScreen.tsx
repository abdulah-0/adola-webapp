import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import PokerGame from '../../../components/games/PokerGame';

export default function PokerScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>♠️ Poker</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>
      <PokerGame />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerButton: { backgroundColor: Colors.primary.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary.border },
  headerButtonText: { color: Colors.primary.text, fontSize: 14, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary.gold },
});
