import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

export function DropdownMenu({ items = [], label = 'Abrir menu', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const ref = useRef(null);

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

  function onMenuKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusIndex((prev) => (prev + 1) % items.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="icon" aria-label={label} onClick={() => setOpen((prev) => !prev)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className={cn('absolute z-40 mt-2 min-w-52 rounded-lg border border-border bg-popover p-1 shadow-md animate-fade-in', align === 'right' ? 'right-0' : 'left-0')}
          role="menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-left transition hover:bg-secondary/60',
                focusIndex === index && 'bg-secondary/60',
                item.destructive && 'text-rose-300'
              )}
              onMouseEnter={() => setFocusIndex(index)}
              onClick={() => {
                item.onSelect?.();
                setOpen(false);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
