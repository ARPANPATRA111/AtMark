import 'react-native-url-polyfill/auto';
import React from 'react';
import 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ToastProvider } from './src/components/ToastProvider';

const App = () => {
  return (
    <ToastProvider>
      <AppNavigator />
    </ToastProvider>
  );
};

export default App;
