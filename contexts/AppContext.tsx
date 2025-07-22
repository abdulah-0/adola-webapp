import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { User } from '../services/authService';

interface AppContextType {
  // User & Authentication
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;

  // App State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Functions
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // No longer managing balance - handled by WalletContext

  // Balance management removed - handled by WalletContext

  const initializeApp = async () => {
    try {
      await AuthService.initialize();
      const currentUser = AuthService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        // Balance will be loaded by the useEffect above
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 Starting logout process...');
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Error logging out:', error);
      // Even if logout fails, clear the local state
      setUser(null);
      setIsAuthenticated(false);
      throw error; // Re-throw to let the UI handle the error
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        isLoading,
        setIsLoading,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
