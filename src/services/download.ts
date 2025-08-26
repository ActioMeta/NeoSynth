import * as FileSystem from 'expo-file-system';
import { Track } from '../store/appStore';

export async function downloadTrack(track: Track): Promise<string> {
  if (!track.url) throw new Error('No URL de track');
  const fileUri = `${FileSystem.documentDirectory}tracks/${track.id}.mp3`;
  // Crear carpeta si no existe
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}tracks/`, { intermediates: true });
  const downloadResumable = FileSystem.createDownloadResumable(
    track.url,
    fileUri
  );
  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) throw new Error('Error al descargar el archivo');
  return result.uri;
}
