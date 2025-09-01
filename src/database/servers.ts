
import { v4 as uuidv4 } from 'uuid';
import { database, withDatabaseLock } from './db';
import type { Server } from '../store/appStore';

export const addServerToDB = async (server: Omit<Server, 'id'>) => {
  return withDatabaseLock(async () => {
    const db = await database;
    
    // Verificar si ya existe un servidor con la misma URL
    const existingServer = await db.getFirstAsync(
      'SELECT id FROM servers WHERE url = ?',
      [server.url]
    ) as { id: string } | null;
    
    if (existingServer) {
      throw new Error('Ya existe un servidor con esta URL');
    }
    
    const id = uuidv4();
    await db.runAsync(
      'INSERT INTO servers (id, name, url, username, password) VALUES (?, ?, ?, ?, ?)',
      [id, server.name, server.url, server.username, server.password]
    );
    return id;
  });
};

export const getServersFromDB = async (): Promise<Server[]> => {
  return withDatabaseLock(async () => {
    const db = await database;
    const result = await db.getAllAsync('SELECT * FROM servers');
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      username: row.username,
      password: row.password,
    }));
  });
};

export const removeServerFromDB = async (id: string) => {
  return withDatabaseLock(async () => {
    const db = await database;
    await db.runAsync('DELETE FROM servers WHERE id = ?', [id]);
  });
};
