import type { Server } from '../store/appStore';

export type SubsonicAuth = {
  url: string;
  username: string;
  password: string;
};

export async function subsonicRequest<T = any>(
  auth: SubsonicAuth,
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const baseUrl = `${auth.url}/rest/${endpoint}`;
  const query = new URLSearchParams({
    u: auth.username,
    p: auth.password, // enviar la contraseña tal cual, sin 'enc:' ni base64
    v: '1.16.1',
    c: 'neosynth',
    f: 'json',
    ...params,
  });
  const url = `${baseUrl}?${query.toString()}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error('Error de red al conectar con Subsonic:', url, e);
    throw new Error('No se pudo conectar al servidor: ' + url);
  }
  if (!res.ok) {
    const text = await res.text();
    console.error('Respuesta HTTP no OK:', res.status, url, text);
    throw new Error(`Error en la petición Subsonic (HTTP ${res.status}): ${url}\n${text}`);
  }
  const data = await res.json();
  return data;
}

export async function pingServer(auth: SubsonicAuth) {
  return subsonicRequest(auth, 'ping.view');
}

export async function getPlaylists(auth: SubsonicAuth) {
  return subsonicRequest(auth, 'getPlaylists.view');
}

export async function getPlaylist(auth: SubsonicAuth, playlistId: string) {
  return subsonicRequest(auth, 'getPlaylist.view', { id: playlistId });
}

export async function getPlaylistPaginated(auth: SubsonicAuth, playlistId: string, offset = 0, limit = 50) {
  return subsonicRequest(auth, 'getPlaylist.view', { 
    id: playlistId,
    offset: offset.toString(),
    size: limit.toString()
  });
}

export async function getArtists(auth: SubsonicAuth) {
  return subsonicRequest(auth, 'getArtists.view');
}

export async function getGenres(auth: SubsonicAuth) {
  return subsonicRequest(auth, 'getGenres.view');
}

export async function getAlbum(auth: SubsonicAuth, albumId: string) {
  return subsonicRequest(auth, 'getAlbum.view', { id: albumId });
}

export async function getAlbumPaginated(auth: SubsonicAuth, albumId: string, offset = 0, limit = 50) {
  return subsonicRequest(auth, 'getAlbum.view', { 
    id: albumId,
    offset: offset.toString(),
    size: limit.toString()
  });
}

export async function getMusicDirectory(auth: SubsonicAuth, id: string) {
  return subsonicRequest(auth, 'getMusicDirectory.view', { id });
}

export async function streamUrl(auth: SubsonicAuth, id: string) {
  // Devuelve la URL directa para streaming
  return `${auth.url}/rest/stream.view?u=${auth.username}&p=${auth.password}&v=1.16.1&c=neosynth&f=json&id=${id}`;
}

export function getCoverArtUrl(auth: SubsonicAuth, coverArtId: string): string {
  const params = new URLSearchParams({
    u: auth.username,
    p: auth.password,
    v: '1.16.1',
    c: 'neosynth',
    f: 'json',
    id: coverArtId,
    size: '300'
  });
  
  return `${auth.url}/rest/getCoverArt?${params.toString()}`;
}

export function getArtistImageUrl(auth: SubsonicAuth, artistId: string): string {
  const params = new URLSearchParams({
    u: auth.username,
    p: auth.password,
    v: '1.16.1',
    c: 'neosynth',
    f: 'json',
    id: artistId,
    size: '300'
  });
  
  return `${auth.url}/rest/getArtistInfo?${params.toString()}`;
}
