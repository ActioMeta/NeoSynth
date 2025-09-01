
import React, { useState } from 'react';
import { addServerToDB } from '../database/servers';
import { pingServer } from '../services/subsonic';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';


export default function LoginScreen({ onServerAdded, navigation }: { onServerAdded?: () => void; navigation?: any }) {
  const { showAlert, alertProps } = useCustomAlert();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name || !url || !username || !password) {
      showAlert('Error', 'Completa todos los campos');
      return;
    }
    // Validar formato de URL
    if (!/^https?:\/\//.test(url)) {
      showAlert('Error', 'La URL debe empezar con http:// o https://');
      return;
    }
    setLoading(true);
    try {
      // Probar conexión al servidor
      await pingServer({ url, username, password });
    } catch (e: any) {
      showAlert('Error de conexión', e?.message || String(e));
      setLoading(false);
      return;
    }
    try {
      await addServerToDB({ name, url, username, password });
      if (onServerAdded) {
        onServerAdded();
      } else if (navigation) {
        navigation.goBack();
      }
    } catch (e: any) {
      showAlert('Error', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Registrar servidor Subsonic/Navidrome</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#5752D7"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="URL"
        placeholderTextColor="#5752D7"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        placeholderTextColor="#5752D7"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        returnKeyType="next"
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Contraseña"
          placeholderTextColor="#5752D7"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((v) => !v)}
          accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#5752D7" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>
      <CustomAlert {...alertProps} />
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#5752D7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    color: '#fff',
    backgroundColor: '#181818',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5752D7',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
