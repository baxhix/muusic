import { describe, expect, it } from 'vitest';
import { buildGlobalSearchOptions, filterGlobalSearchOptions } from '../searchIndex';

describe('searchIndex', () => {
  const shows = [
    {
      id: 's1',
      artist: 'Leo e Raphael',
      venue: 'Villa Country',
      city: 'Sao Paulo',
      country: 'Brasil',
      latitude: -23.55,
      longitude: -46.63
    },
    {
      id: 's2',
      artist: 'Guilherme e Benuto',
      venue: 'Expo Londrina',
      city: 'Londrina',
      country: 'Brasil',
      latitude: -23.31,
      longitude: -51.16
    }
  ];

  const users = [
    { id: 'u1', name: 'Ana Souza', location: { lat: -23.55, lng: -46.63 } },
    { id: 'u2', name: 'Marcos Lima' }
  ];

  it('builds indexed options for show, venue and user entities', () => {
    const options = buildGlobalSearchOptions(shows, users);
    expect(options.some((item) => item.kind === 'show')).toBe(true);
    expect(options.some((item) => item.kind === 'venue')).toBe(true);
    expect(options.some((item) => item.kind === 'user')).toBe(true);
  });

  it('prioritizes label prefix matches in filtered results', () => {
    const options = buildGlobalSearchOptions(shows, users);
    const result = filterGlobalSearchOptions(options, 'leo');
    expect(result[0]?.label).toContain('Leo');
  });

  it('limits result size to avoid large render payloads', () => {
    const options = Array.from({ length: 40 }, (_, idx) => ({
      id: `x-${idx}`,
      kind: 'user',
      label: `Usuario ${idx}`,
      meta: 'Teste',
      searchBlob: `usuario ${idx} teste`
    }));
    const result = filterGlobalSearchOptions(options, 'usuario', 10);
    expect(result).toHaveLength(10);
  });
});
