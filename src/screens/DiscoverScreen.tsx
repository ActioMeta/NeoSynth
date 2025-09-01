import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AlbumCard from '../components/AlbumCard';
import PlaylistCard from '../components/PlaylistCard';
import ServerSelector from '../components/ServerSelector';
import { useAppStore } from '../store/appStore';
import { getRecentAlbums, getFrequentAlbums, getNewestAlbums, getRandomAlbums, getPlaylists } from '../services/discover';
import { streamUrl, getAlbum, getPlaylistPaginated, getCoverArtUrl, subsonicRequest } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';

export default function DiscoverScreen({ navigation }: any) {
  const { currentServer, servers, loadServers, discoverCache, setDiscoverCache } = useAppStore();
  const { addToQueue, setPlayerState } = useAppStore();
  const insets = useSafeAreaInsets();
  
  const [recentAlbums, setRecentAlbums] = useState<any[]>([]);
  const [frequentAlbums, setFrequentAlbums] = useState<any[]>([]);
  const [newestAlbums, setNewestAlbums] = useState<any[]>([]);
  const [randomAlbums, setRandomAlbums] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tiempo de caché: 5 minutos
  const CACHE_DURATION = 5 * 60 * 1000;
  
  useEffect(() => {
    loadServers();
  }, []);
  
  useEffect(() => {
    if (!currentServer) return;
    
    // Verificar si tenemos caché válido
    const now = Date.now();
    const isCacheValid = discoverCache && 
                        discoverCache.serverId === currentServer.id &&
                        (now - discoverCache.lastUpdated) < CACHE_DURATION;
    
    if (isCacheValid) {
      console.log('📦 Using cached discover data');
      setRecentAlbums(discoverCache.recentAlbums);
      setFrequentAlbums(discoverCache.frequentAlbums);
      setNewestAlbums(discoverCache.newestAlbums);
      setRandomAlbums(discoverCache.randomAlbums);
      setPlaylists(discoverCache.playlists);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading fresh discover data');
    setLoading(true);
    loadDiscoverData();
  }, [currentServer]);

  const loadDiscoverData = async () => {
    if (!currentServer) return;
    
    // Datos de ejemplo como fallback
    const fallbackAlbums = [
      { id: '1', name: 'Álbum de ejemplo', artist: 'Artista ejemplo', coverArt: null },
      { id: '2', name: 'Otro álbum', artist: 'Otro artista', coverArt: null },
    ];
    const fallbackPlaylists = [
      { id: '1', name: 'Playlist de ejemplo', songCount: 10 },
      { id: '2', name: 'Otra playlist', songCount: 5 },
    ];
    
    try {
      const [recent, frequent, newest, random, playlists] = await Promise.all([
        getRecentAlbums(currentServer, 12),
        getFrequentAlbums(currentServer, 12),
        getNewestAlbums(currentServer, 12),
        getRandomAlbums(currentServer, 12),
        getPlaylists(currentServer),
      ]);
      
      console.log('Discover data loaded:', { recent: recent?.length, frequent: frequent?.length, newest: newest?.length, random: random?.length, playlists: playlists?.length });
      console.log('Playlists sample:', playlists.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name })));
      
      const recentData = recent.length > 0 ? recent : fallbackAlbums;
      const frequentData = frequent.length > 0 ? frequent : fallbackAlbums;
      const newestData = newest.length > 0 ? newest : fallbackAlbums;
      const randomData = random.length > 0 ? random : fallbackAlbums;
      const playlistsData = playlists.length > 0 ? playlists : fallbackPlaylists;
      
      console.log('Final playlists data:', playlistsData.length, playlistsData.map((p: any) => ({ id: p.id, name: p.name })));
      
      setRecentAlbums(recentData);
      setFrequentAlbums(frequentData);
      setNewestAlbums(newestData);
      setRandomAlbums(randomData);
      setPlaylists(playlistsData);
      
      // Guardar en caché
      setDiscoverCache({
        recentAlbums: recentData,
        frequentAlbums: frequentData,
        newestAlbums: newestData,
        randomAlbums: randomData,
        playlists: playlistsData,
        lastUpdated: Date.now(),
        serverId: currentServer.id,
      });
      
    } catch (error) {
      console.error('Error loading discover data:', error);
      // En caso de error, usar datos de ejemplo
      setRecentAlbums(fallbackAlbums);
      setFrequentAlbums(fallbackAlbums);
      setNewestAlbums(fallbackAlbums);
      setRandomAlbums(fallbackAlbums);
      setPlaylists(fallbackPlaylists);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de acciones
  const handlePlayAlbum = async (album: any) => {
    try {
      // Obtener tracks del álbum
      const albumData = await getAlbum(currentServer!, album.id);
      const tracks = albumData.song || []; // getAlbum.view retorna 'song' no 'child'
      
      if (tracks.length > 0) {
        // Crear objetos de track con URLs de streaming
        const trackList = tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration * 1000, // Convertir a millisegundos
          url: streamUrl(currentServer!, track.id),
          isOffline: false,
          coverArt: track.coverArt ? getCoverArtUrl(currentServer!, track.coverArt) : undefined,
          albumId: album.id
        }));
        
        // Reproducir la lista completa, reemplazando la cola actual
        await audioPlayer.playTrackList(trackList);
      } else {
        console.log('No tracks found in album:', album.id);
        // Si no hay tracks, navegar a detalles del álbum
        navigation.navigate('AlbumDetail', { album });
      }
    } catch (error) {
      console.error('Error playing album:', error);
      // Fallback: navegar a detalles del álbum
      navigation.navigate('AlbumDetail', { album });
    }
  };
  const handleAddAlbumToQueue = async (album: any) => {
    console.log('🎵 handleAddAlbumToQueue called with album:', album.name);
    console.log('📝 Album object:', JSON.stringify(album, null, 2));
    try {
      // Obtener tracks del álbum usando getAlbum.view en lugar de getMusicDirectory
      console.log('🔍 Fetching album data for ID:', album.id);
      const data = await subsonicRequest(currentServer!, 'getAlbum.view', {
        id: album.id,
      });
      
      console.log('📦 Raw album data:', JSON.stringify(data, null, 2));
      
      const response = data['subsonic-response'] || data;
      const albumData = response.album;
      const tracks = albumData?.song || [];
      
      console.log('📀 Album tracks found:', tracks.length);
      
      if (tracks.length > 0) {
        // Crear objetos de track con URLs de streaming
        const trackList = tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration * 1000, // Convertir a millisegundos
          url: streamUrl(currentServer!, track.id),
          isOffline: false,
          coverArt: track.coverArt ? getCoverArtUrl(currentServer!, track.coverArt) : undefined,
          albumId: album.id
        }));
        
        // Agregar a la cola actual sin reemplazar
        const store = useAppStore.getState();
        trackList.forEach((track: any) => store.addToQueue(track));
        
        console.log(`Added ${trackList.length} tracks from album "${album.name}" to queue`);
      } else {
        console.log('⚠️ No tracks found in album');
      }
    } catch (error) {
      console.error('Error adding album to queue:', error);
    }
  };
  const handleAddAlbumToPlaylist = (playlistId: string, playlistName: string, album: any) => {
    console.log(`Adding album "${album.name}" to playlist "${playlistName}" (${playlistId})`);
    // TODO: Implementar la lógica para agregar álbum completo a playlist
  };

  // Lógica de acciones para playlists
  const handlePlayPlaylist = async (playlist: any) => {
    try {
      // Obtener tracks de la playlist
      const playlistData = await getPlaylistPaginated(currentServer!, playlist.id, 0, 200);
      const tracks = playlistData.entry || [];
      
      if (tracks.length > 0) {
        // Crear objetos de track con URLs de streaming
        const trackList = tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration * 1000, // Convertir a millisegundos
          url: streamUrl(currentServer!, track.id),
          isOffline: false,
          coverArt: track.coverArt ? getCoverArtUrl(currentServer!, track.coverArt) : undefined,
          albumId: track.albumId
        }));
        
        // Reproducir la lista completa, reemplazando la cola actual
        await audioPlayer.playTrackList(trackList);
      } else {
        // Si no hay tracks, navegar a detalles de la playlist
        navigation.navigate('PlaylistDetail', { playlist });
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      // Fallback: navegar a detalles de la playlist
      navigation.navigate('PlaylistDetail', { playlist });
    }
  };
  const handleAddPlaylistToQueue = async (playlist: any) => {
    console.log('🎵 handleAddPlaylistToQueue called with playlist:', playlist.name);
    try {
      if (!currentServer) return;
      
      console.log('Adding playlist to queue:', playlist.name);
      
      // Obtener tracks de la playlist usando getPlaylistPaginated
      const playlistData = await getPlaylistPaginated(currentServer, playlist.id, 0, 500);
      const tracks = playlistData.entry || [];
      
      if (tracks.length > 0) {
        // Crear objetos de track con URLs de streaming
        const trackList = tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration * 1000, // Convertir a millisegundos
          url: streamUrl(currentServer, track.id),
          isOffline: false,
          coverArt: track.coverArt ? getCoverArtUrl(currentServer, track.coverArt) : undefined,
          albumId: track.albumId
        }));
        
        // Agregar a la cola usando el store
        const store = useAppStore.getState();
        trackList.forEach((track: any) => store.addToQueue(track));
        
        console.log(`Added ${trackList.length} tracks from playlist "${playlist.name}" to queue`);
      }
    } catch (error) {
      console.error('Error adding playlist to queue:', error);
    }
  };
  const handleAddPlaylistToPlaylist = (playlist: any) => {
    // Esta acción no tiene mucho sentido para playlists
  };

  if (!currentServer) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Discover</Text>
            <ServerSelector onAddServer={() => navigation.navigate('Login')} />
          </View>
        </View>
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text style={{ color: '#fff', marginBottom: 16 }}>
            {servers.length === 0 ? 'Agrega un servidor para comenzar.' : 'Selecciona un servidor para comenzar.'}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#5752D7', padding: 12, borderRadius: 8 }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {servers.length === 0 ? 'Agregar Servidor' : 'Ir a Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <ServerSelector onAddServer={() => navigation.navigate('Login')} />
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              console.log('🔄 Manual refresh requested');
              loadDiscoverData();
            }}
          >
            <Feather name="refresh-cw" size={20} color="#5752D7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search', { scope: 'discover' })}
          >
            <Feather name="search" size={24} color="#5752D7" />
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color="#5752D7" size="large" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom + 80 }} // Tab height + safe area + PlayerBar height
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>Nuevos lanzamientos</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            {newestAlbums.map((item) => (
              <AlbumCard
                key={item.id}
                title={item.name}
                artist={item.artist}
                coverUrl={item.coverArt ? `${currentServer.url}/rest/getCoverArt.view?id=${item.coverArt}&u=${currentServer.username}&p=${currentServer.password}&v=1.16.1&c=neosynth` : undefined}
                onPlay={() => handlePlayAlbum(item)}
                onAddToQueue={() => handleAddAlbumToQueue(item)}
                onAddToPlaylist={(playlistId, playlistName) => handleAddAlbumToPlaylist(playlistId, playlistName, item)}
                onPress={() => navigation.navigate('AlbumDetail', { album: item })}
              />
            ))}
          </ScrollView>

          <Text style={styles.section}>Agregados recientemente</Text>
          {recentAlbums.length === 0 ? (
            <Text style={{ color: '#B3B3B3', fontSize: 14, marginTop: 8 }}>No hay álbumes recientes</Text>
          ) : (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {recentAlbums.map((item) => (
                <AlbumCard
                  key={item.id}
                  title={item.name}
                  artist={item.artist}
                  coverUrl={item.coverArt ? `${currentServer.url}/rest/getCoverArt.view?id=${item.coverArt}&u=${currentServer.username}&p=${currentServer.password}&v=1.16.1&c=neosynth` : undefined}
                  onPlay={() => handlePlayAlbum(item)}
                  onAddToQueue={() => handleAddAlbumToQueue(item)}
                  onAddToPlaylist={(playlistId, playlistName) => handleAddAlbumToPlaylist(playlistId, playlistName, item)}
                  onPress={() => navigation.navigate('AlbumDetail', { album: item })}
                />
              ))}
            </ScrollView>
          )}
          
          <Text style={styles.section}>Lo más escuchado</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            {frequentAlbums.map((item) => (
              <AlbumCard
                key={item.id}
                title={item.name}
                artist={item.artist}
                coverUrl={item.coverArt ? `${currentServer.url}/rest/getCoverArt.view?id=${item.coverArt}&u=${currentServer.username}&p=${currentServer.password}&v=1.16.1&c=neosynth` : undefined}
                onPlay={() => handlePlayAlbum(item)}
                onAddToQueue={() => handleAddAlbumToQueue(item)}
                onAddToPlaylist={(playlistId, playlistName) => handleAddAlbumToPlaylist(playlistId, playlistName, item)}
                onPress={() => navigation.navigate('AlbumDetail', { album: item })}
              />
            ))}
          </ScrollView>

          <Text style={styles.section}>Playlists</Text>
          {playlists.length === 0 ? (
            <Text style={{ color: '#B3B3B3', fontSize: 14, marginTop: 8 }}>No hay playlists disponibles</Text>
          ) : (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {playlists.map((item) => {
                console.log('Rendering playlist:', item.id, item.name);
                return (
                  <PlaylistCard
                    key={item.id}
                    name={item.name}
                    trackCount={item.songCount || 0}
                    onPlay={() => handlePlayPlaylist(item)}
                    onAddToQueue={() => handleAddPlaylistToQueue(item)}
                    onAddToPlaylist={() => handleAddPlaylistToPlaylist(item)}
                    onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
                  />
                );
              })}
            </ScrollView>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: { padding: 8 },
  section: { fontSize: 18, marginTop: 24, fontWeight: '600', color: '#5752D7' },
});
