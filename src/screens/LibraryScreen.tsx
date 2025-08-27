import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import ServerSelector from '../components/ServerSelector';
import ArtistCard from '../components/ArtistCard';
import GenreCard from '../components/GenreCard';
import PlaylistCard from '../components/PlaylistCard';
import { getArtists, getGenres, getPlaylists, getCoverArtUrl, getArtistImageUrl, streamUrl } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';

export default function LibraryScreen({ navigation }: any) {
  const currentServer = useAppStore(s => s.currentServer);
  const servers = useAppStore(s => s.servers);
  const { libraryCache, setLibraryCache } = useAppStore();
  const insets = useSafeAreaInsets();
  
  const [artists, setArtists] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tiempo de caché: 10 minutos para la biblioteca
  const CACHE_DURATION = 10 * 60 * 1000;

  useEffect(() => {
    if (!currentServer) return;
    
    // Verificar si tenemos caché válido
    const now = Date.now();
    const isCacheValid = libraryCache && 
                        libraryCache.serverId === currentServer.id &&
                        (now - libraryCache.lastUpdated) < CACHE_DURATION;
    
    if (isCacheValid) {
      console.log('📦 Using cached library data');
      setArtists(libraryCache.artists);
      setGenres(libraryCache.genres);
      setPlaylists(libraryCache.playlists);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading fresh library data');
    loadLibraryData();
  }, [currentServer]);

  const loadLibraryData = async () => {
    if (!currentServer) return;
    
    setLoading(true);
    try {
      console.log('Loading library data from server:', currentServer.url);
      
      // Cargar datos de forma secuencial para mejor debugging
      console.log('Loading artists...');
      const artistsData = await getArtists(currentServer).then(data => {
        console.log('Artists raw data:', data);
        // Aplanar los índices de artistas
        const flattened = data.flatMap((index: any) => index.artist || []).slice(0, 20);
        console.log('Artists processed:', flattened.length);
        return flattened;
      }).catch(error => {
        console.error('Error loading artists:', error);
        return [];
      });

      console.log('Loading genres...');
      const genresData = await getGenres(currentServer).then(data => {
        console.log('Genres raw data:', data);
        
        // Verificar si la respuesta tiene la estructura correcta de Subsonic
        let genresList = [];
        if (data && data['subsonic-response'] && data['subsonic-response'].genres && data['subsonic-response'].genres.genre) {
          genresList = data['subsonic-response'].genres.genre;
        } else if (Array.isArray(data)) {
          genresList = data;
        }
        
        // Si no hay géneros, usar algunos por defecto para testing
        if (!genresList || genresList.length === 0) {
          console.log('No genres found, using fallback');
          return [
            { name: 'Rock' },
            { name: 'Pop' },
            { name: 'Jazz' },
            { name: 'Electronic' },
            { name: 'Alternative' }
          ];
        }
        
        const limited = genresList.slice(0, 10);
        console.log('Genres processed:', limited.length);
        return limited;
      }).catch(error => {
        console.error('Error loading genres:', error);
        // Fallback si falla la API
        return [
          { name: 'Rock' },
          { name: 'Pop' },
          { name: 'Jazz' }
        ];
      });



      console.log('Loading playlists...');
      const playlistsData = await getPlaylists(currentServer).then(data => {
        console.log('Playlists raw data:', data);
        return data;
      }).catch(error => {
        console.error('Error loading playlists:', error);
        return [];
      });

      setArtists(artistsData);
      setGenres(genresData);
      setPlaylists(playlistsData);
      
      // Guardar en caché
      setLibraryCache({
        artists: artistsData,
        genres: genresData,
        playlists: playlistsData,
        lastUpdated: Date.now(),
        serverId: currentServer.id,
      });
      
      console.log('Final state - Artists:', artistsData.length, 'Genres:', genresData.length, 'Playlists:', playlistsData.length);
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlaylistToQueue = async (playlist: any) => {
    try {
      if (!currentServer) return;
      
      console.log('Adding playlist to queue:', playlist.name);
      
      // Obtener tracks de la playlist
      const playlistData = await getPlaylists(currentServer);
      const fullPlaylist = playlistData.find((p: any) => p.id === playlist.id);
      
      if (fullPlaylist && fullPlaylist.entry) {
        // Crear objetos de track con URLs de streaming
        const trackList = fullPlaylist.entry.map((track: any) => ({
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

  if (!currentServer) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Library</Text>
            <ServerSelector onAddServer={() => navigation.navigate('Login')} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Selecciona un servidor para ver tu biblioteca</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <ServerSelector onAddServer={() => navigation.navigate('Login')} />
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Offline')}
          >
            <Feather name="download" size={22} color="#5752D7" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Search', { scope: 'library' })}
          >
            <Feather name="search" size={22} color="#5752D7" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 60 + insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5752D7" />
            <Text style={styles.loadingText}>Cargando biblioteca...</Text>
          </View>
        ) : (
          <>
            {artists.length > 0 && (
              <>
                <Text style={styles.section}>Artistas</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                >
                  {artists.map((item) => {
                    console.log('Artist data:', item); // Debug logging
                    return (
                      <ArtistCard 
                        key={item.id} 
                        name={item.name}
                        imageUrl={item.artistImageUrl ? `${currentServer.url}/rest/getCoverArt.view?id=${item.artistImageUrl}&u=${currentServer.username}&p=${currentServer.password}&v=1.16.1&c=neosynth&size=200` : undefined}
                        onPress={() => navigation.navigate('ArtistDetail', { artist: item })} 
                      />
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Géneros - siempre mostrar */}
            <Text style={styles.section}>Géneros</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {(genres.length > 0 ? genres : [
                { name: 'Rock' },
                { name: 'Pop' },
                { name: 'Jazz' },
                { name: 'Electronic' },
                { name: 'Alternative' }
              ]).map((item, index) => (
                <GenreCard 
                  key={item.name || index} 
                  name={item.name} 
                  onPress={() => {
                    // Navegar a búsqueda filtrada por género
                    navigation.navigate('Search', {
                      scope: 'library',
                      filter: 'genre',
                      filterValue: item.name,
                      title: `Género: ${item.name}`
                    });
                  }} 
                />
              ))}
            </ScrollView>

            {playlists.length > 0 && (
              <>
                <Text style={styles.section}>Playlists</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                >
                  {playlists.map((item) => (
                    <PlaylistCard
                      key={item.id}
                      name={item.name}
                      trackCount={item.songCount || 0}
                      onPlay={() => navigation.navigate('PlaylistDetail', { playlist: item })}
                      onAddToQueue={() => handleAddPlaylistToQueue(item)}
                      onAddToPlaylist={() => {}}
                      onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
                    />
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </ScrollView>
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
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchButton: { padding: 8 },
  section: { fontSize: 18, marginTop: 24, fontWeight: '600', color: '#5752D7' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#B3B3B3',
    marginTop: 12,
  },
});
