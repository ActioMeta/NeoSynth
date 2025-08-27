import { subsonicRequest, SubsonicAuth } from './subsonic';

export async function getPlaylists(auth: SubsonicAuth) {
  try {
    console.log('Requesting playlists from:', auth.url);
    const data = await subsonicRequest(auth, 'getPlaylists.view', {});
    console.log('Playlists response:', data);
    const response = data['subsonic-response'] || data;
    const playlists = response['playlists']?.playlist || [];
    console.log('Playlists found:', playlists.length);
    return playlists;
  } catch (error) {
    console.error('Error getting playlists:', error);
    return [];
  }
}

export async function getRecentAlbums(auth: SubsonicAuth, count = 12) {
  try {
    console.log('Requesting recent albums from:', auth.url);
    const data = await subsonicRequest(auth, 'getAlbumList.view', {
      type: 'recent',
      size: count,
    });
    console.log('Recent albums response:', data);
    // Navidrome wraps response in 'subsonic-response'
    const response = data['subsonic-response'] || data;
    const albums = response['albumList']?.album || [];
    console.log('Recent albums found:', albums.length);
    return albums;
  } catch (error) {
    console.error('Error getting recent albums:', error);
    return [];
  }
}

export async function getFrequentAlbums(auth: SubsonicAuth, count = 12) {
  try {
    console.log('Requesting frequent albums from:', auth.url);
    const data = await subsonicRequest(auth, 'getAlbumList.view', {
      type: 'frequent',
      size: count,
    });
    console.log('Frequent albums response:', data);
    const response = data['subsonic-response'] || data;
    const albums = response['albumList']?.album || [];
    console.log('Frequent albums found:', albums.length);
    return albums;
  } catch (error) {
    console.error('Error getting frequent albums:', error);
    return [];
  }
}

export async function getNewestAlbums(auth: SubsonicAuth, count = 12) {
  try {
    console.log('Requesting newest albums from:', auth.url);
    const data = await subsonicRequest(auth, 'getAlbumList.view', {
      type: 'newest',
      size: count,
    });
    console.log('Newest albums response:', data);
    const response = data['subsonic-response'] || data;
    const albums = response['albumList']?.album || [];
    console.log('Newest albums found:', albums.length);
    return albums;
  } catch (error) {
    console.error('Error getting newest albums:', error);
    return [];
  }
}

export async function getRandomAlbums(auth: SubsonicAuth, count = 12) {
  try {
    console.log('Requesting random albums from:', auth.url);
    const data = await subsonicRequest(auth, 'getAlbumList.view', {
      type: 'random',
      size: count,
    });
    console.log('Random albums response:', data);
    const response = data['subsonic-response'] || data;
    const albums = response['albumList']?.album || [];
    console.log('Random albums found:', albums.length);
    return albums;
  } catch (error) {
    console.error('Error getting random albums:', error);
    return [];
  }
}

export async function getRecentSongs(auth: SubsonicAuth, count = 20) {
  try {
    console.log('Requesting recent songs from:', auth.url);
    const data = await subsonicRequest(auth, 'getRandomSongs.view', {
      size: count,
    });
    console.log('Recent songs response:', data);
    const response = data['subsonic-response'] || data;
    const songs = response['randomSongs']?.song || [];
    console.log('Recent songs found:', songs.length);
    console.log('Sample song data:', songs[0]);
    return songs;
  } catch (error) {
    console.error('Error getting recent songs:', error);
    return [];
  }
}
