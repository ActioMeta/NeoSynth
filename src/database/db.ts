import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const DB_NAME = 'neosynth.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

// Semáforo global para controlar acceso a la BD
class DatabaseSemaphore {
  private isLocked = false;
  private queue: Array<{ resolve: () => void, reject: (error: any) => void }> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push({ resolve, reject });
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    } else {
      this.isLocked = false;
    }
  }
}

const dbSemaphore = new DatabaseSemaphore();

// Wrapper para ejecutar operaciones de BD con semáforo
export const withDatabaseLock = async <T>(operation: () => Promise<T>, retryCount = 0): Promise<T> => {
  await dbSemaphore.acquire();
  try {
    const result = await operation();
    return result;
  } catch (error) {
    // Si el error es de conexión cerrada y no hemos reintentado demasiadas veces
    if (error instanceof Error && 
        (error.message.includes('closed resource') || 
         error.message.includes('database is closed')) &&
        retryCount < 2) {
      dbInstance = null;
      isInitialized = false;
      
      // Liberar el semáforo antes de reintentar
      dbSemaphore.release();
      
      // Reintentar la operación con una nueva conexión
      return withDatabaseLock(operation, retryCount + 1);
    }
    
    throw error;
  } finally {
    dbSemaphore.release();
  }
};

// Obtiene la conexión a la base de datos
export const getDBConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  return withDatabaseLock(async () => {
    // Si ya tenemos una instancia válida, verificar que no esté cerrada
    if (dbInstance && isInitialized) {
      try {
        // Intentar una operación simple para verificar que la conexión esté activa
        await dbInstance.getFirstAsync('SELECT 1');
        console.log('✅ Existing database connection is valid');
        return dbInstance;
      } catch (error) {
        console.log('🔄 Database connection appears closed, recreating...', error);
        dbInstance = null;
        isInitialized = false;
      }
    }
    
    try {
      // Abrir una nueva conexión
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
      
      // Crear tablas
      await createTables();
      
      isInitialized = true;
      
      return dbInstance;
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      dbInstance = null;
      isInitialized = false;
      throw error;
    }
  });
};

// Crea las tablas de la base de datos
const createTables = async (): Promise<void> => {
  if (!dbInstance) throw new Error('Database instance not available');
  
  try {
    await dbInstance.execAsync(`CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      url TEXT,
      username TEXT,
      password TEXT
    );`);
    
    await dbInstance.execAsync(`CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      offline INTEGER
    );`);
    
    await dbInstance.execAsync(`CREATE TABLE IF NOT EXISTS tracks (
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
    
    await dbInstance.execAsync(`CREATE TABLE IF NOT EXISTS offline_tracks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      albumId TEXT,
      filePath TEXT,
      duration INTEGER,
      coverArt TEXT
    );`);
    
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Exportamos la instancia de la base de datos
export const database = getDBConnection();

// Función para resetear completamente la base de datos (solo para desarrollo)
export const resetDatabase = async (): Promise<void> => {
  return withDatabaseLock(async () => {
    try {
      console.log('🔄 Resetting entire database...');
      
      if (dbInstance) {
        try {
          await dbInstance.closeAsync();
          console.log('📚 Database connection closed');
        } catch (closeError) {
          console.log('⚠️ Error closing database (may already be closed):', closeError);
        }
      }
      
      // Intentar eliminar el archivo de BD
      try {
        const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
        const dbExists = await FileSystem.getInfoAsync(dbPath);
        
        if (dbExists.exists) {
          await FileSystem.deleteAsync(dbPath);
          console.log('🗑️ Database file deleted');
        } else {
          console.log('📭 Database file does not exist');
        }
      } catch (fileError) {
        console.log('⚠️ Could not delete database file:', fileError);
      }
      
      // Resetear variables
      dbInstance = null;
      isInitialized = false;
      
      // Esperar un momento para asegurar que el archivo se haya eliminado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Crear una nueva conexión inmediatamente para evitar errores posteriores
      console.log('🔄 Creating new database connection after reset...');
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
      await createTables();
      isInitialized = true;
      console.log('✅ New database connection established after reset');
      
      console.log('✅ Database reset complete');
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      // Aún así resetear las variables
      dbInstance = null;
      isInitialized = false;
      throw error;
    }
  });
};

// Función de inicialización pública
export const initDatabase = async (): Promise<void> => {
  await getDBConnection();
};

// Función para verificar que la base de datos esté disponible
export const verifyDatabaseConnection = async (): Promise<boolean> => {
  try {
    const db = await getDBConnection();
    await db.getFirstAsync('SELECT 1');
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection verification failed:', error);
    return false;
  }
};
