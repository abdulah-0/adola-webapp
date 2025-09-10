// Plinko 1000 (Evolution) - WebView launcher
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useApp } from '../../../contexts/AppContext';
import { startEvolutionSession } from '../../../services/games/EvolutionService';

const PLINKO_GAME_ID = 'eb3f4260c17737e09767bc4c06796a61';

export default function Plinko1000Screen() {
  const { user } = useApp();
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!user?.id) {
          Alert.alert('Login required', 'Please login to play.');
          return;
        }
        const res = await startEvolutionSession(user.id, PLINKO_GAME_ID, { username: user.username || user.email });
        setLaunchUrl(res.launchUrl);
      } catch (e) {
        console.error('Failed to start session', e);
        Alert.alert('Error', 'Failed to start game session.');
      }
    };
    init();
  }, [user?.id]);

  if (!launchUrl) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#00FFC6" />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <iframe
          src={launchUrl}
          style={{ border: 'none', width: '100%', height: '100%' }}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: launchUrl }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      startInLoadingState
      onError={(e) => {
        console.error('WebView error', e.nativeEvent);
        Alert.alert('Error', 'Failed to load game.');
      }}
    />
  );
}

