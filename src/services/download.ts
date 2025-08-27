import * as FileSystem from 'expo-file-system';
import { Track, Server } from '../store/appStore';
import { streamUrl } from './subsonic';
import { addOfflineTrack, updateTrackLocalPath } from '../database/offlineTracks';

export interface DownloadProgress {
  trackId: string;
  progress: number; // 0-1
  status: 'downloading' | 'completed' | 'error' | 'paused';
  localPath?: string;
  error?: string;
}

export class DownloadService {
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();
  private static instance: DownloadService;

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  async initializeOfflineDirectory() {
    const tracksDir = `${FileSystem.documentDirectory}tracks/`;
    const albumsDir = `${FileSystem.documentDirectory}albums/`;
    const playlistsDir = `${FileSystem.documentDirectory}playlists/`;
    
    await FileSystem.makeDirectoryAsync(tracksDir, { intermediates: true });
    await FileSystem.makeDirectoryAsync(albumsDir, { intermediates: true });
    await FileSystem.makeDirectoryAsync(playlistsDir, { intermediates: true });
  }

  async downloadTrack(
    track: Track, 
    server: Server,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    if (!track.id) throw new Error('Track ID requerido');
    
    await this.initializeOfflineDirectory();
    
    // Verificar si ya está descargado
    const localPath = this.getLocalPath(track.id);
    const fileExists = await this.checkFileExists(localPath);
    
    if (fileExists) {
      console.log('Track ya descargado:', localPath);
      return localPath;
    }

    // Generar URL de streaming
    const trackUrl = await streamUrl(server, track.id);
    
    if (onProgress) {
      this.progressCallbacks.set(track.id, onProgress);
    }

    // Crear descarga resumable
    const downloadResumable = FileSystem.createDownloadResumable(
      trackUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        const progressData: DownloadProgress = {
          trackId: track.id,
          progress: isNaN(progress) ? 0 : progress,
          status: 'downloading',
          localPath,
        };
        
        const callback = this.progressCallbacks.get(track.id);
        if (callback) {
          callback(progressData);
        }
      }
    );

    this.activeDownloads.set(track.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      
      if (!result || !result.uri) {
        throw new Error('Error al descargar el archivo');
      }

      // Notificar progreso completado
      const callback = this.progressCallbacks.get(track.id);
      if (callback) {
        callback({
          trackId: track.id,
          progress: 1,
          status: 'completed',
          localPath: result.uri,
        });
      }

      this.activeDownloads.delete(track.id);
      this.progressCallbacks.delete(track.id);

      // Guardar en la base de datos
      const offlineTrack: Track = {
        ...track,
        localPath: result.uri,
        isOffline: true,
      };
      
      try {
        await addOfflineTrack(offlineTrack, result.uri);
      } catch (dbError) {
        console.warn('Error guardando track en BD:', dbError);
        // Continuar aunque falle la BD
      }

      console.log('Track descargado exitosamente:', result.uri);
      return result.uri;
      
    } catch (error) {
      console.error('Error descargando track:', error);
      
      const callback = this.progressCallbacks.get(track.id);
      if (callback) {
        callback({
          trackId: track.id,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }

      this.activeDownloads.delete(track.id);
      this.progressCallbacks.delete(track.id);
      
      throw error;
    }
  }

  async downloadAlbum(
    tracks: Track[], 
    server: Server, 
    albumId: string,
    onProgress?: (overall: number, current: DownloadProgress) => void
  ): Promise<Track[]> {
    const downloadedTracks: Track[] = [];
    let completedCount = 0;

    for (const track of tracks) {
      try {
        const localPath = await this.downloadTrack(track, server, (progress) => {
          if (onProgress) {
            onProgress(completedCount / tracks.length, progress);
          }
        });

        const offlineTrack: Track = {
          ...track,
          isOffline: true,
          localPath,
        };

        downloadedTracks.push(offlineTrack);
        completedCount++;

        if (onProgress) {
          onProgress(completedCount / tracks.length, {
            trackId: track.id,
            progress: 1,
            status: 'completed',
            localPath,
          });
        }
      } catch (error) {
        console.error(`Error descargando track ${track.title}:`, error);
        // Continuar con el siguiente track
      }
    }

    return downloadedTracks;
  }

  async downloadPlaylist(
    tracks: Track[], 
    server: Server, 
    playlistId: string,
    onProgress?: (overall: number, current: DownloadProgress) => void
  ): Promise<Track[]> {
    const downloadedTracks: Track[] = [];
    let completedCount = 0;

    for (const track of tracks) {
      try {
        const localPath = await this.downloadTrack(track, server, (progress) => {
          if (onProgress) {
            onProgress(completedCount / tracks.length, progress);
          }
        });

        const offlineTrack: Track = {
          ...track,
          isOffline: true,
          localPath,
        };

        downloadedTracks.push(offlineTrack);
        completedCount++;

        if (onProgress) {
          onProgress(completedCount / tracks.length, {
            trackId: track.id,
            progress: 1,
            status: 'completed',
            localPath,
          });
        }
      } catch (error) {
        console.error(`Error descargando track ${track.title}:`, error);
        // Continuar con el siguiente track
      }
    }

    return downloadedTracks;
  }

  async pauseDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.pauseAsync();
      
      const callback = this.progressCallbacks.get(trackId);
      if (callback) {
        callback({
          trackId,
          progress: 0,
          status: 'paused',
        });
      }
    }
  }

  async resumeDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.resumeAsync();
    }
  }

  async cancelDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.pauseAsync();
      this.activeDownloads.delete(trackId);
      this.progressCallbacks.delete(trackId);
      
      // Eliminar archivo parcial si existe
      const localPath = this.getLocalPath(trackId);
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch (error) {
        console.warn('Error eliminando archivo parcial:', error);
      }
    }
  }

  async deleteOfflineTrack(trackId: string): Promise<void> {
    const localPath = this.getLocalPath(trackId);
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      console.log('Track offline eliminado:', localPath);
    } catch (error) {
      console.error('Error eliminando track offline:', error);
      throw error;
    }
  }

  async getOfflineSize(): Promise<number> {
    try {
      const tracksDir = `${FileSystem.documentDirectory}tracks/`;
      const dirInfo = await FileSystem.getInfoAsync(tracksDir);
      return dirInfo.exists && dirInfo.isDirectory ? await this.calculateDirectorySize(tracksDir) : 0;
    } catch (error) {
      console.error('Error calculando tamaño offline:', error);
      return 0;
    }
  }

  async clearAllOfflineFiles(): Promise<void> {
    const tracksDir = `${FileSystem.documentDirectory}tracks/`;
    const albumsDir = `${FileSystem.documentDirectory}albums/`;
    const playlistsDir = `${FileSystem.documentDirectory}playlists/`;
    
    try {
      await FileSystem.deleteAsync(tracksDir, { idempotent: true });
      await FileSystem.deleteAsync(albumsDir, { idempotent: true });
      await FileSystem.deleteAsync(playlistsDir, { idempotent: true });
      
      // Recrear directorios
      await this.initializeOfflineDirectory();
      
      console.log('Todos los archivos offline eliminados');
    } catch (error) {
      console.error('Error eliminando archivos offline:', error);
      throw error;
    }
  }

  getLocalPath(trackId: string): string {
    return `${FileSystem.documentDirectory}tracks/${trackId}.mp3`;
  }

  async checkFileExists(path: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(path);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  async isTrackOffline(trackId: string): Promise<boolean> {
    const localPath = this.getLocalPath(trackId);
    return await this.checkFileExists(localPath);
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      const dirContents = await FileSystem.readDirectoryAsync(dirPath);
      let totalSize = 0;

      for (const item of dirContents) {
        const itemPath = `${dirPath}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.exists) {
          if (itemInfo.isDirectory) {
            totalSize += await this.calculateDirectorySize(`${itemPath}/`);
          } else {
            totalSize += itemInfo.size || 0;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculando tamaño de directorio:', error);
      return 0;
    }
  }

  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  isDownloading(trackId: string): boolean {
    return this.activeDownloads.has(trackId);
  }
}
