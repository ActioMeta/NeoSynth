import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import ServerSelector from '../components/ServerSelector';
import ArtistCard from '../components/ArtistCard';
import GenreCard from '../components/GenreCard';
import YearCard from '../components/YearCard';
import PlaylistCard from '../components/PlaylistCard';
import { getArtists, getGenres, getYears, getPlaylists, getCoverArtUrl, getArtistImageUrl, streamUrl } from '../services/subsonic';
import { audioPlayer } from '../services/audioPlayer';

export default function LibraryScreen({ navigation }: any) {
  const currentServer = useAppStore(s => s.currentServer);
  const servers = useAppStore(s => s.servers);
  const { libraryCache, setLibraryCache } = useAppStore();
  const insets = useSafeAreaInsets();
  
  const [artists, setArtists] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setYears(libraryCache.years || []);
      setPlaylists(libraryCache.playlists);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading fresh library data');
    loadLibraryData();
  }, [currentServer]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLibraryData();
    } finally {
      setRefreshing(false);
    }
  };

  const loadLibraryData = async () => {
    if (!currentServer) return;
    
    setLoading(true);
    try {
      console.log('Loading library data from server:', currentServer.url);
      
      // Cargar datos de forma secuencial para mejor debugging
      console.log('Loading artists...');
      const artistsData = await getArtists(currentServer).then(data => {
        console.log('Artists raw data:', data);
        
        // Verificar estructura de respuesta de Subsonic
        let artistsList = [];
        if (data && data['subsonic-response'] && data['subsonic-response'].artists) {
          // La respuesta getArtists.view tiene estructura: subsonic-response.artists.index[].artist[]
          const indexes = data['subsonic-response'].artists.index || [];
          artistsList = indexes.flatMap((index: any) => index.artist || []);
        } else if (Array.isArray(data)) {
          // Fallback si la data viene directamente como array
          artistsList = data.flatMap((index: any) => index.artist || []);
        }
        
        const limited = artistsList.slice(0, 20);
        console.log('Artists processed:', limited.length);
        return limited;
      }).catch(error => {
        console.error('Error loading artists:', error);
        return [];
      });

      console.log('Loading genres...');
      const genresData = await getGenres(currentServer).then(data => {
        console.log('Genres raw data:', JSON.stringify(data, null, 2));
        
        // Verificar si la respuesta tiene la estructura correcta de Subsonic
        let genresList = [];
        if (data && data['subsonic-response'] && data['subsonic-response'].genres && data['subsonic-response'].genres.genre) {
          genresList = data['subsonic-response'].genres.genre;
        } else if (Array.isArray(data)) {
          genresList = data;
        } else if (data && Array.isArray(data.genre)) {
          genresList = data.genre;
        }
        
        // Normalizar los objetos de género para asegurar que tengan la propiedad 'name'
        const normalizedGenres = genresList.map(genre => {
          if (typeof genre === 'string') {
            return { name: genre };
          } else if (genre && genre.value) {
            return { name: genre.value };
          } else if (genre && genre.name) {
            return { name: genre.name };
          } else {
            return { name: genre?.toString() || 'Unknown' };
          }
        });
        
        // Si no hay géneros, usar algunos por defecto para testing
        if (!normalizedGenres || normalizedGenres.length === 0) {
          console.log('No genres found, using fallback');
          return [
            { name: 'Rock' },
            { name: 'Pop' },
            { name: 'Jazz' },
            { name: 'Electronic' },
            { name: 'Alternative' }
          ];
        }
        
        const limited = normalizedGenres.slice(0, 10);
        console.log('Genres processed:', limited.length, 'Sample:', limited.slice(0, 3));
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



      console.log('Loading years...');
      const yearsData = await getYears(currentServer).then(data => {
        console.log('Years raw data:', data);
        console.log('Years processed:', data.length);
        return data;
      }).catch(error => {
        console.error('Error loading years:', error);
        // Fallback con algunos años comunes
        return [
          { year: 2024, name: '2024' },
          { year: 2023, name: '2023' },
          { year: 2022, name: '2022' },
          { year: 2021, name: '2021' },
          { year: 2020, name: '2020' }
        ];
      });

      console.log('Loading playlists...');
      const playlistsData = await getPlaylists(currentServer).then(data => {
        console.log('Playlists raw data:', data);
        
        // Verificar estructura de respuesta de Subsonic
        let playlistsList = [];
        if (data && data['subsonic-response'] && data['subsonic-response'].playlists && data['subsonic-response'].playlists.playlist) {
          playlistsList = data['subsonic-response'].playlists.playlist;
        } else if (Array.isArray(data)) {
          playlistsList = data;
        }
        
        console.log('Playlists processed:', playlistsList.length);
        return playlistsList;
      }).catch(error => {
        console.error('Error loading playlists:', error);
        return [];
      });

      setArtists(artistsData);
      setGenres(genresData);
      setYears(yearsData);
      setPlaylists(playlistsData);
      
      // Guardar en caché
      setLibraryCache({
        artists: artistsData,
        genres: genresData,
        years: yearsData,
        playlists: playlistsData,
        lastUpdated: Date.now(),
        serverId: currentServer.id,
      });
      
      console.log('Final state - Artists:', artistsData.length, 'Genres:', genresData.length, 'Years:', yearsData.length, 'Playlists:', playlistsData.length);
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
          <Text style={styles.title}>Biblioteca</Text>
          <ServerSelector onAddServer={() => navigation.navigate('Login')} />
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="database" size={64} color="#666" />
          <Text style={styles.emptyTitle}>Sin servidor</Text>
          <Text style={styles.emptyText}>Conecta a un servidor para explorar tu biblioteca musical</Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.connectButtonText}>Conectar servidor</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Biblioteca</Text>
          <ServerSelector onAddServer={() => navigation.navigate('Login')} />
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('DownloadsMain')}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5752D7"
            colors={["#5752D7"]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5752D7" />
            <Text style={styles.loadingText}>Cargando biblioteca...</Text>
          </View>
        ) : (
          <>
            {/* Resumen de estadísticas */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{artists.length}</Text>
                <Text style={styles.statLabel}>Artistas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{playlists.length}</Text>
                <Text style={styles.statLabel}>Playlists</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{genres.length}</Text>
                <Text style={styles.statLabel}>Géneros</Text>
              </View>
            </View>

            {/* Artistas */}
            {artists.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Artistas</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Search', { scope: 'library', filter: 'artist' })}
                  >
                    <Text style={styles.seeAllText}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {artists.map((item) => (
                    <ArtistCard 
                      key={item.id} 
                      name={item.name}
                      imageUrl={item.artistImageUrl ? `${currentServer.url}/rest/getCoverArt.view?id=${item.artistImageUrl}&u=${currentServer.username}&p=${currentServer.password}&v=1.16.1&c=neosynth&size=200` : undefined}
                      onPress={() => navigation.navigate('ArtistDetail', { artist: item })} 
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Géneros */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Géneros</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Search', { scope: 'library', filter: 'genre' })}
              >
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {genres.map((item, index) => (
                <GenreCard
                  key={index}
                  name={item.name}
                  onPress={() => {
                    console.log('Genre pressed:', item.name);
                    navigation.navigate('Search', {
                      scope: 'library',
                      filter: 'genre',
                      filterValue: item.name,
                    });
                  }}
                />
              ))}
            </ScrollView>

            {/* Años */}
            {years.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Años</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Search', { scope: 'library', filter: 'year' })}
                  >
                    <Text style={styles.seeAllText}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {years.map((item, index) => (
                    <YearCard
                      key={index}
                      year={item.name}
                      onPress={() => {
                        console.log('Year pressed:', item.year);
                        navigation.navigate('Search', {
                          scope: 'library',
                          filter: 'year',
                          filterValue: item.year.toString(),
                        });
                      }}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Playlists */}
            {playlists.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Playlists</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Search', { scope: 'library', filter: 'playlist' })}
                  >
                    <Text style={styles.seeAllText}>Ver todas</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
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
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerLeft: {
    flex: 1,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 8 
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5752D7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  
  // Stats container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5752D7',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  // Section styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 14,
    color: '#5752D7',
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  
  // Legacy section style (for genres/playlists)
  section: { 
    fontSize: 18, 
    marginTop: 24, 
    fontWeight: '600', 
    color: '#5752D7',
    paddingHorizontal: 16,
  },
});
