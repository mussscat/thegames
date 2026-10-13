import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CRT_DEFAULT, CrtOverlay, type CrtSettings } from './CrtOverlay';
import { PILOT_MOTION, PilotCard, type PilotMotion } from './PilotCard';
import { computeScale, PILOT_TARGET, type PixelScale } from './pixelScale';
import './pilot.css';

type Mode = 'zoom' | 'transform' | 'var';
type FontChoice = { readonly id: string; readonly name: string; readonly family: string };

const MODES: readonly { readonly id: Mode; readonly name: string }[] = [
  { id: 'zoom', name: 'CSS zoom' },
  { id: 'transform', name: 'transform: scale' },
  { id: 'var', name: 'calc(--px × k)' },
];
const FONTS: readonly FontChoice[] = [
  { id: 'm6x11', name: 'm6x11 (Balatro)', family: "'m6x11', monospace" },
  { id: 'pixelify', name: 'Pixelify Sans', family: "'Pixelify Sans', monospace" },
  { id: 'tiny5', name: 'Tiny5', family: "'Tiny5', monospace" },
  { id: 'handjet', name: 'Handjet', family: "'Handjet', monospace" },
  { id: 'press', name: 'Press Start 2P', family: "'Press Start 2P', monospace" },
];
const WINDOW_ART = { w: 180, h: 240 } as const;
const BAR_INNER = 134;
const EPSILON = 0.02;

function useViewport() {
  const read = () => ({ cssW: window.visualViewport?.width ?? window.innerWidth, cssH: window.visualViewport?.height ?? window.innerHeight, dpr: window.devicePixelRatio });
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const update = (): void => setViewport(read());
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return viewport;
}

/** Share of `[data-sprite]` boxes whose width is a whole number of art pixels; returns the offenders. */
function measure(root: HTMLElement | null, cssPerArt: number): readonly string[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[data-sprite]')).flatMap((el) => {
    const w = el.getBoundingClientRect().width / cssPerArt;
    const h = el.getBoundingClientRect().height / cssPerArt;
    const bad = Math.abs(w - Math.round(w)) > EPSILON || Math.abs(h - Math.round(h)) > EPSILON;
    return bad ? [`${el.dataset.sprite}: ${w.toFixed(2)}×${h.toFixed(2)}`] : [];
  });
}

function stageStyle(mode: Mode, scale: PixelScale, artW: number, artH: number): { readonly sizer: CSSProperties; readonly stage: CSSProperties } {
  const css = scale.cssPerArt;
  if (mode === 'var') return { sizer: { width: artW * css, height: artH * css }, stage: { '--u': `${css}px`, width: artW * css, height: artH * css } as CSSProperties };
  if (mode === 'zoom') return { sizer: { width: artW * css, height: artH * css }, stage: { '--u': '1px', width: artW, height: artH, zoom: css } as CSSProperties };
  return { sizer: { width: artW * css, height: artH * css }, stage: { '--u': '1px', width: artW, height: artH, transform: `scale(${css})`, transformOrigin: '0 0' } as CSSProperties };
}

export function PixelPilotTab() {
  const viewport = useViewport();
  const [mode, setMode] = useState<Mode>('zoom');
  const [full, setFull] = useState(false);
  const [grid, setGrid] = useState(false);
  const [forceN, setForceN] = useState(0);
  const [fontId, setFontId] = useState(FONTS[0]?.id ?? 'm6x11');
  const [fontSize, setFontSize] = useState(11);
  const [hp, setHp] = useState(14);
  const [snap, setSnap] = useState(false);
  const [feel, setFeel] = useState<PilotMotion>(PILOT_MOTION);
  const [angle, setAngle] = useState(0);
  const [sway, setSway] = useState(false);
  const [jumpKey, setJumpKey] = useState(0);
  const [crt, setCrt] = useState<CrtSettings>(CRT_DEFAULT);
  const [sheet, setSheet] = useState(false);
  const [bad, setBad] = useState<readonly string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  const scale = useMemo(() => computeScale(viewport, PILOT_TARGET, forceN > 0 ? forceN : undefined), [viewport, forceN]);
  const artW = full ? scale.artW : WINDOW_ART.w;
  const artH = full ? scale.artH : WINDOW_ART.h;
  const { sizer, stage } = stageStyle(mode, scale, artW, artH);
  const family = FONTS.find((f) => f.id === fontId)?.family ?? '';
  const fill = Math.round((hp / 20) * BAR_INNER);
  const gridPx = scale.cssPerArt >= 3 ? 1 : 8;

  useLayoutEffect(() => {
    setBad(measure(stageRef.current, scale.cssPerArt));
  }, [mode, full, scale.cssPerArt, artW, artH, fontSize, fontId, hp]);

  const vars = { ...stage, '--pp-font': family, '--pp-font-size': fontSize, '--pp-lh': fontSize + 2, '--pp-grid': `calc(var(--u) * ${gridPx})` } as CSSProperties;
  const stageEl = (
    <div className="pp-sizer" style={sizer}>
      <div className="pp-stage" ref={stageRef} style={vars}>
        <section className="pp-panel" data-sprite="panel">
          <h2 className="pp-title">Бой</h2>
          <p className="pp-text">Враг бьёт на 6. Сыграй пару, чтобы закрыться.</p>
          <div className="pp-hp" data-sprite="hp-frame" role="meter" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={20} aria-label="HP">
            <div className="pp-hp__fill" style={{ width: `calc(var(--u) * ${fill})` }} />
          </div>
          <button type="button" className="pp-btn" data-sprite="button"><span>Сыграть</span></button>
          <button type="button" className="pp-btn" data-sprite="button-disabled" disabled><span>Недоступно</span></button>
          {full && <button type="button" className="pp-btn" onClick={() => setFull(false)}><span>Закрыть</span></button>}
        </section>
        <PilotCard unit={mode === 'var' ? scale.cssPerArt : 1} snap={snap} angle={angle} feel={feel} sway={sway} jumpKey={jumpKey} onTap={() => setJumpKey((k) => k + 1)} />
        <CrtOverlay settings={crt} />
        {grid && <div className="pp-grid" aria-hidden="true" />}
      </div>
    </div>
  );

  const controls = (
    <>
      <div className="pp-controls">
        <label>Масштаб <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>{MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>n (0 = авто) <input type="number" min={0} max={12} value={forceN} onChange={(e) => setForceN(Number(e.target.value))} style={{ width: 56 }} /></label>
        <label>Шрифт <select value={fontId} onChange={(e) => setFontId(e.target.value)}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label>Кегль (px арта) <input type="number" min={4} max={24} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: 56 }} /></label>
        <label>HP <input type="range" min={0} max={20} value={hp} onChange={(e) => setHp(Number(e.target.value))} /></label>
        <label>Наклон карты <input type="range" min={-30} max={30} value={angle} onChange={(e) => setAngle(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={sway} onChange={(e) => setSway(e.target.checked)} /> Качание</label>
        <label>Жёсткость: {feel.stiffness} <input type="range" min={60} max={800} step={10} value={feel.stiffness} onChange={(e) => setFeel({ ...feel, stiffness: Number(e.target.value) })} /></label>
        <label>Затухание: {feel.damping} <input type="range" min={3} max={40} step={1} value={feel.damping} onChange={(e) => setFeel({ ...feel, damping: Number(e.target.value) })} /></label>
        <label>Высота прыжка: {feel.height} <input type="range" min={2} max={60} step={1} value={feel.height} onChange={(e) => setFeel({ ...feel, height: Number(e.target.value) })} /></label>
        <label>Период качания, мс: {feel.period} <input type="range" min={150} max={2000} step={50} value={feel.period} onChange={(e) => setFeel({ ...feel, period: Number(e.target.value) })} /></label>
        <label>Размах качания, °: {feel.amplitude} <input type="range" min={1} max={30} step={1} value={feel.amplitude} onChange={(e) => setFeel({ ...feel, amplitude: Number(e.target.value) })} /></label>
        <label><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Прыжок по пикселям арта</label>
        <button type="button" className="pbtn pbtn--small" onClick={() => setJumpKey((k) => k + 1)}>Прыжок карты</button>
        <label><input type="checkbox" checked={crt.on} onChange={(e) => setCrt({ ...crt, on: e.target.checked })} /> ЭЛТ</label>
        <label>Скан-линии, %: {crt.scan} <input type="range" min={0} max={70} step={1} value={crt.scan} onChange={(e) => setCrt({ ...crt, scan: Number(e.target.value) })} /></label>
        <label>Шаг линий <select value={crt.period} onChange={(e) => setCrt({ ...crt, period: Number(e.target.value) })}><option value={1}>1 px арта</option><option value={0.5}>½ px арта</option><option value={0.25}>¼ px арта</option></select></label>
        <label>Виньетка, %: {crt.vignette} <input type="range" min={0} max={80} step={1} value={crt.vignette} onChange={(e) => setCrt({ ...crt, vignette: Number(e.target.value) })} /></label>
        <label>Холодный тон, %: {crt.tint} <input type="range" min={0} max={40} step={1} value={crt.tint} onChange={(e) => setCrt({ ...crt, tint: Number(e.target.value) })} /></label>
        <label><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Сетка</label>
        <button type="button" className="pbtn pbtn--small pbtn--orange" onClick={() => { setFull(true); setSheet(false); }}>На весь экран</button>
      </div>
      <pre className={bad.length > 0 ? 'pp-readout pp-readout--bad' : 'pp-readout'}>
        {`dpr ${viewport.dpr}  окно ${Math.round(viewport.cssW)}×${Math.round(viewport.cssH)} css\nn = ${scale.n}  1 px арта = ${scale.cssPerArt.toFixed(4)} css  экран ${scale.artW}×${scale.artH} арта\n${bad.length === 0 ? 'все data-sprite кратны пикселю арта' : `НЕ кратны (${bad.length}): ${bad.join('; ')}`}`}
      </pre>
    </>
  );

  return (
    <div className="pp-wrap">
      {full ? null : controls}
      {full ? (
        <div className="pp-full">
          {stageEl}
          <button type="button" className="pbtn pbtn--small pp-full__gear" onClick={() => setSheet((s) => !s)}>{sheet ? 'Скрыть' : 'Настройки'}</button>
          {sheet && <div className="pp-full__sheet">{controls}</div>}
        </div>
      ) : stageEl}
    </div>
  );
}
