import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackCard from '../components/TrackCard';
import ItemMenu from '../components/ItemMenu';
import DownloadButton from '../components/DownloadButton';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { useAppStore } from '../store/appStore';
import { getMusicDirectory, streamUrl, subsonicRequest, getCoverArtUrl } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';
import { addTrackToPlaylist } from '../database/playlists';
import { DownloadService } from '../services/download';

export default function AlbumDetailScreen({ route, navigation }: any) {
  const { album, action } = route.params;
  const currentServer = useAppStore(s => s.currentServer);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const { showAlert, alertProps } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumInfo, setAlbumInfo] = useState(album);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!currentServer || !album.id) return;
    
    loadAlbumTracks();
  }, [currentServer, album.id]);

  const loadAlbumTracks = async () => {
    try {
      setLoading(true);
      const data = await subsonicRequest(currentServer!, 'getAlbum.view', {
        id: album.id,
      });
      
      const response = data['subsonic-response'] || data;
      const albumData = response.album;
      
      if (albumData) {
        setAlbumInfo(albumData);
        setTracks(albumData.song || []);
      }
    } catch (error) {
      console.error('Error loading album tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (track: any, index: number) => {
    console.log('handlePlayTrack called with:', { track: track.title, index });
    
    if (!currentServer) {
      console.log('No current server available');
      return;
    }
    
    try {
      console.log('Getting stream URL for track:', track.id);
      const url = await streamUrl(currentServer, track.id);
      console.log('Got stream URL:', url);
      
      const coverArtId = track.coverArt || albumInfo?.coverArt;
      const coverArtUrl = coverArtId && currentServer ? getCoverArtUrl(currentServer, coverArtId) : undefined;
      
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline: false,
        coverArt: coverArtUrl,
        albumId: track.albumId || albumInfo?.id,
      };
      
      console.log('Setting player state and playing track...');
      setPlayerState({ currentTrack: trackData, isPlaying: true });
      await audioPlayer.playTrack(trackData);
      console.log('Track started playing successfully');
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
            albumId: track.albumId || albumInfo?.id,
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
            albumId: track.albumId || albumInfo?.id,
          };
        })
      );
      
      // Mezclar la lista antes de reproducir
      const shuffledTracks = [...trackList].sort(() => Math.random() - 0.5);
      
      // Reproducir la lista mezclada
      await audioPlayer.playTrackList(shuffledTracks);
    } catch (error) {
      console.error('Error playing shuffled album:', error);
    }
  };

  const handleDownloadAlbum = async () => {
    if (!currentServer || tracks.length === 0) return;
    
    showAlert(
      'Descargar Álbum',
      `¿Deseas descargar "${albumInfo.name}" completo para reproducción offline? (${tracks.length} canciones)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descargar',
          onPress: async () => {
            try {
              const downloadService = DownloadService.getInstance();
              
              // Preparar tracks para descarga
              const albumTracks = await Promise.all(
                tracks.map(async (track) => {
                  const url = await streamUrl(currentServer!, track.id);
                  return {
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    duration: (track.duration || 0) * 1000,
                    url,
                    isOffline: false,
                    localPath: undefined,
                    coverArt: track.coverArt || albumInfo.coverArt,
                    albumId: albumInfo.id,
                  };
                })
              );

              await downloadService.downloadAlbum(
                albumTracks,
                currentServer,
                albumInfo.id,
                (overall, current) => {
                  console.log(`Descarga del álbum: ${Math.round(overall * 100)}% - ${current.trackId}: ${Math.round(current.progress * 100)}%`);
                }
              );

              showAlert('Descarga Completa', `El álbum "${albumInfo.name}" se ha descargado correctamente.`);
            } catch (error) {
              console.error('Error downloading album:', error);
              showAlert('Error', 'No se pudo descargar el álbum completo');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = tracks.reduce((total, track) => total + (track.duration || 0), 0);

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
      key={item.id}
      title={item.title}
      artist={item.artist}
      album={item.album}
      duration={item.duration}
      trackNumber={item.track || index + 1}
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
      {/* Album Info */}
      <View style={styles.albumInfo}>
        {albumInfo.coverArt ? (
          <Image 
            source={{ 
              uri: `${currentServer?.url}/rest/getCoverArt.view?id=${albumInfo.coverArt}&u=${currentServer?.username}&p=${currentServer?.password}&v=1.16.1&c=neosynth&size=300` 
            }}
            style={styles.albumCover}
          />
        ) : (
          <View style={[styles.albumCover, styles.placeholderCover]}>
            <Ionicons name="musical-notes" size={60} color="#666" />
          </View>
        )}
        
        <View style={styles.albumDetails}>
          <Text style={styles.albumTitle}>{albumInfo.name}</Text>
          <Text style={styles.albumArtist}>{albumInfo.artist}</Text>
          <Text style={styles.albumMeta}>
            {tracks.length} canciones • {formatDuration(totalDuration)}
          </Text>
          {albumInfo.year && (
            <Text style={styles.albumYear}>{albumInfo.year}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Álbum</Text>
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
            label: 'Descargar álbum',
            icon: 'download',
            onPress: () => {
              handleDownloadAlbum();
              setShowMenu(false);
            }
          }
        ]}
      />

      <CustomAlert {...alertProps} />
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
  albumInfo: { 
    alignItems: 'center', 
    padding: 24 
  },
  albumCover: { 
    width: 200, 
    height: 200, 
    borderRadius: 8, 
    marginBottom: 16 
  },
  placeholderCover: { 
    backgroundColor: '#333', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  albumDetails: { 
    alignItems: 'center' 
  },
  albumTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    marginBottom: 8 
  },
  albumArtist: { 
    fontSize: 18, 
    color: '#5752D7', 
    marginBottom: 8 
  },
  albumMeta: { 
    fontSize: 14, 
    color: '#B3B3B3', 
    marginBottom: 4 
  },
  albumYear: { 
    fontSize: 14, 
    color: '#B3B3B3' 
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
  trackListHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  trackListTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 16 
  },
});
