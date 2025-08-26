import { Audio, AVPlaybackStatus } from 'expo-av';
import { useAppStore, Track } from '../store/appStore';

let sound: Audio.Sound | null = null;

export async function playTrack(track: Track) {
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }
  sound = new Audio.Sound();
  await sound.loadAsync({ uri: track.isOffline && track.localPath ? track.localPath : track.url });
  await sound.playAsync();
  useAppStore.getState().setPlayerState({ currentTrack: track, isPlaying: true });
}

export async function pausePlayback() {
  if (sound) {
    await sound.pauseAsync();
    useAppStore.getState().setPlayerState({ isPlaying: false });
  }
}

export async function resumePlayback() {
  if (sound) {
    await sound.playAsync();
    useAppStore.getState().setPlayerState({ isPlaying: true });
  }
}

export async function stopPlayback() {
  if (sound) {
    await sound.stopAsync();
    useAppStore.getState().setPlayerState({ isPlaying: false });
  }
}

export async function seekTo(positionMillis: number) {
  if (sound) {
    await sound.setPositionAsync(positionMillis);
  }
}

export function getCurrentSound() {
  return sound;
}

export function setOnPlaybackStatusUpdate(callback: (status: AVPlaybackStatus) => void) {
  if (sound) {
    sound.setOnPlaybackStatusUpdate(callback);
  }
}
