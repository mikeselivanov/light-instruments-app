import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'install-prompt-dismissed:v1';

export type InstallPrompt = {
  canPrompt: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Parked by the inline script in public/index.html, which is listening long
// before this module is even downloaded.
type WindowWithParkedPrompt = Window & {
  __installPromptEvent?: BeforeInstallPromptEvent | null;
};

function parkedPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return (window as WindowWithParkedPrompt).__installPromptEvent ?? null;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ reports a Mac user agent, so it is identified by the touch
  // points instead — the usual workaround.
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    // Safari in private mode throws on localStorage access. Treating that as
    // "not dismissed" is the harmless direction: the banner can be closed
    // again, whereas swallowing it would hide install entirely.
    return false;
  }
}

export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Both start in the state that hides the banner, so nothing flashes on the
  // first paint before the effect has read the real values.
  const [dismissed, setDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
    setIsInstalled(detectInstalled());

    // Chrome fires beforeinstallprompt once and does not replay it, and it
    // routinely fires before this component exists: the whole app is gated
    // behind expo-font in the root layout, so nothing React-side is listening
    // for the first second or so of a cold load. index.html catches it for us.
    setDeferred(parkedPrompt());

    const onBeforeInstall = (event: Event) => {
      // Suppress Chrome's own banner in favour of ours — the native one is
      // easy to miss.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onParked = () => setDeferred(parkedPrompt());
    const onInstalled = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('installpromptready', onParked);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('installpromptready', onParked);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS = detectIOS();

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Nothing to recover: the banner is hidden for this session regardless.
    }
  };

  return {
    // iOS has no beforeinstallprompt at all, so it qualifies on the platform
    // check alone — the banner shows instructions there instead of a button.
    canPrompt: !isInstalled && !dismissed && (deferred !== null || isIOS),
    isIOS,
    isInstalled,
    promptInstall: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      // The event is single-use: clear the parked copy too, or a later mount
      // would pick up a spent one and offer a button that does nothing.
      (window as WindowWithParkedPrompt).__installPromptEvent = null;
      setDeferred(null);
      dismiss();
    },
    dismiss,
  };
}
