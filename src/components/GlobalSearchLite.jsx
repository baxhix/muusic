import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

function isValidCoords(show) {
  const latitude = Number(show?.latitude);
  const longitude = Number(show?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

export default function GlobalSearchLite({ shows = [], users = [], onFocusItem, onSelectShow, onSelectUser }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const options = useMemo(() => {
    const showItems = [];
    const venueItems = [];
    const seenVenues = new Set();

    shows.forEach((show) => {
      if (!isValidCoords(show)) return;
      const latitude = Number(show.latitude);
      const longitude = Number(show.longitude);
      const coords = [longitude, latitude];

      showItems.push({
        id: `show:${show.id}`,
        kind: 'show',
        label: show.artist || 'Show sem artista',
        meta: [show.venue, show.city].filter(Boolean).join(' • ') || 'Show cadastrado',
        coords,
        city: show.city || '',
        country: show.country || 'Brasil',
        show
      });

      const venueLabel = String(show.venue || '').trim();
      const venueKey = `${venueLabel.toLowerCase()}::${String(show.city || '').toLowerCase()}`;
      if (venueLabel && !seenVenues.has(venueKey)) {
        seenVenues.add(venueKey);
        venueItems.push({
          id: `venue:${show.id}`,
          kind: 'venue',
          label: venueLabel,
          meta: [show.city, show.country].filter(Boolean).join(' • ') || 'Local de show',
          coords,
          city: show.city || '',
          country: show.country || 'Brasil',
          show
        });
      }
    });

    const userItems = users
      .filter((user) => user?.id)
      .map((user) => {
        const latitude = Number(user?.location?.lat);
        const longitude = Number(user?.location?.lng);
        const hasCoords =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180;
        return {
          id: `user:${user.id}`,
          kind: 'user',
          label: user?.spotify?.display_name || user?.name || 'Usuario',
          meta: hasCoords ? 'Usuario da plataforma • online no mapa' : 'Usuario da plataforma',
          coords: hasCoords ? [longitude, latitude] : null,
          city: '',
          country: '',
          user
        };
      });

    return [...showItems, ...venueItems, ...userItems];
  }, [shows, users]);

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return options.slice(0, 8);
    return options
      .filter((item) => normalizeText(`${item.label} ${item.meta}`).includes(needle))
      .slice(0, 10);
  }, [options, query]);

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
