import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FilterMultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  placeholder: string;
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function FilterMultiSelect({
  label,
  options,
  placeholder,
  selected,
  onChange,
  disabled = false
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => {
    if (selected.length === 0) return placeholder;
    return selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label ?? placeholder
      : `${selected.length} selected`;
  }, [options, placeholder, selected]);

  const toggleSelection = useCallback((value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }, [onChange, selected]);

  const clearSelection = useCallback(() => {
    if (selected.length > 0) {
      onChange([]);
    }
  }, [onChange, selected.length]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'inline-flex min-w-[160px] items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
          disabled
            ? 'cursor-not-allowed border-slate-200 text-slate-400'
            : 'border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600',
          'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>

      {open && !disabled && (
        <div className="absolute z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Select {label.toLowerCase()}
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear
            </button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
            {options.length === 0 && (
              <p className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400">
                No options available
              </p>
            )}

            {options.map((option) => {
              const checked = selected.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && toggleSelection(option.value)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition',
                    option.disabled
                      ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  )}
                  disabled={option.disabled}
                >
                  <span
                    className={cn(
                      'mt-1 flex h-4 w-4 items-center justify-center rounded border text-white',
                      checked
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    )}
                    aria-hidden="true"
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>

                  <span>
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
