import 'react-native-get-random-values';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';
import { useRemoteControls } from '../src/hooks/useRemoteControls';
import { audioPlayer } from '../src/services/audioPlayer';
import { useAppStore } from '../src/store/appStore';

// Suprimir warnings de expo-av globalmente
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && 
      (args[0].includes('expo-av') || args[0].includes('Expo AV has been deprecated'))) {
    return; // Suprimir warnings de expo-av
  }
  originalWarn.apply(console, args);
};

// Debug: Log the imported audioPlayer
console.log('Imported audioPlayer:', audioPlayer);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const loadServers = useAppStore((state) => state.loadServers);
  
  // Configurar controles remotos para audífonos
  useRemoteControls();
  
  // Inicializar el reproductor de audio y cargar servidores
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Cargar servidores desde la base de datos
        console.log('Loading servers from database...');
        await loadServers();
        console.log('Servers loaded successfully');
        
        // Inicializar audio player
        console.log('Initializing audio player...', audioPlayer);
        if (audioPlayer && typeof audioPlayer.initialize === 'function') {
          await audioPlayer.initialize();
          console.log('Audio player initialized successfully');
        } else {
          console.error('Audio player is undefined or missing initialize method:', audioPlayer);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    
    initializeApp();
    
    return () => {
      // Cleanup al desmontar
      if (audioPlayer && typeof audioPlayer.destroy === 'function') {
        audioPlayer.destroy();
      }
    };
  }, [loadServers]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
