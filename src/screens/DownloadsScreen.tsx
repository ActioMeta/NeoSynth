import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GROUP_OPTIONS = ['Artista', 'Álbum', 'Canciones', 'Playlists'];

export default function DownloadsScreen({ navigation }: any) {
  const [search, setSearch] = React.useState('');
  const [groupBy, setGroupBy] = React.useState('Canciones');
  // TODO: cargar canciones descargadas desde la base de datos

  return (
  <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Descargas</Text>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="search" size={24} color="#5752D7" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Buscar..."
        placeholderTextColor="#5752D7"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.groupSelector}>
        {GROUP_OPTIONS.map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.groupButton, groupBy === option && styles.groupButtonActive]}
            onPress={() => setGroupBy(option)}
          >
            <Text style={groupBy === option ? styles.groupTextActive : styles.groupText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* TODO: mostrar lista agrupada según groupBy y search */}
      <FlatList data={[]} renderItem={() => null} />
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#5752D7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    color: '#fff',
    backgroundColor: '#181818',
  },
  groupSelector: { flexDirection: 'row', marginBottom: 12 },
  groupButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5752D7',
  },
  groupButtonActive: {
    backgroundColor: '#5752D7',
    borderColor: '#fff',
  },
  groupText: { color: '#000' },
  groupTextActive: { color: '#fff', fontWeight: 'bold' },
});
