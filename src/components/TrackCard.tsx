
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import ItemMenu, { ItemMenuOption } from './ItemMenu';
import PlaylistSelector from './PlaylistSelector';
import DownloadButton from './DownloadButton';
import { useAppStore } from '../store/appStore';

export type TrackCardProps = {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  trackNumber?: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onDownload: () => void;
  onAddToPlaylist: (playlistId: string, playlistName: string) => void;
  onPress: () => void;
  track?: any; // Para pasar la canción al selector
};

export default function TrackCard({ 
  title, 
  artist, 
  album, 
  duration, 
  trackNumber, 
  onPlay, 
  onAddToQueue, 
  onDownload, 
  onAddToPlaylist, 
  onPress,
  track
}: TrackCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [playlistSelectorVisible, setPlaylistSelectorVisible] = useState(false);
  const currentServer = useAppStore(s => s.currentServer);
  
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const menuOptions: ItemMenuOption[] = [
    { label: 'Reproducir', icon: 'play', onPress: () => onPlay() },
    { label: 'Agregar a la cola', icon: 'add', onPress: () => onAddToQueue() },
    { label: 'Agregar a playlist', icon: 'list', onPress: () => setPlaylistSelectorVisible(true) },
  ];

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.infoRow}>
          {trackNumber && (
            <Text style={styles.trackNumber}>{trackNumber}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{artist}{album ? ` • ${album}` : ''}</Text>
          </View>
          {duration && (
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
          )}
          
          {/* Botón de descarga */}
          {currentServer && track && (
            <DownloadButton
              track={{
                id: track.id || '',
                title: track.title || title,
                artist: track.artist || artist,
                album: track.album || album || '',
                duration: (track.duration || duration || 0) * 1000,
                url: '', // Se genera dinámicamente en el DownloadButton
                isOffline: false,
                coverArt: track.coverArt,
                albumId: track.albumId,
              }}
              server={currentServer}
              size="small"
              style={styles.downloadButton}
            />
          )}
          
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} hitSlop={12}>
            <Feather name="more-vertical" size={20} color="#B3B3B3" />
          </TouchableOpacity>
        </View>
        <ItemMenu visible={menuVisible} onClose={() => setMenuVisible(false)} options={menuOptions} />
      </TouchableOpacity>
      
      <PlaylistSelector
        visible={playlistSelectorVisible}
        onClose={() => setPlaylistSelectorVisible(false)}
        onSelectPlaylist={onAddToPlaylist}
        track={track}
        title={`Agregar "${title}" a playlist`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackNumber: {
    color: '#B3B3B3',
    fontSize: 14,
    marginRight: 12,
    minWidth: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 13,
  },
  duration: {
    color: '#B3B3B3',
    fontSize: 13,
    marginRight: 8,
  },
  downloadButton: {
    marginRight: 8,
  },
  menuBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
