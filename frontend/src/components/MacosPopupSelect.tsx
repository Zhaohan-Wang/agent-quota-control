import { ChevronsUpDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type MacosPopupSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function MacosPopupSelect({
  className,
  children,
  onChange,
  ...props
}: MacosPopupSelectProps) {
  return (
    <div className={["macos-popup", className].filter(Boolean).join(" ")}>
      <select
        {...props}
        onChange={(event) => {
          onChange?.(event);
          event.currentTarget.blur();
        }}
      >
        {children}
      </select>
      <span className="macos-popup-indicator" aria-hidden>
        <ChevronsUpDown size={11} strokeWidth={2.4} />
      </span>
    </div>
  );
}
