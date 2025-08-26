import { getDBConnection } from './db';
import type { Playlist, Track } from '../store/appStore';
import { v4 as uuidv4 } from 'uuid';

export const addPlaylistToDB = (playlist: Omit<Playlist, 'id'>) => {
  const db = getDBConnection();
  const id = uuidv4();
  db.transaction((tx: any) => {
    tx.executeSql(
      'INSERT INTO playlists (id, name, offline) VALUES (?, ?, ?)',
      [id, playlist.name, playlist.offline ? 1 : 0]
    );
    playlist.tracks.forEach(track => {
      tx.executeSql(
        'INSERT INTO tracks (id, playlistId, title, artist, album, duration, url, isOffline, localPath) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [track.id, id, track.title, track.artist, track.album, track.duration, track.url, track.isOffline ? 1 : 0, track.localPath || null]
      );
    });
  });
  return id;
};

export const getPlaylistsFromDB = (): Promise<Playlist[]> => {
  const db = getDBConnection();
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM playlists',
        [],
        (_: any, result: any) => {
          const playlists: Playlist[] = result.rows._array.map((row: any) => ({ ...row, tracks: [] }));
          // Cargar tracks para cada playlist
          const promises = playlists.map((playlist) =>
            new Promise<void>((res, rej) => {
              tx.executeSql(
                'SELECT * FROM tracks WHERE playlistId = ?',
                [playlist.id],
                (_: any, trackResult: any) => {
                  playlist.tracks = trackResult.rows._array;
                  res();
                },
                (_: any, error: any) => {
                  rej(error);
                  return false;
                }
              );
            })
          );
          Promise.all(promises)
            .then(() => resolve(playlists))
            .catch(reject);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const removePlaylistFromDB = (id: string) => {
  const db = getDBConnection();
  db.transaction((tx: any) => {
    tx.executeSql('DELETE FROM tracks WHERE playlistId = ?', [id]);
    tx.executeSql('DELETE FROM playlists WHERE id = ?', [id]);
  });
};
