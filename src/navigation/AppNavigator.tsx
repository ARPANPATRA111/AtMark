import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AddClassScreen } from '../screens/AddClassScreen';
import { ClassScreen } from '../screens/ClassScreen';
import { AddStudentScreen } from '../screens/AddStudentScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { AttendanceHistoryScreen } from '../screens/AttendanceHistoryScreen';
import { StudentAttendanceScreen } from '../screens/StudentAttendanceScreen';
import { ContactInfoScreen } from '../screens/ContactInfoScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

const Stack = createStackNavigator();

const USER_SESSION_KEY = '@user_session';

export const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await AsyncStorage.getItem(USER_SESSION_KEY);
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('[AppNavigator] Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 2,
            shadowOpacity: 0.1,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          cardStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddClass"
          component={AddClassScreen}
          options={{ title: 'Add Class' }}
        />
        <Stack.Screen
          name="Class"
          component={ClassScreen}
          options={({ route }: any) => ({
            title: route.params?.className || 'Class',
          })}
        />
        <Stack.Screen
          name="AddStudent"
          component={AddStudentScreen}
          options={{ title: 'Add Student' }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ title: 'Take Attendance' }}
        />
        <Stack.Screen
          name="AttendanceHistory"
          component={AttendanceHistoryScreen}
          options={{ title: 'Attendance History' }}
        />
        <Stack.Screen
          name="StudentAttendance"
          component={StudentAttendanceScreen}
          options={({ route }: any) => ({
            title: route.params?.student?.name || 'Student Attendance',
          })}
        />
        <Stack.Screen
          name="ContactInfo"
          component={ContactInfoScreen}
          options={{ title: 'Contact & Info' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
