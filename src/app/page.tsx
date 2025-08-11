'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Plus, LogIn, Gamepad2, MessageSquare, Hand, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [resumeOptions, setResumeOptions] = useState<Array<{ roomCode: string; name: string }>>([]);

  const { setRoomCode: setStoreRoomCode, setCurrentPlayer } = useGameStore();

  useEffect(() => {
    // Prefill last used name if available
    const lastName = localStorage.getItem('impostor_last_name');
    if (lastName) setPlayerName(lastName);

    // Gather recent rooms for simple resume list
    const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
    const options: Array<{ roomCode: string; name: string }> = [];
    Object.keys(tokens).forEach((code) => {
      const entry = tokens[code];
      if (entry?.player?.name) {
        options.push({ roomCode: code, name: entry.player.name });
      }
    });
    setResumeOptions(options.slice(0, 5));

    // Proactively prune ended/deleted rooms from resume list
    (async () => {
      const updatedTokens = { ...tokens };
      await Promise.all(
        Object.keys(tokens).map(async (code) => {
          const entry = tokens[code];
          if (!entry?.token) {
            delete updatedTokens[code];
            return;
          }
          try {
            const res = await fetch(`/api/room/${code}`, {
              headers: { Authorization: `Bearer ${entry.token}` },
            });
            if (res.status === 404 || res.status === 410) {
              delete updatedTokens[code];
            }
          } catch {
            // Network errors: keep entry; it may be transient
          }
        })
      );
      localStorage.setItem('impostor_tokens', JSON.stringify(updatedTokens));
      const refreshed: Array<{ roomCode: string; name: string }> = [];
      Object.keys(updatedTokens).forEach((code) => {
        const entry = updatedTokens[code];
        if (entry?.player?.name) {
          refreshed.push({ roomCode: code, name: entry.player.name });
        }
      });
      setResumeOptions(refreshed.slice(0, 5));
    })();
  }, []);

  function getOrCreateDeviceId() {
    let id = localStorage.getItem('impostor_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('impostor_device_id', id);
    }
    return id;
  }

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
        body: JSON.stringify({ name: playerName.trim(), deviceId: getOrCreateDeviceId() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Update store
      setStoreRoomCode(data.roomCode);
      setCurrentPlayer(data.player, data.token);

      // Store token in localStorage and cache per-room token
      localStorage.setItem('impostor_token', data.token);
      localStorage.setItem('impostor_last_name', playerName.trim());
      const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
      tokens[data.roomCode] = { token: data.token, player: data.player, updatedAt: Date.now() };
      localStorage.setItem('impostor_tokens', JSON.stringify(tokens));

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
          name: playerName.trim(),
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      // Update store
      setStoreRoomCode(data.roomCode);
      setCurrentPlayer(data.player, data.token);

      // Store token in localStorage and cache per-room token
      localStorage.setItem('impostor_token', data.token);
      localStorage.setItem('impostor_last_name', playerName.trim());
      const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
      tokens[data.roomCode] = { token: data.token, player: data.player, updatedAt: Date.now() };
      localStorage.setItem('impostor_tokens', JSON.stringify(tokens));

      // Navigate to room
      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.25]" />
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-primary/30 via-primary/0 to-accent/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-accent/25 via-accent/0 to-primary/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 md:py-20"
      >
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-foreground">Impostor</span>
          </h1>
        </div>

        {/* Main interactive panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, type: 'spring', stiffness: 140, damping: 20 }}
        >
          <Card className="bg-card/60 backdrop-blur-xl shadow-xl shadow-black/20 border-border/60">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Left: controls */}
                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <label htmlFor="playerName" className="text-sm font-medium">Your name</label>
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
                      className="h-12 text-base"
                      maxLength={20}
                    />
                  </div>

                  <Button
                    onClick={handleCreateRoom}
                    disabled={!playerName.trim() || isCreating}
                    size="xl"
                    className="h-12 justify-center gap-2"
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        Create game
                      </>
                    )}
                  </Button>

                  <div className="space-y-2">
                    <label htmlFor="roomCode" className="text-sm font-medium">Join with a code</label>
                    <div className="flex gap-2">
                      <Input
                        id="roomCode"
                        type="text"
                        placeholder="ABC123"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && playerName.trim() && roomCode.trim()) {
                            handleJoinRoom();
                          }
                        }}
                        className="h-12 text-center font-mono tracking-widest"
                        maxLength={6}
                      />
                      <Button
                        onClick={handleJoinRoom}
                        disabled={!playerName.trim() || !roomCode.trim() || roomCode.length !== 6 || isJoining}
                        variant={roomCode.length === 6 && playerName.trim() && !isJoining ? 'default' : 'outline'}
                        size="xl"
                        className={`h-12 gap-2 ${roomCode.length === 6 && playerName.trim() && !isJoining ? 'shadow-[0_0_24px_hsl(var(--primary)/0.45)] hover:shadow-[0_0_36px_hsl(var(--primary)/0.6)]' : ''}`}
                      >
                        {isJoining ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                            Joining
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <LogIn className="h-5 w-5" />
                            Join
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </div>

                {/* Right: resume or how it works */}
                <div className="flex flex-col gap-4">
                  {resumeOptions.length > 0 ? (
                    <>
                      <div>
                        <h3 className="mb-1 text-lg font-semibold">Resume</h3>
                        <p className="text-sm text-muted-foreground">Quickly rejoin a recent room</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {resumeOptions.map((opt) => (
                          <Button
                            key={opt.roomCode}
                            variant="secondary"
                            className="h-11 justify-between"
                            onClick={async () => {
                              const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
                              const entry = tokens[opt.roomCode];
                              if (entry?.token) {
                                try {
                                  const res = await fetch(`/api/room/${opt.roomCode}`, { headers: { Authorization: `Bearer ${entry.token}` } });
                                  if (res.ok) {
                                    localStorage.setItem('impostor_token', entry.token);
                                    router.push(`/room/${opt.roomCode}`);
                                    return;
                                  }
                                  if (res.status === 404 || res.status === 410) {
                                    delete tokens[opt.roomCode];
                                    localStorage.setItem('impostor_tokens', JSON.stringify(tokens));
                                    setResumeOptions(
                                      Object.keys(tokens).map((code) => ({ roomCode: code, name: tokens[code].player?.name || '' }))
                                    );
                                    return;
                                  }
                                } catch {}
                              }
                              setRoomCode(opt.roomCode);
                            }}
                          >
                            <span className="font-mono tracking-widest">{opt.roomCode}</span>
                            <span className="text-muted-foreground">{opt.name}</span>
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to play */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 140, damping: 20 }}
        >
          <Card className="bg-card/60 backdrop-blur-xl shadow-xl shadow-black/10 border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">How to play</CardTitle>
              <CardDescription>Clear steps, no spoilers</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                  },
                }}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                {[
                  {
                    title: 'Create your room',
                    desc: 'Start a room and share the 6-letter code with friends.',
                    iconBg: 'bg-primary/15',
                    icon: <Plus className="h-4 w-4 text-primary" />,
                  },
                  {
                    title: 'Everyone joins',
                    desc: 'Each player joins on their phone or computer.',
                    iconBg: 'bg-secondary/30',
                    icon: <Users className="h-4 w-4 text-secondary-foreground" />,
                  },
                  {
                    title: 'Get your secret',
                    desc: 'All players receive a word. One player gets none...',
                    iconBg: 'bg-accent/15',
                    icon: <Eye className="h-4 w-4 text-accent" />,
                  },
                  {
                    title: 'Hint • Discuss • Vote',
                    desc: 'Give short hints (no saying the word), talk it out, then vote the impostor.',
                    iconBg: 'bg-emerald-400/15',
                    icon: <MessageSquare className="h-4 w-4 text-emerald-400" />,
                  },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    whileHover={{ y: -2 }}
                    className="rounded-lg border border-border/60 bg-background/60 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${step.iconBg}`}>
                        {step.icon}
                      </div>
                      <span className="text-xs">Step {i + 1}</span>
                    </div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-4 rounded-md border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                Tip: Keep hints short and subtle. Don’t say the word.
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tiny footer */}
        <div className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
          <div>Made for parties. Works on mobile.</div>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </motion.div>
    </div>
  );
}

