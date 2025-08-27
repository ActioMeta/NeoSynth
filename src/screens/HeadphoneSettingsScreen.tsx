import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HeadphoneSettingsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración de Audífonos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Controles Remotos</Text>
        <Text style={styles.description}>
          Los controles remotos de audífonos Bluetooth están habilitados automáticamente.
        </Text>

        <View style={styles.controlsList}>
          <View style={styles.controlItem}>
            <Feather name="play" size={20} color="#5752D7" />
            <Text style={styles.controlText}>Reproducir/Pausar</Text>
          </View>
          
          <View style={styles.controlItem}>
            <Feather name="skip-forward" size={20} color="#5752D7" />
            <Text style={styles.controlText}>Siguiente canción</Text>
          </View>
          
          <View style={styles.controlItem}>
            <Feather name="skip-back" size={20} color="#5752D7" />
            <Text style={styles.controlText}>Canción anterior</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Nota: Los controles remotos funcionan mejor en builds de desarrollo. 
          En Expo Go, la funcionalidad puede ser limitada.
        </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#B3B3B3',
    lineHeight: 24,
    marginBottom: 24,
  },
  controlsList: {
    marginBottom: 24,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    marginBottom: 8,
  },
  controlText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});