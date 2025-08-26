import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/LoginScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
        <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
        <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
