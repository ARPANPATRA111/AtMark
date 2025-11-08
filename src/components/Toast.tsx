import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, type = 'info', actionLabel, onActionPress }) => {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const bgByType: Record<ToastType, string> = {
    info: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.danger,
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}> 
      <View style={[styles.toast, { backgroundColor: bgByType[type] }]}> 
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress} style={styles.actionBtn}>
            <Text style={styles.action}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  toast: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  message: {
    color: theme.colors.surface,
    fontSize: theme.sizes.md,
    flex: 1,
  },
  actionBtn: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  action: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
});

export default Toast;
