'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';

export function RevealView() {
  const { assignment, currentPlayer, setAssignment, isHost, room, players } = useGameStore();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [gameMode, setGameMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);

  // Clear stale data when component mounts
  useEffect(() => {
    setAssignment(null); // Clear any stale assignment from store
    setIsRevealed(false); // Reset reveal state
    setIsReady(false); // Reset ready state
    setGameMode(null); // Reset game mode
  }, [setAssignment]);

  // Fetch assignment when component mounts
  useEffect(() => {
    const fetchAssignment = async () => {
      if (!currentPlayer) return;

      // Check if we already have a preloaded assignment
      if (assignment && assignment.player_id === currentPlayer.id) {
        console.log('⚡ Using preloaded assignment - INSTANT LOAD!', assignment);
        setCurrentAssignment(assignment);
        
        // Use preloaded mode if available, otherwise fetch it
        if (assignment.mode) {
          console.log('🚀 Game mode also preloaded - FULLY INSTANT!');
          setGameMode(assignment.mode);
          setIsLoading(false);
          return;
        } else {
          // Fetch game mode to complete the data
          try {
            const response = await fetch('/api/game/assignment', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              setGameMode(data.mode);
              setIsLoading(false);
            } else {
              setIsLoading(false);
            }
          } catch (error) {
            console.error('Failed to fetch game mode:', error);
            setIsLoading(false);
          }
          return;
        }
      }

      setIsLoading(true);
      setCurrentAssignment(null); // Clear any stale data
      
      try {
        console.log('🔄 Fetching assignment from API...');
        const response = await fetch('/api/game/assignment', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched fresh assignment:', data);
          setGameMode(data.mode); // Store the game mode
          
          // Create fresh assignment object
          const freshAssignment = {
            id: 'temp',
            round_id: data.round_id,
            player_id: currentPlayer.id,
            role: data.role,
            word_shown: data.word_shown,
          };
          
          setCurrentAssignment(freshAssignment);
          setAssignment(freshAssignment); // Update store
          setIsLoading(false);
        } else {
          const errorData = await response.json();
          console.error('Assignment fetch error:', errorData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch assignment:', error);
        setIsLoading(false);
      }
    };

    fetchAssignment();
  }, [currentPlayer, assignment, setAssignment]);

  // Update ready count from room data
  useEffect(() => {
    if (room && players) {
      const connectedPlayers = players.filter(p => p.connected);
      const readyPlayers = room.ready_players || [];
      setReadyCount(readyPlayers.length);
      setTotalCount(connectedPlayers.length);
      
      // Check if current player is already ready
      if (currentPlayer && readyPlayers.includes(currentPlayer.id)) {
        setIsReady(true);
      }
    }
  }, [room, players, currentPlayer]);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleReady = async () => {
    if (isReady) return; // Prevent double-clicking
    
    try {
      const response = await fetch('/api/game/ready', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReadyCount(data.readyCount || 0);
        setTotalCount(data.totalCount || 0);
        
        // Only set ready to true if the API call succeeded
        setIsReady(true);
        
        if (data.allReady) {
          console.log('All players ready! Game will advance to discussion automatically.');
        }
      } else {
        const errorData = await response.json();
        console.error('Ready API error:', errorData);
        alert(`Failed to mark ready: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to mark ready:', error);
      alert('Failed to mark ready. Please try again.');
    }
  };

  // Show loading state while fetching assignment
  if (isLoading || !currentAssignment || !currentPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your assignment...</p>
        </div>
      </div>
    );
  }

  const isImpostor = currentAssignment.role === 'IMPOSTOR';
  const wordToShow = currentAssignment.word_shown || '?';
  
  // In DECEPTION mode, impostors are shown as innocent
  const displayRole = (gameMode === 'DECEPTION' && isImpostor) ? 'INNOCENT' : (isImpostor ? 'IMPOSTOR' : 'INNOCENT');
  const displayAsImpostor = gameMode !== 'DECEPTION' && isImpostor;
  
  console.log('Fresh assignment data:', currentAssignment);
  console.log('Game mode:', gameMode, 'Is impostor:', isImpostor, 'Display role:', displayRole, 'Word to show:', wordToShow);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold">Your Secret Role</h1>
          <p className="text-muted-foreground">
            Tap the card to reveal your word. Keep it secret!
          </p>
        </motion.div>

        {/* Reveal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <Card 
            className={`reveal-card ${isRevealed ? 'flipped' : ''} h-64 cursor-pointer`}
            onClick={!isRevealed ? handleReveal : undefined}
          >
            <div className="reveal-card-inner relative w-full h-full">
              {/* Front (Hidden) */}
              <div className="reveal-card-front absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg">
                <motion.div
                  animate={{ rotate: isRevealed ? 0 : 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Tap to Reveal</h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Your secret word</span>
                </div>
              </div>

              {/* Back (Revealed) */}
              <div className="reveal-card-back absolute inset-0 flex flex-col items-center justify-center p-6 rounded-lg">
                <div className={`text-center space-y-4 ${displayAsImpostor ? 'text-destructive' : 'text-primary'}`}>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">
                      {displayRole === 'IMPOSTOR' ? 'You are the' : 'You are an'}
                    </h3>
                    <div className={`text-3xl font-bold ${displayAsImpostor ? 'text-destructive' : 'text-primary'}`}>
                      {displayRole}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your word:</p>
                    <div className="text-2xl font-bold bg-secondary/50 px-4 py-2 rounded-lg">
                      {wordToShow}
                    </div>
                  </div>

                  {displayAsImpostor && wordToShow === '?' && (
                    <div className="text-xs text-muted-foreground text-center">
                      Find the crew word through discussion
                    </div>
                  )}
                  

                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Ready Button */}
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleReady}
              disabled={isReady}
              size="xl"
              className="w-full h-16"
            >
              {isReady ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Ready! Waiting for others...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <EyeOff className="w-5 h-5" />
                  I&#39;m Ready
                </div>
              )}
            </Button>
          </motion.div>
        )}

        {/* Ready Status */}
        {isReady && totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-4"
          >
            <div className="bg-secondary/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Players Ready
              </p>
              <div className="text-2xl font-bold">
                {readyCount} / {totalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {readyCount === totalCount 
                  ? "🎉 All ready! Starting discussion..." 
                  : "Waiting for other players..."}
              </p>
            </div>
            
            {/* Host Override Button */}
            {isHost && readyCount < totalCount && (
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/game/check-ready', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
                      },
                    });
                    if (!response.ok) {
                      const errorData = await response.json();
                      alert(`Failed to start discussion: ${errorData.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('Failed to start discussion:', error);
                    alert('Failed to start discussion. Please try again.');
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Force Start Discussion (Host)
              </Button>
            )}
          </motion.div>
        )}

        {/* Tips */}
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-secondary/20 p-4 rounded-lg space-y-2"
          >
            <h4 className="font-medium text-sm">Tips:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {displayAsImpostor ? (
                <>
                  <li>• Listen carefully to find the real word</li>
                  <li>• Give vague clues that could apply to anything</li>
                  <li>• Don&#39;t be too obvious - blend in!</li>
                </>
              ) : (
                <>
                  <li>• Give specific clues about your word</li>
                  <li>• Listen for who seems confused</li>
                  <li>• Work together to find the impostor</li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

