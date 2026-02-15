export const SIM_SOURCE_ID = 'sim-users-source';
export const SIM_DENSITY_SOURCE_ID = 'sim-users-density-source';
export const SIM_LAYER_ID = 'sim-users-layer';
export const SIM_CLUSTER_LAYER_ID = 'sim-users-clusters';
export const SIM_DENSITY_LAYER_ID = 'sim-users-density';
export const SIM_CLUSTER_PULSE_LAYER_ID = 'sim-users-clusters-pulse';

export const DESKTOP_PERF = {
  points: 1000,
  clickableZoom: 7.5,
  clusterMaxZoom: 6,
  clusterRadius: 30,
  showDensity: true,
  showPulse: true,
  feedItems: 60
};

export const MOBILE_PERF = {
  points: 1000,
  clickableZoom: 8.5,
  clusterMaxZoom: 8,
  clusterRadius: 56,
  showDensity: false,
  showPulse: false,
  feedItems: 28
};

const SIM_FIRST_NAMES = ['Lia', 'Noah', 'Maya', 'Ravi', 'Elena', 'Tariq', 'Sofia', 'Kenji', 'Amina', 'Lucas', 'Nora', 'Mateo'];
const SIM_LAST_NAMES = ['Silva', 'Kim', 'Patel', 'Costa', 'Nguyen', 'Garcia', 'Khan', 'Miller', 'Rossi', 'Tanaka', 'Ibrahim', 'Santos'];
const SIM_TRACKS = [
  'Blinding Lights',
  'As It Was',
  'Levitating',
  'Calm Down',
  'Flowers',
  'Bad Habit',
  'Daylight',
  'Happier Than Ever',
  'Midnight City',
  'Lose Control',
  'Espresso',
  'Paint The Town Red'
];

const COUNTRY_CITIES = {
  Canada: ['Toronto', 'Vancouver', 'Montreal'],
  'United States': ['New York', 'Los Angeles', 'Chicago'],
  Mexico: ['Cidade do Mexico', 'Guadalajara', 'Monterrey'],
  Brazil: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia'],
  Argentina: ['Buenos Aires', 'Cordoba', 'Rosario'],
  Chile: ['Santiago', 'Valparaiso', 'Concepcion'],
  Peru: ['Lima', 'Arequipa', 'Cusco'],
  Colombia: ['Bogota', 'Medellin', 'Cali'],
  Uruguay: ['Montevideo', 'Punta del Este', 'Salto'],
  Paraguay: ['Assuncao', 'Ciudad del Este', 'Encarnacion'],
  Ecuador: ['Quito', 'Guayaquil', 'Cuenca'],
  Bolivia: ['La Paz', 'Santa Cruz de la Sierra', 'Cochabamba'],
  Venezuela: ['Caracas', 'Maracaibo', 'Valencia'],
  'United Kingdom': ['Londres', 'Manchester', 'Liverpool'],
  France: ['Paris', 'Lyon', 'Marseille'],
  Germany: ['Berlim', 'Hamburgo', 'Munique'],
  Italy: ['Roma', 'Milao', 'Napoles'],
  Spain: ['Madri', 'Barcelona', 'Valencia'],
  Poland: ['Varsovia', 'Cracovia', 'Gdansk'],
  Ukraine: ['Kyiv', 'Lviv', 'Odesa'],
  Greece: ['Atenas', 'Thessaloniki', 'Patras'],
  Romania: ['Bucareste', 'Cluj-Napoca', 'Timisoara'],
  Nigeria: ['Lagos', 'Abuja', 'Kano'],
  Egypt: ['Cairo', 'Alexandria', 'Giza'],
  'South Africa': ['Johannesburgo', 'Cidade do Cabo', 'Durban'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu'],
  Morocco: ['Casablanca', 'Rabat', 'Marrakech'],
  Ethiopia: ['Adis Abeba', 'Dire Dawa', 'Mekele'],
  Ghana: ['Acra', 'Kumasi', 'Tamale'],
  Algeria: ['Argel', 'Oran', 'Constantina'],
  Tanzania: ['Dar es Salaam', 'Dodoma', 'Arusha'],
  India: ['Mumbai', 'Nova Deli', 'Bangalore'],
  China: ['Pequim', 'Xangai', 'Shenzhen'],
  Japan: ['Toquio', 'Osaka', 'Nagoya'],
  Indonesia: ['Jacarta', 'Surabaya', 'Bandung'],
  Thailand: ['Bangkok', 'Chiang Mai', 'Phuket'],
  'Saudi Arabia': ['Riad', 'Jeddah', 'Dammam'],
  Bangladesh: ['Dhaka', 'Chittagong', 'Khulna'],
  Pakistan: ['Karachi', 'Lahore', 'Islamabad'],
  Turkey: ['Istambul', 'Ancara', 'Izmir'],
  Iran: ['Teera', 'Mashhad', 'Isfahan'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane'],
  'New Zealand': ['Auckland', 'Wellington', 'Christchurch'],
  'Papua New Guinea': ['Port Moresby', 'Lae', 'Madang'],
  Fiji: ['Suva', 'Nadi', 'Lautoka'],
  Antarctica: ['Base McMurdo', 'Base Amundsen-Scott', 'Base Vostok']
};

function randomIn(min, max) {
  return min + Math.random() * (max - min);
}

function distanceSquared(aLng, aLat, bLng, bLat) {
  const dx = aLng - bLng;
  const dy = aLat - bLat;
  return dx * dx + dy * dy;
}

function polygonBounds(polygon) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  polygon.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  });
  return [minLng, minLat, maxLng, maxLat];
}

function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function pointInPolygon(lng, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pickPolygon(polygons) {
  const weighted = polygons.map((polygon) => {
    const area = Math.max(polygonArea(polygon), 0.0001);
    return { polygon, area, bounds: polygonBounds(polygon) };
  });
  const total = weighted.reduce((sum, item) => sum + item.area, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].area;
    if (roll <= 0) return weighted[i];
  }
  return weighted[weighted.length - 1];
}

function samplePointInPolygons(polygons) {
  const picked = pickPolygon(polygons);
  const [minLng, minLat, maxLng, maxLat] = picked.bounds;
  for (let i = 0; i < 80; i += 1) {
    const lng = randomIn(minLng, maxLng);
    const lat = randomIn(minLat, maxLat);
    if (pointInPolygon(lng, lat, picked.polygon)) return [lng, lat];
  }
  const vertex = picked.polygon[Math.floor(Math.random() * picked.polygon.length)];
  return [vertex[0], vertex[1]];
}

function generateDistributedPoints({ count, polygons, minDistance, continent, countries = [], startId }) {
  const minDistSq = minDistance * minDistance;
  const cellSize = minDistance;
  const grid = new Map();
  const points = [];
  let id = startId;
  let attempts = 0;
  const maxAttempts = count * 120;

  const cellKey = (lng, lat) => `${Math.floor(lng / cellSize)}:${Math.floor(lat / cellSize)}`;

  while (points.length < count && attempts < maxAttempts) {
    attempts += 1;
    const [lng, lat] = samplePointInPolygons(polygons);
    const cx = Math.floor(lng / cellSize);
    const cy = Math.floor(lat / cellSize);

    let tooClose = false;
    for (let x = cx - 1; x <= cx + 1 && !tooClose; x += 1) {
      for (let y = cy - 1; y <= cy + 1; y += 1) {
        const list = grid.get(`${x}:${y}`);
        if (!list) continue;
        for (let i = 0; i < list.length; i += 1) {
          const p = list[i];
          if (distanceSquared(lng, lat, p[0], p[1]) < minDistSq) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) break;
      }
    }
    if (tooClose) continue;

    const name = `${SIM_FIRST_NAMES[Math.floor(Math.random() * SIM_FIRST_NAMES.length)]} ${
      SIM_LAST_NAMES[Math.floor(Math.random() * SIM_LAST_NAMES.length)]
    }`;
    const track = SIM_TRACKS[Math.floor(Math.random() * SIM_TRACKS.length)];
    const country = countries.length ? countries[Math.floor(Math.random() * countries.length)] : continent;
    const cityOptions = COUNTRY_CITIES[country] || [];
    const city = cityOptions.length ? cityOptions[Math.floor(Math.random() * cityOptions.length)] : country;

    points.push({
      type: 'Feature',
      properties: {
        id,
        continent,
        country,
        city,
        name,
        track
      },
      geometry: { type: 'Point', coordinates: [lng, lat] }
    });

    const key = cellKey(lng, lat);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push([lng, lat]);
    id += 1;
  }

  while (points.length < count) {
    const [lng, lat] = samplePointInPolygons(polygons);
    const name = `${SIM_FIRST_NAMES[Math.floor(Math.random() * SIM_FIRST_NAMES.length)]} ${
      SIM_LAST_NAMES[Math.floor(Math.random() * SIM_LAST_NAMES.length)]
    }`;
    const track = SIM_TRACKS[Math.floor(Math.random() * SIM_TRACKS.length)];
    const country = countries.length ? countries[Math.floor(Math.random() * countries.length)] : continent;
    const cityOptions = COUNTRY_CITIES[country] || [];
    const city = cityOptions.length ? cityOptions[Math.floor(Math.random() * cityOptions.length)] : country;
    points.push({
      type: 'Feature',
      properties: {
        id,
        continent,
        country,
        city,
        name,
        track
      },
      geometry: { type: 'Point', coordinates: [lng, lat] }
    });
    id += 1;
  }

  return { points, nextId: id };
}

export function buildSimulatedPoints(totalPoints) {
  const features = [];
  let id = 1;
  const zones = [
    {
      continent: 'North America',
      countries: ['Canada', 'United States', 'Mexico'],
      polygons: [[[-168, 72], [-140, 69], [-124, 49], [-117, 32], [-105, 20], [-96, 15], [-82, 9], [-74, 18], [-66, 44], [-74, 58], [-95, 71], [-130, 75]]],
      minDistance: 0.26
    },
    {
      continent: 'South America',
      countries: ['Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Uruguay', 'Paraguay', 'Ecuador', 'Bolivia', 'Venezuela'],
      polygons: [[[-81, 12], [-70, 12], [-52, 6], [-35, -8], [-38, -24], [-52, -55], [-71, -54], [-80, -35], [-78, -8]]],
      minDistance: 0.24
    },
    {
      continent: 'Europe',
      countries: ['United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Poland', 'Ukraine', 'Greece', 'Romania'],
      polygons: [[[-11, 36], [0, 36], [10, 43], [24, 43], [32, 54], [30, 66], [12, 71], [0, 58], [-10, 50]]],
      minDistance: 0.2
    },
    {
      continent: 'Africa',
      countries: ['Nigeria', 'Egypt', 'South Africa', 'Kenya', 'Morocco', 'Ethiopia', 'Ghana', 'Algeria', 'Tanzania'],
      polygons: [[[-17, 36], [10, 37], [35, 32], [51, 12], [43, -11], [30, -35], [12, -35], [-5, -20], [-17, 6]]],
      minDistance: 0.24
    },
    {
      continent: 'Asia',
      countries: ['India', 'China', 'Japan', 'Indonesia', 'Thailand', 'Saudi Arabia', 'Bangladesh', 'Pakistan', 'Turkey', 'Iran'],
      polygons: [[[26, 6], [36, 31], [54, 37], [66, 28], [75, 8], [97, 7], [105, -10], [132, -10], [147, 22], [146, 46], [124, 55], [102, 76], [66, 77], [38, 58]]],
      minDistance: 0.24
    },
    {
      continent: 'Oceania',
      countries: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji'],
      polygons: [
        [[112, -39], [114, -12], [154, -11], [153, -39]],
        [[166, -47], [179, -47], [179, -34], [166, -34]]
      ],
      minDistance: 0.22
    },
    {
      continent: 'Antarctica',
      countries: ['Antarctica'],
      polygons: [[[-180, -84], [180, -84], [180, -72], [-180, -72]]],
      minDistance: 0.45
    }
  ];

  const weights = [24, 15, 11, 14, 28, 6, 2];
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const counts = weights.map((w) => Math.floor((totalPoints * w) / totalWeight));
  counts[0] += totalPoints - counts.reduce((sum, n) => sum + n, 0);

  zones.forEach((zone, idx) => {
    const batch = generateDistributedPoints({
      count: counts[idx],
      continent: zone.continent,
      countries: zone.countries,
      startId: id,
      minDistance: zone.minDistance,
      polygons: zone.polygons
    });
    features.push(...batch.points);
    id = batch.nextId;
  });

  const all = {
    type: 'FeatureCollection',
    features
  };
  return totalPoints >= features.length
    ? all
    : { type: 'FeatureCollection', features: all.features.slice(0, totalPoints) };
}

export function upsertSimulatedLayer(map, data, perfProfile) {
  const clusterSource = map.getSource(SIM_SOURCE_ID);
  if (!clusterSource) {
    map.addSource(SIM_SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: perfProfile.clusterMaxZoom,
      clusterRadius: perfProfile.clusterRadius
    });
  } else {
    clusterSource.setData(data);
  }

  if (perfProfile.showDensity) {
    const densitySource = map.getSource(SIM_DENSITY_SOURCE_ID);
    if (!densitySource) {
      map.addSource(SIM_DENSITY_SOURCE_ID, {
        type: 'geojson',
        data
      });
    } else {
      densitySource.setData(data);
    }
  }

  if (perfProfile.showDensity && !map.getLayer(SIM_DENSITY_LAYER_ID)) {
    map.addLayer({
      id: SIM_DENSITY_LAYER_ID,
      type: 'circle',
      source: SIM_DENSITY_SOURCE_ID,
      paint: {
        'circle-color': '#22c55e',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.52, 4, 0.42, 7, 0.24, 9, 0.08, 11, 0.0],
        'circle-radius': 1.5
      }
    });
  }

  if (!map.getLayer(SIM_CLUSTER_LAYER_ID)) {
    map.addLayer({
      id: SIM_CLUSTER_LAYER_ID,
      type: 'circle',
      source: SIM_SOURCE_ID,
      maxzoom: 6.5,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#15803d',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 5.5, 0.45, 6.5, 0],
        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 20, 9, 80, 13, 250, 17, 800, 22]
      }
    });
  }

  if (perfProfile.showPulse && !map.getLayer(SIM_CLUSTER_PULSE_LAYER_ID)) {
    map.addLayer({
      id: SIM_CLUSTER_PULSE_LAYER_ID,
      type: 'circle',
      source: SIM_SOURCE_ID,
      maxzoom: 6.5,
      filter: ['all', ['has', 'point_count'], ['>=', ['get', 'point_count'], 180]],
      paint: {
        'circle-color': '#22c55e',
        'circle-opacity': 0.18,
        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 180, 24, 500, 34, 1200, 46],
        'circle-blur': 0.35
      }
    });
  }

  if (!map.getLayer(SIM_LAYER_ID)) {
    map.addLayer({
      id: SIM_LAYER_ID,
      type: 'circle',
      source: SIM_SOURCE_ID,
      minzoom: 5.8,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#22c55e',
        'circle-radius': 1.5
      }
    });
  }
}
