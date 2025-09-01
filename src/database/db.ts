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
      console.log(`🔒 Semaphore acquire request - locked: ${this.isLocked}, queue length: ${this.queue.length}`);
      if (!this.isLocked) {
        this.isLocked = true;
        console.log(`✅ Semaphore acquired immediately`);
        resolve();
      } else {
        console.log(`⏳ Semaphore busy, adding to queue`);
        this.queue.push({ resolve, reject });
      }
    });
  }

  release(): void {
    console.log(`🔓 Semaphore release - queue length: ${this.queue.length}`);
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        console.log(`➡️ Semaphore passing to next in queue`);
        next.resolve();
      }
    } else {
      console.log(`🔓 Semaphore fully released`);
      this.isLocked = false;
    }
  }
}

const dbSemaphore = new DatabaseSemaphore();

// Wrapper para ejecutar operaciones de BD con semáforo
export const withDatabaseLock = async <T>(operation: () => Promise<T>, retryCount = 0): Promise<T> => {
  console.log(`🔄 withDatabaseLock: Starting operation (attempt ${retryCount + 1})`);
  await dbSemaphore.acquire();
  try {
    console.log(`🔄 withDatabaseLock: Executing operation`);
    const result = await operation();
    console.log(`✅ withDatabaseLock: Operation completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ withDatabaseLock: Operation failed:`, error);
    
    // Si el error es de conexión cerrada y no hemos reintentado demasiadas veces
    if (error instanceof Error && 
        (error.message.includes('closed resource') || 
         error.message.includes('database is closed')) &&
        retryCount < 2) {
      console.log('🔄 Detected closed database, resetting instance and retrying...');
      dbInstance = null;
      isInitialized = false;
      
      // Liberar el semáforo antes de reintentar
      dbSemaphore.release();
      
      // Reintentar la operación con una nueva conexión
      console.log(`🔄 Retrying operation (attempt ${retryCount + 2})`);
      return withDatabaseLock(operation, retryCount + 1);
    }
    
    throw error;
  } finally {
    console.log(`🔄 withDatabaseLock: Releasing semaphore`);
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

    console.log('🔧 Initializing database...');
    
    try {
      // Abrir una nueva conexión
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
      console.log('📚 Database opened successfully');
      
      // Crear tablas
      await createTables();
      
      isInitialized = true;
      console.log('✅ Database initialization complete');
      
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
