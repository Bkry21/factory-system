import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MachinesScreen  from '../screens/machines/MachinesScreen';
import ReportsScreen   from '../screens/reports/ReportsScreen';
import AdminPanel      from '../screens/AdminPanel';
import CustomTabBar    from '../components/CustomTabBar';
import RadialTabBar from '../components/RadialTabBar';


export type ManagerTabParamList = {
  Dashboard: undefined;
  Machines:  undefined;
  Reports:   undefined;
  Admin:     undefined;
};

const Tab = createBottomTabNavigator<ManagerTabParamList>();

export default function ManagerNavigator() {
  return (
   <Tab.Navigator
  tabBar={props => <RadialTabBar {...props} />}
  screenOptions={{ headerShown: false }}
>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'الرئيسية'  }} />
      <Tab.Screen name="Machines"  component={MachinesScreen}  options={{ tabBarLabel: 'الماكينات' }} />
      <Tab.Screen name="Reports"   component={ReportsScreen}   options={{ tabBarLabel: 'التقارير'  }} />
      <Tab.Screen name="Admin"     component={AdminPanel}      options={{ tabBarLabel: 'التحكم'    }} />
    </Tab.Navigator>
  );
}