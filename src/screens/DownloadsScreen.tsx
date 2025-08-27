import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DownloadService, DownloadProgress } from '../services/download';
import { Track, useAppStore } from '../store/appStore';
import { getOfflineTracks, cleanInvalidOfflineTracks } from '../database/offlineTracks';
import { audioPlayer } from '../services/audioPlayer';
import ItemMenu, { ItemMenuOption } from '../components/ItemMenu';
import { getCoverArtUrl } from '../services/subsonic';

interface OfflineTrack extends Track {
  fileSize?: number;
  downloadDate?: Date;
}

type FilterType = 'tracks' | 'albums' | 'artists' | 'playlists';

interface GroupedContent {
  tracks: OfflineTrack[];
  albums: Record<string, OfflineTrack[]>;
  artists: Record<string, OfflineTrack[]>;
  playlists: Record<string, OfflineTrack[]>;
}

interface FilterState {
  type: FilterType;
  selectedAlbum?: string;
  selectedArtist?: string;
}

export default function DownloadsScreen({ navigation }: any) {
  const { downloadsCache, setDownloadsCache, clearDownloadsCache } = useAppStore();
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({ type: 'tracks' });
  const [groupedContent, setGroupedContent] = useState<GroupedContent>({
    tracks: [],
    albums: {},
    artists: {},
    playlists: {},
  });
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [storageInfo, setStorageInfo] = useState({
    totalSize: 0,
    trackCount: 0,
  });
  const [activeDownloads, setActiveDownloads] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const insets = useSafeAreaInsets();

  const downloadService = DownloadService.getInstance();
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const currentServer = useAppStore(s => s.currentServer);
  const playlists = useAppStore(s => s.playlists);

  // Tiempo de caché: 2 minutos para descargas (pueden cambiar con frecuencia)
  const CACHE_DURATION = 2 * 60 * 1000;

  // Función para construir URL completa del coverArt
  const buildCoverArtUrl = (coverArtId: string) => {
    if (!currentServer || !coverArtId) return '';
    // Si ya es una URL completa, devolverla como está
    if (coverArtId.startsWith('http')) return coverArtId;
    // Si es solo un ID, construir la URL completa
    return getCoverArtUrl(currentServer, coverArtId);
  };

  useEffect(() => {
    // Verificar si tenemos caché válido
    const now = Date.now();
    const isCacheValid = downloadsCache && 
                        (now - downloadsCache.lastUpdated) < CACHE_DURATION &&
                        JSON.stringify(downloadsCache.filterState) === JSON.stringify(filterState);
    
    if (isCacheValid) {
      console.log('📦 Using cached downloads data');
      setOfflineTracks(downloadsCache.tracks);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading fresh downloads data');
    loadOfflineContent();
  }, [filterState]);

  useEffect(() => {
    // Debug: Imprimir información de cover art
    if (offlineTracks.length > 0) {
      console.log('=== DEBUG COVER ART ===');
      offlineTracks.slice(0, 3).forEach((track, index) => {
        console.log(`Track ${index + 1}:`, {
          title: track.title,
          artist: track.artist,
          coverArt: track.coverArt,
          hasCoverArt: !!track.coverArt,
          coverArtLength: track.coverArt?.length,
          coverArtPreview: track.coverArt?.substring(0, 100) + '...'
        });
        
        // Test si la URL es válida
        if (track.coverArt) {
          console.log(`🔗 Testing URL for "${track.title}":`, track.coverArt);
        }
      });
      console.log('======================');
    }
  }, [offlineTracks]);

  const loadOfflineContent = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando contenido offline...');
      
      // Asegurar que la BD tenga la estructura actualizada
      const { initDatabase } = await import('../database/db');
      await initDatabase();
      
      // Limpiar tracks inválidos primero
      await cleanInvalidOfflineTracks();
      
      // Cargar tracks offline directamente de la base de datos
      const allOfflineTracks = await getOfflineTracks();
      console.log('📱 Tracks encontrados en BD:', allOfflineTracks.length);
      
      // Verificar que los archivos realmente existen
      const existingTracks: OfflineTrack[] = [];
      
      for (const track of allOfflineTracks) {
        if (track.localPath) {
          const exists = await downloadService.checkFileExists(track.localPath);
          console.log(`📁 ${track.title} - Archivo existe: ${exists} - Path: ${track.localPath}`);
          if (exists) {
            existingTracks.push({
              ...track,
              downloadDate: new Date(), // En producción, esto vendría de la DB
            });
          } else {
            console.log(`🗑️ ${track.title} - Archivo no existe, eliminando de BD`);
            const { removeOfflineTrack } = await import('../database/offlineTracks');
            await removeOfflineTrack(track.id);
          }
        } else {
          console.log(`❌ ${track.title} - Sin localPath`);
        }
      }

      console.log('✅ Tracks offline válidos:', existingTracks.length);
      setOfflineTracks(existingTracks);
      
      // Agrupar contenido por tipo
      const grouped = groupContent(existingTracks);
      setGroupedContent(grouped);
      
      // Calcular información de almacenamiento
      const totalSize = await downloadService.getOfflineSize();
      setStorageInfo({
        totalSize,
        trackCount: existingTracks.length,
      });
      
      // Guardar en caché
      setDownloadsCache({
        tracks: existingTracks,
        lastUpdated: Date.now(),
        filterState: filterState,
      });
      
    } catch (error) {
      console.error('Error loading offline content:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupContent = (tracks: OfflineTrack[]): GroupedContent => {
    const albums: { [key: string]: OfflineTrack[] } = {};
    const artists: { [key: string]: OfflineTrack[] } = {};
    const serverPlaylists: { [key: string]: OfflineTrack[] } = {};
    
    // Incluir las playlists del servidor que tienen canciones descargadas
    playlists.forEach(playlist => {
      // Filtrar solo las canciones de esta playlist que están descargadas
      const playlistOfflineTracks = tracks.filter(offlineTrack => 
        // Verificar si el track offline pertenece a esta playlist
        playlist.tracks?.some(playlistTrack => playlistTrack.id === offlineTrack.id)
      );
      
      if (playlistOfflineTracks.length > 0) {
        serverPlaylists[playlist.name] = playlistOfflineTracks;
      }
    });
    
    tracks.forEach(track => {
      // Agrupar por álbum
      if (track.album) {
        if (!albums[track.album]) {
          albums[track.album] = [];
        }
        albums[track.album].push(track);
      }
      
      // Agrupar por artista
      if (track.artist) {
        if (!artists[track.artist]) {
          artists[track.artist] = [];
        }
        artists[track.artist].push(track);
      }
    });
    
    return {
      tracks,
      albums,
      artists,
      playlists: serverPlaylists,
    };
  };

  const updateActiveDownloads = () => {
    const downloads = downloadService.getActiveDownloads();
    setActiveDownloads(downloads);
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh requested - clearing downloads cache');
    setRefreshing(true);
    
    // Limpiar caché para forzar recarga
    clearDownloadsCache();
    
    await loadOfflineContent();
    updateActiveDownloads();
    setRefreshing(false);
  };

  const handlePlayTrack = async (track: OfflineTrack) => {
    try {
      if (!track.localPath) return;
      
      const trackData = {
        ...track,
        url: track.localPath, // Usar el archivo local
      };
      
      setPlayerState({ currentTrack: trackData, isPlaying: true });
      await audioPlayer.playTrack(trackData);
    } catch (error) {
      console.error('Error playing offline track:', error);
    }
  };

  const handleAddToQueue = (track: OfflineTrack) => {
    if (!track.localPath) return;
    
    const trackData = {
      ...track,
      url: track.localPath, // Usar el archivo local
    };
    
    addToQueue(trackData);
    // Removed popup notification
  };

  const handlePlayAlbum = async (albumTracks: OfflineTrack[]) => {
    try {
      if (albumTracks.length === 0) return;
      
      const trackList = albumTracks
        .filter(track => track.localPath)
        .map(track => ({
          ...track,
          url: track.localPath!, // Usar archivos locales
        }));
      
      if (trackList.length > 0) {
        await audioPlayer.playTrackList(trackList);
      }
    } catch (error) {
      console.error('Error playing album:', error);
    }
  };

  const handleShuffleAlbum = async (albumTracks: OfflineTrack[]) => {
    try {
      if (albumTracks.length === 0) return;
      
      const trackList = albumTracks
        .filter(track => track.localPath)
        .map(track => ({
          ...track,
          url: track.localPath!, // Usar archivos locales
        }))
        .sort(() => Math.random() - 0.5); // Shuffle
      
      if (trackList.length > 0) {
        await audioPlayer.playTrackList(trackList);
      }
    } catch (error) {
      console.error('Error shuffling album:', error);
    }
  };

  // Función para reproducir todas las canciones en aleatorio
  const handlePlayPlaylist = async (tracks: OfflineTrack[]) => {
    if (tracks.length === 0) return;
    
    try {
      console.log('🎵 Reproduciendo playlist con', tracks.length, 'canciones');
      
      // Agregar todas las canciones a la cola
      tracks.forEach(track => addToQueue(track));
      
      // Reproducir la primera canción
      await audioPlayer.loadAndPlay(tracks[0].localPath || tracks[0].url);
      
      setPlayerState({
        currentTrack: tracks[0],
        isPlaying: true,
        queue: tracks,
        position: 0,
        duration: tracks[0].duration || 0,
      });
    } catch (error) {
      console.error('Error reproduciendo playlist:', error);
    }
  };

  const getPlaylistMenuOptions = (playlist: string, tracks: OfflineTrack[]): ItemMenuOption[] => [
    {
      label: 'Reproducir playlist',
      icon: 'play',
      onPress: () => {
        handlePlayPlaylist(tracks);
      },
    },
    {
      label: 'Reproducir aleatorio',
      icon: 'shuffle',
      onPress: () => {
        const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);
        handlePlayPlaylist(shuffledTracks);
      },
    },
    {
      label: 'Agregar a cola',
      icon: 'plus',
      onPress: () => {
        tracks.forEach(track => addToQueue(track));
        console.log(`Playlist "${playlist}" agregada a la cola`);
      },
    },
  ];

  const handleShuffleAll = async () => {
    try {
      const trackList = offlineTracks
        .map(track => ({
          ...track,
          url: track.localPath!, // Usar archivos locales
        }))
        .sort(() => Math.random() - 0.5); // Shuffle
      
      if (trackList.length > 0) {
        await audioPlayer.playTrackList(trackList);
      }
    } catch (error) {
      console.error('Error shuffling all tracks:', error);
    }
  };

  const getTrackMenuOptions = (track: OfflineTrack): ItemMenuOption[] => [
    { 
      label: 'Reproducir', 
      icon: 'play', 
      onPress: () => {
        setMenuVisible(null);
        handlePlayTrack(track);
      }
    },
    { 
      label: 'Agregar a cola', 
      icon: 'plus', 
      onPress: () => {
        setMenuVisible(null);
        handleAddToQueue(track);
      }
    },
    { 
      label: 'Eliminar descarga', 
      icon: 'trash-2', 
      onPress: () => {
        setMenuVisible(null);
        handleDeleteTrack(track);
      }
    },
  ];

  // Función para cambiar filtro
  const setFilter = (type: FilterType, selectedAlbum?: string, selectedArtist?: string) => {
    console.log('🔄 Filter changed - clearing downloads cache');
    // Limpiar caché cuando se cambia el filtro
    clearDownloadsCache();
    setFilterState({ type, selectedAlbum, selectedArtist });
  };

  // Obtener contenido filtrado
  const getFilteredContent = () => {
    switch (filterState.type) {
      case 'tracks':
        if (filterState.selectedAlbum) {
          return groupedContent.albums[filterState.selectedAlbum] || [];
        }
        if (filterState.selectedArtist) {
          return groupedContent.artists[filterState.selectedArtist] || [];
        }
        return groupedContent.tracks;
      case 'albums':
        return Object.entries(groupedContent.albums);
      case 'artists':
        return Object.entries(groupedContent.artists);
      case 'playlists':
        return Object.entries(groupedContent.playlists);
      default:
        return groupedContent.tracks;
    }
  };

  // Obtener título de sección actual
  const getCurrentSectionTitle = () => {
    if (filterState.selectedAlbum) {
      return `Álbum: ${filterState.selectedAlbum}`;
    }
    if (filterState.selectedArtist) {
      return `Artista: ${filterState.selectedArtist}`;
    }
    switch (filterState.type) {
      case 'tracks':
        return `Todas las canciones (${groupedContent.tracks.length})`;
      case 'albums':
        return `Todos los álbumes (${Object.keys(groupedContent.albums).length})`;
      case 'artists':
        return `Todos los artistas (${Object.keys(groupedContent.artists).length})`;
      case 'playlists':
        return `Todas las playlists (${Object.keys(groupedContent.playlists).length})`;
      default:
        return `Canciones (${groupedContent.tracks.length})`;
    }
  };

  const getAlbumMenuOptions = (album: string, tracks: OfflineTrack[]): ItemMenuOption[] => [
    { 
      label: 'Reproducir álbum', 
      icon: 'play', 
      onPress: () => {
        setMenuVisible(null);
        handlePlayAlbum(tracks);
      }
    },
    { 
      label: 'Reproducir aleatorio', 
      icon: 'shuffle', 
      onPress: () => {
        setMenuVisible(null);
        handleShuffleAlbum(tracks);
      }
    },
    { 
      label: 'Agregar todo a cola', 
      icon: 'plus', 
      onPress: () => {
        setMenuVisible(null);
        tracks.forEach(track => handleAddToQueue(track));
      }
    },
  ];

  const handleDeleteTrack = (track: OfflineTrack) => {
    Alert.alert(
      'Eliminar Descarga',
      `¿Estás seguro de que deseas eliminar "${track.title}" del almacenamiento offline?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await downloadService.deleteOfflineTrack(track.id);
              await loadOfflineContent();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el archivo');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Eliminar Todo',
      '¿Estás seguro de que deseas eliminar todas las descargas offline?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await downloadService.clearAllOfflineFiles();
              await loadOfflineContent();
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar todos los archivos');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrackItem = ({ item }: { item: OfflineTrack }) => {
    const coverArtId = item.coverArt;
    const coverUri = buildCoverArtUrl(coverArtId || '');
    const hasImageError = imageErrors[item.id] || false;
    
    // Debug más específico
    console.log(`� RENDER DEBUG para "${item.title}":`, {
      hasCoverArt: !!coverUri,
      coverUri: coverUri,
      hasImageError: hasImageError,
      shouldShowImage: coverUri && !hasImageError,
      coverUriLength: coverUri?.length
    });
    
    return (
      <TouchableOpacity 
        style={styles.trackItem}
        onPress={() => handlePlayTrack(item)}
        activeOpacity={0.7}
      >
        {/* Cover Art */}
        <View style={styles.coverArtContainer}>
          <Image 
            source={{ 
              uri: coverUri || 'https://via.placeholder.com/50x50/333/666?text=?' 
            }} 
            style={styles.coverArt}
            onLoad={() => {
              console.log(`✅ Cover art LOADED successfully for: ${item.title}`);
            }}
            onLoadStart={() => {
              console.log(`🔄 Cover art LOADING started for: ${item.title} - URI: ${coverUri}`);
            }}
            onError={(error) => {
              console.log(`❌ Cover art ERROR for: ${item.title}`);
              console.log(`❌ Error details:`, error.nativeEvent.error);
              console.log(`❌ URI was:`, coverUri);
              setImageErrors(prev => ({ ...prev, [item.id]: true }));
            }}
          />
          {/* Fallback icon overlay */}
          {(!coverUri || hasImageError) && (
            <View style={[styles.coverArt, styles.coverArtPlaceholder, { position: 'absolute' }]}>
              <Feather name="music" size={20} color="#666" />
            </View>
          )}
        </View>
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist} • {item.album}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
        
        <ItemMenu
          visible={menuVisible === item.id}
          onClose={() => setMenuVisible(null)}
          options={getTrackMenuOptions(item)}
        />
      </TouchableOpacity>
    );
  };

  const renderAlbumItem = (album: string, tracks: OfflineTrack[]) => {
    const artist = tracks[0]?.artist || 'Artista desconocido';
    const trackCount = tracks.length;
    const coverArtId = tracks[0]?.coverArt;
    const coverArt = buildCoverArtUrl(coverArtId || '');
    const albumKey = `album-${album}`;
    const hasImageError = imageErrors[albumKey] || false;
    
    return (
      <TouchableOpacity 
        key={album}
        style={styles.albumItem}
        onPress={() => handlePlayAlbum(tracks)}
        activeOpacity={0.7}
      >
        {/* Cover Art */}
        <View style={styles.coverArtContainer}>
          {coverArt && !hasImageError ? (
            <Image 
              source={{ uri: coverArt }} 
              style={styles.coverArt}
              onError={(error) => {
                console.log('Error loading album cover art for:', album, error.nativeEvent.error);
                setImageErrors(prev => ({ ...prev, [albumKey]: true }));
              }}
            />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <Feather name="disc" size={24} color="#666" />
            </View>
          )}
        </View>
        
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {album}
          </Text>
          <Text style={styles.albumArtist} numberOfLines={1}>
            {artist} • {trackCount} canción{trackCount !== 1 ? 'es' : ''}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(`album-${album}`)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
        
        <ItemMenu
          visible={menuVisible === `album-${album}`}
          onClose={() => setMenuVisible(null)}
          options={getAlbumMenuOptions(album, tracks)}
        />
      </TouchableOpacity>
    );
  };

  const renderArtistItem = (artist: string, tracks: OfflineTrack[]) => {
    const albumCount = new Set(tracks.map(t => t.album)).size;
    const trackCount = tracks.length;
    const coverArt = tracks[0]?.coverArt;
    
    return (
      <TouchableOpacity 
        key={artist}
        style={styles.artistItem}
        onPress={() => handlePlayAlbum(tracks)}
        activeOpacity={0.7}
      >
        {/* Cover Art */}
        <View style={styles.coverArtContainer}>
          {coverArt ? (
            <Image source={{ uri: coverArt }} style={styles.coverArt} />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <Feather name="user" size={24} color="#666" />
            </View>
          )}
        </View>
        
        <View style={styles.artistInfo}>
          <Text style={styles.artistName} numberOfLines={1}>
            {artist}
          </Text>
          <Text style={styles.artistDetails} numberOfLines={1}>
            {albumCount} álbum{albumCount !== 1 ? 'es' : ''} • {trackCount} canción{trackCount !== 1 ? 'es' : ''}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(`artist-${artist}`)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
        
        <ItemMenu
          visible={menuVisible === `artist-${artist}`}
          onClose={() => setMenuVisible(null)}
          options={getAlbumMenuOptions(artist, tracks)}
        />
      </TouchableOpacity>
    );
  };

  const renderPlaylistItem = (playlist: string, tracks: OfflineTrack[]) => {
    const trackCount = tracks.length;
    const firstTrack = tracks[0];
    const coverArtId = firstTrack?.coverArt;
    const coverArt = buildCoverArtUrl(coverArtId || '');
    const playlistKey = `playlist-${playlist}`;
    const hasImageError = imageErrors[playlistKey] || false;
    
    return (
      <TouchableOpacity 
        key={playlist}
        style={styles.playlistItem}
        onPress={() => handlePlayPlaylist(tracks)}
        activeOpacity={0.7}
      >
        {/* Cover Art */}
        <View style={styles.coverArtContainer}>
          {coverArt && !hasImageError ? (
            <Image 
              source={{ uri: coverArt }} 
              style={styles.coverArt}
              onError={(error) => {
                console.log('Error loading playlist cover art for:', playlist, error.nativeEvent.error);
                setImageErrors(prev => ({ ...prev, [playlistKey]: true }));
              }}
            />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <Feather name="list" size={24} color="#666" />
            </View>
          )}
        </View>
        
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle} numberOfLines={1}>
            {playlist}
          </Text>
          <Text style={styles.playlistSubtitle} numberOfLines={1}>
            {trackCount} canción{trackCount !== 1 ? 'es' : ''}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(`playlist-${playlist}`)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-vertical" size={20} color="#B3B3B3" />
        </TouchableOpacity>
        
        <ItemMenu
          visible={menuVisible === `playlist-${playlist}`}
          onClose={() => setMenuVisible(null)}
          options={getPlaylistMenuOptions(playlist, tracks)}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#5752D7" />
        <Text style={styles.loadingText}>Cargando contenido offline...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Música Offline</Text>
        
        {offlineTracks.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Feather name="trash-2" size={20} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Controles principales: Filtros y reproducción */}
      <View style={styles.mainControls}>
        {/* Selector de filtros y botón de aleatorio */}
        <View style={styles.filterSelectorContainer}>
          <TouchableOpacity
            style={styles.filterSelector}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={styles.filterSelectorText}>
              {filterState.type === 'tracks' ? 'Canciones' : 
               filterState.type === 'albums' ? 'Álbumes' : 
               filterState.type === 'artists' ? 'Artistas' : 'Playlists'}
            </Text>
            <Feather name="chevron-down" size={16} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.shuffleAllButton}
            onPress={() => handleShuffleAll()}
          >
            <Feather name="shuffle" size={16} color="#FFF" />
            <Text style={styles.shuffleAllText}>Aleatorio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {offlineTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="download-cloud" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No hay música offline</Text>
          <Text style={styles.emptySubtitle}>
            Las canciones que descargues aparecerán aquí para reproducción sin conexión
          </Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => Alert.alert(
              'Cómo descargar música',
              'Para descargar música:\n\n1. Ve a cualquier álbum o canción\n2. Toca el ícono de descarga (⬇️)\n3. La música se guardará aquí para uso offline'
            )}
          >
            <Feather name="help-circle" size={20} color="#5752D7" />
            <Text style={styles.helpText}>¿Cómo descargar música?</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.trackList}
          contentContainerStyle={[styles.listContent, { paddingBottom: 60 + insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5752D7"
            />
          }
        >
          {filterState.type === 'tracks' && (
            <>
              <Text style={styles.sectionTitle}>Todas las canciones ({groupedContent.tracks.length})</Text>
              {groupedContent.tracks.map((track, index) => (
                <View key={track.id}>
                  {renderTrackItem({ item: track })}
                </View>
              ))}
            </>
          )}

          {filterState.type === 'albums' && (
            <>
              <Text style={styles.sectionTitle}>Todos los álbumes ({Object.keys(groupedContent.albums).length})</Text>
              {Object.entries(groupedContent.albums).map(([album, tracks]) => 
                renderAlbumItem(album, tracks)
              )}
            </>
          )}

          {filterState.type === 'artists' && (
            <>
              <Text style={styles.sectionTitle}>Todos los artistas ({Object.keys(groupedContent.artists).length})</Text>
              {Object.entries(groupedContent.artists).map(([artist, tracks]) => 
                renderArtistItem(artist, tracks)
              )}
            </>
          )}

          {filterState.type === 'playlists' && (
            <>
              <Text style={styles.sectionTitle}>Todas las playlists ({Object.keys(groupedContent.playlists).length})</Text>
              {Object.entries(groupedContent.playlists).map(([playlist, tracks]) => 
                renderPlaylistItem(playlist, tracks)
              )}
            </>
          )}
        </ScrollView>
      )}
      
      {/* Modal para seleccionar filtro */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mostrar</Text>
            
            <TouchableOpacity
              style={[
                styles.modalOption,
                filterState.type === 'tracks' && styles.modalOptionActive
              ]}
              onPress={() => {
                setFilter('tracks');
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                filterState.type === 'tracks' && styles.modalOptionTextActive
              ]}>
                Canciones ({groupedContent.tracks.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalOption,
                filterState.type === 'albums' && styles.modalOptionActive
              ]}
              onPress={() => {
                setFilter('albums');
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                filterState.type === 'albums' && styles.modalOptionTextActive
              ]}>
                Álbumes ({Object.keys(groupedContent.albums).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalOption,
                filterState.type === 'artists' && styles.modalOptionActive
              ]}
              onPress={() => {
                setFilter('artists');
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                filterState.type === 'artists' && styles.modalOptionTextActive
              ]}>
                Artistas ({Object.keys(groupedContent.artists).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalOption,
                filterState.type === 'playlists' && styles.modalOptionActive
              ]}
              onPress={() => {
                setFilter('playlists');
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                filterState.type === 'playlists' && styles.modalOptionTextActive
              ]}>
                Playlists ({Object.keys(groupedContent.playlists).length})
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
  storageInfo: {
    padding: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storageText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
  },
  downloadingText: {
    color: '#5752D7',
    marginLeft: 12,
    fontSize: 14,
  },
  trackList: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  trackStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadIndicator: {
    marginLeft: 8,
  },
  trackArtist: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 4,
  },
  trackDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 12,
    color: '#666',
  },
  downloadDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  helpText: {
    color: '#5752D7',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Nuevos estilos para la interfaz actualizada
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#5752D7',
  },
  filterButtonText: {
    color: '#B3B3B3',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  
  // Estilos para álbumes
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  albumInfo: {
    flex: 1,
    marginRight: 12,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  
  // Estilos para artistas
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  artistInfo: {
    flex: 1,
    marginRight: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  artistDetails: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  
  // Estilos para playlists
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  playlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  playlistSubtitle: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  
  // Estilos para secciones
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  seeMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  seeMoreText: {
    color: '#5752D7',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Estilos para cover art
  coverArtContainer: {
    marginRight: 12,
  },
  coverArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  coverArtPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilos para controles principales
  mainControls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  shuffleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5752D7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shuffleAllText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Nuevos estilos para el selector y modal
  filterSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
  },
  filterSelectorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    minWidth: 250,
    maxWidth: 300,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionActive: {
    backgroundColor: '#5752D7',
  },
  modalOptionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextActive: {
    fontWeight: '600',
  },
});
