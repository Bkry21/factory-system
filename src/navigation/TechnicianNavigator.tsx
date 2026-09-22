import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TasksScreen   from '../screens/technician/TasksScreen';
import MachinesScreen from '../screens/machines/MachinesScreen';
import CustomTabBar  from '../components/CustomTabBar';
import RadialTabBar from '../components/RadialTabBar';


export type TechnicianTabParamList = {
  Tasks:    undefined;
  Machines: undefined;
};

const Tab = createBottomTabNavigator<TechnicianTabParamList>();

export default function TechnicianNavigator() {
  return (
   <Tab.Navigator
  tabBar={props => <RadialTabBar {...props} />}
  screenOptions={{ headerShown: false }}
>
      <Tab.Screen name="Tasks"    component={TasksScreen}    options={{ tabBarLabel: 'مهامي'      }} />
      <Tab.Screen name="Machines" component={MachinesScreen} options={{ tabBarLabel: 'الماكينات' }} />
    </Tab.Navigator>
  );
}