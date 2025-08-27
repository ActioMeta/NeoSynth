import * as SQLite from 'expo-sqlite';
import { database } from './db';
import { Track } from '../store/appStore';

export async function addOfflineTrack(track: Track, filePath: string): Promise<void> {
  try {
    const db = await database;
    
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_tracks 
       (id, title, artist, album, albumId, filePath, duration, coverArt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        track.id,
        track.title,
        track.artist || '',
        track.album || '',
        track.albumId || '',
        filePath,
        track.duration || 0,
        track.coverArt || ''
      ]
    );
  } catch (error) {
    console.error('Error adding offline track:', error);
    throw error;
  }
}

export async function getOfflineTracks(): Promise<Track[]> {
  try {
    const db = await database;
    
    const result = await db.getAllAsync(
      'SELECT * FROM offline_tracks ORDER BY artist, album, title'
    );
    
    console.log('📱 Raw tracks from DB:', result.length);
    
    return result.map((row: any) => {
      console.log(`🔍 Processing track: ${row.title} - filePath: ${row.filePath}`);
      
      return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        album: row.album,
        albumId: row.albumId,
        filePath: row.filePath,
        url: row.filePath, // Para canciones offline, la URL es el path local
        localPath: row.filePath,
        duration: row.duration,
        coverArt: row.coverArt,
        isOffline: true
      };
    });
  } catch (error) {
    console.error('Error getting offline tracks:', error);
    return [];
  }
}

export async function updateTrackLocalPath(trackId: string, localPath: string): Promise<void> {
  try {
    const db = await database;
    
    await db.runAsync(
      'UPDATE offline_tracks SET filePath = ? WHERE id = ?',
      [localPath, trackId]
    );
  } catch (error) {
    console.error('Error updating track local path:', error);
    throw error;
  }
}

export async function getOfflineTracksByAlbum(albumId: string): Promise<Track[]> {
  try {
    const db = await database;
    
    const result = await db.getAllAsync(
      'SELECT * FROM offline_tracks WHERE albumId = ? ORDER BY title',
      [albumId]
    );
    
    return result.map((row: any) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      albumId: row.albumId,
      filePath: row.filePath,
      url: row.filePath, // Para canciones offline, la URL es el path local
      localPath: row.filePath,
      duration: row.duration,
      coverArt: row.coverArt,
      isOffline: true
    }));
  } catch (error) {
    console.error('Error getting offline tracks by album:', error);
    return [];
  }
}

export async function getOfflineTracksByArtist(artist: string): Promise<Track[]> {
  try {
    const db = await database;
    
    const result = await db.getAllAsync(
      'SELECT * FROM offline_tracks WHERE artist = ? ORDER BY album, title',
      [artist]
    );
    
    return result.map((row: any) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      albumId: row.albumId,
      filePath: row.filePath,
      url: row.filePath, // Para canciones offline, la URL es el path local
      localPath: row.filePath,
      duration: row.duration,
      coverArt: row.coverArt,
      isOffline: true
    }));
  } catch (error) {
    console.error('Error getting offline tracks by artist:', error);
    return [];
  }
}

export async function getOfflineArtists(): Promise<string[]> {
  try {
    const db = await database;
    
    const result = await db.getAllAsync(
      'SELECT DISTINCT artist FROM offline_tracks WHERE artist != "" ORDER BY artist'
    );
    
    return result.map((row: any) => row.artist);
  } catch (error) {
    console.error('Error getting offline artists:', error);
    return [];
  }
}

export async function getOfflineAlbums(): Promise<{albumId: string, album: string, artist: string}[]> {
  try {
    const db = await database;
    
    const result = await db.getAllAsync(
      'SELECT DISTINCT albumId, album, artist FROM offline_tracks WHERE album != "" ORDER BY artist, album'
    );
    
    return result.map((row: any) => ({
      albumId: row.albumId,
      album: row.album,
      artist: row.artist
    }));
  } catch (error) {
    console.error('Error getting offline albums:', error);
    return [];
  }
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  try {
    const db = await database;
    
    await db.runAsync('DELETE FROM offline_tracks WHERE id = ?', [trackId]);
  } catch (error) {
    console.error('Error removing offline track:', error);
    throw error;
  }
}

export async function isTrackOffline(trackId: string): Promise<boolean> {
  try {
    const db = await database;
    
    const result = await db.getFirstAsync(
      'SELECT id FROM offline_tracks WHERE id = ?',
      [trackId]
    );
    
    return result !== null;
  } catch (error) {
    console.error('Error checking if track is offline:', error);
    return false;
  }
}

export async function getOfflineTrackFilePath(trackId: string): Promise<string | null> {
  try {
    const db = await database;
    
    const result = await db.getFirstAsync(
      'SELECT filePath FROM offline_tracks WHERE id = ?',
      [trackId]
    ) as { filePath: string } | null;
    
    return result?.filePath || null;
  } catch (error) {
    console.error('Error getting offline track file path:', error);
    return null;
  }
}

export async function cleanInvalidOfflineTracks(): Promise<void> {
  try {
    const db = await database;
    
    // Eliminar tracks sin filePath o con filePath vacío
    const deleteResult = await db.runAsync(
      'DELETE FROM offline_tracks WHERE filePath IS NULL OR filePath = ""'
    );
    
    console.log(`🧹 Cleaned ${deleteResult.changes} invalid offline tracks`);
  } catch (error) {
    console.error('Error cleaning invalid offline tracks:', error);
  }
}
