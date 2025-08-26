import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AlbumCard from '../components/AlbumCard';
import TrackCard from '../components/TrackCard';
import PlaylistCard from '../components/PlaylistCard';
import ServerSelector from '../components/ServerSelector';
import { useAppStore } from '../store/appStore';
import { getRecentAlbums, getRecentSongs, getFrequentAlbums, getNewestAlbums, getRandomAlbums, getPlaylists } from '../services/discover';
import { streamUrl } from '../services/subsonic';

export default function DiscoverScreen({ navigation }: any) {
  const currentServer = useAppStore(s => s.currentServer);
  const servers = useAppStore(s => s.servers);
  const loadServers = useAppStore(s => s.loadServers);
  const addToQueue = useAppStore(s => s.addToQueue);
  const setPlayerState = useAppStore(s => s.setPlayerState);
  const [recentAlbums, setRecentAlbums] = useState<any[]>([]);
  const [frequentAlbums, setFrequentAlbums] = useState<any[]>([]);
  const [newestAlbums, setNewestAlbums] = useState<any[]>([]);
  const [randomAlbums, setRandomAlbums] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadServers();
  }, []);
  
  useEffect(() => {
    if (!currentServer) return;
    setLoading(true);
    
    // Datos de ejemplo como fallback
    const fallbackAlbums = [
      { id: '1', name: 'Álbum de ejemplo', artist: 'Artista ejemplo', coverArt: null },
      { id: '2', name: 'Otro álbum', artist: 'Otro artista', coverArt: null },
    ];
    const fallbackSongs = [
      { id: '1', title: 'Canción de ejemplo', artist: 'Artista ejemplo', album: 'Álbum ejemplo' },
      { id: '2', title: 'Otra canción', artist: 'Otro artista', album: 'Otro álbum' },
    ];
    const fallbackPlaylists = [
      { id: '1', name: 'Playlist de ejemplo', songCount: 10 },
      { id: '2', name: 'Otra playlist', songCount: 5 },
    ];
    
    Promise.all([
      getRecentAlbums(currentServer, 12),
      getFrequentAlbums(currentServer, 12),
      getNewestAlbums(currentServer, 12),
      getRandomAlbums(currentServer, 12),
      getRecentSongs(currentServer, 12),
      getPlaylists(currentServer),
    ]).then(([recent, frequent, newest, random, songs, playlists]) => {
      console.log('Discover data loaded:', { recent: recent?.length, frequent: frequent?.length, newest: newest?.length, random: random?.length, songs: songs?.length, playlists: playlists?.length });
      setRecentAlbums(recent.length > 0 ? recent : fallbackAlbums);
      setFrequentAlbums(frequent.length > 0 ? frequent : fallbackAlbums);
      setNewestAlbums(newest.length > 0 ? newest : fallbackAlbums);
      setRandomAlbums(random.length > 0 ? random : fallbackAlbums);
      setSongs(songs.length > 0 ? songs : fallbackSongs);
      setPlaylists(playlists.length > 0 ? playlists : fallbackPlaylists);
    }).catch((error) => {
      console.error('Error loading discover data:', error);
      // En caso de error, usar datos de ejemplo
      setRecentAlbums(fallbackAlbums);
      setFrequentAlbums(fallbackAlbums);
      setNewestAlbums(fallbackAlbums);
      setRandomAlbums(fallbackAlbums);
      setSongs(fallbackSongs);
      setPlaylists(fallbackPlaylists);
    }).finally(() => setLoading(false));
  }, [currentServer]);

  // Lógica de acciones
  const handlePlayAlbum = async (album: any) => {
    // Buscar primer track del álbum y reproducir
    // Aquí podrías navegar a la vista de álbum o reproducir el primer track
    navigation.navigate('AlbumDetail', { album });
  };
  const handleAddAlbumToQueue = (album: any) => {
    // Navegar a detalle o agregar tracks a la cola
    navigation.navigate('AlbumDetail', { album, action: 'queue' });
  };
  const handleDownloadAlbum = (album: any) => {
    navigation.navigate('AlbumDetail', { album, action: 'download' });
  };
  const handleAddAlbumToPlaylist = (album: any) => {
    navigation.navigate('AlbumDetail', { album, action: 'addToPlaylist' });
  };

  const handlePlaySong = async (song: any) => {
    if (!currentServer) return;
    const url = await streamUrl(currentServer, song.id);
    setPlayerState({ currentTrack: {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration || 0,
      url,
      isOffline: false,
    }, isPlaying: true });
  };
  const handleAddSongToQueue = async (song: any) => {
    if (!currentServer) return;
    const url = await streamUrl(currentServer, song.id);
    addToQueue({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration || 0,
      url,
      isOffline: false,
    });
  };
  const handleDownloadSong = (song: any) => {
    // Implementar descarga real
    // downloadTrack(song)
  };
  const handleAddSongToPlaylist = (song: any) => {
    // Implementar lógica para agregar a playlist
  };

  // Lógica de acciones para playlists
  const handlePlayPlaylist = (playlist: any) => {
    navigation.navigate('PlaylistDetail', { playlist });
  };
  const handleAddPlaylistToQueue = (playlist: any) => {
    navigation.navigate('PlaylistDetail', { playlist, action: 'queue' });
  };
  const handleDownloadPlaylist = (playlist: any) => {
    navigation.navigate('PlaylistDetail', { playlist, action: 'download' });
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
        <TouchableOpacity onPress={() => navigation.navigate('Search', { scope: 'discover' })}>
          <Ionicons name="search" size={24} color="#5752D7" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#5752D7" size="large" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView>
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
                onDownload={() => handleDownloadAlbum(item)}
                onAddToPlaylist={() => handleAddAlbumToPlaylist(item)}
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
                  onDownload={() => handleDownloadAlbum(item)}
                  onAddToPlaylist={() => handleAddAlbumToPlaylist(item)}
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
                onDownload={() => handleDownloadAlbum(item)}
                onAddToPlaylist={() => handleAddAlbumToPlaylist(item)}
                onPress={() => navigation.navigate('AlbumDetail', { album: item })}
              />
            ))}
          </ScrollView>

          <Text style={styles.section}>Mix de canciones</Text>
          {songs.length === 0 ? (
            <Text style={{ color: '#B3B3B3', fontSize: 14, marginTop: 8 }}>No hay canciones disponibles</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {songs.map((item) => (
                <TrackCard
                  key={item.id}
                  title={item.title}
                  artist={item.artist}
                  album={item.album}
                  onPlay={() => handlePlaySong(item)}
                  onAddToQueue={() => handleAddSongToQueue(item)}
                  onDownload={() => handleDownloadSong(item)}
                  onAddToPlaylist={() => handleAddSongToPlaylist(item)}
                  onPress={() => {}}
                />
              ))}
            </View>
          )}

          <Text style={styles.section}>Playlists</Text>
          {playlists.length === 0 ? (
            <Text style={{ color: '#B3B3B3', fontSize: 14, marginTop: 8 }}>No hay playlists disponibles</Text>
          ) : (
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
                  onPlay={() => handlePlayPlaylist(item)}
                  onAddToQueue={() => handleAddPlaylistToQueue(item)}
                  onDownload={() => handleDownloadPlaylist(item)}
                  onAddToPlaylist={() => handleAddPlaylistToPlaylist(item)}
                  onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
                />
              ))}
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
  section: { fontSize: 18, marginTop: 24, fontWeight: '600', color: '#5752D7' },
});
