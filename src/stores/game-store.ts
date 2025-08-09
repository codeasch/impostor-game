import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  Room, 
  Player, 
  Round, 
  Assignment, 
  GameSettings, 
  GameResult, 
  VoteTally,
  GameStatus 
} from '@/types/game';

interface GameState {
  // Current room and player info
  roomCode: string | null;
  currentPlayer: Player | null;
  playerToken: string | null;
  
  // Room state
  room: Room | null;
  players: Player[];
  
  // Round state
  currentRound: Round | null;
  assignment: Assignment | null;
  
  // Game flow
  gameStatus: GameStatus;
  isHost: boolean;
  isConnected: boolean;
  
  // Timer state
  clockOffset: number;
  timeRemaining: number | null;
  
  // Voting state
  votes: VoteTally;
  hasVoted: boolean;
  selectedPlayer: string | null;
  
  // Results
  gameResult: GameResult | null;
  
  // Settings
  gameSettings: GameSettings;
  
  // Actions
  setRoomCode: (code: string | null) => void;
  setCurrentPlayer: (player: Player | null, token?: string) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  
  setCurrentRound: (round: Round | null) => void;
  setAssignment: (assignment: Assignment | null) => void;
  setGameStatus: (status: GameStatus) => void;
  
  setClockOffset: (offset: number) => void;
  setTimeRemaining: (time: number | null) => void;
  
  setVotes: (votes: VoteTally) => void;
  setHasVoted: (voted: boolean) => void;
  setSelectedPlayer: (playerId: string | null) => void;
  
  setGameResult: (result: GameResult | null) => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  
  setIsConnected: (connected: boolean) => void;
  
  // Computed
  getConnectedPlayers: () => Player[];
  getPlayerById: (id: string) => Player | undefined;
  getPlayerByName: (name: string) => Player | undefined;
  isPlayerHost: (playerId: string) => boolean;
  
  // Reset
  resetGame: () => void;
  resetRound: () => void;
}

const initialSettings: GameSettings = {
  pack: 'classic',
  mode: 'BLANK',
  timer_seconds: 300, // 5 minutes
  impostor_count: 1, // Fixed at 1
  clue_rounds: 1, // Fixed at 1
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    roomCode: null,
    currentPlayer: null,
    playerToken: null,
    
    room: null,
    players: [],
    
    currentRound: null,
    assignment: null,
    
    gameStatus: 'LOBBY',
    isHost: false,
    isConnected: false,
    
    clockOffset: 0,
    timeRemaining: null,
    
    votes: {},
    hasVoted: false,
    selectedPlayer: null,
    
    gameResult: null,
    gameSettings: initialSettings,
    
    // Actions
    setRoomCode: (code) => set({ roomCode: code }),
    
    setCurrentPlayer: (player, token) => set({ 
      currentPlayer: player,
      playerToken: token,
      isHost: player?.is_host ?? false,
    }),
    
    setRoom: (room) => set({ room }),
    
    setPlayers: (players) => set({ players }),
    
    addPlayer: (player) => set((state) => ({
      players: [...state.players.filter(p => p.id !== player.id), player],
    })),
    
    removePlayer: (playerId) => set((state) => ({
      players: state.players.filter(p => p.id !== playerId),
    })),
    
    updatePlayer: (playerId, updates) => set((state) => ({
      players: state.players.map(p => 
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),
    
    setCurrentRound: (round) => set({ currentRound: round }),
    setAssignment: (assignment) => set({ assignment }),
    setGameStatus: (status) => set({ gameStatus: status }),
    
    setClockOffset: (offset) => set({ clockOffset: offset }),
    setTimeRemaining: (time) => set({ timeRemaining: time }),
    
    setVotes: (votes) => set({ votes }),
    setHasVoted: (voted) => set({ hasVoted: voted }),
    setSelectedPlayer: (playerId) => set({ selectedPlayer: playerId }),
    
    setGameResult: (result) => set({ gameResult: result }),
    setGameSettings: (settings) => set((state) => ({
      gameSettings: { ...state.gameSettings, ...settings },
    })),
    
    setIsConnected: (connected) => set({ isConnected: connected }),
    
    // Computed
    getConnectedPlayers: () => get().players.filter(p => p.connected),
    
    getPlayerById: (id) => get().players.find(p => p.id === id),
    
    getPlayerByName: (name) => get().players.find(p => p.name.toLowerCase() === name.toLowerCase()),
    
    isPlayerHost: (playerId) => {
      const player = get().getPlayerById(playerId);
      return player?.is_host ?? false;
    },
    
    // Reset
    resetGame: () => set({
      roomCode: null,
      currentPlayer: null,
      playerToken: null,
      room: null,
      players: [],
      currentRound: null,
      assignment: null,
      gameStatus: 'LOBBY',
      isHost: false,
      isConnected: false,
      clockOffset: 0,
      timeRemaining: null,
      votes: {},
      hasVoted: false,
      selectedPlayer: null,
      gameResult: null,
      gameSettings: initialSettings,
    }),
    
    resetRound: () => set({
      currentRound: null,
      assignment: null,
      timeRemaining: null,
      votes: {},
      hasVoted: false,
      selectedPlayer: null,
      gameResult: null,
      // Keep gameSettings when resetting round (persist between games)
    }),
  }))
);

