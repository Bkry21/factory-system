import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OperatorScreen from '../screens/operator/OperatorScreen';
import RadialTabBar   from '../components/RadialTabBar';

export type OperatorTabParamList = {
  Operator: undefined;
};

const Tab = createBottomTabNavigator<OperatorTabParamList>();

export default function OperatorNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <RadialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Operator"
        component={OperatorScreen}
        options={{ tabBarLabel: 'ماكينتي' }}
      />
    </Tab.Navigator>
  );
}