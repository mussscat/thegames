import { createRun, type RunState } from '@game/durak';
import { useRef, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DurakRunScreen } from './games/durak/DurakRunScreen';
import { browserStore, clearRun, loadRun, type LoadResult } from './games/durak/runStorage';
import { MenuScreen } from './screens/MenuScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { randomSeed, seedFromUrl } from './seed';
import { Backdrop } from './ui/Backdrop';
import { SettingsProvider } from './ui/SettingsContext';

type Screen =
  | { readonly name: 'menu' }
  | { readonly name: 'settings' }
  | { readonly name: 'run'; readonly run: RunState; readonly key: number };

function loadSaved(): LoadResult {
  const store = browserStore();
  return store ? loadRun(store) : { status: 'none' };
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [saved, setSaved] = useState<LoadResult>(loadSaved);
  const runKey = useRef(0);

  const openRun = (run: RunState): void => {
    runKey.current += 1;
    setScreen({ name: 'run', run, key: runKey.current });
  };
  const startNewRun = (seed: number): void => {
    const store = browserStore();
    if (store) clearRun(store);
    openRun(createRun(seed));
  };
  const toMenu = (): void => {
    setSaved(loadSaved());
    setScreen({ name: 'menu' });
  };

  const renderScreen = () => {
    if (screen.name === 'run') {
      return <DurakRunScreen key={screen.key} initialRun={screen.run} onExit={toMenu} onNewRun={() => startNewRun(randomSeed())} />;
    }
    if (screen.name === 'settings') return <SettingsScreen onBack={() => setScreen({ name: 'menu' })} />;
    return (
      <MenuScreen
        canContinue={saved.status === 'ok'}
        saveInvalid={saved.status === 'invalid'}
        onNewRun={() => startNewRun(seedFromUrl(window.location.search))}
        onContinue={() => {
          if (saved.status === 'ok') openRun(saved.run);
        }}
        onSettings={() => setScreen({ name: 'settings' })}
      />
    );
  };

  return (
    <SettingsProvider>
      <Backdrop />
      <ErrorBoundary onReset={toMenu}>{renderScreen()}</ErrorBoundary>
    </SettingsProvider>
  );
}
