import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  iconName?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  iconName,
  iconPosition = 'left',
  style,
  textStyle,
  iconStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ];
  
  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];
  
  const iconColor = 
    variant === 'outline' ? theme.colors.primary : 
    variant === 'ghost' ? theme.colors.gray600 :
    theme.colors.surface;
  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' ? theme.colors.primary : 
            variant === 'ghost' ? theme.colors.gray600 :
            theme.colors.surface
          }
          size="small"
        />
      ) : (
        <>
          {iconName && iconPosition === 'left' && (
            <Icon
              name={iconName}
              size={iconSize}
              color={iconColor}
              style={[styles.iconLeft, iconStyle]}
            />
          )}
          <Text style={textStyles}>{title}</Text>
          {iconName && iconPosition === 'right' && (
            <Icon
              name={iconName}
              size={iconSize}
              color={iconColor}
              style={[styles.iconRight, iconStyle]}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  button_primary: {
    backgroundColor: theme.colors.primary,
  },
  button_secondary: {
    backgroundColor: theme.colors.secondary,
  },
  button_danger: {
    backgroundColor: theme.colors.danger,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  button_ghost: {
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  button_small: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  button_medium: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  button_large: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.gray300,
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: theme.colors.surface,
  },
  text_secondary: {
    color: theme.colors.surface,
  },
  text_danger: {
    color: theme.colors.surface,
  },
  text_outline: {
    color: theme.colors.primary,
  },
  text_ghost: {
    color: theme.colors.gray700,
  },
  text_small: {
    fontSize: theme.sizes.sm,
  },
  text_medium: {
    fontSize: theme.sizes.md,
  },
  text_large: {
    fontSize: theme.sizes.lg,
  },
  textDisabled: {
    color: theme.colors.gray500,
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
});
