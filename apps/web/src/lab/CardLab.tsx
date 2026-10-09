import { makeCard, type Card } from '@game/core';
import { ENHANCEMENT_IDS, ENHANCEMENTS, type EnhancementId } from '@game/durak';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BACKGROUND_SPEED } from '../ui/Backdrop';
import { FEEL, type Feel } from '../ui/FeelBox';
import { PALETTE_IDS, PALETTES, type PaletteId } from '../ui/palettes';
import { PixelCard } from '../ui/PixelCard';
import { playSound, setVolume } from '../ui/sound';
import { SwirlBackground } from '../ui/SwirlBackground';
import { FontTab } from './FontTab';
import { GalleryTab } from './GalleryTab';
import { HighlightTab } from './HighlightTab';
import { PacksTab } from './PacksTab';
import './labFonts';
import '../games/durak/shop.css';
import './lab.css';
import { TrumpTab } from './TrumpTab';

const TABS = [
  { id: 'card', name: 'Карта' },
  { id: 'font', name: 'Шрифт' },
  { id: 'highlight', name: 'Подсветка' },
  { id: 'trump', name: 'Козырь' },
  { id: 'gallery', name: 'Галерея' },
  { id: 'packs', name: 'Паки' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const HERO: Card = makeCard('hearts', 12);
const HAND: readonly Card[] = [makeCard('spades', 7), makeCard('clubs', 10), makeCard('diamonds', 14), makeCard('hearts', 9), makeCard('spades', 13)];

type SliderProps = { readonly label: string; readonly value: number; readonly min: number; readonly max: number; readonly step?: number; readonly onChange: (v: number) => void };

function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <label className="lab__slider">
      <span>
        {label}: {value}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function CardLab() {
  const [feel, setFeel] = useState<Feel>(FEEL);
  const [paletteId, setPaletteId] = useState<PaletteId>('neon');
  const [speed, setSpeed] = useState(BACKGROUND_SPEED);
  const [volume, setVolumeState] = useState(0.35);
  const [sound, setSound] = useState(true);
  const [faceDown, setFaceDown] = useState(false);
  const [enhancement, setEnhancement] = useState<EnhancementId | undefined>('golden');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [played, setPlayed] = useState(false);
  const [panel, setPanel] = useState(false);
  const [tab, setTab] = useState<Tab>('card');
  const palette = PALETTES[paletteId];
  const tune = (patch: Partial<Feel>): void => setFeel((f) => ({ ...f, ...patch }));

  const toggle = (card: Card): void => {
    const isSelected = selected.has(card.id);
    playSound(isSelected ? 'deselect' : 'select', sound);
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };
  const play = (): void => {
    playSound('play', sound);
    setPlayed(true);
    window.setTimeout(() => setPlayed(false), 900);
  };

  return (
    <div className="lab">
      <SwirlBackground colors={palette.colors} pixel={feel.pixel * 2} speed={speed} />
      <div className="crt" aria-hidden="true" />
      <main className="lab__stage">
        <h1 className="lab__title">Лаборатория карты</h1>
        <nav className="lab__tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={t.id === tab ? 'pbtn pbtn--small pbtn--orange' : 'pbtn pbtn--small pbtn--blue'} onClick={() => setTab(t.id)}>
              {t.name}
            </button>
          ))}
        </nav>
        {tab === 'font' && <FontTab />}
        {tab === 'highlight' && <HighlightTab />}
        {tab === 'trump' && <TrumpTab />}
        {tab === 'gallery' && <GalleryTab />}
        {tab === 'packs' && <PacksTab />}
        {tab === 'card' && (
          <>
        <div className="lab__hero">
          <AnimatePresence>
            {!played && (
              <motion.div key="hero" exit={{ y: -260, rotate: 25, opacity: 0, scale: 0.6 }} transition={{ duration: 0.45, ease: 'easeIn' }}>
                <PixelCard
                  card={HERO}
                  feel={feel}
                 
                  width={150}
                  enhancement={enhancement}
                  faceDown={faceDown}
                  onTap={() => playSound('select', sound)}
                  onHover={() => playSound('hover', sound)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="lab__actions">
          <button type="button" className="pbtn pbtn--blue" onClick={() => { playSound('flip', sound); setFaceDown((f) => !f); }}>
            Перевернуть
          </button>
          <button type="button" className="pbtn pbtn--red" onClick={play}>
            Сыграть
          </button>
          <button type="button" className="pbtn pbtn--orange" onClick={() => playSound('coin', sound)}>
            +1 монета
          </button>
        </div>
        <div className="lab__hand">
          {HAND.map((card, i) => (
            <div key={card.id} className="lab__hand-slot" style={{ transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 6}px)` }}>
              <PixelCard card={card} feel={feel} width={64} selected={selected.has(card.id)} swayDelay={i * 0.4} onTap={() => toggle(card)} />
            </div>
          ))}
        </div>
        <div className="lab__gallery">
          {ENHANCEMENT_IDS.map((id, i) => (
            <PixelCard key={id} card={HAND[i] ?? HERO} feel={feel} width={66} enhancement={id} swayDelay={i * 0.3} showLabel onTap={() => playSound('select', sound)} />
          ))}
        </div>
          </>
        )}
      </main>

      {tab === 'card' && (
      <section className={panel ? 'lab__panel' : 'lab__panel lab__panel--closed'}>
        <button type="button" className="pbtn pbtn--small" onClick={() => setPanel((p) => !p)}>
          {panel ? 'Скрыть настройки' : 'Настройки'}
        </button>
        {panel && (
          <div className="lab__controls">
            <Slider label="Наклон" value={feel.tilt} min={0} max={40} onChange={(tilt) => tune({ tilt })} />
            <Slider label="Покачивание" value={feel.sway} min={0} max={6} step={0.5} onChange={(sway) => tune({ sway })} />
            <Slider label="Жёсткость пружины" value={feel.stiffness} min={60} max={600} step={10} onChange={(stiffness) => tune({ stiffness })} />
            <Slider label="Затухание" value={feel.damping} min={5} max={40} onChange={(damping) => tune({ damping })} />
            <Slider label="Пиксель" value={feel.pixel} min={1} max={6} onChange={(pixel) => tune({ pixel })} />
            <Slider label="Скорость фона" value={speed} min={0} max={3} step={0.1} onChange={setSpeed} />
            <Slider
              label="Громкость"
              value={volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => {
                setVolumeState(v);
                setVolume(v);
                playSound('select', sound);
              }}
            />
            <label className="lab__slider">
              <span>Палитра</span>
              <select value={paletteId} onChange={(e) => setPaletteId(e.target.value as PaletteId)}>
                {PALETTE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PALETTES[id].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="lab__slider">
              <span>Усиление</span>
              <select value={enhancement ?? ''} onChange={(e) => setEnhancement((e.target.value || undefined) as EnhancementId | undefined)}>
                <option value="">нет</option>
                {ENHANCEMENT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {ENHANCEMENTS[id].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="lab__check">
              <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Звук
            </label>
            <button type="button" className="pbtn pbtn--small" onClick={() => setFeel(FEEL)}>
              Сбросить
            </button>
            <pre className="lab__dump">{JSON.stringify({ ...feel, palette: palette.name, speed }, null, 0)}</pre>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
