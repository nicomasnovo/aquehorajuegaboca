// Hook para manejar el prompt de instalación PWA

import { useState, useEffect } from 'react';
import type { InstallPromptEvent } from '../types';

interface UseInstallPromptReturn {
  isStandalone: boolean;
  deferredInstall: InstallPromptEvent | null;
  requestInstall: () => Promise<'accepted' | 'dismissed' | null>;
}

/**
 * Hook para manejar la instalación de la PWA.
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredInstall, setDeferredInstall] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    checkStandalone();

    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener('change', checkStandalone);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setIsStandalone(true);
      setDeferredInstall(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      media.removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const requestInstall = async (): Promise<'accepted' | 'dismissed' | null> => {
    if (deferredInstall) {
      await deferredInstall.prompt();
      const choice = await deferredInstall.userChoice;
      setDeferredInstall(null);
      return choice.outcome;
    }
    return null;
  };

  return { isStandalone, deferredInstall, requestInstall };
}
