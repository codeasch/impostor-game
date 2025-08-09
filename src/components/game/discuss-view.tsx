'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { formatTime } from '@/lib/utils';

export function DiscussView() {
  const { 
    players, 
    gameSettings,
    isHost 
  } = useGameStore();

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isEndingDiscussion, setIsEndingDiscussion] = useState(false);

  // Timer logic - using game settings timer
  useEffect(() => {
    if (!gameSettings?.timer_seconds) {
      setTimeRemaining(null);
      return;
    }

    // Set initial time
    setTimeRemaining(gameSettings.timer_seconds);

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          // Auto-advance to voting when timer hits 0
          if (isHost) {
            handleEndDiscussion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameSettings?.timer_seconds]);

  const hasTimer = gameSettings?.timer_seconds && timeRemaining !== null;
  const connectedPlayers = players.filter(p => p.connected);

  const handleEndDiscussion = async () => {
    if (!isHost) return;

    setIsEndingDiscussion(true);
    try {
      const response = await fetch('/api/game/end-discussion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('End discussion error:', errorData);
        throw new Error(errorData.error || 'Failed to end discussion');
      }

      console.log('Discussion ended successfully');
    } catch (error) {
      console.error('Error ending discussion:', error);
      alert(`Failed to end discussion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEndingDiscussion(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-bold">Discussion Time</h1>
        <p className="text-muted-foreground">
          Share clues and find the impostor
        </p>
      </motion.div>

      {/* Timer */}
      {hasTimer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-primary" />
                <span className="text-3xl font-bold font-mono">
                  {formatTime(timeRemaining!)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Time remaining</p>
              
              {/* Progress bar */}
              <div className="w-full bg-secondary/30 rounded-full h-2 mt-4">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ 
                    width: `${(timeRemaining! / gameSettings!.timer_seconds!) * 100}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Timer Mode */}
      {!hasTimer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <MessageCircle className="w-6 h-6 text-accent" />
                <span className="text-xl font-semibold">No Time Limit</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Discuss as long as you need
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Players */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" />
            Players ({connectedPlayers.length})
          </h3>

          <div className="grid gap-2">
            {connectedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20"
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  <span className="font-medium">
                    {player.name}
                  </span>
                  {player.is_host && (
                    <span className="text-xs text-primary ml-2">
                      • Host
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Discussion Guidelines */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Discussion Guidelines</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Each player gives clues about their word</p>
            <p>• Listen carefully for inconsistencies</p>
            <p>• Ask questions to clarify suspicious answers</p>
            <p>• Remember: impostors are trying to blend in!</p>
          </div>
        </CardContent>
      </Card>

      {/* Host Controls */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleEndDiscussion}
            disabled={isEndingDiscussion}
            size="lg"
            className="w-full h-14"
            variant="outline"
          >
            {isEndingDiscussion ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Ending Discussion...
              </div>
            ) : (
              "End Discussion & Start Voting"
            )}
          </Button>
        </motion.div>
      )}

      {/* Waiting for Host */}
      {!isHost && (
        <div className="text-center p-6">
          <p className="text-muted-foreground">
            Waiting for host to start voting...
          </p>
        </div>
      )}
    </div>
  );
}

