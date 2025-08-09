'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Plus, LogIn, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const { setRoomCode: setStoreRoomCode, setCurrentPlayer } = useGameStore();

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Update store
      setStoreRoomCode(data.roomCode);
      setCurrentPlayer(data.player, data.token);

      // Store token in localStorage
      localStorage.setItem('impostor_token', data.token);

      // Navigate to room
      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const response = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: roomCode.trim().toUpperCase(), 
          name: playerName.trim() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      // Update store
      setStoreRoomCode(data.roomCode);
      setCurrentPlayer(data.player, data.token);

      // Store token in localStorage
      localStorage.setItem('impostor_token', data.token);

      // Navigate to room
      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-20 h-20 mx-auto bg-primary/20 rounded-2xl flex items-center justify-center"
          >
            <Gamepad2 className="w-10 h-10 text-primary" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Impostor
            </h1>
            <p className="text-muted-foreground mt-2">
              Find the impostor among you
            </p>
          </motion.div>
        </div>

        {/* Name Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="space-y-2"
        >
          <label htmlFor="playerName" className="text-sm font-medium">
            Your Name
          </label>
          <Input
            id="playerName"
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && playerName.trim()) {
                handleCreateRoom();
              }
            }}
            className="h-12 text-lg"
            maxLength={20}
          />
        </motion.div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <Card className="hover:bg-card/80 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  Create Room
                </CardTitle>
                <CardDescription>
                  Start a new game and invite friends
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || isCreating}
                  className="w-full h-12"
                  size="lg"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Create Game
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0, duration: 0.4 }}
          >
            <Card className="hover:bg-card/80 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-accent" />
                  </div>
                  Join Room
                </CardTitle>
                <CardDescription>
                  Enter a room code to join an existing game
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Input
                  type="text"
                  placeholder="Room Code (6 characters)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && playerName.trim() && roomCode.trim()) {
                      handleJoinRoom();
                    }
                  }}
                  className="h-12 text-lg text-center tracking-wider font-mono"
                  maxLength={6}
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !roomCode.trim() || roomCode.length !== 6 || isJoining}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  {isJoining ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      Joining...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Join Game
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="text-center text-xs text-muted-foreground"
        >
          <p>3-20 players • Real-time multiplayer</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

