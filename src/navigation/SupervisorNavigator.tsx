import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen  from '../screens/dashboard/DashboardScreen';
import MachinesScreen   from '../screens/machines/MachinesScreen';
import FaultsScreen     from '../screens/faults/FaultsScreen';
import ProductionScreen from '../screens/production/ProductionScreen';
import CustomTabBar     from '../components/CustomTabBar';
import RadialTabBar from '../components/RadialTabBar';


export type SupervisorTabParamList = {
  Dashboard:  undefined;
  Machines:   undefined;
  Faults:     undefined;
  Production: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

export default function SupervisorNavigator() {
  return (
   <Tab.Navigator
  tabBar={props => <RadialTabBar {...props} />}
  screenOptions={{ headerShown: false }}
>
      <Tab.Screen name="Machines"   component={MachinesScreen}   options={{ tabBarLabel: 'الماكينات' }} />
      <Tab.Screen name="Faults"     component={FaultsScreen}     options={{ tabBarLabel: 'الأعطال'   }} />
      <Tab.Screen name="Production" component={ProductionScreen} options={{ tabBarLabel: 'الإنتاج'   }} />
    </Tab.Navigator>
  );
}