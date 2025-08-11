import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getPlayerInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateTimeRemaining(
  startServerTs: string, 
  endServerTs: string, 
  clientOffset: number
): number {
  const now = Date.now() + clientOffset;
  const endTime = new Date(endServerTs).getTime();
  return Math.max(0, Math.floor((endTime - now) / 1000));
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pickRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject(new Error('Unable to copy to clipboard'));
      }
      document.body.removeChild(textArea);
    });
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Deterministic player color mapping
// Shared palette used across all views so each player keeps a consistent color
// Reordered palette to maximize contrast early; host reserved as fuchsia/purple
export const HOST_PLAYER_COLOR = { tile: 'from-fuchsia-500/25 to-fuchsia-500/10 border-fuchsia-500/30', text: 'text-fuchsia-300' };
export const PLAYER_COLOR_PALETTE = [
  HOST_PLAYER_COLOR, // reserved for host (purple)
  { tile: 'from-orange-500/40 to-orange-500/20 border-orange-500/50', text: 'text-orange-300' }, // orange (2nd)
  { tile: 'from-cyan-500/40 to-cyan-500/20 border-cyan-500/50', text: 'text-cyan-300' },        // cyan
  { tile: 'from-emerald-500/40 to-emerald-500/20 border-emerald-500/50', text: 'text-emerald-300' }, // green
  { tile: 'from-rose-500/40 to-rose-500/20 border-rose-500/50', text: 'text-rose-300' },        // red/pink
  { tile: 'from-sky-500/40 to-sky-500/20 border-sky-500/50', text: 'text-sky-300' },            // blue
  { tile: 'from-lime-500/40 to-lime-500/20 border-lime-500/50', text: 'text-lime-300' },        // lime
  { tile: 'from-pink-500/40 to-pink-500/20 border-pink-500/50', text: 'text-pink-300' },        // pink alt
  { tile: 'from-violet-500/35 to-violet-500/20 border-violet-500/45', text: 'text-violet-300' }, // secondary purple (later)
];

function hashStringToInt(input: string): number {
  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getPlayerColor(playerId: string) {
  const idx = hashStringToInt(playerId) % PLAYER_COLOR_PALETTE.length;
  return PLAYER_COLOR_PALETTE[idx];
}

export function getPlayerColorWithHostOverride(playerId: string, isHost: boolean) {
  if (isHost) return HOST_PLAYER_COLOR;
  return getPlayerColor(playerId);
}

// Room-scoped unique color assignment to prioritize distinct colors per added player
export function getRoomColorMap(players: Array<{ id: string; is_host?: boolean }>) {
  const mapping: Record<string, { tile: string; text: string }> = {};
  const palette = PLAYER_COLOR_PALETTE;
  // Assign host first
  const host = players.find(p => p.is_host);
  if (host) mapping[host.id] = HOST_PLAYER_COLOR;
  // Sort others by id for stability
  const others = players.filter(p => !p.is_host).slice().sort((a, b) => a.id.localeCompare(b.id));
  let idx = 1; // start after host color
  for (const p of others) {
    mapping[p.id] = palette[idx % palette.length];
    idx += 1;
  }
  return mapping;
}