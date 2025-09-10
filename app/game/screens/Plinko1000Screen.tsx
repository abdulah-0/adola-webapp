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
    // On web, some providers block iframing with X-Frame-Options/CSP.
    // We provide an iframe plus a visible "Open in new tab" link as fallback.
    // Also broaden the allow attributes and remove sandbox to avoid blocking loads.
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <div style={{ padding: 8, background: '#111', color: '#fff', fontSize: 12 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>URL: {launchUrl}</div>
          Having trouble loading? <a href={launchUrl} target="_blank" rel="noreferrer" style={{ color: '#00FFC6' }}>Open game in a new tab</a>
        </div>
        <iframe
          src={launchUrl}
          title="Plinko 1000"
          style={{ border: 'none', width: '100%', height: '100%' }}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; payment; geolocation; microphone; camera"
          allowFullScreen
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

