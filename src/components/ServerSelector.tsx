import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { removeServerFromDB } from '../database/servers';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

type ServerSelectorProps = {
  onAddServer?: () => void;
};

const ServerSelector: React.FC<ServerSelectorProps> = ({ onAddServer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { showAlert, alertProps } = useCustomAlert();
  const currentServer = useAppStore(s => s.currentServer);
  const servers = useAppStore(s => s.servers);
  const setCurrentServer = useAppStore(s => s.setCurrentServer);
  const loadServers = useAppStore(s => s.loadServers);

  const displayText = currentServer 
    ? currentServer.name 
    : servers.length > 0 
      ? 'Offline' 
      : 'No server';

  const handleServerSelect = (server: any) => {
    setCurrentServer(server);
    setIsOpen(false);
  };

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    showAlert(
      'Eliminar Servidor',
      `¿Estás seguro de que quieres eliminar "${serverName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeServerFromDB(serverId);
              
              // Si el servidor eliminado era el actual, desseleccionarlo
              if (currentServer?.id === serverId) {
                setCurrentServer(null);
              }
              
              // Recargar la lista de servidores
              await loadServers();
              
              console.log('✅ Servidor eliminado exitosamente');
            } catch (error) {
              console.error('❌ Error eliminando servidor:', error);
              showAlert('Error', 'No se pudo eliminar el servidor');
            }
          }
        }
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.selector} 
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.serverText} numberOfLines={1}>
          {displayText}
        </Text>
        <Feather name="chevron-down" size={16} color="#5752D7" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        >
          <View style={styles.dropdown}>
            {servers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No hay servidores</Text>
                {onAddServer && (
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      setIsOpen(false);
                      onAddServer();
                    }}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Agregar servidor</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <FlatList
                  data={servers}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.serverItemContainer}>
                      <TouchableOpacity
                        style={[
                          styles.serverItem,
                          currentServer?.id === item.id && styles.selectedItem
                        ]}
                        onPress={() => handleServerSelect(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serverName}>{item.name}</Text>
                          <Text style={styles.serverUrl}>{item.url}</Text>
                        </View>
                        {currentServer?.id === item.id && (
                          <Feather name="check" size={20} color="#5752D7" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteServer(item.id, item.name)}
                      >
                        <Feather name="trash-2" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {onAddServer && (
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      setIsOpen(false);
                      onAddServer();
                    }}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Agregar servidor</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <CustomAlert {...alertProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5752D7',
    minWidth: 120,
    maxWidth: 200,
  },
  serverText: {
    color: '#5752D7',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#181818',
    borderRadius: 12,
    maxHeight: 300,
    minWidth: 250,
    maxWidth: 300,
    margin: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flex: 1,
  },
  selectedItem: {
    backgroundColor: '#5752D720',
  },
  serverName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  serverUrl: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 14,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5752D7',
    padding: 12,
    margin: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  serverItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ServerSelector;
