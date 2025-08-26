import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackCard from '../components/TrackCard';
import { useAppStore } from '../store/appStore';
import { getPlaylistPaginated, streamUrl } from '../services/subsonic';

const ITEMS_PER_PAGE = 50;

export default function PlaylistDetailScreen({ route, navigation }: any) {
  const { playlist } = route.params;
  const currentServer = useAppStore(s => s.currentServer);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [playlistInfo, setPlaylistInfo] = useState(playlist);

  useEffect(() => {
    if (!currentServer || !playlist.id) return;
    
    loadInitialTracks();
  }, [currentServer, playlist.id]);

  const loadInitialTracks = async () => {
    try {
      setLoading(true);
      setCurrentPage(0);
      setTracks([]);
      setHasMore(true);
      await loadMoreTracks(0, true);
    } catch (error) {
      console.error('Error loading initial playlist tracks:', error);
      setLoading(false);
    }
  };

  const loadMoreTracks = async (page = currentPage, isInitial = false) => {
    if (!currentServer || (!hasMore && !isInitial)) return;
    
    try {
      if (!isInitial) setLoadingMore(true);
      
      const offset = page * ITEMS_PER_PAGE;
      const data = await getPlaylistPaginated(currentServer, playlist.id, offset, ITEMS_PER_PAGE);
      
      const response = data['subsonic-response'] || data;
      const playlistData = response.playlist;
      
      if (playlistData) {
        if (isInitial) {
          setPlaylistInfo(playlistData);
        }
        
        const newTracks = playlistData.entry || [];
        
        if (isInitial) {
          setTracks(newTracks);
        } else {
          setTracks(prev => [...prev, ...newTracks]);
        }
        
        // Verificar si hay más elementos
        const totalSongs = playlistData.songCount || playlistData.size || 0;
        const loadedSongs = offset + newTracks.length;
        setHasMore(loadedSongs < totalSongs && newTracks.length === ITEMS_PER_PAGE);
        
        setCurrentPage(page + 1);
      }
    } catch (error) {
      console.error('Error loading more playlist tracks:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handlePlayTrack = async (track: any, index: number) => {
    if (!currentServer) return;
    
    try {
      const url = await streamUrl(currentServer, track.id);
      setPlayerState({ 
        currentTrack: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration || 0,
          url,
          isOffline: false,
        }, 
        isPlaying: true 
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleAddTrackToQueue = async (track: any) => {
    if (!currentServer) return;
    
    try {
      const url = await streamUrl(currentServer, track.id);
      addToQueue({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline: false,
      });
    } catch (error) {
      console.error('Error adding track to queue:', error);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0], 0);
      // Agregar el resto a la cola
      tracks.slice(1).forEach(track => handleAddTrackToQueue(track));
    }
  };

  const handleAddAllToQueue = () => {
    tracks.forEach(track => handleAddTrackToQueue(track));
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      handlePlayTrack(shuffled[0], 0);
      shuffled.slice(1).forEach(track => handleAddTrackToQueue(track));
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = tracks.reduce((total, track) => total + (track.duration || 0), 0);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMoreTracks(currentPage);
    }
  }, [loadingMore, hasMore, currentPage]);

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => (
    <TrackCard
      key={`${item.id}-${index}`}
      title={item.title}
      artist={item.artist}
      album={item.album}
      duration={item.duration}
      trackNumber={index + 1}
      onPlay={() => handlePlayTrack(item, index)}
      onAddToQueue={() => handleAddTrackToQueue(item)}
      onDownload={() => {}}
      onAddToPlaylist={() => {}}
      onPress={() => handlePlayTrack(item, index)}
    />
  );

  const renderListHeader = () => (
    <>
      {/* Playlist Info */}
      <View style={styles.playlistInfo}>
        <View style={styles.playlistCover}>
          <Ionicons name="musical-notes" size={60} color="#666" />
        </View>
        
        <View style={styles.playlistDetails}>
          <Text style={styles.playlistName}>{playlistInfo.name}</Text>
          <Text style={styles.playlistMeta}>
            {tracks.length} canciones • {formatDuration(totalDuration)}
          </Text>
          {playlistInfo.comment && (
            <Text style={styles.playlistDescription}>{playlistInfo.comment}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayAll}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Reproducir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
          <Ionicons name="shuffle" size={20} color="#5752D7" />
          <Text style={styles.shuffleButtonText}>Aleatorio</Text>
        </TouchableOpacity>
      </View>

      {/* Track List Header */}
      <View style={styles.trackListHeader}>
        <Text style={styles.trackListTitle}>Canciones</Text>
      </View>
    </>
  );

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#5752D7" size="small" />
        <Text style={styles.loadingText}>Cargando más canciones...</Text>
      </View>
    );
  };

  const renderListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Esta playlist está vacía</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlist</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#5752D7" size="large" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderListEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  playlistInfo: { 
    alignItems: 'center', 
    padding: 24 
  },
  playlistCover: { 
    width: 200, 
    height: 200, 
    borderRadius: 8, 
    backgroundColor: '#333', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16 
  },
  playlistDetails: { 
    alignItems: 'center' 
  },
  playlistName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    marginBottom: 8 
  },
  playlistMeta: { 
    fontSize: 14, 
    color: '#B3B3B3', 
    marginBottom: 8 
  },
  playlistDescription: { 
    fontSize: 14, 
    color: '#B3B3B3',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  actionButtons: { 
    flexDirection: 'row', 
    paddingHorizontal: 24, 
    marginBottom: 24, 
    gap: 12 
  },
  playButton: { 
    flex: 1, 
    backgroundColor: '#5752D7', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 24, 
    gap: 8 
  },
  playButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  shuffleButton: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#5752D7', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 24, 
    gap: 8 
  },
  shuffleButtonText: { 
    color: '#5752D7', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  trackList: { 
    paddingHorizontal: 16 
  },
  trackListTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 16 
  },
  trackListHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#B3B3B3',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
  },
});
