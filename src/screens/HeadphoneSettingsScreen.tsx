import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { audioPlayer } from '../services/audioPlayer';

export default function HeadphoneSettingsScreen({ navigation }: any) {
  const { audioSettings, updateAudioSettings } = useAppStore();
  
  const handleCrossfadeToggle = (enabled: boolean) => {
    audioPlayer.setCrossfadeEnabled(enabled);
  };

  const handleCrossfadeDurationChange = (duration: number) => {
    audioPlayer.setCrossfadeDuration(duration);
  };

  const handlePrebufferTimeChange = (time: number) => {
    audioPlayer.setPrebufferTime(time);
  };
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

        {/* Sección de Transiciones de Audio */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Transiciones de Audio</Text>
        <Text style={styles.description}>
          Configuraciones para mejorar la experiencia de reproducción continua.
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Crossfade</Text>
            <Text style={styles.settingDescription}>
              Transición suave entre canciones para preservar las transiciones de álbum
            </Text>
          </View>
          <Switch
            value={audioSettings.crossfadeEnabled}
            onValueChange={handleCrossfadeToggle}
            thumbColor={audioSettings.crossfadeEnabled ? '#5752D7' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#5752D7' }}
          />
        </View>

        {audioSettings.crossfadeEnabled && (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Duración del Crossfade</Text>
                <Text style={styles.settingDescription}>
                  Tiempo de transición entre canciones
                </Text>
              </View>
              <View style={styles.optionButtons}>
                {[1000, 2000, 3000].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.optionButton,
                      audioSettings.crossfadeDuration === duration && styles.optionButtonActive
                    ]}
                    onPress={() => handleCrossfadeDurationChange(duration)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      audioSettings.crossfadeDuration === duration && styles.optionButtonTextActive
                    ]}>
                      {duration / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Tiempo de Prebuffer</Text>
                <Text style={styles.settingDescription}>
                  Cuándo empezar a cargar la siguiente canción
                </Text>
              </View>
              <View style={styles.optionButtons}>
                {[5000, 10000, 15000].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.optionButton,
                      audioSettings.prebufferTime === time && styles.optionButtonActive
                    ]}
                    onPress={() => handlePrebufferTimeChange(time)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      audioSettings.prebufferTime === time && styles.optionButtonTextActive
                    ]}>
                      {time / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#B3B3B3',
    lineHeight: 18,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  optionButtonActive: {
    backgroundColor: '#5752D7',
    borderColor: '#5752D7',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
});