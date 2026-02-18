import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { buildGlobalSearchOptions, filterGlobalSearchOptions } from '../lib/searchIndex';

function useDebouncedValue(value, delay = 150) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearchLite({ shows = [], users = [], onFocusItem, onSelectShow, onSelectUser }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(query, 140);

  const options = useMemo(() => buildGlobalSearchOptions(shows, users), [shows, users]);

  const filtered = useMemo(() => filterGlobalSearchOptions(options, debouncedQuery, 10), [options, debouncedQuery]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) setHighlightedIndex(-1);
  }, [open]);

  function handleSelect(item) {
    setQuery(item.label);
    setOpen(false);
    setHighlightedIndex(-1);

    if (item.coords) {
      onFocusItem?.({
        coords: item.coords,
        city: item.city,
        country: item.country
      });
    }

    if (item.kind === 'show' || item.kind === 'venue') {
      onSelectShow?.(item.show);
    }

    if (item.kind === 'user') {
      onSelectUser?.(item.user);
    }
  }

  function handleKeyDown(event) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= filtered.length ? 0 : next;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev <= 0) return filtered.length - 1;
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const item = filtered[highlightedIndex] || filtered[0];
      if (item) handleSelect(item);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="global-search-wrap" ref={rootRef}>
      <Search className="global-search-icon" size={16} />
      <input
        ref={inputRef}
        className="global-search-input"
        type="text"
        placeholder="Buscar shows, locais e usuarios"
        aria-label="Busca global"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className="global-search-panel" role="listbox" aria-label="Sugestoes da busca">
          {filtered.length ? (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={highlightedIndex === index}
                className={highlightedIndex === index ? 'global-search-item active' : 'global-search-item'}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(item)}
              >
                <span className="global-search-item-title">{item.label}</span>
                <span className="global-search-item-meta">
                  {item.kind === 'show' ? 'Show' : item.kind === 'venue' ? 'Local' : 'Usuario'} • {item.meta}
                </span>
              </button>
            ))
          ) : (
            <p className="global-search-empty">Nenhum resultado encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
