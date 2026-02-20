import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Select({ value, onValueChange, options = [], placeholder = 'Selecionar', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);
  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  useEffect(() => {
    function onOutside(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }

    function onEsc(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((item) => item.value === value);
    setHighlighted(index >= 0 ? index : 0);
  }, [open, options, value]);

  function onKeyDown(event) {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % options.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + options.length) % options.length);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[highlighted];
      if (option) {
        onValueChange(option.value);
        setOpen(false);
      }
    }
  }

  return (
    <div ref={ref} className="relative min-w-44">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="admin-select-trigger flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm text-foreground transition hover:border-border/90"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="admin-select-list absolute right-0 z-40 mt-2 w-full rounded-lg border border-border bg-popover p-1 shadow-md"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          {options.map((option, index) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className={cn(
                  'admin-select-item flex h-9 w-full items-center justify-between rounded-md px-2 text-sm text-foreground transition hover:bg-secondary/60',
                  highlighted === index && 'bg-secondary/60'
                )}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="h-4 w-4 text-slate-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
