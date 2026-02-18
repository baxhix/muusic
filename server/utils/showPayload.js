function formatShowDateLabel(startsAt) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function sanitizeShowResponse(show) {
  if (!show) return null;
  return {
    id: show.id,
    artist: String(show.artist || '').trim(),
    venue: String(show.venue || '').trim(),
    city: String(show.city || '').trim(),
    country: String(show.country || 'Brasil').trim() || 'Brasil',
    address: show.address ? String(show.address).trim() : null,
    description: show.description ? String(show.description).trim() : null,
    latitude: Number(show.latitude),
    longitude: Number(show.longitude),
    startsAt: formatShowDateLabel(show.startsAt),
    thumbUrl: show.thumbUrl || null,
    ticketUrl: show.ticketUrl || null,
    createdAt: show.createdAt || null
  };
}

export function parseShowPayload(body = {}) {
  const artist = String(body.artist || '').trim();
  const venue = String(body.venue || '').trim();
  const city = String(body.city || '').trim();
  const country = String(body.country || 'Brasil').trim() || 'Brasil';
  const address = String(body.address || '').trim();
  const description = String(body.description || '').trim();
  const startsAt = String(body.startsAt || '').trim();
  const thumbUrl = String(body.thumbUrl || '').trim();
  const ticketUrl = String(body.ticketUrl || '').trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!artist || !venue || !city || !startsAt) {
    return { error: 'Artista, local, cidade e data/hora sao obrigatorios.' };
  }
  const startsDate = new Date(startsAt);
  if (Number.isNaN(startsDate.getTime())) {
    return { error: 'Data/hora do show invalida.' };
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: 'Latitude invalida.' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: 'Longitude invalida.' };
  }

  return {
    artist,
    venue,
    city,
    country,
    address: address || null,
    description: description || null,
    startsAt: startsDate.toISOString(),
    latitude,
    longitude,
    thumbUrl: thumbUrl || null,
    ticketUrl: ticketUrl || null
  };
}

export function parseListQuery(query = {}) {
  const page = Number.isFinite(Number(query.page)) ? Math.max(1, Number(query.page)) : 1;
  const limit = Number.isFinite(Number(query.limit)) ? Math.min(200, Math.max(1, Number(query.limit))) : 50;
  const search = String(query.search || '').trim();
  return { page, limit, search };
}
