'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Timer, Users, Package, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORD_PACKS = [
  { id: 'classic', name: 'Classic', description: 'Everyday objects and concepts' },
  { id: 'animals', name: 'Animals', description: 'Creatures from around the world' },
  { id: 'food', name: 'Food & Drinks', description: 'Culinary delights and beverages' },
  { id: 'places', name: 'Places', description: 'Cities, landmarks, and locations' },
  { id: 'movies', name: 'Movies & TV', description: 'Entertainment and pop culture' },
];

const TIMER_OPTIONS = [
  { value: undefined, label: 'No Timer', description: 'Unlimited discussion time' },
  { value: 180, label: '3 Minutes', description: 'Quick rounds' },
  { value: 300, label: '5 Minutes', description: 'Standard timing' },
  { value: 420, label: '7 Minutes', description: 'Extended discussion' },
  { value: 600, label: '10 Minutes', description: 'Thorough analysis' },
];

export function SettingsPanel({ isOpen, onOpenChange }: SettingsPanelProps) {
  const { gameSettings, setGameSettings } = useGameStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings via API (this will broadcast to other players)
      const response = await fetch('/api/game/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
        body: JSON.stringify(gameSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Still close the panel even if broadcast failed
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Word Pack */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Word Pack
                </label>
                <div className="grid gap-2">
                  {WORD_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setGameSettings({ pack: pack.id })}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        gameSettings.pack === pack.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-secondary/50'
                      )}
                    >
                      <div className="font-medium">{pack.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pack.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Mode */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Impostor Mode
                </label>
                <div className="grid gap-2">
                  <button
                    onClick={() => setGameSettings({ mode: 'BLANK' })}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      gameSettings.mode === 'BLANK'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-secondary/50'
                    )}
                  >
                    <div className="font-medium">Blank Cards</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Impostors see a "?" - classic mode
                    </div>
                  </button>

                  <button
                    onClick={() => setGameSettings({ mode: 'DECEPTION' })}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      gameSettings.mode === 'DECEPTION'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-secondary/50'
                    )}
                  >
                    <div className="font-medium">Deception Mode</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      🤯 Impostors think they're innocent - mind games!
                    </div>
                  </button>
                </div>
              </div>

              {/* Timer */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Discussion Timer
                </label>
                <div className="grid gap-2">
                  {TIMER_OPTIONS.map((option) => (
                    <button
                      key={option.value || 'none'}
                      onClick={() => setGameSettings({ timer_seconds: option.value })}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        gameSettings.timer_seconds === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-secondary/50'
                      )}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>



              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

