// Browser-side plumbing for Web Push. Web-only: nothing here is imported by
// the native build.

const API = '/api';

// Returns Uint8Array<ArrayBuffer> rather than plain Uint8Array on purpose:
// since TS 5.7 the type is generic over its buffer, Uint8Array.from() widens
// it to ArrayBufferLike, and applicationServerKey wants a BufferSource, which
// SharedArrayBuffer-backed views do not satisfy. Allocating the ArrayBuffer
// explicitly pins the parameter.
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  // VAPID keys travel as URL-safe base64, which atob does not accept.
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

// On iOS, Push is only available to a web app that has been added to the Home
// Screen — in a Safari tab the API is simply absent. That is a state the user
// can fix, so it must read as instructions rather than as an error.
export function needsInstallForPush(): boolean {
  return isIOS() && !isStandalone() && !pushSupported();
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  // `serviceWorker.ready` never settles when registration never completes (a
  // dev server serving something other than the real script at /sw.js, or any
  // other environment where the worker never becomes active) — without a
  // bound, a settings save would hang forever instead of failing and rolling
  // back to what is actually scheduled server-side.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('service worker not ready')), 500)
    ),
  ]);
  return registration.pushManager.getSubscription();
}

export async function subscribe(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    // Required by every browser: a push must result in a visible notification.
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export async function sendSubscription(
  subscription: PushSubscription,
  hour: number,
  minute: number
): Promise<void> {
  const raw = subscription.toJSON();
  const response = await fetch(`${API}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: raw.keys,
      hour,
      minute,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!response.ok) throw new Error(`subscribe failed: ${response.status}`);
}

export async function dropSubscription(subscription: PushSubscription): Promise<void> {
  await fetch(`${API}/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
