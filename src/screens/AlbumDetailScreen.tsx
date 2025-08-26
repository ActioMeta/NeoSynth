import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackCard from '../components/TrackCard';
import { useAppStore } from '../store/appStore';
import { subsonicRequest, streamUrl } from '../services/subsonic';

export default function AlbumDetailScreen({ route, navigation }: any) {
  const { album, action } = route.params;
  const currentServer = useAppStore(s => s.currentServer);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumInfo, setAlbumInfo] = useState(album);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = tracks.reduce((total, track) => total + (track.duration || 0), 0);

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
      onAddToPlaylist={() => {}}
      onPress={() => handlePlayTrack(item, index)}
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
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Reproducir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.queueButton} onPress={handleAddAllToQueue}>
          <Ionicons name="add" size={20} color="#5752D7" />
          <Text style={styles.queueButtonText}>Agregar a cola</Text>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Álbum</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#5752D7" size="large" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView>
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
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.playButtonText}>Reproducir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.queueButton} onPress={handleAddAllToQueue}>
              <Ionicons name="add" size={20} color="#5752D7" />
              <Text style={styles.queueButtonText}>Agregar a cola</Text>
            </TouchableOpacity>
          </View>

          {/* Track List */}
          <View style={styles.trackList}>
            <Text style={styles.trackListTitle}>Canciones</Text>
            {tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                title={track.title}
                artist={track.artist}
                album={track.album}
                duration={track.duration}
                trackNumber={track.track || index + 1}
                onPlay={() => handlePlayTrack(track, index)}
                onAddToQueue={() => handleAddTrackToQueue(track)}
                onDownload={() => {}}
                onAddToPlaylist={() => {}}
                onPress={() => handlePlayTrack(track, index)}
              />
            ))}
          </View>
        </ScrollView>
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
  queueButton: { 
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
  queueButtonText: { 
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
});
