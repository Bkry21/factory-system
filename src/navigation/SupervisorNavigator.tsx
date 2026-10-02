import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MachinesScreen   from '../screens/machines/MachinesScreen';
import FaultsScreen     from '../screens/faults/FaultsScreen';
import ProductionScreen from '../screens/production/ProductionScreen';
import OperatorsScreen  from '../screens/supervisor/OperatorsScreen';
import BubbleTabBar     from '../components/BubbleTabBar';

export type SupervisorTabParamList = {
  Machines:   undefined;
  Faults:     undefined;
  Production: undefined;
  Operators:  undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

export default function SupervisorNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <BubbleTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Machines"   component={MachinesScreen}   options={{ tabBarLabel: 'الماكينات' }} />
      <Tab.Screen name="Faults"     component={FaultsScreen}     options={{ tabBarLabel: 'الأعطال'   }} />
      <Tab.Screen name="Production" component={ProductionScreen} options={{ tabBarLabel: 'الإنتاج'   }} />
      <Tab.Screen name="Operators"  component={OperatorsScreen}  options={{ tabBarLabel: 'المشغلون'   }} />
    </Tab.Navigator>
  );
}