'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings, Crown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { getPlayerInitials } from '@/lib/utils';
import { SettingsPanel } from './settings-panel';

export function LobbyView() {
  const { 
    players, 
    currentPlayer, 
    gameSettings,
    isHost 
  } = useGameStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const connectedPlayers = players.filter(p => p.connected);
  const canStart = connectedPlayers.length >= 3;

  const handleStartGame = async () => {
    if (!canStart || !isHost) return;

    console.log('Starting game with settings:', gameSettings);
    setIsStarting(true);
    try {
      // Call API to start the game
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
        body: JSON.stringify(gameSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Start game error:', errorData);
        throw new Error(errorData.error || 'Failed to start game');
      }

      const result = await response.json();
      console.log('Game started successfully:', result);
    } catch (error) {
      console.error('Error starting game:', error);
      alert(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-bold">
          {isHost ? 'Your Game Room' : 'Waiting for Host'}
        </h1>
        <p className="text-muted-foreground">
          {isHost 
            ? `${connectedPlayers.length}/20 players • Configure settings and start when ready`
            : 'The host will start the game soon'
          }
        </p>
      </motion.div>

      {/* Players Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Players ({connectedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {connectedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {getPlayerInitials(player.name)}
                  </span>
                </div>

                {/* Name and Host Badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {player.name}
                    </span>
                    {player.is_host && (
                      <Crown className="w-3 h-3 text-accent flex-shrink-0" />
                    )}
                  </div>
                  {player.id === currentPlayer?.id && (
                    <span className="text-xs text-muted-foreground">You</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel (Host Only) */}
      {isHost && (
        <SettingsPanel 
          isOpen={showSettings} 
          onOpenChange={setShowSettings} 
        />
      )}

      {/* Game Settings Display (Non-Host) */}
      {!isHost && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Game Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pack:</span>
                <span className="ml-2 font-medium capitalize">{gameSettings.pack}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <span className="ml-2 font-medium">
                  {gameSettings.mode === 'BLANK' ? 'Blank Cards' : 'Deception Mode'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Timer:</span>
                <span className="ml-2 font-medium">
                  {gameSettings.timer_seconds 
                    ? `${Math.floor(gameSettings.timer_seconds / 60)}:${(gameSettings.timer_seconds % 60).toString().padStart(2, '0')}`
                    : 'No limit'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {isHost && (
          <>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="lg"
              className="w-full h-14"
            >
              <Settings className="w-5 h-5 mr-2" />
              {showSettings ? 'Hide Settings' : 'Game Settings'}
            </Button>

            <Button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              size="xl"
              className="w-full h-16 text-lg font-semibold"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Starting Game...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="w-6 h-6" />
                  Start Game
                  {!canStart && ' (Need 3+ players)'}
                </div>
              )}
            </Button>
          </>
        )}

        {!isHost && (
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Play!</h3>
            <p className="text-muted-foreground">
              Waiting for the host to start the game...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

