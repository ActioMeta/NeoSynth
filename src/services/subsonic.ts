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
  console.log('🔗 Subsonic request URL:', baseUrl); // No loggeamos la URL completa por seguridad
  console.log('🔗 Endpoint:', endpoint);
  console.log('🔗 Base URL:', auth.url);
  
  let res;
  try {
    console.log('🔗 Iniciando fetch...');
    res = await fetch(url);
    console.log('🔗 Fetch completado, status:', res.status);
  } catch (e) {
    console.error('❌ Error de red al conectar con Subsonic:', auth.url, e);
    throw new Error('No se pudo conectar al servidor. Verifica que la URL sea correcta y que el servidor esté disponible.');
  }
  if (!res.ok) {
    const text = await res.text();
    console.error('❌ Respuesta HTTP no OK:', res.status, text);
    if (res.status === 401) {
      throw new Error('Error de autenticación: Usuario o contraseña incorrectos');
    } else if (res.status === 404) {
      throw new Error('Servidor no encontrado. Verifica que la URL sea correcta');
    } else if (res.status >= 500) {
      throw new Error('Error del servidor. Intenta más tarde');
    } else {
      throw new Error(`Error en la petición (HTTP ${res.status})`);
    }
  }
  
  let data;
  try {
    data = await res.json();
    console.log('🔗 Response data:', data);
  } catch (e) {
    console.error('❌ Error parsing JSON:', e);
    throw new Error('Error al procesar la respuesta del servidor');
  }
  
  // Verificar si hay errores en la respuesta de Subsonic
  if (data['subsonic-response'] && data['subsonic-response'].status !== 'ok') {
    const error = data['subsonic-response'].error;
    console.error('❌ Subsonic error:', error);
    if (error && error.code === 40) {
      throw new Error('Usuario o contraseña incorrectos');
    } else if (error && error.code === 50) {
      throw new Error('Usuario no autorizado para esta operación');
    } else {
      throw new Error(error ? error.message : 'Error desconocido del servidor');
    }
  }
  
  return data;
}

export async function pingServer(auth: SubsonicAuth) {
  console.log('🏓 Ping server:', auth.url, 'user:', auth.username);
  try {
    const result = await subsonicRequest(auth, 'ping.view');
    console.log('🏓 Ping result:', result);
    return result;
  } catch (error) {
    console.error('🏓 Ping failed:', error);
    throw error;
  }
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

export async function getYears(auth: SubsonicAuth) {
  // Subsonic no tiene un endpoint específico para años, 
  // obtenemos los álbumes más recientes y extraemos los años únicos
  const response = await subsonicRequest(auth, 'getAlbumList2.view', {
    type: 'newest',
    size: '500' // Obtener muchos albums para tener buena variedad de años
  });
  
  // Extraer años únicos de los álbumes
  const albums = response?.['subsonic-response']?.albumList2?.album || [];
  const years = new Set<number>();
  
  albums.forEach((album: any) => {
    if (album.year && album.year > 0) {
      years.add(album.year);
    }
  });
  
  // Convertir a array y ordenar descendente
  return Array.from(years)
    .sort((a, b) => b - a)
    .slice(0, 20) // Limitar a 20 años
    .map(year => ({ year, name: year.toString() }));
}

export async function getAlbumsByGenre(auth: SubsonicAuth, genre: string) {
  // Buscar álbumes por género usando getAlbumList2 con tipo 'alphabeticalByName'
  // y luego filtrar por género en el cliente (Subsonic no siempre soporta 'byGenre')
  try {
    const response = await subsonicRequest(auth, 'getAlbumList2.view', {
      type: 'alphabeticalByName',
      size: '500' // Obtener muchos álbumes para filtrar
    });
    
    const albums = response?.['subsonic-response']?.albumList2?.album || [];
    // Filtrar álbumes por género
    const filtered = albums.filter((album: any) => 
      album.genre && album.genre.toLowerCase().includes(genre.toLowerCase())
    );
    
    return {
      'subsonic-response': {
        albumList2: {
          album: filtered.slice(0, 100) // Limitar resultados
        }
      }
    };
  } catch (error) {
    console.error('Error getting albums by genre:', error);
    return { 'subsonic-response': { albumList2: { album: [] } } };
  }
}

export async function getAlbumsByYear(auth: SubsonicAuth, year: string) {
  // Buscar álbumes por año usando getAlbumList2 con tipo 'alphabeticalByName'
  // y luego filtrar por año en el cliente
  try {
    const response = await subsonicRequest(auth, 'getAlbumList2.view', {
      type: 'alphabeticalByName',
      size: '500' // Obtener muchos álbumes para filtrar
    });
    
    const albums = response?.['subsonic-response']?.albumList2?.album || [];
    // Filtrar álbumes por año
    const filtered = albums.filter((album: any) => 
      album.year && album.year.toString() === year
    );
    
    return {
      'subsonic-response': {
        albumList2: {
          album: filtered.slice(0, 100) // Limitar resultados
        }
      }
    };
  } catch (error) {
    console.error('Error getting albums by year:', error);
    return { 'subsonic-response': { albumList2: { album: [] } } };
  }
}

export async function getSongsByGenre(auth: SubsonicAuth, genre: string) {
  // Buscar canciones por género usando getRandomSongs con filtro de género
  try {
    const response = await subsonicRequest(auth, 'getRandomSongs.view', {
      size: '100'
    });
    
    const songs = response?.['subsonic-response']?.randomSongs?.song || [];
    // Filtrar canciones por género en el cliente
    const filtered = songs.filter((song: any) => 
      song.genre && song.genre.toLowerCase().includes(genre.toLowerCase())
    );
    
    return {
      'subsonic-response': {
        randomSongs: {
          song: filtered.slice(0, 50) // Limitar resultados
        }
      }
    };
  } catch (error) {
    console.error('Error getting songs by genre:', error);
    return { 'subsonic-response': { randomSongs: { song: [] } } };
  }
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

export function streamUrl(auth: SubsonicAuth, id: string) {
  // Devuelve la URL directa para streaming
  return `${auth.url}/rest/stream.view?u=${auth.username}&p=${auth.password}&v=1.16.1&c=neosynth&f=json&id=${id}`;
}

export function getCoverArtUrl(server: SubsonicAuth, id: string): string {
  const params = new URLSearchParams({
    u: server.username,
    p: server.password,
    v: '1.16.1',
    c: 'neosynth',
    f: 'json',
    id: id,
    size: '300'
  });
  
  return `${server.url}/rest/getCoverArt.view?${params.toString()}`;
}

export async function searchMusic(server: SubsonicAuth, query: string) {
  console.log('🔍 Making search request for:', query);
  
  try {
    const response = await subsonicRequest(server, 'search3.view', {
      query: query,
      songCount: '20',
      albumCount: '20', 
      artistCount: '20'
    });
    
    console.log('🔍 Raw search response:', JSON.stringify(response, null, 2));
    
    // Verificar la estructura de la respuesta
    if (response && response['subsonic-response']) {
      const subsonicResponse = response['subsonic-response'];
      console.log('🔍 Subsonic response status:', subsonicResponse.status);
      
      if (subsonicResponse.status === 'ok' && subsonicResponse.searchResult3) {
        return subsonicResponse.searchResult3;
      } else {
        console.log('🔍 Search failed or no results:', subsonicResponse);
        return { song: [], album: [], artist: [] };
      }
    } else {
      console.log('🔍 Invalid response structure:', response);
      return { song: [], album: [], artist: [] };
    }
  } catch (error) {
    console.error('🔍 Search error:', error);
    throw error;
  }
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
