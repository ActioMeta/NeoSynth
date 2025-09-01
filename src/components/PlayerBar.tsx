import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';

export default function PlayerBar() {
  const { player } = useAppStore();
  const currentTrack = player.currentTrack;
  const isPlaying = player.isPlaying;

  if (!currentTrack) {
    return null; // No mostrar la barra si no hay canción
  }

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioPlayer.pause();
      } else {
        await audioPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const handleNext = async () => {
    try {
      await audioPlayer.playNext();
    } catch (error) {
      console.error('Error playing next:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await audioPlayer.playPrevious();
    } catch (error) {
      console.error('Error playing previous:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Track Info */}
      <View style={styles.trackInfo}>
        {currentTrack.coverArt ? (
          <Image
            source={{ uri: currentTrack.coverArt }}
            style={styles.coverArt}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
            <Feather name="music" size={16} color="#666" />
          </View>
        )}
        
        <View style={styles.textInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title || 'Sin título'}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artist || 'Artista desconocido'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePrevious}
          style={styles.controlButton}
          hitSlop={8}
        >
          <Feather name="skip-back" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.controlButton, styles.playButton]}
          hitSlop={8}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.controlButton}
          hitSlop={8}
        >
          <Feather name="skip-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
    elevation: 10, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  coverArtPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  playButton: {
    backgroundColor: '#5752D7',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
});
