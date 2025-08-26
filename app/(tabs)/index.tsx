
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import MainTabs from '../../src/components/MainTabs';
import { getServersFromDB } from '../../src/database/servers';
import { initDatabase } from '../../src/database/db';
import LoginScreen from '../../src/screens/LoginScreen';



export default function TabOneScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [hasServer, setHasServer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch (e: any) {
        setError('Error al inicializar la base de datos: ' + (e?.message || e));
        setLoading(false);
        return;
      }
      try {
        const servers = await (await import('../../src/database/servers')).getServersFromDB();
        setHasServer(servers.length > 0);
        setLoading(false);
      } catch (e: any) {
        console.error('DB ERROR:', e);
        setError('Error al consultar la base de datos: ' + (e?.message || e));
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Cargando...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }
  if (!hasServer) {
    return <LoginScreen onServerAdded={async () => {
      setLoading(true);
      try {
        const servers = await (await import('../../src/database/servers')).getServersFromDB();
        setHasServer(servers.length > 0);
        setLoading(false);
      } catch (e: any) {
        console.error('DB ERROR:', e);
        setError('Error al consultar la base de datos: ' + (e?.message || e));
        setLoading(false);
      }
    }} />;
  }
  return <MainTabs />;
}
