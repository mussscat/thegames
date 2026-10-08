type Option = { readonly id: string; readonly name: string };

type LabSelectProps<T extends string> = {
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option[];
  readonly onChange: (value: T) => void;
};

export function LabSelect<T extends string>({ label, value, options, onChange }: LabSelectProps<T>) {
  return (
    <label className="lab__slider">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
