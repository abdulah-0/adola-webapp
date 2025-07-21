// Authentication Service for Adola App - Supabase Integration Implementation
// Following requirements document: Migration from Firebase to Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signUpUser,
  signInUser,
  signOutUser,
  resetUserPassword,
  onAuthStateChange as onSupabaseAuthStateChange,
  getCurrentUser,
  isUserAuthenticated
} from './supabaseAuth';

// User interface matching the original with admin capabilities
export interface User {
  id: string;
  email: string;
  username: string;
  walletBalance: number;
  joinedDate: Date;
  isOnline: boolean;
  displayName: string;
  emailVerified: boolean;
  level: number;
  xp: number;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  status: 'online' | 'offline' | 'away';
  profilePicture?: string;
  referralCode?: string;
  referredBy?: string;
  lastLoginDate?: Date;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  adminPermissions?: {
    manageUsers: boolean;
    manageTransactions: boolean;
    manageGames: boolean;
    viewAnalytics: boolean;
    systemSettings: boolean;
    grantAdminAccess: boolean;
  };
  preferences?: {
    notifications: boolean;
    soundEffects: boolean;
    musicEnabled: boolean;
    language: string;
  };
}

// Authentication response interface
export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

// Registration data interface
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  referralCode?: string;
}

// Login data interface
export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private authToken: string | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth service - Check Supabase authentication first
  async initialize(): Promise<void> {
    try {
      // First, check if user is authenticated with Supabase
      const isSupabaseAuthenticated = await isUserAuthenticated();

      if (isSupabaseAuthenticated) {
        // Get current Supabase user
        const supabaseUser = await getCurrentUser();

        if (supabaseUser) {
          // Convert Supabase user to local User interface
          this.currentUser = {
            id: supabaseUser.id, // Use real Supabase UUID
            email: supabaseUser.email || '',
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || '',
            displayName: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || '',
            walletBalance: 50, // Will be loaded from database
            joinedDate: new Date(supabaseUser.created_at),
            isOnline: true,
            emailVerified: supabaseUser.email_confirmed_at ? true : false,
            level: 1,
            xp: 0,
            gamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            status: 'online',
            referralCode: this.generateReferralCode(),
            isAdmin: false,
            isSuperAdmin: false,
            preferences: {
              notifications: true,
              soundEffects: true,
              musicEnabled: true,
              language: 'en',
            },
          };

          console.log('✅ Supabase user loaded:', this.currentUser.id);
          return;
        }
      }

      // Fallback: check stored user data
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('authToken');

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        // Only use stored user if it has a valid UUID format and is not a hardcoded test user
        if (parsedUser.id &&
            parsedUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
            parsedUser.id !== '00000000-0000-0000-0000-000000000001') {
          this.currentUser = parsedUser;
          this.authToken = storedToken;
          console.log('✅ Valid stored user loaded:', this.currentUser.id);
        } else {
          console.log('⚠️ Invalid or test user ID found, clearing storage');
          await AsyncStorage.multiRemove(['user', 'authToken']);
        }
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
    }
  }

  // Register new user - Firebase Implementation (Requirements Document Section 7)
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validate input (Requirements Document Section 10: Security)
      if (!data.username || !data.email || !data.password) {
        return {
          success: false,
          error: 'All fields are required'
        };
      }

      // Use Supabase signUp function from requirements document
      const supabaseResult = await signUpUser(data.email, data.password, data.username);

      if (!supabaseResult.success || !supabaseResult.user) {
        return {
          success: false,
          error: supabaseResult.error || 'Registration failed'
        };
      }

      // Convert Supabase user to local User interface
      const newUser: User = {
        ...supabaseResult.user,
        referralCode: this.generateReferralCode(),
        referredBy: data.referralCode,
        preferences: {
          notifications: true,
          soundEffects: true,
          musicEnabled: true,
          language: 'en',
        },
      };

      // Generate auth token for session management
      const token = this.generateAuthToken(newUser.id);

      // Store user data locally for session persistence
      await this.storeUserData(newUser, token);

      this.currentUser = newUser;
      this.authToken = token;

      return {
        success: true,
        user: newUser,
        token: token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  // Login user - Firebase Implementation (Requirements Document Section 7)
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Validate input (Requirements Document Section 10: Security)
      if (!data.email || !data.password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Use Supabase login function from requirements document
      const supabaseResult = await signInUser(data.email, data.password);

      if (!supabaseResult.success || !supabaseResult.user) {
        return {
          success: false,
          error: supabaseResult.error || 'Invalid email or password'
        };
      }

      // Convert Supabase user to local User interface
      const user: User = {
        ...supabaseResult.user,
        preferences: {
          notifications: true,
          soundEffects: true,
          musicEnabled: true,
          language: 'en',
        },
      };

      // Generate auth token for session management
      const token = this.generateAuthToken(user.id);

      // Store user data locally for session persistence
      await this.storeUserData(user, token);

      this.currentUser = user;
      this.authToken = token;

      return {
        success: true,
        user: user,
        token: token
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  // Logout user - Firebase Implementation (Requirements Document Section 7)
  async logout(): Promise<void> {
    try {
      // Use Supabase logout function from requirements document
      await signOutUser();

      // Clear stored session data (Requirements Document Section 10: Security)
      await AsyncStorage.multiRemove(['user', 'authToken']);

      this.currentUser = null;
      this.authToken = null;

      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  // Password Reset - Firebase Implementation (Requirements Document Section 11)
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email address is required'
        };
      }

      // Use Supabase resetPassword function from requirements document
      const result = await resetUserPassword(email);
      return result;
    } catch (error) {
      console.error('❌ Password reset error:', error);
      return {
        success: false,
        error: 'Failed to send password reset email'
      };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.authToken !== null;
  }

  // Update user data
  async updateUser(updates: Partial<User>): Promise<boolean> {
    try {
      if (!this.currentUser) return false;

      this.currentUser = { ...this.currentUser, ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(this.currentUser));
      
      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  }

  // Private helper methods
  private async checkUserExists(email: string, username: string): Promise<boolean> {
    // Mock check - in production, this would check Firebase
    const mockUsers = [
      { email: 'test@adola.com', username: 'testuser' },
      { email: 'snakeyes358@gmail.com', username: 'superadmin' },
      { email: 'admin@adola.com', username: 'admin' },
    ];

    return mockUsers.some(user =>
      user.email.toLowerCase() === email.toLowerCase() ||
      user.username.toLowerCase() === username.toLowerCase()
    );
  }

  private async authenticateUser(email: string, password: string): Promise<User | null> {
    // Super Admin Authentication - use Supabase auth
    if (email === 'snakeyes358@gmail.com' && password === '@Useless19112004') {
      try {
        const supabaseResult = await signInUser(email, password);
        if (supabaseResult.success && supabaseResult.user) {
          return {
            id: supabaseResult.user.id, // Use real Supabase UUID
            email: 'snakeyes358@gmail.com',
            username: 'superadmin',
            walletBalance: 999999999, // Unlimited balance for admin
            joinedDate: new Date('2024-01-01'),
            isOnline: true,
            displayName: 'Super Admin',
            emailVerified: true,
            level: 999,
            xp: 999999,
            gamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            status: 'online',
            referralCode: 'ADMIN001',
            isAdmin: true,
            isSuperAdmin: true,
            adminPermissions: {
              manageUsers: true,
              manageTransactions: true,
              manageGames: true,
              viewAnalytics: true,
              systemSettings: true,
              grantAdminAccess: true,
            },
            preferences: {
              notifications: true,
              soundEffects: true,
              musicEnabled: true,
              language: 'en',
            },
          };
        }
      } catch (error) {
        console.error('Super admin authentication failed:', error);
        return null;
      }
    }

    // Test User Authentication
    if (email === 'test@adola.com' && password === 'password') {
      return {
        id: '00000000-0000-0000-0000-000000000002', // Valid UUID for test user
        email: 'test@adola.com',
        username: 'testuser',
        walletBalance: 2500,
        joinedDate: new Date('2024-01-01'),
        isOnline: true,
        displayName: 'Test User',
        emailVerified: true,
        level: 5,
        xp: 1250,
        gamesPlayed: 25,
        totalWins: 15,
        totalLosses: 10,
        status: 'online',
        referralCode: 'TEST123',
        preferences: {
          notifications: true,
          soundEffects: true,
          musicEnabled: true,
          language: 'en',
        },
      };
    }

    return null;
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private generateAuthToken(userId: string): string {
    return `token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async storeUserData(user: User, token: string): Promise<void> {
    await AsyncStorage.multiSet([
      ['user', JSON.stringify(user)],
      ['authToken', token]
    ]);
  }
}

export default AuthService.getInstance();
