'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { GameHeader } from '@/components/game/game-header';
import { LobbyView } from '@/components/game/lobby-view';
import { RevealView } from '@/components/game/reveal-view';
import { DiscussView } from '@/components/game/discuss-view';
import { VoteView } from '@/components/game/vote-view';
import { ResultView } from '@/components/game/result-view';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { KickedModal } from '@/components/ui/kicked-modal';
import type { Player } from '@/types/game';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;
  
  const {
    currentPlayer,
    playerToken,
    gameStatus,
    setRoomCode,
    setRoom,
    setPlayers,
    setCurrentPlayer,
    setGameStatus,
    setGameSettings,
    setAssignment,
    setIsConnected,
    resetGame,
  } = useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [kicked, setKicked] = useState(false);

  // Initialize room and realtime connection
  useEffect(() => {
    if (!roomCode) return;

    const initializeRoom = async () => {
      try {
        // Check if we have a valid token; if not, try rejoin via deviceId
        let token = localStorage.getItem('impostor_token');
        if (!token) {
          const deviceId = localStorage.getItem('impostor_device_id');
          if (deviceId) {
            const resp = await fetch('/api/room/rejoin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomCode: roomCode.toUpperCase(), deviceId }),
            });
            if (resp.status === 403) {
              setKicked(true);
              setIsLoading(false);
              return;
            }
            if (resp.ok) {
              const data = await resp.json();
              const newToken: string = String(data.token || '');
              if (newToken) {
                token = newToken;
                localStorage.setItem('impostor_token', newToken);
                // Update token cache for this room
                const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
                tokens[roomCode.toUpperCase()] = { token: newToken, player: data.player, updatedAt: Date.now() };
                localStorage.setItem('impostor_tokens', JSON.stringify(tokens));
              }
            }
          }
        }
        if (!token) {
          console.log('No token or rejoin available, redirecting to home');
          router.push('/');
          return;
        }

        console.log('Initializing room:', roomCode);
        setRoomCode(roomCode.toUpperCase());

        // Fetch room data via API instead of direct Supabase call
        const roomResponse = await fetch(`/api/room/${roomCode.toUpperCase()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!roomResponse.ok) {
          const errorData = await roomResponse.json();
          console.error('Room fetch error:', errorData);
          setError(errorData.error || 'Failed to load room');
          return;
        }

        const { room: roomData, players: playersData, currentPlayer } = await roomResponse.json();
        console.log('Room data loaded:', roomData, playersData, currentPlayer);

        setRoom(roomData);
        setPlayers(playersData || []);
        setCurrentPlayer(currentPlayer);
        // Ensure this client shows as connected right away
        try {
          await fetch('/api/presence/heartbeat', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('impostor_token')}` } });
        } catch {}
        if (currentPlayer?.kicked) {
          setKicked(true);
        }
        setGameStatus(roomData.status);

        // Simplified realtime setup - focus on polling for now
        const realtimeChannel = supabase.channel(`room:${roomCode.toUpperCase()}`);

        // Listen for broadcast events (settings still work via broadcasts)
        realtimeChannel.on('broadcast', { event: 'SETTINGS_UPDATE' }, (payload) => {
          console.log('Settings updated:', payload.payload.settings);
          setGameSettings(payload.payload.settings);
        });

        realtimeChannel.subscribe((status) => {
          console.log('Realtime subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });

        setChannel(realtimeChannel);
        
        // Set loading to false immediately after data is loaded
        // Don't wait for realtime subscription
        setIsLoading(false);

        // Start heartbeat to maintain presence
        const heartbeat = setInterval(async () => {
          try {
            await fetch('/api/presence/heartbeat', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              keepalive: true,
            });
          } catch (e) {
            // best effort
          }
        }, 25000);
        (realtimeChannel as any).heartbeat = heartbeat;

        // Add more frequent polling for better responsiveness
        let previousStatus = gameStatus;
        const pollUpdates = setInterval(async () => {
          try {
            // Poll both room and players data
            const response = await fetch(`/api/room/${roomCode.toUpperCase()}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const { room: updatedRoom, players: updatedPlayers, currentPlayer: me } = await response.json();
              setRoom(updatedRoom);
              setPlayers(updatedPlayers);
              if (me?.kicked) {
                setKicked(true);
              }
              
              // Check if status changed to REVEAL - preload assignment
              if (previousStatus !== 'REVEAL' && updatedRoom.status === 'REVEAL') {
                console.log('🚀 Status changed to REVEAL - preloading assignment...');
                try {
                  const assignmentResponse = await fetch('/api/game/assignment', {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  
                  if (assignmentResponse.ok) {
                    const assignmentData = await assignmentResponse.json();
                    console.log('✅ Assignment preloaded:', assignmentData);
                    
                    // Store preloaded assignment in the store with game mode
                    setAssignment({
                      id: 'temp',
                      round_id: assignmentData.round_id,
                      player_id: currentPlayer?.id || '',
                      role: assignmentData.role,
                      word_shown: assignmentData.word_shown,
                      mode: assignmentData.mode, // Include game mode
                    });
                  }
                } catch (assignmentError) {
                  console.error('Failed to preload assignment:', assignmentError);
                }
              }
              
              previousStatus = updatedRoom.status;
              setGameStatus(updatedRoom.status);
            } else if (response.status === 404 || response.status === 410) {
              // Room ended/deleted; redirect to home
              try {
                if ((realtimeChannel as any).pollInterval) clearInterval((realtimeChannel as any).pollInterval);
                if ((realtimeChannel as any).heartbeat) clearInterval((realtimeChannel as any).heartbeat);
              } catch {}
              setIsLoading(false);
              router.push('/');
            }
          } catch (error) {
            console.error('Error polling updates:', error);
          }
        }, 1000); // Poll every 1 second for faster updates

        // Store interval for cleanup
        (realtimeChannel as any).pollInterval = pollUpdates;

      } catch (err) {
        console.error('Error initializing room:', err);
        setError('Failed to load room');
      }
    };

    initializeRoom();

    // Cleanup
    return () => {
      if (channel) {
        // Clear polling interval
        if ((channel as any).pollInterval) {
          clearInterval((channel as any).pollInterval);
        }
        if ((channel as any).heartbeat) {
          clearInterval((channel as any).heartbeat);
        }
        channel.unsubscribe();
      }
    };
  }, [roomCode, router, setRoomCode, setRoom, setPlayers, setGameStatus, setIsConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
      // Don't reset game state on unmount, keep it for potential reconnection
    };
  }, [channel]);

  // Handle browser back/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const token = localStorage.getItem('impostor_token');
        if (token) {
          // Best-effort heartbeat with keepalive to mark recent presence
          void fetch('/api/presence/heartbeat', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            keepalive: true,
          });
        }
      } catch {}
      if (channel) channel.unsubscribe();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [channel]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (kicked) {
    return (
      <>
        <KickedModal open={true} />
      </>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GameHeader />
      
      <main className="pb-safe">
        {gameStatus === 'LOBBY' && <LobbyView />}
        {gameStatus === 'REVEAL' && <RevealView />}
        {gameStatus === 'DISCUSS' && <DiscussView />}
        {gameStatus === 'VOTE' && <VoteView />}
        {gameStatus === 'REVEAL_RESULT' && <ResultView />}
      </main>
    </div>
  );
}

