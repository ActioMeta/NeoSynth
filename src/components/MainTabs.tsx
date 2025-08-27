
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverScreen from '../screens/DiscoverScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import LoginScreen from '../screens/LoginScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import QueueScreen from '../screens/QueueScreen';
import SearchScreen from '../screens/SearchScreen';
import HeadphoneSettingsScreen from '../screens/HeadphoneSettingsScreen';
import PlayerBar from './PlayerBar';
import MiniPlayer from './MiniPlayer';
import { useRemoteControls } from '../hooks/useRemoteControls';
import '../utils/debugRemoteControls'; // Importar funciones de debug
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
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
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
}

function DownloadsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DownloadsMain" component={DownloadsScreen} />
    </Stack.Navigator>
  );
}


function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Discover"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'music';
          if (route.name === 'Discover') iconName = 'compass';
          if (route.name === 'Downloads') iconName = 'download';
          if (route.name === 'Library') iconName = 'folder';
          return <Feather name={iconName as any} size={24} color={focused ? '#5752D7' : '#B3B3B3'} style={{ marginBottom: -2 }} />;
        },
        tabBarActiveTintColor: '#5752D7',
        tabBarInactiveTintColor: '#B3B3B3',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
          elevation: 8, // Sombra en Android
          shadowColor: '#000', // Sombra en iOS
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        tabBarLabelStyle: {
          fontSize: 12, // Reduced from 13
          fontWeight: '600',
          color: '#fff',
          marginBottom: 2, // Reduced from 4
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

export default function MainTabsWithPlayer() {
  // Configurar controles remotos para audífonos Bluetooth
  useRemoteControls();
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabsScreen} />
      <RootStack.Screen name="Queue" component={QueueScreen} />
      <RootStack.Screen name="HeadphoneSettings" component={HeadphoneSettingsScreen} />
    </RootStack.Navigator>
  );
}

function MainTabsScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Contenido principal */}
      <View style={{ flex: 1 }}>
        <MainTabs />
      </View>
      
      {/* Mini Player - encima de la barra de navegación */}
      <View style={{ 
        position: 'absolute', 
        bottom: 60 + insets.bottom, // Altura del tab bar + safe area
        left: 0, 
        right: 0, 
        zIndex: 2 
      }}>
        <MiniPlayer />
      </View>
    </View>
  );
}
