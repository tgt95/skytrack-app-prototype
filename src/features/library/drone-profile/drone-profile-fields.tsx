import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectIcon,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";

export function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Number(parsed.toFixed(6))
    : null;
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <FieldRoot className="ms-field">
      <FieldLabel>{label}</FieldLabel>
      <FieldControl
        type={type}
        value={value}
        onValueChange={(next: unknown) => onChange(String(next))}
        placeholder={placeholder}
      />
    </FieldRoot>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  formatOption = (option) =>
    option === "Unspecified" ? "Not specified" : option,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  formatOption?: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <FieldRoot className="ms-field">
      <FieldLabel>{label}</FieldLabel>
      <Select<T>
        items={options.map((option) => ({
          value: option,
          label: formatOption(option),
        }))}
        value={value}
        onValueChange={(next: unknown) => onChange(String(next) as T)}
      >
        <SelectTrigger>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side="bottom" align="start" sideOffset={4}>
            <SelectPopup>
              <SelectList>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    <SelectItemIndicator />
                    <SelectItemText>{formatOption(option)}</SelectItemText>
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </FieldRoot>
  );
}

export function NumberField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number | null;
  unit: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <FieldRoot className="ms-field">
      <FieldLabel>{label}</FieldLabel>
      <FieldControl
        type="number"
        min={0}
        step="any"
        value={value === null ? "" : String(value)}
        onValueChange={(next: unknown) =>
          onChange(optionalNumber(String(next)))
        }
        placeholder={`Not specified (${unit})`}
      />
    </FieldRoot>
  );
}
