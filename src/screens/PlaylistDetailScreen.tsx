import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackCard from '../components/TrackCard';
import ItemMenu from '../components/ItemMenu';
import { useAppStore } from '../store/appStore';
import { getPlaylistPaginated, streamUrl, getCoverArtUrl } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';
import { addTrackToPlaylist } from '../database/playlists';
import { DownloadService } from '../services/download';

const ITEMS_PER_PAGE = 50;
const downloadService = DownloadService.getInstance();

export default function PlaylistDetailScreen({ route, navigation }: any) {
  const { playlist } = route.params;
  const currentServer = useAppStore(s => s.currentServer);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
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
    console.log('PlaylistDetailScreen: handlePlayTrack called with:', { track: track.title, index });
    
    if (!currentServer) {
      console.log('PlaylistDetailScreen: No current server available');
      return;
    }
    
    try {
      console.log('PlaylistDetailScreen: Getting stream URL for track:', track.id);
      const url = await streamUrl(currentServer, track.id);
      console.log('PlaylistDetailScreen: Got stream URL:', url);
      
      const coverArtUrl = track.coverArt && currentServer ? getCoverArtUrl(currentServer, track.coverArt) : undefined;
      
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline: false,
        coverArt: coverArtUrl,
      };
      
      console.log('PlaylistDetailScreen: Setting player state and playing track...');
      setPlayerState({ currentTrack: trackData, isPlaying: true });
      await audioPlayer.playTrack(trackData);
      console.log('PlaylistDetailScreen: Track started playing successfully');
    } catch (error) {
      console.error('PlaylistDetailScreen: Error playing track:', error);
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

  const handlePlayAll = async () => {
    if (tracks.length === 0 || !currentServer) return;
    
    try {
      // Preparar todas las canciones con URLs
      const trackList = await Promise.all(
        tracks.map(async (track) => {
          const url = await streamUrl(currentServer, track.id);
          return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration || 0,
            url,
            isOffline: false,
            coverArt: track.coverArt,
            albumId: track.albumId,
          };
        })
      );
      
      // Reproducir toda la lista, esto limpiará la cola actual
      await audioPlayer.playTrackList(trackList);
    } catch (error) {
      console.error('Error playing all tracks:', error);
    }
  };

  const handleAddAllToQueue = () => {
    tracks.forEach(track => handleAddTrackToQueue(track));
  };

  const handlePlayShuffle = async () => {
    if (tracks.length === 0 || !currentServer) return;
    
    try {
      // Preparar todas las canciones con URLs
      const trackList = await Promise.all(
        tracks.map(async (track) => {
          const url = await streamUrl(currentServer, track.id);
          return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration || 0,
            url,
            isOffline: false,
            coverArt: track.coverArt,
            albumId: track.albumId,
          };
        })
      );
      
      // Mezclar la lista antes de reproducir
      const shuffledTracks = [...trackList].sort(() => Math.random() - 0.5);
      
      // Reproducir la lista mezclada
      await audioPlayer.playTrackList(shuffledTracks);
    } catch (error) {
      console.error('Error playing shuffled playlist:', error);
    }
  };

  const handleDownloadPlaylist = async () => {
    if (!currentServer) return;
    
    try {
      console.log('Iniciando descarga de playlist:', playlist.name);
      
      // Obtener todas las canciones de la playlist
      const playlistTracks = tracks.map(track => ({
        ...track,
        url: `${currentServer.url}/rest/stream?id=${track.id}&u=${currentServer.username}&p=${currentServer.password}&v=1.12.0&c=neosynth`,
      }));
      
      // Usar el DownloadService para descargar toda la playlist
      await downloadService.downloadPlaylist(
        playlistTracks,
        currentServer,
        playlist.id,
        (overall: number, current: any) => {
          console.log(`Progreso general: ${Math.round(overall * 100)}%, Canción actual: ${current.trackId}`);
        }
      );
      
      console.log('Playlist descargada exitosamente');
      Alert.alert(
        'Descarga completada',
        `La playlist "${playlist.name}" se ha descargado para uso offline.`
      );
    } catch (error) {
      console.error('Error descargando playlist:', error);
      Alert.alert(
        'Error',
        'No se pudo descargar la playlist. Inténtalo de nuevo.'
      );
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

  const handleAddTrackToPlaylist = async (playlistId: string, playlistName: string, track: any) => {
    try {
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: (track.duration || 0) * 1000, // Convertir a millisegundos
        url: await streamUrl(currentServer!, track.id),
        isOffline: false,
        localPath: undefined
      };
      
      await addTrackToPlaylist(playlistId, trackData);
      console.log(`Track "${track.title}" added to playlist "${playlistName}"`);
      // TODO: Mostrar mensaje de éxito al usuario
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      // TODO: Mostrar mensaje de error al usuario
    }
  };

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
      onAddToPlaylist={(playlistId, playlistName) => handleAddTrackToPlaylist(playlistId, playlistName, item)}
      onPress={() => handlePlayTrack(item, index)}
      track={item}
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
          <Feather name="play" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Reproducir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shuffleButton} onPress={handlePlayShuffle}>
          <Feather name="shuffle" size={20} color="#5752D7" />
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
    if (!loadingMore) return <></>;
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
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlist</Text>
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Feather name="more-horizontal" size={24} color="#fff" />
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

      <ItemMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        anchorPosition={{
          top: insets.top + 12, // SafeArea top + padding del header
          left: 0 // Usaremos right en el menú
        }}
        options={[
          {
            label: 'Agregar a cola',
            icon: 'list',
            onPress: () => {
              handleAddAllToQueue();
              setShowMenu(false);
            }
          },
          {
            label: 'Descargar playlist',
            icon: 'download',
            onPress: () => {
              handleDownloadPlaylist();
              setShowMenu(false);
            }
          }
        ]}
      />
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
