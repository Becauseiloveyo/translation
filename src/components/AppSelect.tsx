import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

export type AppSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type AppSelectProps = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
};

export function AppSelect({ value, options, onChange, label, className = "", buttonClassName = "", placeholder = "请选择" }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  function selectValue(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={`app-select ${open ? "open" : ""} ${className}`.trim()}>
      {label ? <div className="app-select-label">{label}</div> : null}
      <button
        className={`app-select-trigger ${buttonClassName}`.trim()}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {open ? (
        <div className="app-select-menu" id={listId} role="listbox">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                className={active ? "app-select-option active" : "app-select-option"}
                type="button"
                role="option"
                aria-selected={active}
                key={option.value}
                onClick={() => selectValue(option.value)}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
