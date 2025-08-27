import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

export type PlaylistSelectorProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPlaylist: (playlistId: string, playlistName: string) => void;
  tracks?: any[];
  title?: string;
};

export default function PlaylistSelector({
  visible,
  onClose,
  onSelectPlaylist,
  tracks,
  title = 'Agregar a playlist'
}: PlaylistSelectorProps) {
  const playlists = useAppStore(s => s.playlists);

  const handleSelectPlaylist = (playlist: any) => {
    onSelectPlaylist(playlist.id, playlist.name);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {playlists.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No hay playlists</Text>
                </View>
              ) : (
                playlists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => handleSelectPlaylist(playlist)}
                  >
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    maxHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  playlistItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  playlistName: {
    fontSize: 16,
    color: '#fff',
  },
});
