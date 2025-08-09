'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Vote, Check, X, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { getPlayerInitials, formatTime } from '@/lib/utils';

export function VoteView() {
  const { 
    players, 
    currentPlayer,
    isHost 
  } = useGameStore();

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteCounts, setVoteCounts] = useState<{ [key: string]: { count: number; name: string } }>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(40); // 40-second voting timer

  const connectedPlayers = players.filter(p => p.connected);
  const votablePlayers = connectedPlayers.filter(p => p.id !== currentPlayer?.id);

  // 40-second voting timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance to results when timer hits 0
          if (isHost) {
            handleEndVoting();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHost]);

  // Server now handles auto-advance when all players vote

  // Poll for vote count only (not individual vote counts - keep voting secret)
  useEffect(() => {
    const pollVoteCount = async () => {
      try {
        const response = await fetch('/api/game/vote-count', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTotalVotes(data.totalVotes || 0);
          // Don't set voteCounts - keep voting secret!
        }
      } catch (error) {
        console.error('Failed to fetch vote count:', error);
      }
    };

    pollVoteCount();
    const interval = setInterval(pollVoteCount, 3000); // Poll every 3 seconds (less frequent since votes are instant)
    return () => clearInterval(interval);
  }, []);

  const handlePlayerSelect = (playerId: string) => {
    if (hasVoted) return;
    setSelectedPlayer(selectedPlayer === playerId ? null : playerId);
  };

  const handleSubmitVote = async () => {
    if (!selectedPlayer || hasVoted) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/game/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
        body: JSON.stringify({ accused_player_id: selectedPlayer }),
      });

      if (response.ok) {
        setHasVoted(true);
        const data = await response.json();
        setTotalVotes(data.totalVotes || 0);
        
        // If all players voted, the API already advanced the game
        if (data.allVoted) {
          console.log('All players voted! Results will show automatically.');
        }
        // Don't show individual vote counts - keep secret!
      } else {
        const errorData = await response.json();
        console.error('Vote error:', errorData);
        alert(`Failed to submit vote: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndVoting = async () => {
    if (!isHost) return;

    try {
      const response = await fetch('/api/game/end-vote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('End voting error:', errorData);
        alert(`Failed to end voting: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to end voting:', error);
      alert('Failed to end voting. Please try again.');
    }
  };

  // Calculate vote progress
  const totalPlayers = connectedPlayers.length;
  const allVoted = totalVotes >= totalPlayers;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-bold">Voting Time</h1>
        <p className="text-muted-foreground">
          Who do you think is the impostor?
        </p>
      </motion.div>

      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Card className="bg-gradient-to-br from-destructive/10 to-orange/10 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-destructive" />
              <span className="text-3xl font-bold font-mono text-destructive">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Voting time remaining</p>
            
            {/* Progress bar */}
            <div className="w-full bg-secondary/30 rounded-full h-2 mt-4">
              <motion.div
                className="bg-destructive h-2 rounded-full"
                initial={{ width: '100%' }}
                animate={{ 
                  width: `${(timeRemaining / 40) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Voting Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-primary" />
              <span className="font-semibold">Voting Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalVotes}/{totalPlayers} votes
            </span>
          </div>
          
          <div className="w-full bg-secondary/30 rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(totalVotes / totalPlayers) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {allVoted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center"
            >
              <p className="text-sm font-medium text-green-500">
                🎉 All players have voted! Results coming up...
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Player Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Select a Player to Vote Out</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {votablePlayers.map((player, index) => (
              <motion.button
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handlePlayerSelect(player.id)}
                disabled={hasVoted}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedPlayer === player.id
                    ? 'border-primary bg-primary/10'
                    : hasVoted
                    ? 'border-border/50 opacity-50 cursor-not-allowed'
                    : 'border-border hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {getPlayerInitials(player.name)}
                    </span>
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Secret ballot
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedPlayer === player.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vote Actions */}
      <div className="space-y-3">
        {!hasVoted ? (
          <Button
            onClick={handleSubmitVote}
            disabled={!selectedPlayer || isSubmitting}
            size="xl"
            className="w-full h-16"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Submitting Vote...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Vote Out {selectedPlayer ? votablePlayers.find(p => p.id === selectedPlayer)?.name : 'Selected Player'}
              </div>
            )}
          </Button>
        ) : (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-500">
                <Check className="w-5 h-5" />
                <span className="font-medium">Vote Submitted!</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Waiting for other players to vote...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Auto-advance message */}
        {allVoted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-4"
          >
            <p className="text-sm text-muted-foreground">
              ⚡ All votes cast! Revealing results now...
            </p>
          </motion.div>
        )}
      </div>

      {/* Voting Rules */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Voting Rules
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Vote for the player you think is the impostor</p>
            <p>• You cannot vote for yourself</p>
            <p>• You have 40 seconds to cast your vote</p>
            <p>• The player with the most votes is eliminated</p>
            <p>• In case of a tie, nobody is eliminated</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

