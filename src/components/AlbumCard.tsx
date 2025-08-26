

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemMenu, { ItemMenuOption } from './ItemMenu';

export type AlbumCardProps = {
  title: string;
  artist: string;
  coverUrl?: string;
  onPlay: () => void;
  onAddToQueue: () => void;
  onDownload: () => void;
  onAddToPlaylist: () => void;
  onPress: () => void;
};

const AlbumCard: React.FC<AlbumCardProps> = ({
  title,
  artist,
  coverUrl,
  onPlay,
  onAddToQueue,
  onDownload,
  onAddToPlaylist,
  onPress,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const menuOptions: ItemMenuOption[] = [
    { label: 'Reproducir', icon: 'play', onPress: () => onPlay() },
    { label: 'Agregar a la cola', icon: 'add', onPress: () => onAddToQueue() },
    { label: 'Descargar', icon: 'download', onPress: () => onDownload() },
    { label: 'Agregar a playlist', icon: 'list', onPress: () => onAddToPlaylist() },
  ];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Ionicons name="musical-notes" size={40} color="#5752D7" />
        </View>
      )}
      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
      </View>
      <ItemMenu visible={menuVisible} onClose={() => setMenuVisible(false)} options={menuOptions} />
    </TouchableOpacity>
  );
};

export default AlbumCard;

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
    marginBottom: 8,
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#181818',
    marginBottom: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  menuBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
