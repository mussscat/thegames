import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DurakFightScreen } from './games/durak/DurakFightScreen';
import { MenuScreen } from './screens/MenuScreen';
import { randomSeed, seedFromUrl } from './seed';

type Screen = { readonly name: 'menu' } | { readonly name: 'durak'; readonly seed: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const toMenu = (): void => setScreen({ name: 'menu' });

  return (
    <ErrorBoundary onReset={toMenu}>
      {screen.name === 'durak' ? (
        <DurakFightScreen
          key={screen.seed}
          seed={screen.seed}
          onExit={toMenu}
          onRestart={() => setScreen({ name: 'durak', seed: randomSeed() })}
        />
      ) : (
        <MenuScreen onStartDurak={() => setScreen({ name: 'durak', seed: seedFromUrl(window.location.search) })} />
      )}
    </ErrorBoundary>
  );
}
