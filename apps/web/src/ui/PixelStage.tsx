import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { SCREEN_TARGET, type Viewport } from './pixelScale';
import { StageContext, type StageInfo } from './StageContext';
import { stageLayout } from './stageLayout';

function readViewport(): Viewport {
  const vv = window.visualViewport;
  return { cssW: vv?.width ?? window.innerWidth, cssH: vv?.height ?? window.innerHeight, dpr: window.devicePixelRatio };
}

/** The viewport, re-read on resize and rotation but not while a finger is down (a gesture must not re-flow the screen). */
function useStageViewport(): Viewport {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    let touching = false;
    let pending = false;
    const apply = (): void => {
      pending = false;
      setViewport(readViewport());
    };
    const onResize = (): void => {
      if (touching) pending = true;
      else apply();
    };
    const down = (): void => {
      touching = true;
    };
    const up = (): void => {
      touching = false;
      if (pending) apply();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);
  return viewport;
}

/**
 * The game's root: a box `artW × artH` CSS px (= art pixels) scaled by `cssPerArt`, so one art pixel is a whole number
 * of device pixels. Everything inside is laid out in plain px; `container-type: size` lets screens use `@container`
 * queries in art pixels instead of viewport media queries.
 */
export function PixelStage({ children, background }: { readonly children: ReactNode; readonly background?: ReactNode }) {
  const viewport = useStageViewport();
  const layout = useMemo(() => stageLayout(viewport, SCREEN_TARGET), [viewport]);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const info = useMemo<StageInfo>(
    () => ({
      cssPerArt: layout.cssPerArt,
      artW: layout.artW,
      artH: layout.artH,
      root,
      frame: () => {
        const rect = root?.getBoundingClientRect();
        return { left: rect?.left ?? 0, top: rect?.top ?? 0, cssPerArt: layout.cssPerArt };
      },
    }),
    [layout, root],
  );
  const style = {
    left: layout.offsetX,
    top: layout.offsetY,
    width: layout.artW,
    height: layout.artH,
    transform: `scale(${layout.cssPerArt})`,
    '--k': layout.cssPerArt,
  } as CSSProperties;
  return (
    <StageContext.Provider value={info}>
      {background}
      <div className="stage" ref={setRoot} style={style} data-art-w={layout.artW} data-art-h={layout.artH} data-n={layout.n}>
        {children}
      </div>
    </StageContext.Provider>
  );
}
