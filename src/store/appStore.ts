import { create } from 'zustand';
import { getServersFromDB } from '../database/servers';

export type Server = {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
};

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  offline: boolean;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  isOffline: boolean;
  localPath?: string;
  coverArt?: string;
  albumId?: string;
};

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  currentIndex?: number;
  position?: number;
  duration?: number;
  shuffle: boolean;
  repeat: boolean;
}

interface AudioSettings {
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // en millisegundos
  prebufferTime: number; // en millisegundos
}

interface DiscoverCache {
  recentAlbums: any[];
  frequentAlbums: any[];
  newestAlbums: any[];
  randomAlbums: any[];
  playlists: any[];
  lastUpdated: number;
  serverId: string;
}

interface LibraryCache {
  artists: any[];
  genres: any[];
  years: any[];
  playlists: any[];
  lastUpdated: number;
  serverId: string;
}

interface DownloadsCache {
  tracks: any[];
  lastUpdated: number;
  filterState: any;
}

interface AppState {
  servers: Server[];
  currentServer: Server | null;
  playlists: Playlist[];
  player: PlayerState;
  audioSettings: AudioSettings;
  discoverCache: DiscoverCache | null;
  libraryCache: LibraryCache | null;
  downloadsCache: DownloadsCache | null;
  addServer: (server: Server) => void;
  removeServer: (id: string) => void;
  setCurrentServer: (server: Server | null) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  setPlayerState: (state: Partial<PlayerState>) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  setQueue: (tracks: Track[]) => void;
  reorderQueue: (tracks: Track[]) => void;
  shuffleQueue: () => void;
  clearQueue: () => void;
  loadServers: () => Promise<void>;
  setDiscoverCache: (cache: DiscoverCache) => void;
  setLibraryCache: (cache: LibraryCache) => void;
  setDownloadsCache: (cache: DownloadsCache) => void;
  clearCache: () => void;
  clearDownloadsCache: () => void;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  currentServer: null,
  playlists: [],
  discoverCache: null,
  libraryCache: null,
  downloadsCache: null,
  player: {
    currentTrack: null,
    queue: [],
    isPlaying: false,
    currentIndex: 0,
    shuffle: false,
    repeat: false,
  },
  audioSettings: {
    crossfadeEnabled: true,
    crossfadeDuration: 2000, // 2 segundos
    prebufferTime: 10000, // 10 segundos
  },
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (id) => set((state) => ({ servers: state.servers.filter(s => s.id !== id) })),
  setCurrentServer: (server) => {
    set(() => ({ currentServer: server }));
    // Limpiar caché cuando se cambia de servidor
    const { clearCache } = get();
    clearCache();
  },
  addPlaylist: (playlist) => set((state) => ({ playlists: [...state.playlists, playlist] })),
  removePlaylist: (id) => set((state) => ({ playlists: state.playlists.filter(p => p.id !== id) })),
  setPlayerState: (playerState) => set((state) => ({ player: { ...state.player, ...playerState } })),
  addToQueue: (track) => set((state) => ({ player: { ...state.player, queue: [...state.player.queue, track] } })),
  removeFromQueue: (trackId) => set((state) => ({ player: { ...state.player, queue: state.player.queue.filter(t => t.id !== trackId) } })),
  setQueue: (tracks) => set((state) => ({ player: { ...state.player, queue: tracks } })),
  reorderQueue: (tracks) => set((state) => ({ player: { ...state.player, queue: tracks } })),
  shuffleQueue: () => set((state) => {
    const shuffled = [...state.player.queue].sort(() => Math.random() - 0.5);
    return { player: { ...state.player, queue: shuffled } };
  }),
  clearQueue: () => set((state) => ({ player: { ...state.player, queue: [] } })),
  setDiscoverCache: (cache) => set(() => ({ discoverCache: cache })),
  setLibraryCache: (cache) => set(() => ({ libraryCache: cache })),
  setDownloadsCache: (cache) => set(() => ({ downloadsCache: cache })),
  clearCache: () => set(() => ({ discoverCache: null, libraryCache: null, downloadsCache: null })),
  clearDownloadsCache: () => set(() => ({ downloadsCache: null })),
  updateAudioSettings: (settings) => set((state) => ({ 
    audioSettings: { ...state.audioSettings, ...settings } 
  })),
  loadServers: async () => {
    const servers = await getServersFromDB();
    set({ servers });
    // Si no hay servidor actual pero hay servidores, seleccionar el primero
    const currentState = get();
    if (!currentState.currentServer && servers.length > 0) {
      set({ currentServer: servers[0] });
    }
  },
}));
