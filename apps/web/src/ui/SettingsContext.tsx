import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { browserStore } from '../storage';
import { loadSettings, parseSettings, saveSettings, type Settings } from './settings';
import { playSound, setVolume, type SoundName } from './sound';

type SettingsApi = {
  readonly settings: Settings;
  readonly update: (patch: Partial<Settings>) => void;
  readonly play: (name: SoundName) => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(browserStore()));

  useEffect(() => setVolume(settings.volume), [settings.volume]);

  const update = useCallback(
    (patch: Partial<Settings>): void => {
      const next = parseSettings({ ...settings, ...patch });
      setSettings(next);
      const store = browserStore();
      if (store) saveSettings(store, next);
    },
    [settings],
  );
  const play = useCallback((name: SoundName): void => playSound(name, settings.sound), [settings.sound]);
  const api = useMemo(() => ({ settings, update, play }), [settings, update, play]);

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api) throw new Error('useSettings must be used inside <SettingsProvider>');
  return api;
}
