import React from 'react';
import { I18nManager } from 'react-native';
import Navigation from './src/navigation';

I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

export default function App() {
  return <Navigation />;
}