import React, { useState, useEffect, useCallback } from 'react';
import { I18nManager, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider } from './src/context/ThemeContext';



I18nManager.forceRTL(true);
I18nManager.allowRTL(true);


export default function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}