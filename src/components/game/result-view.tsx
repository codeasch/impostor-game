'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, RotateCcw, LogOut, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { getPlayerInitials } from '@/lib/utils';

interface GameResult {
  impostorIds: string[];
  crewWord: string;
  win: 'INNOCENT' | 'IMPOSTOR';
  voteCounts: { [key: string]: { count: number; name: string } };
  mostVotedPlayer?: { id: string; name: string; votes: number };
}

export function ResultView() {
  const { players, settings, isHost } = useGameStore();
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);

  // Fetch game results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch('/api/game/results', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setGameResult(data);
        } else {
          console.error('Failed to fetch results');
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-lg">Calculating results...</p>
      </div>
    );
  }

  if (!gameResult) {
    return (
      <div className="p-4 text-center">
        <p>Failed to load results. Please refresh the page.</p>
      </div>
    );
  }

  const { impostorIds, crewWord, win, voteCounts, mostVotedPlayer } = gameResult;
  const impostors = players.filter(p => impostorIds.includes(p.id));
  const innocentWon = win === 'INNOCENT';

  // Vote results are already calculated in the API
  const voteEntries = Object.entries(voteCounts).map(([id, data]) => [id, data.count]);
  const maxVotes = Math.max(...voteEntries.map(([_, count]) => count as number), 0);

  const handlePlayAgain = async () => {
    if (!isHost) return;

    setIsPlayingAgain(true);
    try {
      await fetch('/api/game/play-again', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
      });
    } catch (error) {
      console.error('Failed to start new game:', error);
    } finally {
      setIsPlayingAgain(false);
    }
  };

  const handleLeaveRoom = async () => {
    setIsLeavingRoom(true);
    try {
      await fetch('/api/game/leave', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
      });
      
      // Clear local storage and redirect
      localStorage.removeItem('impostor_token');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to leave room:', error);
      // Redirect anyway
      window.location.href = '/';
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Win/Loss Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={innocentWon ? { rotate: [0, 10, -10, 0] } : { x: [-5, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
          className={`text-6xl`}
        >
          {innocentWon ? '🎉' : '💀'}
        </motion.div>
        
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold ${
            innocentWon ? 'text-green-500' : 'text-destructive'
          }`}>
            {innocentWon ? 'Innocent Wins!' : 'Impostors Win!'}
          </h1>
          <p className="text-muted-foreground">
            {innocentWon 
              ? 'The impostors have been found!'
              : 'The impostors successfully deceived everyone!'
            }
          </p>
        </div>
      </motion.div>

      {/* The Secret Word */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">The Secret Word Was</h2>
            <div className="text-3xl font-bold text-primary bg-primary/10 px-6 py-3 rounded-lg inline-block">
              {crewWord}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Impostors Reveal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-destructive" />
              The Impostor{impostors.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {impostors.map((impostor, index) => (
                <motion.div
                  key={impostor.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-destructive">
                      {getPlayerInitials(impostor.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{impostor.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Received {voteCounts[impostor.id]?.count || 0} vote{voteCounts[impostor.id]?.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Crown className="w-5 h-5 text-destructive" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Voting Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Voting Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostVotedPlayer ? (
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <p className="font-medium">
                  {mostVotedPlayer.name} was voted out with {mostVotedPlayer.votes} vote{mostVotedPlayer.votes !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {impostorIds.includes(mostVotedPlayer.id) 
                    ? '✅ Correctly identified as impostor!'
                    : '❌ Was innocent player'
                  }
                </p>
              </div>
            ) : (
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <p className="font-medium">No elimination - tie vote!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Multiple players tied with {maxVotes} vote{maxVotes !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Full vote breakdown */}
            <div className="mt-4 space-y-2">
              {Object.entries(voteCounts)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([playerId, voteData]) => {
                  const player = players.find(p => p.id === playerId);
                  if (!player) return null;
                  
                  return (
                    <div key={playerId} className="flex items-center justify-between text-sm">
                      <span>{player.name}</span>
                      <span className="text-muted-foreground">
                        {voteData.count} vote{voteData.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Game Settings Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Game Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pack:</span>
              <span className="ml-2 font-medium capitalize">{settings?.pack || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mode:</span>
              <span className="ml-2 font-medium">
                {settings?.mode === 'BLANK' ? 'Blank Cards' : 'Close Words'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Players:</span>
              <span className="ml-2 font-medium">{players.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Impostors:</span>
              <span className="ml-2 font-medium">{impostors.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="space-y-3"
      >
        {isHost && (
          <Button
            onClick={handlePlayAgain}
            disabled={isPlayingAgain}
            size="xl"
            className="w-full h-16"
          >
            {isPlayingAgain ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Starting New Game...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Play Again
              </div>
            )}
          </Button>
        )}

        <Button
          onClick={handleLeaveRoom}
          disabled={isLeavingRoom}
          variant="outline"
          size="lg"
          className="w-full"
        >
          {isLeavingRoom ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Leaving...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Leave Room
            </div>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

