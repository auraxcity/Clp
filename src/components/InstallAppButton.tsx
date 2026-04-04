'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, X } from 'lucide-react';

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('clp-pwa-dismissed');
    if (stored) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> });
    };
    window.addEventListener('beforeinstallprompt', handler);

    const standalone = (navigator as { standalone?: boolean }).standalone ?? window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) setIsInstalled(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setDismissed(true);
    localStorage.setItem('clp-pwa-dismissed', '1');
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('clp-pwa-dismissed', '1');
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 flex items-center gap-3 bg-[#0A1F44] text-white rounded-xl shadow-lg p-4 border border-[#D4AF37]/30">
      <Download className="h-5 w-5 text-[#D4AF37] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install CLP App</p>
        <p className="text-xs text-gray-300">Add to home screen for quick access on desktop, iOS, or Android.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" onClick={handleInstall} className="!bg-[#D4AF37] !text-[#0A1F44] hover:!bg-[#c49e2e]">
          Install
        </Button>
        <button type="button" onClick={handleDismiss} className="p-1 rounded hover:bg-white/10" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
