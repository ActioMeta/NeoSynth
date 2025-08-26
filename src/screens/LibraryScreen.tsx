import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import ServerSelector from '../components/ServerSelector';
import ArtistCard from '../components/ArtistCard';
import GenreCard from '../components/GenreCard';
import YearCard from '../components/YearCard';
import PlaylistCard from '../components/PlaylistCard';

export default function LibraryScreen({ navigation }: any) {
  const currentServer = useAppStore(s => s.currentServer);
  const servers = useAppStore(s => s.servers);
  // TODO: Reemplazar estos datos de ejemplo por datos reales de la API
  const artists = [
    { id: '1', name: 'Artista 1' },
    { id: '2', name: 'Artista 2' },
    { id: '3', name: 'Artista 3' },
  ];
  const genres = [
    { name: 'Rock' },
    { name: 'Pop' },
    { name: 'Jazz' },
  ];
  const years = [
    { year: '2025' },
    { year: '2024' },
    { year: '2023' },
  ];
  const playlists = [
    { id: '1', name: 'Favoritos', trackCount: 12 },
    { id: '2', name: 'Workout', trackCount: 8 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <ServerSelector onAddServer={() => navigation.navigate('Login')} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { scope: 'library' })}>
          <Ionicons name="search" size={24} color="#5752D7" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <Text style={styles.section}>Artistas</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
        >
          {artists.map((item) => (
            <ArtistCard 
              key={item.id} 
              name={item.name} 
              onPress={() => navigation.navigate('ArtistDetail', { artist: item })} 
            />
          ))}
        </ScrollView>
        <Text style={styles.section}>Géneros</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
        >
          {genres.map((item) => (
            <GenreCard key={item.name} name={item.name} onPress={() => {}} />
          ))}
        </ScrollView>
        <Text style={styles.section}>Años</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
        >
          {years.map((item) => (
            <YearCard key={item.year} year={item.year} onPress={() => {}} />
          ))}
        </ScrollView>
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
              trackCount={item.trackCount}
              onPlay={() => navigation.navigate('PlaylistDetail', { playlist: item })}
              onAddToQueue={() => {}}
              onDownload={() => {}}
              onAddToPlaylist={() => {}}
              onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
            />
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  section: { fontSize: 18, marginTop: 24, fontWeight: '600', color: '#5752D7' },
});
