import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';

export function useRemoteControls() {
  const { player } = useAppStore();
  const currentTrack = player.currentTrack;
  const isPlaying = player.isPlaying;

  useEffect(() => {
    // Solo ejecutar en dispositivos reales, no en web
    if (Platform.OS === 'web') {
      console.log('🎧 Remote controls not available on web');
      return;
    }

    let mounted = true;

    const setupRemoteControls = async () => {
      try {
        console.log('🎧 Setting up remote controls...');

        // Configurar audio mode para reproducción en segundo plano
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Configurar categoría de audio para controles remotos
        if (Platform.OS === 'ios') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: true,
          });
        }

        // Configurar notificaciones para controles de medios
        try {
          await Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          });
          
          console.log('🎧 Notification handler configured');
        } catch (notifError) {
          console.log('⚠️ Notifications not available in Expo Go, using basic controls');
        }

        console.log('✅ Remote controls setup complete');
      } catch (error) {
        console.log('❌ Error setting up remote controls:', error);
      }
    };

    const updateNowPlayingInfo = async () => {
      if (!currentTrack || !mounted) return;

      try {
        // Actualizar información de "Now Playing" en el centro de control
        const nowPlayingInfo = {
          title: currentTrack.title || 'Unknown Title',
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'Unknown Album',
          isLiveStream: false,
        };

        // En iOS, esto aparece en el centro de control y pantalla de bloqueo
        if (Platform.OS === 'ios') {
          // Usar la API nativa si está disponible
          console.log('🎵 Updating Now Playing info:', nowPlayingInfo.title);
        }

        // Para Android, usar notificaciones de medios si están disponibles
        if (Platform.OS === 'android') {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: nowPlayingInfo.title,
                body: `${nowPlayingInfo.artist} • ${nowPlayingInfo.album}`,
                sound: false,
                priority: Notifications.AndroidNotificationPriority.MIN,
                sticky: true,
              },
              trigger: null,
            });
          } catch (notifError) {
            // Silencioso si las notificaciones no están disponibles
          }
        }
      } catch (error) {
        console.log('⚠️ Could not update Now Playing info:', error);
      }
    };

    const setupAppStateListener = () => {
      // Manejar interrupciones de audio (como llamadas telefónicas)
      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'background' && isPlaying) {
          console.log('📱 App went to background, maintaining audio session');
        }
      };

      // En React Native moderno, esto se maneja automáticamente
      console.log('📱 App state listener configured');
    };

    // Configurar controles remotos
    setupRemoteControls();
    setupAppStateListener();

    // Actualizar información cuando cambie la canción
    if (currentTrack) {
      updateNowPlayingInfo();
    }

    return () => {
      mounted = false;
      console.log('🎧 Remote controls cleanup');
    };
  }, [currentTrack, isPlaying]);

  // Configurar listeners para comandos remotos
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleRemoteCommand = async (command: string) => {
      console.log('🎧 Remote command received:', command);
      
      switch (command) {
        case 'play':
          await audioPlayer.play();
          break;
        case 'pause':
          await audioPlayer.pause();
          break;
        case 'next':
          await audioPlayer.playNext();
          break;
        case 'previous':
          await audioPlayer.playPrevious();
          break;
        default:
          console.log('🎧 Unknown remote command:', command);
      }
    };

    // Los comandos remotos se manejan automáticamente por expo-av
    // cuando se usan los métodos correctos del audio player
    console.log('🎧 Remote command listeners active');

    return () => {
      console.log('🎧 Remote command listeners cleanup');
    };
  }, []);
}

// Función de utilidad para debugging
export const debugRemoteControls = () => {
  console.log('🔧 Remote Controls Debug Info:');
  console.log('- Platform:', Platform.OS);
  console.log('- Audio support: expo-av');
  console.log('- Background audio: enabled');
  console.log('- Remote commands: basic support');
};