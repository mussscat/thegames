import { TAROTS, targetsOk, type DeckProfile, type PackCard, type TarotCast } from '@game/durak';
import { useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { ConfirmReplace } from './ConfirmReplace';
import { DetailSheet } from './DetailSheet';
import { replacementsFor, type Replacement } from './opening';
import { PackCardFace } from './PackCardFace';
import { TarotTargets } from './TarotTargets';
import './opening.css';

type TarotCastSheetProps = {
  readonly cast: TarotCast;
  readonly profile: DeckProfile;
  readonly error?: string | null;
  readonly onCast: (targets: readonly string[]) => void;
  readonly onSkip: () => void;
};

/** A bought shelf tarot: pick targets from its hand and apply, or skip it — it is sold either way. */
export function TarotCastSheet({ cast, profile, error = null, onCast, onSkip }: TarotCastSheetProps) {
  const [targets, setTargets] = useState<readonly string[]>([]);
  const [confirm, setConfirm] = useState<readonly Replacement[] | null>(null);
  const tarot = TAROTS[cast.tarotId];
  const card: PackCard = { kind: 'tarot', tarotId: cast.tarotId };
  const apply = (): void => {
    const changes = replacementsFor(card, targets, profile);
    if (changes.length > 0) setConfirm(changes);
    else onCast(targets);
  };
  return (
    <>
      <DetailSheet
        title={tarot.name}
        subtitle="Куплено — выбери карты"
        text={tarot.description}
        warning={error}
        art={<PackCardFace card={card} size="big" />}
        onClose={null}
        actions={
          <>
            <PixelButton tone="orange" disabled={!targetsOk(cast.tarotId, targets, profile)} onClick={apply}>
              Применить
            </PixelButton>
            <PixelButton tone="blue" onClick={onSkip}>
              Пропустить
            </PixelButton>
          </>
        }
      >
        <TarotTargets tarotId={cast.tarotId} hand={cast.hand} profile={profile} picked={targets} onChange={setTargets} />
      </DetailSheet>
      {confirm && (
        <ConfirmReplace
          changes={confirm}
          onConfirm={() => {
            setConfirm(null);
            onCast(targets);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
