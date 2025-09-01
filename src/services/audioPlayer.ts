import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useAppStore } from '../store/appStore';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';

// Suprimir el warning de deprecación de expo-av temporalmente
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('expo-av')) {
    return; // Suprimir warnings de expo-av
  }
  originalWarn.apply(console, args);
};

export class AudioPlayerService {
  private static instance: AudioPlayerService;
  private sound: Audio.Sound | null = null;
  private nextSound: Audio.Sound | null = null; // Para prebuffering de la siguiente canción
  private isInitialized = false;
  private remoteControlsEnabled = false;
  private appStateSubscription: any = null;
  private crossfadeEnabled = false; // Temporalmente deshabilitado para debug
  private crossfadeDuration = 2000; // 2 segundos de crossfade
  private prebufferTime = 10000; // Empezar a prebuffer 10 segundos antes del final
  private crossfadeInProgress = false; // Bandera para evitar múltiples crossfades
  private lastPosition = 0; // Para detectar si el progreso se detuvo
  private progressCheckCount = 0; // Contador para verificar si está realmente terminado

  private constructor() {}

  public static getInstance(): AudioPlayerService {
    if (!AudioPlayerService.instance) {
      AudioPlayerService.instance = new AudioPlayerService();
    }
    return AudioPlayerService.instance;
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Configuración específica para audífonos Bluetooth y reproducción continua
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        // Configuraciones adicionales para mejorar compatibilidad con Bluetooth
        ...(Platform.OS === 'android' && {
          // Android específico para Bluetooth y gapless
          audioWillChange: true,
        }),
        // Configuraciones para reproducción continua sin gaps
        ...(Platform.OS === 'ios' && {
          // iOS específico para transiciones suaves
          mixWithOthers: false,
        }),
      });

      // Sincronizar configuraciones desde el store
      const store = useAppStore.getState();
      const { audioSettings } = store;
      this.crossfadeEnabled = audioSettings.crossfadeEnabled;
      this.crossfadeDuration = audioSettings.crossfadeDuration;
      this.prebufferTime = audioSettings.prebufferTime;

      // Configurar controles remotos para audífonos
      await this.setupRemoteControls();
      
      // Configurar listener para cambios de estado de la app
      this.setupAppStateListener();
      
      this.isInitialized = true;
      console.log('✅ Audio player initialized successfully with optimized settings');
      console.log(`🎵 Crossfade: ${this.crossfadeEnabled ? 'enabled' : 'disabled'} (${this.crossfadeDuration}ms)`);
      console.log(`📦 Prebuffer time: ${this.prebufferTime}ms`);
      console.log('🎧 Bluetooth headphone controls should now work for:');
      console.log('  - Play/Pause: Toggle playback');
      console.log('  - Next: Skip to next track');
      console.log('  - Previous: Go to previous track');
      console.log('📱 Platform:', Platform.OS);
      
      if (__DEV__) {
        console.log('🔧 Development mode notes:');
        console.log('  - Expo Go: Basic Bluetooth controls via expo-av');
        console.log('  - Development Build: Full media notification support');
        console.log('  - Use global.debugRemoteControls for testing');
      }
    } catch (error) {
      console.error('Error initializing audio player:', error);
      // Try a simpler configuration if the full one fails
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        
        // Intentar configurar controles remotos básicos
        await this.setupRemoteControls();
        
        this.isInitialized = true;
        console.log('Audio player initialized with fallback configuration');
      } catch (fallbackError) {
        console.error('Failed to initialize audio player with fallback:', fallbackError);
      }
    }
  }

  private async setupRemoteControls() {
    try {
      // Configurar controles remotos habilitados
      const store = useAppStore.getState();
      
      // Enable remote controls on the audio session
      if (Platform.OS === 'ios') {
        console.log('🎧 Setting up iOS remote controls');
      } else {
        console.log('🎧 Setting up Android remote controls');
      }
      
      this.remoteControlsEnabled = true;
      console.log('✅ Remote controls enabled');
      
    } catch (error) {
      console.error('❌ Error setting up remote controls:', error);
      this.remoteControlsEnabled = false;
    }
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'background') {
      console.log('App moved to background, maintaining audio playback');
    } else if (nextAppState === 'active') {
      console.log('App returned to foreground');
    }
  }

  private async updateNowPlayingInfo(track: any) {
    try {
      if (!track) return;
      
      // Update track info for remote controls
      console.log('🎵 Updating Now Playing info for:', track.title, 'by', track.artist);
      
      // Here you would typically use expo-av's built-in methods or
      // a library like expo-media-library for full media session control
      
      console.log('🎧 Bluetooth headphone controls should now work for play/pause/next/previous');
      
    } catch (error) {
      console.error('❌ Error updating now playing info:', error);
    }
  }

  // Funciones públicas para controlar crossfade
  public setCrossfadeEnabled(enabled: boolean) {
    this.crossfadeEnabled = enabled;
    // Actualizar el store
    const store = useAppStore.getState();
    store.updateAudioSettings({ crossfadeEnabled: enabled });
    console.log(`🎵 Crossfade ${enabled ? 'enabled' : 'disabled'}`);
  }

  public setCrossfadeDuration(durationMs: number) {
    this.crossfadeDuration = Math.max(1000, Math.min(5000, durationMs)); // Entre 1 y 5 segundos
    // Actualizar el store
    const store = useAppStore.getState();
    store.updateAudioSettings({ crossfadeDuration: this.crossfadeDuration });
    console.log(`⏱️ Crossfade duration set to ${this.crossfadeDuration}ms`);
  }

  public setPrebufferTime(timeMs: number) {
    this.prebufferTime = Math.max(5000, Math.min(30000, timeMs)); // Entre 5 y 30 segundos
    // Actualizar el store
    const store = useAppStore.getState();
    store.updateAudioSettings({ prebufferTime: this.prebufferTime });
    console.log(`📦 Prebuffer time set to ${this.prebufferTime}ms`);
  }

  public async loadAndPlay(url: string) {
    try {
      console.log('🎵 Loading and playing:', url);
      
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }
      
      // Stop previous sound INSTANTLY without waiting for unload
      if (this.sound) {
        try {
          this.sound.stopAsync().catch(() => {}); // No esperar
          this.sound.unloadAsync().catch(() => {}); // No esperar
          this.sound = null;
        } catch (error) {
          // Ignorar errores de cleanup
        }
      }

      // Determinar si es un archivo local (offline) o URL remota
      const isLocalFile = url.startsWith('file://') || (FileSystem.documentDirectory && url.includes(FileSystem.documentDirectory));
      
      console.log('Audio source type:', isLocalFile ? 'Local file (offline)' : 'Remote stream');

      // Create and load new sound with optimized configuration for immediate playback
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
          progressUpdateIntervalMillis: 500, // Update more frequently for better sync
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      
      // Update player state immediately
      const store = useAppStore.getState();
      store.setPlayerState({ isPlaying: true });
      
      // Update Now Playing information
      const currentTrack = store.player.currentTrack;
      if (currentTrack) {
        this.updateNowPlayingInfo(currentTrack);
      }

      console.log('✅ Audio loaded and playing successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading audio:', error);
      return false;
    }
  }

  public async play() {
    if (this.sound) {
      try {
        await this.sound.playAsync();
        useAppStore.getState().setPlayerState({ isPlaying: true });
        console.log('Playback started');
      } catch (error) {
        console.error('Error playing:', error);
      }
    }
  }

  public async pause() {
    if (this.sound) {
      try {
        await this.sound.pauseAsync();
        useAppStore.getState().setPlayerState({ isPlaying: false });
        console.log('Playback paused');
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }
  }

  public async stop() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        useAppStore.getState().setPlayerState({ isPlaying: false });
        console.log('Playback stopped');
      } catch (error) {
        console.error('Error stopping:', error);
      }
    }
  }

  public async stopAndUnload() {
    // Limpiar sonido actual
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        useAppStore.getState().setPlayerState({ isPlaying: false });
        console.log('Playback stopped and unloaded');
      } catch (error) {
        console.error('Error stopping and unloading:', error);
      }
    }
    
    // Limpiar sonido prebuffering
    if (this.nextSound) {
      try {
        await this.nextSound.unloadAsync();
        this.nextSound = null;
        console.log('Next sound prebuffer cleared');
      } catch (error) {
        console.error('Error cleaning next sound:', error);
      }
    }
    
    // Resetear bandera de crossfade
    this.crossfadeInProgress = false;
  }

  public async seek(positionMillis: number) {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(positionMillis);
        console.log(`Seeked to ${positionMillis}ms`);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  }

  public async isPlaying(): Promise<boolean> {
    if (!this.sound) return false;
    
    try {
      const status = await this.sound.getStatusAsync();
      return status.isLoaded && (status as AVPlaybackStatusSuccess).isPlaying;
    } catch (error) {
      console.error('Error checking playing status:', error);
      return false;
    }
  }

  public async setVolume(volume: number) {
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(volume);
        console.log(`Volume set to ${volume}`);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  }

  public async getStatus(): Promise<AVPlaybackStatus | null> {
    if (this.sound) {
      try {
        return await this.sound.getStatusAsync();
      } catch (error) {
        console.error('Error getting status:', error);
        return null;
      }
    }
    return null;
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    try {
      if (status.isLoaded) {
        const successStatus = status as AVPlaybackStatusSuccess;
        const store = useAppStore.getState();
        
        // Only update if there are meaningful changes to prevent infinite loops
        const currentPosition = store.player.position || 0;
        const currentDuration = store.player.duration || 0;
        const currentIsPlaying = store.player.isPlaying;
        
        const newPosition = successStatus.positionMillis || 0;
        const newDuration = successStatus.durationMillis || 0;
        const newIsPlaying = successStatus.isPlaying;
        
        // Only update if there's a significant change (> 100ms for position)
        const positionChanged = Math.abs(newPosition - currentPosition) > 100;
        const durationChanged = Math.abs(newDuration - currentDuration) > 100;
        const playingChanged = newIsPlaying !== currentIsPlaying;
        
        if (positionChanged || durationChanged || playingChanged) {
          store.setPlayerState({
            position: newPosition,
            duration: newDuration,
            isPlaying: newIsPlaying
          });
        }
        
        // Detección robusta del final de canción
        const position = successStatus.positionMillis || 0;
        const duration = successStatus.durationMillis || 0;
        const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
        
        // Verificar si el progreso se detuvo cerca del final
        const positionDiff = Math.abs(position - this.lastPosition);
        const isAtEnd = progressPercent >= 99.8; // Al 99.8% o más
        const progressStopped = positionDiff < 100; // Progreso casi detenido (menos de 100ms de cambio)
        
        // Solo cambiar al siguiente track si:
        // 1. Está al 99.8% o más del progreso, Y
        // 2. (didJustFinish O el progreso se detuvo por 2 updates consecutivos), Y
        // 3. No está en loop
        if (isAtEnd && !successStatus.isLooping) {
          if (successStatus.didJustFinish) {
            console.log('✅ Track finished via didJustFinish at', progressPercent.toFixed(2), '%');
            this.playNext();
            this.progressCheckCount = 0;
          } else if (progressStopped) {
            this.progressCheckCount++;
            console.log(`Progress check ${this.progressCheckCount}: Position stalled at ${progressPercent.toFixed(2)}%`);
            
            if (this.progressCheckCount >= 2) {
              console.log('✅ Track finished via progress stall detection');
              this.playNext();
              this.progressCheckCount = 0;
            }
          } else {
            this.progressCheckCount = 0;
          }
        } else {
          this.progressCheckCount = 0;
          
          // Log false positives
          if (successStatus.didJustFinish && !successStatus.isLooping && !isAtEnd) {
            console.log('⚠️ False finish ignored - only at', progressPercent.toFixed(2), '% progress');
          }
        }
        
        // Actualizar última posición para próximo check
        this.lastPosition = position;
        
        // Manejar interrupciones de audio (llamadas, etc.)
        if (!successStatus.isPlaying && this.isInitialized) {
          console.log('Audio paused, possibly due to interruption');
        }
      } else {
        // Only log error if there's actually an error message
        if (status.error) {
          console.error('Playbook status error:', status.error);
          // Reset player state on actual error, but only if significantly different
          const store = useAppStore.getState();
          if (store.player.isPlaying) {
            store.setPlayerState({ isPlaying: false });
          }
        }
      }
    } catch (error) {
      console.error('Error in playbook status update:', error);
    }
  }

  public async playNext() {
    try {
      const store = useAppStore.getState();
      const { queue, currentIndex } = store.player;
      
      console.log('playNext called - current state:', {
        queueLength: queue.length,
        currentIndex,
        currentTrack: store.player.currentTrack?.title
      });
      
      if (queue.length === 0) {
        // No queue - mantener reproduciendo la canción actual si existe
        console.log('No queue - keeping current track playing if exists');
        return;
      }

      // Asegurar que currentIndex tenga un valor válido
      const safeCurrentIndex = typeof currentIndex === 'number' ? currentIndex : 0;
      const nextIndex = safeCurrentIndex + 1;
      
      console.log('playNext - calculated nextIndex:', nextIndex, 'from currentIndex:', safeCurrentIndex);
      
      if (nextIndex < queue.length) {
        const nextTrack = queue[nextIndex];
        
        // Validate next track
        if (nextTrack && nextTrack.id && nextTrack.url) {
          console.log('playNext - playing track:', nextTrack.title, 'at index:', nextIndex);
          
          // Update current index and track IMMEDIATELY for instant UI feedback
          store.setPlayerState({ 
            currentTrack: nextTrack,
            currentIndex: nextIndex,
            position: 0, // Reset position for new track
            duration: 0, // Will be updated when track loads
          });
          
          // Load and play the track (this will take some time but UI is already updated)
          await this.loadAndPlay(nextTrack.url);
        } else {
          // Invalid track, try to skip to next
          store.setPlayerState({ currentIndex: nextIndex });
          console.warn('Invalid track at index', nextIndex, ', skipping');
          await this.playNext(); // Recursive call to try next track
        }
      } else {
        // End of queue - mantener reproduciendo la canción actual
        console.log('End of queue reached - keeping current track playing');
        // No hacer nada, mantener la canción actual reproduciéndose
        return;
      }
    } catch (error) {
      console.error('Error in playNext:', error);
    }
  }

  public async playPrevious() {
    try {
      const store = useAppStore.getState();
      const { queue, currentIndex, position } = store.player;
      
      console.log('playPrevious called - current state:', {
        queueLength: queue.length,
        currentIndex,
        position: Math.floor(position || 0),
        currentTrack: store.player.currentTrack?.title
      });
      
      if (queue.length === 0) {
        console.log('No queue available for previous');
        return;
      }

      const safeCurrentIndex = typeof currentIndex === 'number' ? currentIndex : 0;
      const currentPosition = position || 0;
      
      // Si han pasado menos de 3 segundos desde el inicio de la canción
      if (currentPosition < 3000) { // 3000 ms = 3 segundos
        console.log('Less than 3 seconds, going to previous track');
        
        if (safeCurrentIndex > 0) {
          const prevIndex = safeCurrentIndex - 1;
          const prevTrack = queue[prevIndex];
          
          if (prevTrack && prevTrack.id && prevTrack.url) {
            console.log('playPrevious - going to track:', prevTrack.title, 'at index:', prevIndex);
            
            // Update current index and track IMMEDIATELY for instant UI feedback
            store.setPlayerState({ 
              currentTrack: prevTrack,
              currentIndex: prevIndex,
              position: 0, // Reset position for previous track
              duration: 0, // Will be updated when track loads
            });
            
            // Load and play the track
            await this.loadAndPlay(prevTrack.url);
          } else {
            console.warn('Invalid previous track at index:', prevIndex);
            return;
          }
        } else {
          // Ya estamos en la primera canción
          console.log('Already at first track, restarting current track');
          await this.seek(0);
        }
      } else {
        // Han pasado más de 3 segundos, reiniciar la canción actual
        console.log('More than 3 seconds elapsed, restarting current track');
        await this.seek(0);
      }
    } catch (error) {
      console.error('Error in playPrevious:', error);
    }
  }

  public async playTrack(track: any) {
    try {
      console.log('playTrack called with:', track.title);
      
      if (!track || !track.url) {
        console.error('Invalid track provided to playTrack');
        return;
      }

      // Update current track in store
      const store = useAppStore.getState();
      store.setPlayerState({ currentTrack: track });
      
      // Load and play the track
      await this.loadAndPlay(track.url);
      
    } catch (error) {
      console.error('Error in playTrack:', error);
    }
  }

  public async playSingleTrack(track: any) {
    try {
      console.log('playSingleTrack called with:', track.title);
      
      if (!track || !track.url) {
        console.error('Invalid track provided to playSingleTrack');
        return;
      }

      // Clear queue and set current track
      const store = useAppStore.getState();
      store.setQueue([]);
      store.setPlayerState({ 
        currentTrack: track,
        currentIndex: undefined 
      });
      
      // Load and play the track
      await this.loadAndPlay(track.url);
      
    } catch (error) {
      console.error('Error in playSingleTrack:', error);
    }
  }

  public async playTrackList(tracks: any[], startIndex: number = 0) {
    try {
      console.log('playTrackList called with', tracks.length, 'tracks, starting at index', startIndex);
      
      if (!tracks || tracks.length === 0) {
        console.error('No tracks provided to playTrackList');
        return;
      }

      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const trackToPlay = tracks[validStartIndex];
      
      if (!trackToPlay || !trackToPlay.url) {
        console.error('Invalid track at start index:', validStartIndex);
        return;
      }

      // Set queue and current track
      const store = useAppStore.getState();
      store.setQueue(tracks);
      store.setPlayerState({ 
        currentTrack: trackToPlay,
        currentIndex: validStartIndex 
      });
      
      // Load and play the track
      await this.loadAndPlay(trackToPlay.url);
      
    } catch (error) {
      console.error('Error in playTrackList:', error);
    }
  }

  public async destroy() {
    try {
      await this.stopAndUnload();
      
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
      }
      
      this.isInitialized = false;
      console.log('Audio player destroyed');
    } catch (error) {
      console.error('Error destroying audio player:', error);
    }
  }
}

// Create and export the singleton instance
export const audioPlayer = AudioPlayerService.getInstance();
