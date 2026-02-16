import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getPrisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_SHOWS_PATH = path.join(__dirname, '..', 'data', 'local-shows.json');

function parseShowsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.shows)) return payload.shows;
  return [];
}

function normalizeShow(show) {
  if (!show) return null;
  return {
    id: show.id,
    artist: String(show.artist || '').trim(),
    venue: String(show.venue || '').trim(),
    city: String(show.city || '').trim(),
    country: String(show.country || 'Brasil').trim() || 'Brasil',
    latitude: Number(show.latitude),
    longitude: Number(show.longitude),
    startsAt: new Date(show.startsAt).toISOString(),
    thumbUrl: show.thumbUrl || null,
    ticketUrl: show.ticketUrl || null,
    createdAt: show.createdAt ? new Date(show.createdAt).toISOString() : null
  };
}

class ShowService {
  async readJSON() {
    try {
      const raw = await fs.readFile(LOCAL_SHOWS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return parseShowsPayload(parsed);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeJSON(shows) {
    await fs.mkdir(path.dirname(LOCAL_SHOWS_PATH), { recursive: true });
    await fs.writeFile(LOCAL_SHOWS_PATH, JSON.stringify(shows, null, 2), 'utf8');
  }

  async listShows() {
    const prismaClient = await getPrisma();
    if (prismaClient?.show) {
      const shows = await prismaClient.show.findMany({
        orderBy: { startsAt: 'asc' }
      });
      return shows.map((show) => normalizeShow(show));
    }

    const shows = await this.readJSON();
    return shows
      .map((show) => normalizeShow(show))
      .filter(Boolean)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  async createShow(data) {
    const prismaClient = await getPrisma();
    const payload = {
      artist: data.artist,
      venue: data.venue,
      city: data.city,
      country: data.country,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      startsAt: new Date(data.startsAt),
      thumbUrl: data.thumbUrl || null,
      ticketUrl: data.ticketUrl || null
    };

    if (prismaClient?.show) {
      const created = await prismaClient.show.create({ data: payload });
      return normalizeShow(created);
    }

    const shows = await this.readJSON();
    const show = {
      id: data.id || `show-${Date.now()}`,
      ...payload,
      startsAt: payload.startsAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    shows.push(show);
    await this.writeJSON(shows);
    return normalizeShow(show);
  }

  async updateShowById(id, data) {
    const prismaClient = await getPrisma();
    const payload = {
      artist: data.artist,
      venue: data.venue,
      city: data.city,
      country: data.country,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      startsAt: new Date(data.startsAt),
      thumbUrl: data.thumbUrl || null,
      ticketUrl: data.ticketUrl || null
    };

    if (prismaClient?.show) {
      const updated = await prismaClient.show.update({
        where: { id },
        data: payload
      });
      return normalizeShow(updated);
    }

    const shows = await this.readJSON();
    const index = shows.findIndex((show) => show.id === id);
    if (index === -1) return null;

    shows[index] = {
      ...shows[index],
      ...payload,
      startsAt: payload.startsAt.toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.writeJSON(shows);
    return normalizeShow(shows[index]);
  }

  async deleteShowById(id) {
    const prismaClient = await getPrisma();
    if (prismaClient?.show) {
      const deleted = await prismaClient.show.delete({ where: { id } });
      return normalizeShow(deleted);
    }

    const shows = await this.readJSON();
    const index = shows.findIndex((show) => show.id === id);
    if (index === -1) return null;
    const [deleted] = shows.splice(index, 1);
    await this.writeJSON(shows);
    return normalizeShow(deleted);
  }
}

const showService = new ShowService();
export default showService;
