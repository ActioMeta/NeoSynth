import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';

export default function SearchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const currentServer = useAppStore(s => s.currentServer);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentServer) return;

    setIsSearching(true);
    try {
      // TODO: Implementar búsqueda real con API de Subsonic
      console.log('Searching for:', query);
      
      // Simular resultados por ahora
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSearchResults([]);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canciones, álbumes, artistas..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
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
            onPress={() => handleSearch(searchQuery)}
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
        ) : searchResults.length === 0 && !isSearching ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>Sin resultados</Text>
            <Text style={styles.emptyStateText}>
              No se encontraron resultados para "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Resultados</Text>
            {/* TODO: Mostrar resultados de búsqueda aquí */}
            <Text style={styles.comingSoon}>Funcionalidad de búsqueda próximamente...</Text>
          </View>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
