import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { syncManager } from '../storage/syncManager';
import { theme } from '../theme';

export const SyncIndicator = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
    });

    // Check initial states
    setIsSyncing(syncManager.getSyncingStatus());
    setIsOnline(syncManager.getOnlineStatus());

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSyncing) {
      // Start spinning animation
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Icon name="sync" size={16} color={theme.colors.primary} />
        </Animated.View>
        <Text style={styles.text}>Syncing to cloud...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    marginLeft: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
