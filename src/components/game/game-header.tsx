'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Crown, Wifi, WifiOff, Check } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function GameHeader() {
  const { roomCode, players, currentPlayer, isConnected } = useGameStore();
  const [copied, setCopied] = useState(false);

  const connectedPlayers = players.filter(p => p.connected);
  const isHost = currentPlayer?.is_host ?? false;

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;
    
    try {
      await copyToClipboard(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
        {/* Room Code */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleCopyRoomCode}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm font-medium transition-all',
              'bg-primary/10 hover:bg-primary/15 border border-primary/20 shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            whileTap={{ scale: 0.95 }}
            disabled={!roomCode}
          >
            <span className="text-primary font-bold tracking-wider">
              {roomCode || 'Loading...'}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-primary" />
            )}
          </motion.button>

          {copied && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs text-green-500 font-medium"
            >
              Copied!
            </motion.span>
          )}
        </div>

        {/* Player Info & Connection Status */}
        <div className="flex items-center gap-3">
          {/* Player Count */}
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-lg border border-border/60">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {connectedPlayers.length}
            </span>
          </div>

          {/* Host Badge */}
          {isHost && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg">
              <Crown className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent">Host</span>
            </div>
          )}

          {/* Connection Status */}
          <div className={cn(
            'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors border',
            isConnected 
              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
              : 'bg-destructive/10 text-destructive border-destructive/20'
          )}>
            {isConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
          </div>

          {/* Settings control moved into Lobby settings card for better placement */}
        </div>
      </div>
    </header>
  );
}

