import type { ReactNode } from "react";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";

interface InspectorFieldProps {
  label: ReactNode;
  labelId?: string;
  labelClassName?: string;
  className?: string;
  children: ReactNode;
}

export function InspectorField({
  label,
  labelId,
  labelClassName = "w-100/2 text-sm leading-normal font-medium text-(--muted-foreground)",
  className = "flex flex-row items-center gap-2",
  children,
}: InspectorFieldProps) {
  return (
    <FieldRoot className={className}>
      <FieldLabel className={labelClassName} id={labelId}>
        {label}
      </FieldLabel>
      {children}
    </FieldRoot>
  );
}
