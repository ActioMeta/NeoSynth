
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverScreen from '../screens/DiscoverScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import LoginScreen from '../screens/LoginScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    </Stack.Navigator>
  );
}

function DownloadsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DownloadsMain" component={DownloadsScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    </Stack.Navigator>
  );
}


export default function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Discover"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'musical-notes';
          if (route.name === 'Discover') iconName = 'compass';
          if (route.name === 'Downloads') iconName = 'download';
          if (route.name === 'Library') iconName = 'library';
          return <Ionicons name={iconName as any} size={28} color={focused ? '#5752D7' : '#B3B3B3'} style={{ marginBottom: -4 }} />;
        },
        tabBarActiveTintColor: '#5752D7',
        tabBarInactiveTintColor: '#B3B3B3',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          color: '#fff',
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverStack} />
      <Tab.Screen name="Downloads" component={DownloadsStack} />
      <Tab.Screen name="Library" component={LibraryStack} />
    </Tab.Navigator>
  );
}
