import { ErrorBoundary } from './ErrorBoundary';
import { MenuScreen } from './screens/MenuScreen';

export function App() {
  return (
    <ErrorBoundary onReset={() => undefined}>
      <MenuScreen onStartDurak={() => undefined} />
    </ErrorBoundary>
  );
}
