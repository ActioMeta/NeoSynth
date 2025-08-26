
import { v4 as uuidv4 } from 'uuid';
import { getDBConnection } from './db';
import type { Server } from '../store/appStore';

export const addServerToDB = async (server: Omit<Server, 'id'>) => {
  const db = await getDBConnection();
  const id = uuidv4();
  const stmt = await db.prepareAsync('INSERT INTO servers (id, name, url, username, password) VALUES (?, ?, ?, ?, ?)');
  try {
    await stmt.executeAsync([id, server.name, server.url, server.username, server.password]);
  } finally {
    await stmt.finalizeAsync();
  }
  return id;
};

export const getServersFromDB = async (): Promise<Server[]> => {
  const db = await getDBConnection();
  const stmt = await db.prepareAsync('SELECT * FROM servers');
  try {
    const result = await stmt.executeAsync();
    const rows: Server[] = [];
    for await (const row of result) {
      rows.push(row as Server);
    }
    return rows;
  } finally {
    await stmt.finalizeAsync();
  }
};

export const removeServerFromDB = async (id: string) => {
  const db = await getDBConnection();
  const stmt = await db.prepareAsync('DELETE FROM servers WHERE id = ?');
  try {
    await stmt.executeAsync([id]);
  } finally {
    await stmt.finalizeAsync();
  }
};
