import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AlbumCard from '../components/AlbumCard';
import TrackCard from '../components/TrackCard';
import { useAppStore } from '../store/appStore';
import { subsonicRequest, streamUrl } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';

export default function ArtistDetailScreen({ route, navigation }: any) {
  const { artist } = route.params;
  const currentServer = useAppStore(s => s.currentServer);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const [albums, setAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistInfo, setArtistInfo] = useState(artist);

  useEffect(() => {
    if (!currentServer || !artist.id) return;
    
    loadArtistData();
  }, [currentServer, artist.id]);

  const loadArtistData = async () => {
    try {
      setLoading(true);
      const data = await subsonicRequest(currentServer!, 'getArtist.view', {
        id: artist.id,
      });
      
      const response = data['subsonic-response'] || data;
      const artistData = response.artist;
      
      if (artistData) {
        setArtistInfo(artistData);
        setAlbums(artistData.album || []);
      }

      // Obtener canciones principales del artista
      try {
        const songsData = await subsonicRequest(currentServer!, 'getTopSongs.view', {
          artist: artist.name,
          count: 10,
        });
        const songsResponse = songsData['subsonic-response'] || songsData;
        setTopSongs(songsResponse.topSongs?.song || []);
      } catch (error) {
        console.log('Top songs not available for this artist');
      }
    } catch (error) {
      console.error('Error loading artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (track: any) => {
    if (!currentServer) return;
    
    try {
      const url = await streamUrl(currentServer, track.id);
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration || 0,
        url,
        isOffline: false,
      };
      
      setPlayerState({ currentTrack: trackData, isPlaying: true });
      await audioPlayer.playTrack(trackData);
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

  const handlePlayAlbum = (album: any) => {
    navigation.navigate('AlbumDetail', { album });
  };

  const handleAddAlbumToQueue = (album: any) => {
    navigation.navigate('AlbumDetail', { album, action: 'queue' });
  };

  const handleDownloadAlbum = (album: any) => {
    navigation.navigate('AlbumDetail', { album, action: 'download' });
  };

  const handleAddAlbumToPlaylist = (album: any) => {
    navigation.navigate('AlbumDetail', { album, action: 'addToPlaylist' });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artista</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#5752D7" size="large" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView>
          {/* Artist Info */}
          <View style={styles.artistInfo}>
            <View style={styles.artistImage}>
              <Ionicons name="person" size={60} color="#666" />
            </View>
            
            <View style={styles.artistDetails}>
              <Text style={styles.artistName}>{artistInfo.name}</Text>
              <Text style={styles.artistMeta}>
                {albums.length} álbumes
              </Text>
            </View>
          </View>

          {/* Top Songs */}
          {topSongs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Canciones principales</Text>
              {topSongs.map((track, index) => (
                <TrackCard
                  key={track.id}
                  title={track.title}
                  artist={track.artist}
                  album={track.album}
                  duration={track.duration}
                  onPlay={() => handlePlayTrack(track)}
                  onAddToQueue={() => handleAddTrackToQueue(track)}
                  onDownload={() => {}}
                  onAddToPlaylist={() => {}}
                  onPress={() => handlePlayTrack(track)}
                />
              ))}
            </View>
          )}

          {/* Albums */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Álbumes</Text>
            {albums.length === 0 ? (
              <Text style={styles.emptyText}>No hay álbumes disponibles</Text>
            ) : (
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                {albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    title={album.name}
                    artist={album.artist}
                    coverUrl={album.coverArt ? `${currentServer?.url}/rest/getCoverArt.view?id=${album.coverArt}&u=${currentServer?.username}&p=${currentServer?.password}&v=1.16.1&c=neosynth` : undefined}
                    onPlay={() => handlePlayAlbum(album)}
                    onAddToQueue={() => handleAddAlbumToQueue(album)}
                    onDownload={() => handleDownloadAlbum(album)}
                    onAddToPlaylist={() => handleAddAlbumToPlaylist(album)}
                    onPress={() => navigation.navigate('AlbumDetail', { album })}
                  />
                ))}
              </ScrollView>
            )}
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
  artistInfo: { 
    alignItems: 'center', 
    padding: 24 
  },
  artistImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#333', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16 
  },
  artistDetails: { 
    alignItems: 'center' 
  },
  artistName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    marginBottom: 8 
  },
  artistMeta: { 
    fontSize: 14, 
    color: '#B3B3B3' 
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
