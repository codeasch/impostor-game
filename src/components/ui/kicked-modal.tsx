'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { useEffect } from 'react';

type Accent = 'primary' | 'destructive' | 'accent' | 'green' | 'yellow';

interface KickedModalProps {
  open: boolean;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  onConfirmHref?: string;
  confirmText?: string;
  onClose?: () => void;
}

export function KickedModal({ open, title = 'You have been removed', description = 'The host has removed you from this room. You can return to the home screen to join or create another game.', icon, accent = 'destructive', onConfirmHref = '/', confirmText = 'Go to Home', onClose }: KickedModalProps) {
  useEffect(() => {
    if (!open) return;
    // Clear any room token to prevent accidental reuse
    try {
      const tokens = JSON.parse(localStorage.getItem('impostor_tokens') || '{}');
      const code = window.location.pathname.split('/').pop()?.toUpperCase();
      if (code && tokens[code]) delete tokens[code];
      localStorage.setItem('impostor_tokens', JSON.stringify(tokens));
      localStorage.removeItem('impostor_token');
    } catch {}
  }, [open]);

  const accentClasses: Record<Accent, { bg: string; text: string; ring?: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
    accent: { bg: 'bg-accent/10', text: 'text-accent' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  };
  const a = accentClasses[accent] ?? accentClasses.destructive;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl"
          >
            <div className="p-6 text-center space-y-4">
              <div className={`mx-auto w-16 h-16 rounded-full ${a.bg} flex items-center justify-center`}>
                {icon ?? <XCircle className={`w-8 h-8 ${a.text}`} />}
              </div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
              <div className="pt-2">
                <button
                  onClick={() => { if (onClose) onClose(); window.location.href = onConfirmHref || '/'; }}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


