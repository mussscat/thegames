import type { TablePair } from '@game/durak';
import { CardView } from '../../components/CardView';

export function TableView({ table }: { readonly table: readonly TablePair[] }) {
  return (
    <div className="table" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair">
          <CardView card={pair.attack} />
          {pair.defense && (
            <div className="table__defense">
              <CardView card={pair.defense} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
