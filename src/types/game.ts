export type GameStatus = 
  | 'LOBBY' 
  | 'ASSIGNING' 
  | 'REVEAL' 
  | 'DISCUSS' 
  | 'VOTE' 
  | 'REVEAL_RESULT' 
  | 'ENDED';

export type PlayerRole = 'INNOCENT' | 'IMPOSTOR';

export type GameMode = 'BLANK' | 'DECEPTION';

export type WinState = 'INNOCENT' | 'IMPOSTOR';

export interface Room {
  code: string;
  host_id: string;
  status: GameStatus;
  created_at: string;
  current_round: number;
}

export interface Player {
  id: string;
  room_code: string;
  name: string;
  is_host: boolean;
  connected: boolean;
  joined_at: string;
  avatar_seed?: string;
  device_id?: string;
  kicked?: boolean;
  kicked_at?: string;
}

export interface Round {
  id: string;
  room_code: string;
  round_number: number;
  pack: string;
  mode: GameMode;
  impostor_count: number;
  clue_rounds: number;
  timer_seconds?: number;
  crew_word: string;
  start_server_ts?: string;
  end_server_ts?: string;
}

export interface Assignment {
  id: string;
  round_id: string;
  player_id: string;
  role: PlayerRole;
  word_shown: string;
  mode?: GameMode; // Optional for preloaded assignments
}

export interface Vote {
  id: string;
  round_id: string;
  voter_id: string;
  accused_player_id: string;
  created_at: string;
}

export interface GameSettings {
  pack: string;
  mode: GameMode;
  timer_seconds?: number;
  impostor_count: number;
  clue_rounds: number;
}

export interface GameResult {
  impostor_ids: string[];
  crew_word: string;
  win: WinState;
}

export interface VoteTally {
  [playerId: string]: number;
}

// Realtime events
export interface RealtimeEvent {
  type: string;
  payload: any;
}

export interface RoomUpdatedEvent extends RealtimeEvent {
  type: 'ROOM_UPDATED';
  payload: {
    status: GameStatus;
    current_round: number;
  };
}

export interface RoundCreatedEvent extends RealtimeEvent {
  type: 'ROUND_CREATED';
  payload: {
    roundId: string;
    settings: GameSettings;
    startable: boolean;
  };
}

export interface RoundStartedEvent extends RealtimeEvent {
  type: 'ROUND_STARTED';
  payload: {
    roundId: string;
    startServerTs: string;
    endServerTs?: string;
  };
}

export interface RoundPhaseEvent extends RealtimeEvent {
  type: 'ROUND_PHASE';
  payload: {
    phase: GameStatus;
  };
}

export interface VoteTallyEvent extends RealtimeEvent {
  type: 'VOTE_TALLY';
  payload: {
    counts: VoteTally;
  };
}

export interface ResultEvent extends RealtimeEvent {
  type: 'RESULT';
  payload: GameResult & { tally: VoteTally };
}

export interface PresenceEvent extends RealtimeEvent {
  type: 'PRESENCE';
  payload: {
    playerId: string;
    connected: boolean;
  };
}

// Word packs
export interface WordPack {
  id: string;
  name: string;
  description: string;
  words: string[];
  close_pairs?: { [key: string]: string[] };
}

