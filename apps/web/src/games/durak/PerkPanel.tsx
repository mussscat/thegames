import { MAX_PERKS, PERKS, type PerkId } from '@game/durak';

/** The player's perks: a framed slot list; empty frame when there are none. Cards are text-only for now (art later). */
export function PerkPanel({ perks }: { readonly perks: readonly PerkId[] }) {
  return (
    <section className={perks.length > 0 ? 'perks panel' : 'perks perks--empty panel'} aria-label="Перки">
      <header className="perks__head">
        <h3 className="perks__title">Перки</h3>
        <span className="perks__count">
          {perks.length}/{MAX_PERKS}
        </span>
      </header>
      <ul className="perks__list">
        {perks.map((id) => (
          <li key={id} className="perks__card">
            <strong className="perks__name">{PERKS[id].name}</strong>
            <span className="perks__text">{PERKS[id].description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
