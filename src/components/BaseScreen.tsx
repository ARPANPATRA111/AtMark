import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  ScrollView,
  View,
} from 'react-native';
import { theme } from '../theme';

interface BaseScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  backgroundColor?: string;
}

export const BaseScreen: React.FC<BaseScreenProps> = ({
  children,
  style,
  scrollable = false,
  backgroundColor = theme.colors.background,
}) => {
  const Container = scrollable ? ScrollView : View;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={backgroundColor}
      />
      <Container
        style={[styles.content, style]}
        contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
