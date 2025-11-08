import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BaseScreen } from '../components/BaseScreen';
import { theme } from '../theme';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const skills = [
  'React Native',
  'TypeScript',
  'Mobile Development',
  'UI/UX Design',
  'MMKV Storage',
  'Performance Optimization',
];

export const ContactInfoScreen = () => {
  const handleAction = (type: string, value: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    
    let url = '';
    switch (type) {
      case 'email':
        url = `mailto:${value}`;
        break;
      case 'website':
        url = value.startsWith('http') ? value : `https://${value}`;
        break;
      case 'phone':
        url = `tel:${value}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?phone=${value}`;
        break;
    }
    
    Linking.openURL(url).catch(() => {
      console.error('Failed to open URL:', url);
    });
  };

  return (
    <BaseScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.heroSection}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={require('../../Arpan.png')}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.name}>Arpan Patra</Text>
          <Text style={styles.role}>React Native Developer</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillPill}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleAction('email', 'developer@atmark.app')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.danger }]}>
                <Icon name="email" size={24} color={theme.colors.surface} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>thispc119@gmail.com</Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleAction('website', 'https://arpan111.vercel.app')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
                <Icon name="language" size={24} color={theme.colors.surface} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Portfolio-Website</Text>
                <Text style={styles.contactValue}>arpan111.vercel.app</Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleAction('whatsapp', '+919111155305')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <Icon name="chat" size={24} color={theme.colors.surface} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>+91 9111155305</Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About At-Mark</Text>
            <Text style={styles.aboutText}>
              At-Mark is a modern, production-ready attendance tracking application built with React Native. 
              It features offline-first architecture with WatermelonDB, secure cloud sync with Supabase, 
              and an intuitive user interface designed for educators and institutions. Track attendance 
              efficiently with comprehensive reporting and analytics capabilities.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
            <Text style={styles.footerText}>Made with ❤️ using React Native</Text>
          </View>
        </View>
      </ScrollView>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  heroSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  role: {
    fontSize: theme.sizes.md,
    color: theme.colors.surface,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.lg,
  },
  skillsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  skillPill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  skillText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  contactSection: {
    marginBottom: theme.spacing.xl,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  contactLabel: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
  },
  contactValue: {
    fontSize: theme.sizes.md,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  aboutSection: {
    marginBottom: theme.spacing.xl,
  },
  aboutText: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textLight,
    marginVertical: theme.spacing.xs,
  },
});
