import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
  <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Configuración</Text>
      {/* TODO: opciones de servidores, cuentas, almacenamiento, etc. */}
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#fff', letterSpacing: 1 },
});
