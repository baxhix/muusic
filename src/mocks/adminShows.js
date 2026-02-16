export const DEFAULT_SHOWS_PAGE_SIZE = 7;

export const mockShows = [
  {
    id: 's-1',
    artist: 'Dua Lipa',
    venue: 'Allianz Parque',
    city: 'Sao Paulo',
    country: 'Brasil',
    startsAt: '2026-04-12T22:00:00.000Z',
    ticketUrl: 'https://example.com/dua'
  },
  {
    id: 's-2',
    artist: 'The Weeknd',
    venue: 'Engenhao',
    city: 'Rio de Janeiro',
    country: 'Brasil',
    startsAt: '2026-03-21T23:00:00.000Z',
    ticketUrl: 'https://example.com/weeknd'
  },
  {
    id: 's-3',
    artist: 'Coldplay',
    venue: 'Mineirao',
    city: 'Belo Horizonte',
    country: 'Brasil',
    startsAt: '2026-01-18T21:00:00.000Z',
    ticketUrl: ''
  }
];

export function getShowStatus(startsAt) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'indefinido';
  return date.getTime() >= Date.now() ? 'proximo' : 'encerrado';
}

export function calculateShowsKpis(shows) {
  const cities = new Set(shows.map((show) => show.city).filter(Boolean));
  return {
    total: shows.length,
    upcoming: shows.filter((show) => getShowStatus(show.startsAt) === 'proximo').length,
    cities: cities.size
  };
}

export function buildCityOptions(shows) {
  const unique = [...new Set(shows.map((show) => show.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return [{ value: 'all', label: 'Todas as cidades' }, ...unique.map((city) => ({ value: city, label: city }))];
}

export function queryShows({ shows, search = '', city = 'all', page = 1, pageSize = DEFAULT_SHOWS_PAGE_SIZE }) {
  const term = search.trim().toLowerCase();

  const filtered = shows
    .filter((show) => {
      if (city !== 'all' && show.city !== city) return false;
      if (!term) return true;
      const haystack = `${show.artist} ${show.venue} ${show.city}`.toLowerCase();
      return haystack.includes(term);
    })
    .sort((a, b) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime());

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages
  };
}

export async function fetchShowsMock({ shows = mockShows, search, city, page, pageSize, shouldFail = false }) {
  await new Promise((resolve) => setTimeout(resolve, 360));
  if (shouldFail) {
    throw new Error('Nao foi possivel carregar shows.');
  }

  return {
    shows,
    kpis: calculateShowsKpis(shows),
    ...queryShows({ shows, search, city, page, pageSize })
  };
}

export async function fetchShowsFromApi({ apiFetch, search, city, page, pageSize }) {
  const payload = await apiFetch('/admin/shows?page=1&limit=500');
  const shows = Array.isArray(payload?.shows) ? payload.shows : [];

  return {
    shows,
    kpis: calculateShowsKpis(shows),
    ...queryShows({ shows, search, city, page, pageSize })
  };
}
