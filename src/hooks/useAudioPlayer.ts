import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';
import { streamUrl } from '../services/subsonic';
import { DownloadService } from '../services/download';

export function useAudioPlayer() {
  const currentTrack = useAppStore(s => s.player.currentTrack);
  const isPlaying = useAppStore(s => s.player.isPlaying);
  const queue = useAppStore(s => s.player.queue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const removeFromQueue = useAppStore(s => s.removeFromQueue);
  const addToQueue = useAppStore(s => s.addToQueue);
  const currentServer = useAppStore(s => s.currentServer);

  useEffect(() => {
    // Initialize audio player on mount
    audioPlayer.initialize();
  }, []);

  const playTrack = async (track: any) => {
    if (!currentServer) return false;
    
    try {
      const downloadService = DownloadService.getInstance();
      let url = '';
      let isOffline = false;
      let localPath: string | undefined;

      // Verificar si el track está disponible offline
      const isTrackOffline = await downloadService.isTrackOffline(track.id);
      
      if (isTrackOffline) {
        // Usar archivo local si está disponible
        localPath = downloadService.getLocalPath(track.id);
        url = localPath;
        isOffline = true;
        console.log('Playing offline track:', track.title);
      } else {
        // Usar streaming si no está offline
        url = await streamUrl(currentServer, track.id);
        isOffline = false;
        console.log('Playing streaming track:', track.title);
      }

      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline,
        localPath,
        coverArt: track.coverArt,
        albumId: track.albumId,
      };
      
      setPlayerState({ currentTrack: trackData, isPlaying: true });
      return await audioPlayer.playTrack(trackData);
    } catch (error) {
      console.error('Error playing track:', error);
      return false;
    }
  };

  const pauseTrack = async () => {
    await audioPlayer.pause();
  };

  const resumeTrack = async () => {
    await audioPlayer.play();
  };

  const stopTrack = async () => {
    await audioPlayer.stop();
    setPlayerState({ currentTrack: null, isPlaying: false });
  };

  const playNext = async () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      removeFromQueue(nextTrack.id);
      return await playTrack(nextTrack);
    }
    return false;
  };

  const addTrackToQueue = async (track: any) => {
    if (!currentServer) return;
    
    try {
      const url = await streamUrl(currentServer, track.id);
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline: false,
      };
      
      addToQueue(trackData);
    } catch (error) {
      console.error('Error adding track to queue:', error);
    }
  };

  const seekTo = async (positionMillis: number) => {
    await audioPlayer.seek(positionMillis);
  };

  const setVolume = async (volume: number) => {
    await audioPlayer.setVolume(volume);
  };

  return {
    currentTrack,
    isPlaying,
    queue,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    playNext,
    addTrackToQueue,
    seekTo,
    setVolume,
  };
}
