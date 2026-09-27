import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth }             from '../hooks/useAuth';
import { useAppTheme }         from '../context/ThemeContext';
import AuthNavigator           from './AuthNavigator';
import ManagerNavigator        from './ManagerNavigator';
import SupervisorNavigator     from './SupervisorNavigator';
import TechnicianNavigator     from './TechnicianNavigator';
import OperatorNavigator       from './OperatorNavigator';

export default function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

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
      case 'factory_manager':        return <ManagerNavigator />;
      case 'supervisor':             return <SupervisorNavigator />;
      case 'maintenance_technician': return <TechnicianNavigator />;
      case 'machine_operator':       return <OperatorNavigator />; // ✅ جديد
      default:                       return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {getNavigator()}
    </NavigationContainer>
  );
}