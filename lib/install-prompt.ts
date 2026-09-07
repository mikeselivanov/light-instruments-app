// Native stub. On a real install there is nothing to prompt for, so the
// banner never renders — the web build gets the real implementation from
// install-prompt.web.ts.
export type InstallPrompt = {
  canPrompt: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
};

export function useInstallPrompt(): InstallPrompt {
  return {
    canPrompt: false,
    isIOS: false,
    isInstalled: true,
    promptInstall: async () => {},
    dismiss: () => {},
  };
}
