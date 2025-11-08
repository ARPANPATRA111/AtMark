export const theme = {
  colors: {
    primary: '#4A90E2',
    primaryDark: '#357ABD',
    primaryLight: '#7AB3E8',
    secondary: '#50C878',
    secondaryDark: '#3FA060',
    secondaryLight: '#7AD99A',
    danger: '#E74C3C',
    dangerDark: '#C0392B',
    warning: '#F39C12',
    success: '#27AE60',
    
    background: '#F5F6F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textLight: '#BDC3C7',
    
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    
    gray100: '#F8F9FA',
    gray200: '#E9ECEF',
    gray300: '#DEE2E6',
    gray400: '#CED4DA',
    gray500: '#ADB5BD',
    gray600: '#6C757D',
    gray700: '#495057',
    gray800: '#343A40',
    gray900: '#212529',
    
    present: '#27AE60',
    absent: '#E74C3C',
    presentLight: '#E8F8F0',
    absentLight: '#FADBD8',
  },
  
  gradients: {
    primary: ['#4A90E2', '#357ABD'],
    secondary: ['#50C878', '#3FA060'],
    success: ['#27AE60', '#229954'],
    danger: ['#E74C3C', '#C0392B'],
    card: ['#FFFFFF', '#F8F9FA'],
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
