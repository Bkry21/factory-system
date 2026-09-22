import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth }             from '../hooks/useAuth';
import { useAppTheme }         from '../context/ThemeContext';
import AuthNavigator           from './AuthNavigator';
import ManagerNavigator        from './ManagerNavigator';
import SupervisorNavigator     from './SupervisorNavigator';
import TechnicianNavigator     from './TechnicianNavigator';

export default function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { colors } = useAppTheme(); // ← من الثيم مش من الـ import

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getNavigator = () => {
    if (!isAuthenticated || !user) return <AuthNavigator />;
    switch (user.role) {
      case 'factory_manager':       return <ManagerNavigator />;
      case 'supervisor':            return <SupervisorNavigator />;
      case 'maintenance_technician':return <TechnicianNavigator />;
      default:                      return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {getNavigator()}
    </NavigationContainer>
  );
}