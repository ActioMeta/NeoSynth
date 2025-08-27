import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';

export default function QueueScreen() {
  const navigation = useNavigation();
  const { player } = useAppStore();
  const { queue, currentTrack, isPlaying } = player;
  const { setPlayerState, removeFromQueue, clearQueue, reorderQueue } = useAppStore();

  const handlePlayTrack = async (track: any, index: number) => {
    try {
      setPlayerState({ currentTrack: track, isPlaying: true });
      await audioPlayer.playTrack(track);
    } catch (error) {
      console.error('Error playing track from queue:', error);
    }
  };

  const handleRemoveFromQueue = (trackId: string) => {
    // Eliminación directa sin confirmación para mejor UX
    removeFromQueue(trackId);
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Limpiar cola',
      '¿Estás seguro de que quieres limpiar toda la cola?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => clearQueue(),
        },
      ]
    );
  };

  const handleDragEnd = ({ data }: { data: any[] }) => {
    reorderQueue(data);
  };

  const renderTrackItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    const isCurrentTrack = currentTrack?.id === item.id;

    return (
      <ScaleDecorator>
        <View
          style={[
            styles.trackItem, 
            isCurrentTrack && styles.currentTrackItem,
            isActive && styles.draggingItem
          ]}
        >
          <TouchableOpacity
            style={styles.trackInfo}
            onPress={() => handlePlayTrack(item, 0)}
            disabled={isActive}
          >
            {item.coverArt ? (
              <Image
                source={{ uri: item.coverArt }}
                style={styles.coverArt}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
                <Feather name="music" size={16} color="#666" />
              </View>
            )}
            
            <View style={styles.textInfo}>
              <Text style={[styles.title, isCurrentTrack && styles.currentTrackText]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            {isCurrentTrack && (
              <View style={styles.playingIndicator}>
                <Feather 
                  name={isPlaying ? "volume-2" : "pause"} 
                  size={16} 
                  color="#5752D7" 
                />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={drag}
              delayLongPress={150}
            >
              <Feather name="menu" size={18} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleRemoveFromQueue(item.id)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Cola de reproducción</Text>
        
        {queue.length > 0 && (
          <TouchableOpacity
            onPress={handleClearQueue}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {currentTrack && (
        <View style={styles.currentSection}>
          <Text style={styles.sectionTitle}>Reproduciendo ahora</Text>
          <View style={styles.currentTrackCard}>
            {currentTrack.coverArt ? (
              <Image
                source={{ uri: currentTrack.coverArt }}
                style={styles.currentCoverArt}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.currentCoverArt, styles.coverArtPlaceholder]}>
                <Feather name="music" size={32} color="#666" />
              </View>
            )}
            <View style={styles.currentTrackInfo}>
              <Text style={styles.currentTrackTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.currentTrackArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.queueSection}>
        <Text style={styles.sectionTitle}>
          Siguiente ({queue.length} canciones)
        </Text>
        
        {queue.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="music" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No hay canciones en la cola</Text>
            <Text style={styles.emptyStateSubtext}>
              Las canciones que agregues aparecerán aquí
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={queue}
            renderItem={renderTrackItem}
            keyExtractor={(item: any) => item.id}
            onDragEnd={handleDragEnd}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  currentSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  currentTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
  },
  currentCoverArt: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  currentTrackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currentTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  currentTrackArtist: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  queueSection: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 100,
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  draggingItem: {
    backgroundColor: '#333',
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    minHeight: 70,
  },
  currentTrackItem: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  coverArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  coverArtPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  currentTrackText: {
    color: '#5752D7',
  },
  artist: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playingIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
});