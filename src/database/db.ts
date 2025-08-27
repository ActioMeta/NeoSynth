


import * as SQLite from 'expo-sqlite';

const DB_NAME = 'neosynth.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Obtiene la conexión a la base de datos de forma asíncrona
export const getDBConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
};

// Exportamos la instancia de la base de datos para uso directo
export const database = getDBConnection();

// Inicializa la base de datos y crea las tablas si no existen
export const initDatabase = async (): Promise<void> => {
  const db = await getDBConnection();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      url TEXT,
      username TEXT,
      password TEXT
    );`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      offline INTEGER
    );`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY NOT NULL,
      playlistId TEXT,
      title TEXT,
      artist TEXT,
      album TEXT,
      duration INTEGER,
      url TEXT,
      isOffline INTEGER,
      localPath TEXT,
      FOREIGN KEY (playlistId) REFERENCES playlists(id)
    );`);
    
    // Tabla para canciones offline
    await db.execAsync(`CREATE TABLE IF NOT EXISTS offline_tracks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      albumId TEXT,
      filePath TEXT,
      duration INTEGER,
      coverArt TEXT
    );`);
  });
};
