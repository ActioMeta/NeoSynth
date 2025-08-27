import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  SafeAreaView, 
  Image,
  Dimensions 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';
import { getCoverArtUrl } from '../services/subsonic';

interface FullPlayerProps {
  visible: boolean;
  onClose: () => void;
}

export default function FullPlayer({ visible, onClose }: FullPlayerProps) {
  const currentTrack = useAppStore(s => s.player.currentTrack);
  const isPlaying = useAppStore(s => s.player.isPlaying);
  const queue = useAppStore(s => s.player.queue);
  const shuffle = useAppStore(s => s.player.shuffle);
  const repeat = useAppStore(s => s.player.repeat);
  const currentServer = useAppStore(s => s.currentServer);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const removeFromQueue = useAppStore(s => s.removeFromQueue);
  const shuffleQueue = useAppStore(s => s.shuffleQueue);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load cover art URL when track changes
    if (currentTrack && currentServer) {
      const coverUrl = getCoverArtUrl(currentServer, currentTrack.coverArt || currentTrack.albumId || currentTrack.id);
      setCoverArtUrl(coverUrl);
    } else {
      setCoverArtUrl(null);
    }
  }, [currentTrack, currentServer]);

  useEffect(() => {
    // Update position periodically when playing
    let interval: any;
    
    if (isPlaying && !isSeeking) {
      interval = setInterval(async () => {
        const status = await audioPlayer.getStatus();
        if (status?.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isSeeking]);

  const handlePlayPause = async () => {
    if (!currentTrack) return;
    
    if (isPlaying) {
      await audioPlayer.pause();
    } else {
      await audioPlayer.play();
    }
  };

  const handleNext = async () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      removeFromQueue(nextTrack.id);
      setPlayerState({ currentTrack: nextTrack });
      await audioPlayer.playTrack(nextTrack);
    }
  };

  const handlePrevious = async () => {
    // If more than 3 seconds have passed, restart current track
    if (position > 3000) {
      await audioPlayer.seek(0);
    } else {
      // Go to previous track in queue
      await audioPlayer.playPrevious();
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekComplete = async (value: number) => {
    const newPosition = (value / 100) * duration;
    await audioPlayer.seek(newPosition);
    setPosition(newPosition);
    setIsSeeking(false);
  };

  const toggleShuffle = () => {
    const newShuffle = !shuffle;
    setPlayerState({ shuffle: newShuffle });
    if (newShuffle) {
      shuffleQueue();
    }
  };

  const toggleRepeat = () => {
    setPlayerState({ repeat: !repeat });
  };

    const formatTime = (millis: number) => {
    if (!millis || typeof millis !== 'number' || millis < 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  if (!currentTrack) return <></>;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            onClose();
            (navigation as any).navigate('Queue');
          }}>
            <Feather name="list" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Album Art */}
        <View style={styles.albumArtContainer}>
          <View style={styles.albumArt}>
            {coverArtUrl ? (
              <Image 
                source={{ uri: coverArtUrl }} 
                style={styles.albumArtImage}
                onError={() => setCoverArtUrl(null)}
              />
            ) : (
              <Feather name="music" size={120} color="#666" />
            )}
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
          <Text style={styles.trackAlbum} numberOfLines={1}>
            {currentTrack.album}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={100}
            value={isSeeking ? undefined : progress}
            onSlidingStart={handleSeekStart}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor="#5752D7"
            maximumTrackTintColor="#333"
            thumbTintColor="#5752D7"
          />
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleShuffle} style={styles.controlButton}>
            <Ionicons 
              name="shuffle" 
              size={24} 
              color={shuffle ? "#5752D7" : "#B3B3B3"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
            <Feather name="skip-back" size={32} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={32} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
            <Feather name="skip-forward" size={32} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
            <Ionicons 
              name="repeat" 
              size={24} 
              color={repeat ? "#5752D7" : "#B3B3B3"} 
            />
          </TouchableOpacity>
        </View>

        {/* Queue info */}
        {queue.length > 0 && (
          <View style={styles.queueInfo}>
            <Text style={styles.queueText}>
              Siguientes: {queue.length} canciones
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  albumArtContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 20,
  },
  albumArt: {
    width: 280,
    height: 280,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  albumArtImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trackInfo: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginVertical: 16,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    fontSize: 18,
    color: '#5752D7',
    marginBottom: 4,
  },
  trackAlbum: {
    fontSize: 16,
    color: '#B3B3B3',
  },
  progressContainer: {
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  controlButton: {
    padding: 16,
  },
  playButton: {
    backgroundColor: '#5752D7',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  queueInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  queueText: {
    fontSize: 14,
    color: '#B3B3B3',
  },
});
