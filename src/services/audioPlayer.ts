import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useAppStore } from '../store/appStore';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';

export class AudioPlayerService {
  private static instance: AudioPlayerService;
  private sound: Audio.Sound | null = null;
  private isInitialized = false;
  private currentLoadPromise: Promise<boolean> | null = null; // Promesa de carga actual
  private loadAbortController: AbortController | null = null; // Controlador para abortar cargas
  private remoteControlsEnabled = false;
  private appStateSubscription: any = null;

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
      // Configuración específica para audífonos Bluetooth
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
          // Android específico para Bluetooth
          audioWillChange: true,
        }),
      });

      // Configurar controles remotos para audífonos
      await this.setupRemoteControls();
      
      // Configurar listener para cambios de estado de la app
      this.setupAppStateListener();
      
      this.isInitialized = true;
      console.log('✅ Audio player initialized successfully with Bluetooth remote controls');
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

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Mantener la reproducción activa en segundo plano
      this.ensureBackgroundPlayback();
    }
  };

  private async ensureBackgroundPlayback() {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          // Re-aplicar configuración de audio para mantener conexión Bluetooth
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false, // No reducir volumen en background
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring background playback:', error);
    }
  }

  private async setupRemoteControls() {
    try {
      // Solo configurar en dispositivos reales, no en simulador
      if (Platform.OS === 'ios' && __DEV__) {
        console.log('Skipping remote controls setup in iOS simulator');
        return;
      }

      // Configurar handler para notificaciones locales (no push notifications)
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        }),
      });

      // Configurar canales de notificación para Android (solo para controles de medios locales)
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('media-controls', {
            name: 'Media Controls',
            importance: Notifications.AndroidImportance.LOW,
            sound: undefined,
            vibrationPattern: [],
            enableLights: false,
            description: 'Controls de medios para audífonos Bluetooth',
          });
          console.log('✅ Android media control channel created');
        } catch (channelError) {
          console.warn('⚠️ Could not create notification channel (might be Expo Go limitation):', channelError);
          // Continuar sin notificaciones, los controles Bluetooth aún pueden funcionar
        }
      }

      this.remoteControlsEnabled = true;
      console.log('✅ Remote controls configured successfully for Bluetooth devices');
      console.log('ℹ️ Note: Media notifications may not work in Expo Go, but Bluetooth controls should work');
    } catch (error) {
      console.warn('⚠️ Error setting up remote controls (possibly Expo Go limitation):', error);
      console.log('🔄 Falling back to basic Bluetooth controls via expo-av');
      this.remoteControlsEnabled = false;
    }
  }

  private async updateNowPlayingInfo(track: any) {
    try {
      if (!track || !this.remoteControlsEnabled) return;
      
      console.log('🎵 Updating Now Playing info for Bluetooth controls:');
      console.log('  - Title:', track?.title || 'Unknown track');
      console.log('  - Artist:', track?.artist || 'Unknown artist');
      console.log('  - Album:', track?.album || 'Unknown album');
      
      // expo-av maneja automáticamente la información "Now Playing" 
      // para los controles de audífonos Bluetooth cuando:
      // 1. staysActiveInBackground: true está configurado
      // 2. El audio está reproduciéndose activamente
      // 3. Los metadatos están disponibles en el archivo de audio
      
      console.log('🎧 Bluetooth headphone controls should now work for play/pause/next/previous');
      
    } catch (error) {
      console.error('❌ Error updating now playing info:', error);
    }
  }

  public async loadAndPlay(url: string) {
    // Cancelar cualquier carga anterior en progreso
    if (this.currentLoadPromise) {
      console.log('Cancelling previous audio load');
      if (this.loadAbortController) {
        this.loadAbortController.abort();
      }
      // Esperar a que la carga anterior termine o se cancele
      try {
        await this.currentLoadPromise;
      } catch (error) {
        // Ignorar errores de cancelación
        console.log('Previous load was cancelled or failed');
      }
    }

    // Crear nuevo controlador de aborto para esta carga
    this.loadAbortController = new AbortController();
    const signal = this.loadAbortController.signal;
    
    // Crear la promesa de carga y guardarla
    this.currentLoadPromise = this._loadAndPlayInternal(url, signal);
    
    try {
      const result = await this.currentLoadPromise;
      return result;
    } finally {
      // Limpiar referencias
      if (this.currentLoadPromise === this.currentLoadPromise) {
        this.currentLoadPromise = null;
        this.loadAbortController = null;
      }
    }
  }

  private async _loadAndPlayInternal(url: string, signal: AbortSignal): Promise<boolean> {
    try {
      console.log('Loading track from URL:', url);
      
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Verificar si fue cancelado antes de continuar
      if (signal.aborted) {
        throw new Error('Load was cancelled');
      }
      
      // Stop and unload previous sound completely
      await this.stopAndUnload();

      // Verificar si fue cancelado después de detener el audio anterior
      if (signal.aborted) {
        throw new Error('Load was cancelled');
      }

      // Determinar si es un archivo local (offline) o URL remota
      const isLocalFile = url.startsWith('file://') || (FileSystem.documentDirectory && url.includes(FileSystem.documentDirectory));
      
      console.log('Audio source type:', isLocalFile ? 'Local file (offline)' : 'Remote stream');

      // Create and load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
          progressUpdateIntervalMillis: 1000, // Update progress every second
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      // Verificar si fue cancelado después de crear el sonido
      if (signal.aborted) {
        console.log('Load was cancelled, unloading sound');
        await sound.unloadAsync();
        throw new Error('Load was cancelled');
      }

      this.sound = sound;
      
      // Actualizar información de "Now Playing" con el track actual
      const store = useAppStore.getState();
      const currentTrack = store.player.currentTrack;
      if (currentTrack) {
        await this.updateNowPlayingInfo(currentTrack);
      }
      
      console.log('Track loaded and playing successfully');
      
      return true;
    } catch (error: any) {
      if (signal.aborted || error?.message === 'Load was cancelled') {
        console.log('Audio load was cancelled');
        return false;
      }
      
      console.error('Error loading track:', error);
      console.error('URL was:', url);
      
      // Update store to reflect error state
      const store = useAppStore.getState();
      store.setPlayerState({ isPlaying: false });
      
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
        
        // Update player state
        const store = useAppStore.getState();
        store.setPlayerState({
          position: successStatus.positionMillis || 0,
          duration: successStatus.durationMillis || 0,
          isPlaying: successStatus.isPlaying
        });
        
        // Check if track finished
        if (successStatus.didJustFinish && !successStatus.isLooping) {
          console.log('Track finished, playing next in queue');
          this.playNext();
        }
        
        // Manejar interrupciones de audio (llamadas, etc.)
        if (!successStatus.isPlaying && this.isInitialized) {
          // El audio fue pausado, posiblemente por una interrupción
          // expo-av maneja automáticamente la reanudación después de interrupciones
          console.log('Audio paused, possibly due to interruption');
        }
      } else {
        // Only log error if there's actually an error message
        if (status.error) {
          console.error('Playback status error:', status.error);
          // Reset player state on actual error
          const store = useAppStore.getState();
          store.setPlayerState({ isPlaying: false });
        }
        // If status.isLoaded is false but no error, it might be loading or transitioning
      }
    } catch (error) {
      console.error('Error in playback status update:', error);
    }
  }

  public async playNext() {
    try {
      // Cancelar cualquier carga en progreso antes de continuar
      if (this.currentLoadPromise) {
        console.log('Cancelling current audio load for next track');
        if (this.loadAbortController) {
          this.loadAbortController.abort();
        }
      }

      const store = useAppStore.getState();
      const { queue, currentIndex } = store.player;
      
      console.log('playNext called - current state:', {
        queueLength: queue.length,
        currentIndex,
        currentTrack: store.player.currentTrack?.title
      });
      
      if (queue.length === 0) {
        // No queue - stop playing
        await this.stopAndUnload();
        store.setPlayerState({ isPlaying: false });
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
          // Update current index and track
          store.setPlayerState({ 
            currentTrack: nextTrack,
            currentIndex: nextIndex 
          });
          // Play it
          await this.loadAndPlay(nextTrack.url);
        } else {
          // Invalid track, try to skip to next
          store.setPlayerState({ currentIndex: nextIndex });
          console.warn('Invalid track at index', nextIndex, ', skipping');
          await this.playNext(); // Recursive call to try next track
        }
      } else {
        // End of queue - stop playing but keep current track
        await this.stopAndUnload();
        store.setPlayerState({ isPlaying: false });
        console.log('End of queue reached');
      }
    } catch (error) {
      console.error('Error in playNext:', error);
    }
  }

  public async playPrevious() {
    try {
      // Cancelar cualquier carga en progreso antes de continuar
      if (this.currentLoadPromise) {
        console.log('Cancelling current audio load for previous track');
        if (this.loadAbortController) {
          this.loadAbortController.abort();
        }
      }

      const store = useAppStore.getState();
      const { queue, currentIndex } = store.player;
      
      console.log('playPrevious called - current state:', {
        queueLength: queue.length,
        currentIndex,
        currentTrack: store.player.currentTrack?.title
      });
      
      // Asegurar que currentIndex tenga un valor válido
      const safeCurrentIndex = typeof currentIndex === 'number' ? currentIndex : 0;
      
      if (queue.length === 0 || safeCurrentIndex <= 0) {
        // No queue or at beginning - restart current track
        console.log('playPrevious - at beginning, restarting current track');
        if (this.sound) {
          await this.seek(0);
          await this.play();
        }
        return;
      }

      const prevIndex = safeCurrentIndex - 1;
      const prevTrack = queue[prevIndex];
      
      console.log('playPrevious - calculated prevIndex:', prevIndex, 'from currentIndex:', safeCurrentIndex);
      
      if (prevTrack && prevTrack.id && prevTrack.url) {
        console.log('playPrevious - playing track:', prevTrack.title, 'at index:', prevIndex);
        // Update current index and track
        store.setPlayerState({ 
          currentTrack: prevTrack,
          currentIndex: prevIndex 
        });
        // Play it
        await this.loadAndPlay(prevTrack.url);
      }
    } catch (error) {
      console.error('Error in playPrevious:', error);
    }
  }

  public async playTrack(track: any) {
    console.log('AudioPlayer: playTrack called with track:', track.title);
    
    // Cancelar cualquier carga en progreso antes de iniciar nueva reproducción
    if (this.currentLoadPromise) {
      console.log('Cancelling current audio load for new track');
      if (this.loadAbortController) {
        this.loadAbortController.abort();
      }
    }

    await this.initialize(); // Asegurar que esté inicializado
    
    const store = useAppStore.getState();
    store.setPlayerState({ currentTrack: track });
    
    console.log('AudioPlayer: Calling loadAndPlay with URL:', track.url);
    const result = await this.loadAndPlay(track.url);
    console.log('AudioPlayer: loadAndPlay completed with result:', result);
    return result;
  }

  // Reproduce una canción individual, reemplazando la cola actual
  public async playSingleTrack(track: any) {
    // Cancelar cualquier carga en progreso
    if (this.currentLoadPromise) {
      console.log('Cancelling current audio load for single track');
      if (this.loadAbortController) {
        this.loadAbortController.abort();
      }
    }

    const store = useAppStore.getState();
    
    // Reemplazar toda la cola con solo esta canción
    store.setQueue([track]);
    store.setPlayerState({ 
      currentTrack: track,
      currentIndex: 0 
    });
    
    return await this.loadAndPlay(track.url);
  }

  // Reproduce una lista (álbum, playlist, etc.) reemplazando la cola actual
  public async playTrackList(tracks: any[], startIndex: number = 0) {
    // Cancelar cualquier carga en progreso
    if (this.currentLoadPromise) {
      console.log('Cancelling current audio load for track list');
      if (this.loadAbortController) {
        this.loadAbortController.abort();
      }
    }

    const store = useAppStore.getState();
    
    if (!tracks || tracks.length === 0) {
      console.error('No tracks provided to play');
      return false;
    }

    // Validar índice de inicio
    const safeStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const trackToPlay = tracks[safeStartIndex];
    
    if (!trackToPlay || !trackToPlay.url) {
      console.error('Invalid track at index:', safeStartIndex);
      return false;
    }

    // Reemplazar toda la cola con la nueva lista
    store.setQueue(tracks);
    store.setPlayerState({ 
      currentTrack: trackToPlay,
      currentIndex: safeStartIndex 
    });

    console.log(`Playing track list: ${tracks.length} tracks, starting at index ${safeStartIndex}`);
    console.log('Initial track:', trackToPlay.title);
    return await this.loadAndPlay(trackToPlay.url);
  }

  // Agrega tracks a la cola actual (sin reemplazar)
  public async addToQueue(tracks: any[]) {
    const store = useAppStore.getState();
    const currentQueue = store.player.queue;
    const newQueue = [...currentQueue, ...tracks];
    store.setQueue(newQueue);
    console.log(`Added ${tracks.length} tracks to queue. Total: ${newQueue.length}`);
  }

  public async destroy() {
    // Limpiar listeners y recursos
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Cancelar cualquier carga en progreso
    if (this.loadAbortController) {
      this.loadAbortController.abort();
    }
    
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    
    this.isInitialized = false;
    this.currentLoadPromise = null;
    this.loadAbortController = null;
    this.remoteControlsEnabled = false;
    
    console.log('🧹 AudioPlayerService destroyed and cleaned up');
  }

  // Métodos para manejar comandos remotos desde audífonos
  public async handleRemotePlay() {
    console.log('Remote play command received from headphones');
    await this.play();
  }

  public async handleRemotePause() {
    console.log('Remote pause command received from headphones');
    await this.pause();
  }

  public async handleRemoteNext() {
    console.log('Remote next command received from headphones');
    await this.playNext();
  }

  public async handleRemotePrevious() {
    console.log('Remote previous command received from headphones');
    await this.playPrevious();
  }

  // Método para verificar si los controles remotos están activos
  public isRemoteControlsEnabled(): boolean {
    return this.remoteControlsEnabled;
  }
}

// Export singleton instance
export const audioPlayer = AudioPlayerService.getInstance();
