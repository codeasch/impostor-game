'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Package, Timer, Zap, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGameStore } from '@/stores/game-store'
import { cn } from '@/lib/utils'

interface WordPackMeta { id: string; name: string; description: string }

const DEFAULT_WORD_PACKS: WordPackMeta[] = [
  { id: 'random', name: 'Random (All Packs)', description: 'Mixed bag from every category' },
  { id: 'classic', name: 'Classic', description: 'Everyday objects and concepts' },
  { id: 'animals', name: 'Animals', description: 'Creatures from around the world' },
  { id: 'food', name: 'Food & Drinks', description: 'Culinary delights and beverages' },
  { id: 'places', name: 'Places', description: 'Cities, landmarks, and locations' },
  { id: 'movies', name: 'Movies & TV', description: 'Entertainment and pop culture' },
  { id: 'sports', name: 'Sports', description: 'Games, teams, events, and gear' },
  { id: 'music', name: 'Music', description: 'Genres, instruments, and roles' },
  { id: 'technology', name: 'Technology', description: 'Everyday tech and apps' },
  { id: 'jobs', name: 'Jobs & Professions', description: 'Occupations and workplaces' },
  { id: 'nature', name: 'Nature', description: 'Biomes, weather, and phenomena' },
  { id: 'trending', name: 'Trending', description: 'Current events, memes, and pop culture' },
]

export function SettingsDropdown() {
  const { gameSettings, setGameSettings } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [availablePacks, setAvailablePacks] = useState<WordPackMeta[]>(DEFAULT_WORD_PACKS)
  const [showPackList, setShowPackList] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true
    fetch('/packs/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: WordPackMeta[]) => {
        if (Array.isArray(data) && isMounted) setAvailablePacks(data)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowPackList(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowPackList(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/game/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('impostor_token')}`,
        },
        body: JSON.stringify(gameSettings),
      })
      if (!response.ok) throw new Error('Failed to save settings')
      setIsOpen(false)
    } catch (err) {
      console.error('Error saving settings:', err)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPack = availablePacks.find(p => p.id === gameSettings.pack)

  return (
    <div ref={rootRef} className="relative">
      <Button
        onClick={() => setIsOpen((v) => !v)}
        variant="secondary"
        size="sm"
        className="h-9 gap-2"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Settings className="w-4 h-4" />
        Settings
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            {/* Modal content (no backdrop darken/blur) */}
            <motion.div
              ref={rootRef}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-[min(92vw,640px)] max-h-[85vh] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/50"
            >
              <div className="p-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Settings className="w-4 h-4 text-primary" /> Game Settings
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:underline">Close</button>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Pack select */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" /> Word Pack
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowPackList((v) => !v)}
                    className="w-full flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-sm"
                    aria-expanded={showPackList}
                  >
                    <span className="truncate">
                      {selectedPack ? selectedPack.name : 'Select a pack'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <AnimatePresence>
                    {showPackList && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-border/60 bg-card/80 backdrop-blur-xl shadow-lg"
                      >
                        <div className="max-h-56 overflow-y-auto">
                          {availablePacks.map((pack) => (
                            <button
                              key={pack.id}
                              onClick={() => {
                                setGameSettings({ pack: pack.id })
                                setShowPackList(false)
                              }}
                              className={cn(
                                'w-full px-3 py-2 text-left text-sm hover:bg-secondary/40 flex items-center justify-between',
                                gameSettings.pack === pack.id ? 'bg-primary/10 text-primary' : ''
                              )}
                            >
                              <span className="truncate">{pack.name}</span>
                              {gameSettings.pack === pack.id && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Mode select */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4" /> Impostor Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameSettings({ mode: 'BLANK' })}
                    className={cn(
                      'p-2 rounded-lg border text-sm',
                      gameSettings.mode === 'BLANK' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary/40'
                    )}
                  >
                    Classic
                  </button>
                  <button
                    onClick={() => setGameSettings({ mode: 'DECEPTION' })}
                    className={cn(
                      'p-2 rounded-lg border text-sm',
                      gameSettings.mode === 'DECEPTION' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary/40'
                    )}
                  >
                    Deception
                  </button>
                </div>
              </div>

              {/* Timer select */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                  <Timer className="w-4 h-4" /> Discussion Timer
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 60, label: '1 min' },
                    { value: 120, label: '2 min' },
                    { value: 180, label: '3 min' },
                    { value: 300, label: '5 min' },
                    { value: 420, label: '7 min' },
                    { value: undefined, label: 'No timer' },
                  ].map((opt) => (
                    <button
                      key={String(opt.value ?? 'none')}
                      onClick={() => setGameSettings({ timer_seconds: opt.value })}
                      className={cn(
                        'p-2 rounded-lg border text-sm',
                        gameSettings.timer_seconds === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  'Save Settings'
                )}
              </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


