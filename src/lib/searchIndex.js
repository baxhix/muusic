function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function hasValidShowCoords(show) {
  const latitude = Number(show?.latitude);
  const longitude = Number(show?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

function hasValidUserCoords(user) {
  const latitude = Number(user?.location?.lat);
  const longitude = Number(user?.location?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

function toSearchBlob(item) {
  return normalizeText(`${item.label} ${item.meta}`);
}

function scoreMatch(item, needle) {
  const label = normalizeText(item.label);
  const meta = normalizeText(item.meta);
  if (label.startsWith(needle)) return 0;
  if (label.includes(needle)) return 1;
  if (meta.includes(needle)) return 2;
  return 3;
}

export function buildGlobalSearchOptions(shows = [], users = []) {
  const showItems = [];
  const venueItems = [];
  const userItems = [];
  const seenVenues = new Set();

  shows.forEach((show) => {
    if (!hasValidShowCoords(show)) return;
    const latitude = Number(show.latitude);
    const longitude = Number(show.longitude);
    const coords = [longitude, latitude];

    showItems.push({
      id: `show:${show.id}`,
      kind: 'show',
      label: show.artist || 'Show sem artista',
      meta: [show.venue, show.city].filter(Boolean).join(' • ') || 'Show cadastrado',
      city: show.city || '',
      country: show.country || 'Brasil',
      coords,
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
        city: show.city || '',
        country: show.country || 'Brasil',
        coords,
        show
      });
    }
  });

  users.forEach((user) => {
    const coords = hasValidUserCoords(user) ? [Number(user.location.lng), Number(user.location.lat)] : null;
    userItems.push({
      id: `user:${user.id}`,
      kind: 'user',
      label: user?.spotify?.display_name || user?.name || 'Usuario',
      meta: coords ? 'Usuario da plataforma • online no mapa' : 'Usuario da plataforma',
      city: '',
      country: '',
      coords,
      user
    });
  });

  const all = [...showItems, ...venueItems, ...userItems];
  return all.map((item) => ({ ...item, searchBlob: toSearchBlob(item) }));
}

export function filterGlobalSearchOptions(options = [], query = '', limit = 10) {
  const needle = normalizeText(query);
  if (!needle) return options.slice(0, Math.min(8, limit));

  return options
    .filter((item) => item.searchBlob.includes(needle))
    .sort((a, b) => scoreMatch(a, needle) - scoreMatch(b, needle))
    .slice(0, limit);
}
