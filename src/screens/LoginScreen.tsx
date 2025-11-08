import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BaseScreen } from '../components/BaseScreen';
import { CustomTextInput } from '../components/CustomTextInput';
import { CustomButton } from '../components/CustomButton';
import { theme } from '../theme';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/ToastProvider';
import { syncManager } from '../storage/syncManager';

const USER_SESSION_KEY = '@user_session';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [name, setName] = useState('');
  const toast = useToast();

  const handleAuth = async () => {
    if (!email || !password) {
      toast.showToast({ message: 'Please fill in all fields', type: 'warning' });
      return;
    }

    if (!isLogin && !name) {
      toast.showToast({ message: 'Please enter your name', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Login
        setLoadingMessage('Logging in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Save session
        await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify({
          email: data.user?.email,
          userId: data.user?.id,
        }));

        toast.showToast({ message: 'Login successful!', type: 'success' });
        
        // 📥 Fetch classes from Supabase after login
        setLoadingMessage('Loading your classes from cloud...');
        console.log('[Login] 🔄 Starting cloud data fetch for user:', data.user!.id);
        try {
          await syncManager.fetchClassesFromSupabase(data.user!.id);
          console.log('[Login] ✅ Successfully loaded cloud data');
          toast.showToast({ 
            message: 'Cloud data loaded successfully!', 
            type: 'success',
            duration: 2000,
          });
        } catch (fetchError) {
          console.error('[Login] ❌ Error fetching cloud data:', fetchError);
          toast.showToast({ 
            message: 'Could not load cloud data. Use sync button to try again.', 
            type: 'warning',
            duration: 4000,
          });
          // Don't block login if fetch fails - user can sync manually later
        }
        
        navigation.replace('Main');
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        toast.showToast({ 
          message: 'Account created! Please check your email to verify.', 
          type: 'success',
          duration: 5000,
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error('[Login] Auth error:', error);
      toast.showToast({ 
        message: error.message || 'Authentication failed', 
        type: 'error',
        duration: 4000,
      });
      } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };  const handleSkip = async () => {
    // Save anonymous session
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify({
      email: 'anonymous',
      userId: 'anonymous_' + Date.now(),
    }));
    navigation.replace('Main');
  };

  return (
    <BaseScreen>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Icon name="school" size={80} color={theme.colors.primary} />
          <Text style={styles.title}>At-Mark</Text>
          <Text style={styles.subtitle}>Attendance Tracker</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          
          {!isLogin && (
            <CustomTextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              iconName="person"
            />
          )}

          <CustomTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            iconName="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <CustomTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            iconName="lock"
            secureTextEntry
          />

          <CustomButton
            title={loading ? loadingMessage || 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            onPress={handleAuth}
            disabled={loading}
            iconName={loading ? undefined : (isLogin ? 'login' : 'person-add')}
          />

          {loading && loadingMessage && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          )}

          <TouchableOpacity 
            onPress={() => setIsLogin(!isLogin)}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchTextBold}>
                {isLogin ? 'Sign Up' : 'Login'}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  form: {
    gap: theme.spacing.md,
  },
  formTitle: {
    fontSize: theme.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  switchText: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
  },
  switchTextBold: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  skipText: {
    fontSize: theme.sizes.md,
    color: theme.colors.textLight,
    textDecorationLine: 'underline',
  },
});
