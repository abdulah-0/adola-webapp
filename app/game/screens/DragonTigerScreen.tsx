import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import DragonTigerGame from '../../../components/games/DragonTigerGame';

export default function DragonTigerScreen() {
  return <DragonTigerGame />;
}
