


import * as SQLite from 'expo-sqlite';

const DB_NAME = 'neosynth.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Obtiene la conexión a la base de datos de forma asíncrona
export const getDBConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
};

// Inicializa la base de datos y crea las tablas si no existen
export const initDatabase = async (): Promise<void> => {
  const db = await getDBConnection();
  // withTransactionAsync no recibe argumentos, se usa el propio db
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
  });
};
