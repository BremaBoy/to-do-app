import React from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/Navigation/AppNavigator';

import { ThemeProvider } from './src/Context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}