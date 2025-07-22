// Supabase Authentication Service
// Following requirements document: Migration from Firebase to Supabase
// Implements: signup, login, logout, session management

import { supabase, supabaseAvailable } from '../lib/supabase';

/**
 * Sign up new user - Following requirements document
 * Migrated from: firebase.auth().createUserWithEmailAndPassword()
 * To: supabase.auth.signUp()
 */
export const signUpUser = async (email, password, username, referralCode = null) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    // Step 1: Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          display_name: username,
          referral_code: referralCode
        }
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Step 2: User profile and wallet will be created automatically by database trigger
    // The trigger 'auto_create_user_and_wallet' will handle:
    // - Creating user profile in users table
    // - Creating wallet with welcome bonus
    // - Processing referral code if provided
    // - Giving referral bonus to referrer

    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch the created user data from the database
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (fetchError || !userData) {
      console.error('❌ Failed to fetch user data after registration:', fetchError);
      throw new Error('User profile creation failed');
    }

    console.log('✅ User registered successfully:', email);
    return {
      success: true,
      user: userData,
      message: 'Registration successful! Please check your email for verification.'
    };

  } catch (error) {
    console.error('❌ Registration error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sign in user - Following requirements document
 * Migrated from: firebase.auth().signInWithEmailAndPassword()
 * To: supabase.auth.signInWithPassword()
 */
export const signInUser = async (email, password) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    // Handle super admin credentials - try real auth first
    if (email === 'snakeyes358@gmail.com' && password === '@Useless19112004') {
      // Try to authenticate with Supabase first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authData?.user && !authError) {
        // Use real Supabase user ID for super admin
        return {
          success: true,
          user: {
            id: authData.user.id, // Use real Supabase UUID
            email: 'snakeyes358@gmail.com',
            username: 'superadmin',
            display_name: 'Super Admin',
            wallet_balance: 999999999,
            is_admin: true,
            is_super_admin: true,
            admin_permissions: {
              manage_users: true,
              manage_transactions: true,
              manage_games: true,
              view_analytics: true,
            }
          },
          message: 'Super Admin login successful!'
        };
      } else {
        // Fallback: create super admin account if it doesn't exist
        console.log('⚠️ Super admin account not found in Supabase, please sign up first');
        throw new Error('Super admin account not found. Please sign up with this email first.');
      }
    }

    // Step 1: Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Login failed');
    }

    // Step 2: Get user profile from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.warn('⚠️ User profile not found, creating basic profile');
      // Create basic profile if not exists
      const basicUserData = {
        id: authData.user.id,
        email: email,
        username: email.split('@')[0],
        display_name: email.split('@')[0],
        wallet_balance: 50,
        joined_date: new Date().toISOString(),
        is_online: true,
        email_verified: authData.user.email_confirmed_at ? true : false,
        level: 1,
        xp: 0,
        games_played: 0,
        total_wins: 0,
        total_losses: 0,
        status: 'online',
        is_admin: false,
        is_super_admin: false,
        last_login_date: new Date().toISOString(),
        registration_bonus: true,
      };

      await supabase.from('users').insert([basicUserData]);
      
      console.log('✅ User signed in successfully:', email);
      return {
        success: true,
        user: basicUserData,
        message: 'Login successful!'
      };
    }

    // Step 3: Update last login
    await supabase
      .from('users')
      .update({
        last_login_date: new Date().toISOString(),
        is_online: true,
        status: 'online'
      })
      .eq('id', authData.user.id);

    console.log('✅ User signed in successfully:', email);
    return {
      success: true,
      user: userData,
      message: 'Login successful!'
    };

  } catch (error) {
    console.error('❌ Login error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sign out user - Following requirements document
 * Migrated from: firebase.auth().signOut()
 * To: supabase.auth.signOut()
 */
export const signOutUser = async () => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }

    console.log('✅ User signed out successfully');
    return {
      success: true,
      message: 'Signed out successfully'
    };

  } catch (error) {
    console.error('❌ Sign out error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Reset password - Following requirements document
 */
export const resetUserPassword = async (email) => {
  try {
    if (!supabaseAvailable) {
      throw new Error('Supabase not available');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      throw error;
    }

    console.log('✅ Password reset email sent');
    return {
      success: true,
      message: 'Password reset email sent'
    };

  } catch (error) {
    console.error('❌ Password reset error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Auth state listener - Following requirements document
 */
export const onAuthStateChange = (callback) => {
  if (!supabaseAvailable) {
    console.log('ℹ️ Supabase not available, using mock auth state');
    return () => {}; // Return empty cleanup function
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        console.log('✅ User is signed in:', session.user.email);
        
        // Get user profile
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        
        callback({ 
          isAuthenticated: true, 
          user: userData || session.user,
          session: session 
        });
      } else {
        console.log('ℹ️ User is signed out');
        callback({ 
          isAuthenticated: false, 
          user: null,
          session: null 
        });
      }
    }
  );

  // Return cleanup function
  return () => {
    subscription?.unsubscribe();
  };
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  if (!supabaseAvailable) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = async () => {
  if (!supabaseAvailable) {
    return false;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
};
