import { AudioPlayer, AudioSource } from 'expo-audio';
import { useAppStore } from '../store/appStore';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';

export class AudioPlayerService {
  private static instance: AudioPlayerService;
  private player: AudioPlayer | null = null;
  private isInitialized = false;
  private remoteControlsEnabled = false;
  private appStateSubscription: any = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastPosition = 0;
  private progressCheckCount = 0;

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
      console.log('🎵 Initializing AudioPlayer service...');

      // Crear nueva instancia del reproductor
      this.player = new AudioPlayer();

      // Configurar eventos del reproductor
      this.setupPlayerEvents();

      // Configurar manejo de cambios de estado de la app
      this.setupAppStateHandling();

      this.isInitialized = true;
      console.log('✅ AudioPlayer service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing AudioPlayer service:', error);
      throw error;
    }
  }

  private setupPlayerEvents() {
    if (!this.player) return;

    // Evento cuando termina la reproducción
    this.player.addListener('playbackStatusUpdate', (status: any) => {
      this.onPlaybackStatusUpdate(status);
    });

    // Evento cuando termina una pista
    this.player.addListener('audioPlayerDidFinishPlaying', () => {
      console.log('🔄 Track finished, playing next...');
      this.playNext();
    });
  }

  private onPlaybackStatusUpdate(status: any) {
    try {
      if (status.isLoaded) {
        // Actualizar estado del reproductor
        const store = useAppStore.getState();
        store.setPlayerState({
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying || false
        });

        // Detección del final de canción
        const position = status.positionMillis || 0;
        const duration = status.durationMillis || 0;
        const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

        // Verificar si el progreso se detuvo cerca del final
        const positionDiff = Math.abs(position - this.lastPosition);
        const isAtEnd = progressPercent >= 99.8;
        const progressStopped = positionDiff < 100;

        if (isAtEnd && progressStopped) {
          this.progressCheckCount++;
          if (this.progressCheckCount >= 2) {
            console.log('✅ Track finished via progress stall detection');
            this.playNext();
            this.progressCheckCount = 0;
          }
        } else {
          this.progressCheckCount = 0;
        }

        this.lastPosition = position;
      }
    } catch (error) {
      console.error('Error in playback status update:', error);
    }
  }

  private setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('App state changed to:', nextAppState);
    if (nextAppState === 'background') {
      // La app pasó a segundo plano, asegurar que la reproducción continúe
      this.updateNowPlayingInfo();
    }
  }

  public async loadAndPlay(url: string) {
    try {
      if (!this.player) {
        throw new Error('AudioPlayer not initialized');
      }

      console.log('🎵 Loading and playing:', url);

      // Crear fuente de audio
      const audioSource: AudioSource = { uri: url };

      // Cargar y reproducir
      await this.player.prepareAsync(audioSource);
      await this.player.playAsync();

      // Actualizar Now Playing info
      this.updateNowPlayingInfo();

      // Iniciar el intervalo de actualización
      this.startUpdateInterval();

      console.log('✅ Audio loaded and playing successfully');
    } catch (error) {
      console.error('❌ Error loading and playing audio:', error);
      throw error;
    }
  }

  private startUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (!this.player) return;

      try {
        const status = await this.player.getStatusAsync();
        this.onPlaybackStatusUpdate(status);
      } catch (error) {
        console.error('Error getting player status:', error);
      }
    }, 500);
  }

  private stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public async play() {
    if (!this.player) return;

    try {
      await this.player.playAsync();
      this.updateNowPlayingInfo();
      this.startUpdateInterval();
    } catch (error) {
      console.error('Error playing:', error);
    }
  }

  public async pause() {
    if (!this.player) return;

    try {
      await this.player.pauseAsync();
      this.stopUpdateInterval();
    } catch (error) {
      console.error('Error pausing:', error);
    }
  }

  public async stop() {
    if (!this.player) return;

    try {
      await this.player.stopAsync();
      this.stopUpdateInterval();
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }

  public async seekTo(positionMillis: number) {
    if (!this.player) return;

    try {
      await this.player.setPositionAsync(positionMillis);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  public async isPlaying(): Promise<boolean> {
    if (!this.player) return false;

    try {
      const status = await this.player.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch (error) {
      console.error('Error checking if playing:', error);
      return false;
    }
  }

  public async getStatus() {
    if (!this.player) return null;

    try {
      return await this.player.getStatusAsync();
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }

  public async playNext() {
    const store = useAppStore.getState();
    const { queue, currentIndex } = store.player;

    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];

      console.log('⏭️ Playing next track:', nextTrack.title);

      // Actualizar inmediatamente el estado
      store.setPlayerState({
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        isPlaying: true
      });

      try {
        await this.loadAndPlay(nextTrack.url);
      } catch (error) {
        console.error('Error playing next track:', error);
      }
    } else {
      console.log('📋 End of queue reached');
      store.setPlayerState({ isPlaying: false });
      await this.stop();
    }
  }

  public async playPrevious() {
    const store = useAppStore.getState();
    const { queue, currentIndex } = store.player;

    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevTrack = queue[prevIndex];

      console.log('⏮️ Playing previous track:', prevTrack.title);

      // Actualizar inmediatamente el estado
      store.setPlayerState({
        currentIndex: prevIndex,
        currentTrack: prevTrack,
        isPlaying: true
      });

      try {
        await this.loadAndPlay(prevTrack.url);
      } catch (error) {
        console.error('Error playing previous track:', error);
      }
    } else {
      console.log('📋 At beginning of queue');
    }
  }

  public async playTrackList(tracks: any[]) {
    const store = useAppStore.getState();
    
    if (tracks.length === 0) return;

    console.log('📋 Loading track list with', tracks.length, 'tracks');
    
    // Actualizar la cola y empezar reproducción
    store.setPlayerState({
      queue: tracks,
      currentIndex: 0,
      currentTrack: tracks[0],
      isPlaying: true
    });

    // Reproducir primera canción
    try {
      await this.loadAndPlay(tracks[0].url);
    } catch (error) {
      console.error('Error playing track list:', error);
    }
  }

  public async playTrackAtIndex(index: number) {
    const store = useAppStore.getState();
    const { queue } = store.player;

    if (index >= 0 && index < queue.length) {
      const trackToPlay = queue[index];

      console.log('🎯 Playing track at index', index, ':', trackToPlay.title);

      // Actualizar estado
      store.setPlayerState({
        currentIndex: index,
        currentTrack: trackToPlay,
        isPlaying: true
      });

      // Reproducir
      try {
        await this.loadAndPlay(trackToPlay.url);
      } catch (error) {
        console.error('Error playing track at index:', error);
      }
    }
  }

  private async updateNowPlayingInfo() {
    try {
      const store = useAppStore.getState();
      const { currentTrack } = store.player;

      if (!currentTrack) return;

      // Configurar notificación para Now Playing
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      console.log('📱 Updated Now Playing info for:', currentTrack.title);
    } catch (error) {
      console.error('Error updating Now Playing info:', error);
    }
  }

  public async enableRemoteControls() {
    if (this.remoteControlsEnabled) return;

    try {
      console.log('🎛️ Enabling remote controls...');
      this.remoteControlsEnabled = true;
      console.log('✅ Remote controls enabled');
    } catch (error) {
      console.error('❌ Error enabling remote controls:', error);
    }
  }

  public async disableRemoteControls() {
    if (!this.remoteControlsEnabled) return;

    try {
      console.log('🎛️ Disabling remote controls...');
      this.remoteControlsEnabled = false;
      console.log('✅ Remote controls disabled');
    } catch (error) {
      console.error('❌ Error disabling remote controls:', error);
    }
  }

  public async cleanup() {
    console.log('🧹 Cleaning up AudioPlayer service...');

    try {
      // Parar reproducción
      await this.stop();

      // Limpiar intervalos
      this.stopUpdateInterval();

      // Remover listeners de app state
      if (this.appStateSubscription) {
        this.appStateSubscription?.remove();
        this.appStateSubscription = null;
      }

      // Limpiar reproductor
      if (this.player) {
        await this.player.unloadAsync();
        this.player = null;
      }

      this.isInitialized = false;
      console.log('✅ AudioPlayer service cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Exportar instancia singleton
export const audioPlayer = AudioPlayerService.getInstance();
