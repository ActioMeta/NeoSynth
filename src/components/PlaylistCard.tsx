import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemMenu, { ItemMenuOption } from './ItemMenu';

export type PlaylistCardProps = {
  name: string;
  trackCount: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onAddToPlaylist: () => void;
  onPress: () => void;
};

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  name,
  trackCount,
  onPlay,
  onAddToQueue,
  onAddToPlaylist,
  onPress,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const menuOptions: ItemMenuOption[] = [
    { label: 'Reproducir', icon: 'play', onPress: () => onPlay() },
    { label: 'Agregar a la cola', icon: 'add', onPress: () => onAddToQueue() },
    { label: 'Agregar a playlist', icon: 'list', onPress: () => onAddToPlaylist() },
  ];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle}>{trackCount} canciones</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
      </View>
      <ItemMenu visible={menuVisible} onClose={() => setMenuVisible(false)} options={menuOptions} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 180,
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    color: '#B3B3B3',
    fontSize: 13,
  },
  menuBtn: {
    padding: 6,
    marginLeft: 4,
  },
});

export default PlaylistCard;
