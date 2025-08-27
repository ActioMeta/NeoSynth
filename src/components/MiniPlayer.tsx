import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';
import FullPlayer from './FullPlayer';

export default function MiniPlayer() {
  const currentTrack = useAppStore(s => s.player.currentTrack);
  const isPlaying = useAppStore(s => s.player.isPlaying);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const queue = useAppStore(s => s.player.queue);
  const removeFromQueue = useAppStore(s => s.removeFromQueue);
  
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize audio player
    audioPlayer.initialize();
  }, []);

  useEffect(() => {
    // Update position periodically when playing
    let interval: any;
    
    if (isPlaying) {
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
  }, [isPlaying]);

  const handlePlayPause = async () => {
    if (!currentTrack) return;
    
    if (isPlaying) {
      await audioPlayer.pause();
    } else {
      await audioPlayer.play();
    }
  };

  const handleNext = async () => {
    console.log('MiniPlayer: handleNext called');
    await audioPlayer.playNext();
  };

  const handlePrevious = async () => {
    console.log('MiniPlayer: handlePrevious called');
    await audioPlayer.playPrevious();
  };

  const formatTime = (millis: number) => {
    if (!millis || typeof millis !== 'number' || millis < 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  // Don't show if no track
  if (!currentTrack) return <></>;

  // Debug cover art
  console.log('MiniPlayer - currentTrack:', {
    title: currentTrack.title,
    coverArt: currentTrack.coverArt,
    hasValidCoverArt: !!currentTrack.coverArt && currentTrack.coverArt.length > 0
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => setShowFullPlayer(true)}
        activeOpacity={0.8}
      >
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        
        {/* Player content */}
        <View style={styles.content}>
          {/* Track info */}
          <View style={styles.trackInfo}>
            <View style={styles.albumArt}>
              {currentTrack.coverArt ? (
                <Image
                  source={{ uri: currentTrack.coverArt }}
                  style={styles.coverArtImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="musical-notes" size={24} color="#666" />
              )}
            </View>
            <View style={styles.textInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            
            {/* Controls - moved to the right side */}
            <View style={styles.controls}>
              <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
                <Ionicons name="play-skip-back" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
                <Ionicons name="play-skip-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <FullPlayer 
        visible={showFullPlayer}
        onClose={() => setShowFullPlayer(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#333',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5752D7',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coverArtImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  textInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 4,
  },
  playButton: {
    backgroundColor: '#5752D7',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
