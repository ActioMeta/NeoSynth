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
};

export type PlayerState = {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: boolean;
};

interface AppState {
  servers: Server[];
  currentServer: Server | null;
  playlists: Playlist[];
  player: PlayerState;
  addServer: (server: Server) => void;
  removeServer: (id: string) => void;
  setCurrentServer: (server: Server) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  setPlayerState: (state: Partial<PlayerState>) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  shuffleQueue: () => void;
  clearQueue: () => void;
  loadServers: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  currentServer: null,
  playlists: [],
  player: {
    currentTrack: null,
    queue: [],
    isPlaying: false,
    shuffle: false,
    repeat: false,
  },
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (id) => set((state) => ({ servers: state.servers.filter(s => s.id !== id) })),
  setCurrentServer: (server) => set(() => ({ currentServer: server })),
  addPlaylist: (playlist) => set((state) => ({ playlists: [...state.playlists, playlist] })),
  removePlaylist: (id) => set((state) => ({ playlists: state.playlists.filter(p => p.id !== id) })),
  setPlayerState: (playerState) => set((state) => ({ player: { ...state.player, ...playerState } })),
  addToQueue: (track) => set((state) => ({ player: { ...state.player, queue: [...state.player.queue, track] } })),
  removeFromQueue: (trackId) => set((state) => ({ player: { ...state.player, queue: state.player.queue.filter(t => t.id !== trackId) } })),
  shuffleQueue: () => set((state) => {
    const shuffled = [...state.player.queue].sort(() => Math.random() - 0.5);
    return { player: { ...state.player, queue: shuffled } };
  }),
  clearQueue: () => set((state) => ({ player: { ...state.player, queue: [] } })),
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
