import { database, withDatabaseLock } from './db';
import { Track } from '../store/appStore';

export async function addOfflineTrack(track: Track, filePath: string): Promise<void> {
  return withDatabaseLock(async () => {
    try {
      console.log(`💾 Adding offline track: ${track.title}`);
      console.log(`💾 File path to save: ${filePath}`);
      
      const db = await database;
      console.log(`💾 Database connection obtained for: ${track.title}`);
      
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
      console.log(`✅ Offline track added: ${track.title} at ${filePath}`);
    } catch (error) {
      console.error('❌ Error adding offline track:', error);
      throw error;
    }
  });
}

export async function getOfflineTracks(): Promise<Track[]> {
  return withDatabaseLock(async () => {
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
          url: row.filePath,
          localPath: row.filePath,
          duration: row.duration,
          coverArt: row.coverArt,
          isOffline: true
        };
      });
    } catch (error) {
      console.error('❌ Error getting offline tracks:', error);
      return [];
    }
  });
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  return withDatabaseLock(async () => {
    try {
      console.log(`🗑️ Removing offline track: ${trackId}`);
      const db = await database;
      
      const result = await db.runAsync('DELETE FROM offline_tracks WHERE id = ?', [trackId]);
      console.log(`✅ Removed track ${trackId}, affected rows: ${result.changes}`);
    } catch (error) {
      console.error(`❌ Error removing offline track ${trackId}:`, error);
      throw error;
    }
  });
}

export async function getOfflineTrackFilePath(trackId: string): Promise<string | null> {
  return withDatabaseLock(async () => {
    try {
      const db = await database;
      
      const result = await db.getFirstAsync(
        'SELECT filePath FROM offline_tracks WHERE id = ?',
        [trackId]
      ) as { filePath: string } | null;
      
      return result ? result.filePath : null;
    } catch (error) {
      console.error(`❌ Error getting offline track file path:`, error);
      return null;
    }
  });
}

export async function isTrackOffline(trackId: string): Promise<boolean> {
  return withDatabaseLock(async () => {
    try {
      const db = await database;
      
      const result = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM offline_tracks WHERE id = ?',
        [trackId]
      ) as { count: number } | null;
      
      return result ? result.count > 0 : false;
    } catch (error) {
      console.error(`❌ Error checking if track is offline:`, error);
      return false;
    }
  });
}

export async function cleanInvalidOfflineTracks(): Promise<void> {
  return withDatabaseLock(async () => {
    try {
      const db = await database;
      
      const deleteResult = await db.runAsync(
        'DELETE FROM offline_tracks WHERE filePath IS NULL OR filePath = ""'
      );
      
      console.log(`🧹 Cleaned ${deleteResult.changes} invalid offline tracks`);
    } catch (error) {
      console.error('❌ Error cleaning invalid offline tracks:', error);
      throw error;
    }
  });
}

export async function clearAllOfflineTracks(): Promise<void> {
  return withDatabaseLock(async () => {
    try {
      console.log('🗑️ Clearing all offline tracks from database...');
      const db = await database;
      
      const deleteResult = await db.runAsync('DELETE FROM offline_tracks');
      
      console.log(`🗑️ Cleared ${deleteResult.changes} offline tracks from database`);
    } catch (error) {
      console.error('❌ Error clearing all offline tracks:', error);
      throw error;
    }
  });
}

export async function updateTrackLocalPath(trackId: string, localPath: string): Promise<void> {
  return withDatabaseLock(async () => {
    try {
      const db = await database;
      
      await db.runAsync(
        'UPDATE offline_tracks SET filePath = ? WHERE id = ?',
        [localPath, trackId]
      );
    } catch (error) {
      console.error('❌ Error updating track local path:', error);
      throw error;
    }
  });
}

export async function getOfflineTracksByAlbum(albumId: string): Promise<Track[]> {
  return withDatabaseLock(async () => {
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
        url: row.filePath,
        localPath: row.filePath,
        duration: row.duration,
        coverArt: row.coverArt,
        isOffline: true
      }));
    } catch (error) {
      console.error('❌ Error getting offline tracks by album:', error);
      return [];
    }
  });
}

export async function getOfflineTracksByArtist(artist: string): Promise<Track[]> {
  return withDatabaseLock(async () => {
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
        url: row.filePath,
        localPath: row.filePath,
        duration: row.duration,
        coverArt: row.coverArt,
        isOffline: true
      }));
    } catch (error) {
      console.error('❌ Error getting offline tracks by artist:', error);
      return [];
    }
  });
}

export async function getOfflineArtists(): Promise<string[]> {
  return withDatabaseLock(async () => {
    try {
      const db = await database;
      
      const result = await db.getAllAsync(
        'SELECT DISTINCT artist FROM offline_tracks WHERE artist != "" ORDER BY artist'
      );
      
      return result.map((row: any) => row.artist);
    } catch (error) {
      console.error('❌ Error getting offline artists:', error);
      return [];
    }
  });
}

export async function getOfflineAlbums(): Promise<{albumId: string, album: string, artist: string}[]> {
  return withDatabaseLock(async () => {
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
      console.error('❌ Error getting offline albums:', error);
      return [];
    }
  });
}
