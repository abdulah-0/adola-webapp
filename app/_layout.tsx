import { Stack } from 'expo-router';
import { AppProvider } from '../contexts/AppContext';
import { WalletProvider } from '../contexts/WalletContext';
import AuthGuard from '../components/AuthGuard';
import AppNotifications from '../components/notifications/AppNotifications';
import WebOptimizations from '../components/web/WebOptimizations';

export default function RootLayout() {
  return (
    <WebOptimizations>
      <AppProvider>
        <WalletProvider>
          <AuthGuard>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/register" options={{ headerShown: false }} />
              <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="admin/index" options={{ headerShown: false }} />
            </Stack>
            <AppNotifications />
          </AuthGuard>
        </WalletProvider>
      </AppProvider>
    </WebOptimizations>
  );
}
