import { createRun, type RunState } from '@game/durak';
import { useRef, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DurakRunScreen } from './games/durak/DurakRunScreen';
import { browserStore, clearRun, loadRun, type LoadResult } from './games/durak/runStorage';
import { MenuScreen } from './screens/MenuScreen';
import { randomSeed, seedFromUrl } from './seed';

type Screen = { readonly name: 'menu' } | { readonly name: 'run'; readonly run: RunState; readonly key: number };

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

  return (
    <ErrorBoundary onReset={toMenu}>
      {screen.name === 'run' ? (
        <DurakRunScreen key={screen.key} initialRun={screen.run} onExit={toMenu} onNewRun={() => startNewRun(randomSeed())} />
      ) : (
        <MenuScreen
          canContinue={saved.status === 'ok'}
          saveInvalid={saved.status === 'invalid'}
          onNewRun={() => startNewRun(seedFromUrl(window.location.search))}
          onContinue={() => {
            if (saved.status === 'ok') openRun(saved.run);
          }}
        />
      )}
    </ErrorBoundary>
  );
}
