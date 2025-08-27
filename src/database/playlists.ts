import { getDBConnection } from './db';
import type { Playlist, Track } from '../store/appStore';
import { v4 as uuidv4 } from 'uuid';

export const addPlaylistToDB = async (playlist: Omit<Playlist, 'id'>) => {
  const db = await getDBConnection();
  const id = uuidv4();
  
  try {
    // Crear playlist
    await db.execAsync(
      `INSERT INTO playlists (id, name, offline) VALUES ("${id}", "${playlist.name}", ${playlist.offline ? 1 : 0})`
    );
    
    // Agregar tracks
    for (const track of playlist.tracks) {
      await db.execAsync(
        `INSERT INTO tracks (id, playlistId, title, artist, album, duration, url, isOffline, localPath) VALUES ("${track.id}", "${id}", "${track.title}", "${track.artist}", "${track.album}", ${track.duration}, "${track.url}", ${track.isOffline ? 1 : 0}, ${track.localPath ? `"${track.localPath}"` : 'null'})`
      );
    }
    
    return id;
  } catch (error) {
    console.error('Error adding playlist to DB:', error);
    throw error;
  }
};

export const getPlaylistsFromDB = async (): Promise<Playlist[]> => {
  const db = await getDBConnection();
  
  try {
    // Obtener playlists
    const playlistsResult = await db.getAllAsync('SELECT * FROM playlists');
    const playlists: Playlist[] = playlistsResult.map((row: any) => ({ 
      ...row, 
      offline: Boolean(row.offline),
      tracks: [] 
    }));
    
    // Cargar tracks para cada playlist
    for (const playlist of playlists) {
      const tracksResult = await db.getAllAsync(`SELECT * FROM tracks WHERE playlistId = "${playlist.id}"`);
      playlist.tracks = tracksResult.map((row: any) => ({
        ...row,
        isOffline: Boolean(row.isOffline)
      }));
    }
    
    return playlists;
  } catch (error) {
    console.error('Error getting playlists from DB:', error);
    return [];
  }
};

export const removePlaylistFromDB = async (id: string) => {
  const db = await getDBConnection();
  
  try {
    await db.execAsync(`DELETE FROM tracks WHERE playlistId = "${id}"`);
    await db.execAsync(`DELETE FROM playlists WHERE id = "${id}"`);
  } catch (error) {
    console.error('Error removing playlist from DB:', error);
    throw error;
  }
};

export const addTrackToPlaylist = async (playlistId: string, track: Track) => {
  const db = await getDBConnection();
  
  try {
    await db.execAsync(
      `INSERT INTO tracks (id, playlistId, title, artist, album, duration, url, isOffline, localPath) VALUES ("${track.id}", "${playlistId}", "${track.title}", "${track.artist}", "${track.album}", ${track.duration}, "${track.url}", ${track.isOffline ? 1 : 0}, ${track.localPath ? `"${track.localPath}"` : 'null'})`
    );
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    throw error;
  }
};

export const addTracksToPlaylist = async (playlistId: string, tracks: Track[]) => {
  for (const track of tracks) {
    await addTrackToPlaylist(playlistId, track);
  }
};
