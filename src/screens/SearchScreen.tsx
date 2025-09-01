import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { subsonicRequest, streamUrl, getCoverArtUrl, getAlbum, searchMusic, getAlbumsByGenre, getAlbumsByYear, getSongsByGenre } from '../services/subsonic';
import AlbumCard from '../components/AlbumCard';
import TrackCard from '../components/TrackCard';
import { audioPlayer } from '../services/audioPlayer';

export default function SearchScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    songs: any[];
    albums: any[];
    artists: any[];
  }>({ songs: [], albums: [], artists: [] });
  const { currentServer, addToQueue, setPlayerState } = useAppStore();

  // Obtener parámetros de filtro de la navegación
  const { scope, filter, filterValue } = route.params || {};

  useEffect(() => {
    // Si viene con filtros desde LibraryScreen, realizar búsqueda automática
    if (filter && filterValue) {
      setSearchQuery(filterValue);
      if (filter === 'genre' || filter === 'year') {
        handleFilteredSearch(filter, filterValue);
      } else {
        handleSearch(filterValue);
      }
    } else if (filter && !filterValue) {
      // Si hay filtro pero no valor específico, mostrar todo el contenido de ese tipo
      handleShowAllByFilter(filter);
    } else if (scope === 'discover') {
      // Si viene desde Discover sin filtros, cargar contenido popular
      loadDiscoverContent();
    }
  }, [filter, filterValue, scope]);

  const handleShowAllByFilter = async (filterType: string) => {
    if (!currentServer) return;
    
    setIsSearching(true);
    try {
      console.log(`Loading all content for filter: ${filterType}`);
      
      let albums: any[] = [];
      let songs: any[] = [];
      let artists: any[] = [];
      
      switch (filterType) {
        case 'artist':
          // Cargar todos los artistas
          const artistsResponse = await subsonicRequest(currentServer, 'getArtists.view');
          if (artistsResponse?.['subsonic-response']?.artists?.index) {
            artists = artistsResponse['subsonic-response'].artists.index
              .flatMap((index: any) => index.artist || [])
              .slice(0, 100);
          }
          break;
          
        case 'genre':
          // Cargar álbumes de varios géneros
          const genresResponse = await subsonicRequest(currentServer, 'getAlbumList2.view', {
            type: 'alphabeticalByName',
            size: '100'
          });
          albums = genresResponse?.['subsonic-response']?.albumList2?.album || [];
          break;
          
        case 'year':
          // Cargar álbumes ordenados por año
          const yearsResponse = await subsonicRequest(currentServer, 'getAlbumList2.view', {
            type: 'newest',
            size: '100'
          });
          albums = yearsResponse?.['subsonic-response']?.albumList2?.album || [];
          break;
          
        case 'playlist':
          // Cargar todas las playlists del servidor
          const playlistsResponse = await subsonicRequest(currentServer, 'getPlaylists.view');
          let playlists: any[] = [];
          
          if (playlistsResponse?.['subsonic-response']?.playlists?.playlist) {
            playlists = playlistsResponse['subsonic-response'].playlists.playlist;
          }
          
          // Para mostrar las playlists, las convertimos en un formato que el SearchScreen pueda mostrar
          // Las playlists se mostrarán en la sección de "artists" con un ícono especial
          artists = playlists.map((playlist: any) => ({
            id: playlist.id,
            name: playlist.name,
            albumCount: playlist.songCount || 0,
            isPlaylist: true // Flag para identificar que es una playlist
          }));
          break;
      }
      
      console.log(`Found ${artists.length} artists, ${albums.length} albums, ${songs.length} songs for ${filterType}`);
      
      setSearchResults({
        artists,
        albums,
        songs
      });
      
    } catch (error) {
      console.error(`Error loading all content for ${filterType}:`, error);
      setSearchResults({ songs: [], albums: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const loadDiscoverContent = async () => {
    if (!currentServer) return;
    
    setIsSearching(true);
    try {
      console.log('Loading discover content for search...');
      
      // Cargar contenido popular/aleatorio para mostrar en la búsqueda general
      const [albumsResponse, songsResponse] = await Promise.all([
        subsonicRequest(currentServer, 'getAlbumList2.view', {
          type: 'alphabeticalByName',
          size: '50'
        }),
        subsonicRequest(currentServer, 'getRandomSongs.view', {
          size: '50'
        })
      ]);
      
      const albums = albumsResponse?.['subsonic-response']?.albumList2?.album || [];
      const songs = songsResponse?.['subsonic-response']?.randomSongs?.song || [];
      
      setSearchResults({
        albums,
        songs,
        artists: [] // Los artistas se cargarán cuando se haga una búsqueda específica
      });
      
    } catch (error) {
      console.error('Error loading discover content:', error);
      setSearchResults({ songs: [], albums: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilteredSearch = async (filterType: string, filterValue: string) => {
    if (!currentServer) return;
    
    setIsSearching(true);
    try {
      console.log(`Searching by ${filterType}:`, filterValue);
      
      let albums: any[] = [];
      let songs: any[] = [];
      const artists: any[] = []; // Los artistas no se filtran específicamente por género/año en Subsonic
      
      if (filterType === 'genre') {
        // Buscar álbumes y canciones por género
        const [albumsResponse, songsResponse] = await Promise.all([
          getAlbumsByGenre(currentServer, filterValue),
          getSongsByGenre(currentServer, filterValue)
        ]);
        
        albums = albumsResponse?.['subsonic-response']?.albumList2?.album || [];
        songs = songsResponse?.['subsonic-response']?.randomSongs?.song || [];
        
      } else if (filterType === 'year') {
        // Buscar álbumes por año
        const albumsResponse = await getAlbumsByYear(currentServer, filterValue);
        albums = albumsResponse?.['subsonic-response']?.albumList2?.album || [];
        
        // Para canciones por año, obtener canciones de los álbumes encontrados
        if (albums.length > 0) {
          const albumSongs = await Promise.all(
            albums.slice(0, 10).map(async (album: any) => {
              try {
                const albumDetail = await getAlbum(currentServer, album.id);
                return albumDetail?.['subsonic-response']?.album?.song || [];
              } catch (error) {
                console.error('Error loading album songs:', error);
                return [];
              }
            })
          );
          songs = albumSongs.flat().slice(0, 50); // Limitar a 50 canciones
        }
      }
      
      console.log(`Found ${albums.length} albums, ${songs.length} songs for ${filterType}: ${filterValue}`);
      
      setSearchResults({
        albums,
        songs,
        artists
      });
      
    } catch (error) {
      console.error(`Error searching by ${filterType}:`, error);
      setSearchResults({ songs: [], albums: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentServer) return;

    setIsSearching(true);
    try {
      console.log('🔍 Searching for:', query);
      
      const searchResult = await searchMusic(currentServer, query);
      
      console.log('🔍 Search result received:', searchResult);
      
      setSearchResults({
        songs: searchResult.song || [],
        albums: searchResult.album || [],
        artists: searchResult.artist || []
      });
      
      console.log('🔍 Final results set:', {
        songs: (searchResult.song || []).length,
        albums: (searchResult.album || []).length,
        artists: (searchResult.artist || []).length
      });
      
    } catch (error) {
      console.error('❌ Error searching:', error);
      setSearchResults({ songs: [], albums: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({ songs: [], albums: [], artists: [] });
  };

  const handlePlayPlaylist = async (playlist: any) => {
    try {
      // Obtener las canciones de la playlist
      const playlistData = await subsonicRequest(currentServer!, 'getPlaylist.view', {
        id: playlist.id
      });
      
      const tracks = playlistData?.['subsonic-response']?.playlist?.entry || [];
      
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
        console.log('No tracks found in playlist:', playlist.id);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  };

  const handlePlayAlbum = async (album: any) => {
    try {
      // Obtener tracks del álbum
      const albumData = await getAlbum(currentServer!, album.id);
      const tracks = albumData.song || [];
      
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
        navigation.navigate('AlbumDetail', { album });
      }
    } catch (error) {
      console.error('Error playing album:', error);
      navigation.navigate('AlbumDetail', { album });
    }
  };

  const handlePlaySong = async (song: any) => {
    try {
      const trackUrl = streamUrl(currentServer!, song.id);
      await audioPlayer.loadAndPlay(trackUrl);
      
      // Actualizar el estado del reproductor con la información de la canción
      setPlayerState({
        currentTrack: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration * 1000,
          url: trackUrl,
          isOffline: false,
          coverArt: song.coverArt ? getCoverArtUrl(currentServer!, song.coverArt) : undefined,
        }
      });
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {filter && filterValue ? 
            `${filter === 'genre' ? 'Género' : filter === 'year' ? 'Año' : 'Filtro'}: ${filterValue || ''}` 
            : filter ?
            `Todos los ${filter === 'artist' ? 'Artistas' : filter === 'genre' ? 'Géneros' : filter === 'year' ? 'Años' : filter === 'playlist' ? 'Contenido' : 'Elementos'}`
            : scope === 'discover' ? 'Explorar' : 'Buscar'
          }
        </Text>
        {((filter && filterValue) || filter) && (
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#1db954" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              filter && filterValue ? 
                `Buscar en ${filter === 'genre' ? 'género' : filter === 'year' ? 'año' : 'filtro'} "${filterValue}"...` :
                "Buscar canciones, álbumes, artistas..."
            }
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (filter && filterValue) {
                // Si hay filtro activo, buscar dentro del filtro
                handleFilteredSearch(filter, searchQuery);
              } else {
                // Búsqueda normal
                handleSearch(searchQuery);
              }
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              if (filter && filterValue) {
                handleFilteredSearch(filter, searchQuery);
              } else {
                handleSearch(searchQuery);
              }
            }}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Buscar</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {!currentServer ? (
          <View style={styles.emptyState}>
            <Feather name="server" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>Sin servidor</Text>
            <Text style={styles.emptyStateText}>
              Conecta a un servidor para buscar música
            </Text>
          </View>
        ) : searchQuery.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>Buscar música</Text>
            <Text style={styles.emptyStateText}>
              Escribe para buscar canciones, álbumes y artistas
            </Text>
          </View>
        ) : isSearching ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#5752D7" />
            <Text style={styles.emptyStateTitle}>Buscando...</Text>
            <Text style={styles.emptyStateText}>
              Buscando "{searchQuery}"
            </Text>
          </View>
        ) : (searchResults.songs.length === 0 && searchResults.albums.length === 0 && searchResults.artists.length === 0) && !isSearching ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>Sin resultados</Text>
            <Text style={styles.emptyStateText}>
              No se encontraron resultados para "{searchQuery}"
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsContainer}>
            {/* Filter Info */}
            {filter && filterValue && (
              <View style={styles.filterInfo}>
                <Text style={styles.filterInfoText}>
                  Contenido {filter === 'genre' ? 'del género' : filter === 'year' ? 'del año' : 'del filtro'}: 
                  <Text style={styles.filterValueText}> {filterValue || ''}</Text>
                </Text>
              </View>
            )}
            
            {/* Artists / Playlists */}
            {searchResults.artists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {searchResults.artists.some((item: any) => item.isPlaylist) ? 'Playlists' : 'Artistas'} ({searchResults.artists.length})
                </Text>
                {searchResults.artists.map((artist: any) => (
                  <TouchableOpacity
                    key={artist.id}
                    style={styles.artistItem}
                    onPress={() => {
                      if (artist.isPlaylist) {
                        handlePlayPlaylist(artist);
                      } else {
                        navigation.navigate('ArtistDetail', { artist });
                      }
                    }}
                  >
                    <View style={styles.artistIcon}>
                      <Feather 
                        name={artist.isPlaylist ? "list" : "user"} 
                        size={20} 
                        color="#666" 
                      />
                    </View>
                    <View style={styles.artistInfo}>
                      <Text style={styles.artistName}>{artist.name}</Text>
                      <Text style={styles.artistAlbums}>
                        {artist.isPlaylist ? 
                          `${artist.albumCount || 0} cancion${(artist.albumCount || 0) !== 1 ? 'es' : ''}` :
                          `${artist.albumCount || 0} álbum${(artist.albumCount || 0) !== 1 ? 'es' : ''}`
                        }
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Albums */}
            {searchResults.albums.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Álbumes ({searchResults.albums.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.horizontalList}>
                    {searchResults.albums.map((album: any) => (
                      <AlbumCard
                        key={album.id}
                        title={album.name}
                        artist={album.artist}
                        coverUrl={album.coverArt ? getCoverArtUrl(currentServer!, album.coverArt) : undefined}
                        onPress={() => navigation.navigate('AlbumDetail', { album })}
                        onPlay={() => handlePlayAlbum(album)}
                        onAddToQueue={async () => {
                          try {
                            const albumData = await getAlbum(currentServer!, album.id);
                            if (albumData.song) {
                              albumData.song.forEach((song: any) => {
                                const track = {
                                  id: song.id,
                                  title: song.title,
                                  artist: song.artist,
                                  album: song.album,
                                  duration: song.duration * 1000,
                                  url: streamUrl(currentServer!, song.id),
                                  isOffline: false,
                                  coverArt: song.coverArt ? getCoverArtUrl(currentServer!, song.coverArt) : undefined,
                                };
                                addToQueue(track);
                              });
                            }
                          } catch (error) {
                            console.error('Error adding album to queue:', error);
                          }
                        }}
                        onAddToPlaylist={() => {}}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Songs */}
            {searchResults.songs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Canciones ({searchResults.songs.length})</Text>
                {searchResults.songs.map((song: any) => (
                  <TrackCard
                    key={song.id}
                    title={song.title}
                    artist={song.artist}
                    album={song.album}
                    duration={song.duration}
                    track={song}
                    onPlay={() => handlePlaySong(song)}
                    onAddToQueue={() => {
                      const track = {
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        album: song.album,
                        duration: song.duration * 1000,
                        url: streamUrl(currentServer!, song.id),
                        isOffline: false,
                        coverArt: song.coverArt ? getCoverArtUrl(currentServer!, song.coverArt) : undefined,
                      };
                      addToQueue(track);
                    }}
                    onDownload={() => {}}
                    onAddToPlaylist={() => {}}
                    onPress={() => handlePlaySong(song)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#5752D7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  artistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  artistAlbums: {
    fontSize: 14,
    color: '#666',
  },
  filterInfo: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1db954',
  },
  filterInfoText: {
    fontSize: 14,
    color: '#ccc',
  },
  filterValueText: {
    fontWeight: 'bold',
    color: '#1db954',
  },
});
