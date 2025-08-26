
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemMenu, { ItemMenuOption } from './ItemMenu';

export type TrackCardProps = {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  trackNumber?: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onDownload: () => void;
  onAddToPlaylist: () => void;
  onPress: () => void;
};

export default function TrackCard({ title, artist, album, duration, trackNumber, onPlay, onAddToQueue, onDownload, onAddToPlaylist, onPress }: TrackCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const menuOptions: ItemMenuOption[] = [
    { label: 'Reproducir', icon: 'play', onPress: () => onPlay() },
    { label: 'Agregar a la cola', icon: 'add', onPress: () => onAddToQueue() },
    { label: 'Descargar', icon: 'download', onPress: () => onDownload() },
    { label: 'Agregar a playlist', icon: 'list', onPress: () => onAddToPlaylist() },
  ];

  return (
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
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
      </View>
      <ItemMenu visible={menuVisible} onClose={() => setMenuVisible(false)} options={menuOptions} />
    </TouchableOpacity>
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
  menuBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
