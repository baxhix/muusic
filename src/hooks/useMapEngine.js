import { useEffect, useRef, useState } from 'react';
import { FALLBACK_STYLE, MAPBOX_TOKEN } from '../config/appConfig';
import {
  SIM_CLUSTER_LAYER_ID,
  SIM_CLUSTER_PULSE_LAYER_ID,
  SIM_DENSITY_LAYER_ID,
  SIM_LAYER_ID,
  SIM_SOURCE_ID,
  upsertSimulatedLayer
} from '../lib/mapSimulation';
import { summarizeFpsSamples } from '../lib/perfStats';

const PRESENCE_SOURCE_ID = 'presence-users-source';
const PRESENCE_LAYER_ID = 'presence-users-layer';
const PRESENCE_LAYER_LIMIT = 2000;

function toPresenceGeoJson(users = []) {
  const features = [];
  users.forEach((user) => {
    const lat = Number(user?.location?.lat);
    const lng = Number(user?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    features.push({
      type: 'Feature',
      properties: {
        id: user.id || '',
        name: user?.spotify?.display_name || user?.name || 'Usuario'
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    });
  });
  return {
    type: 'FeatureCollection',
    features
  };
}

export function useMapEngine({
  enabled,
  isMobileDevice,
  perfProfile,
  simulatedPoints,
  shows = [],
  onShowSelect,
  onUserSelect,
  users,
  socketRef,
  mapVisibility = { users: true, shows: true }
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const userMarkersRef = useRef(new Map());
  const showMarkersRef = useRef(new Map());
  const mapVisibilityRef = useRef(mapVisibility);
  const popupRef = useRef(null);
  const selectedSimIdRef = useRef(null);
  const fpsSamplesRef = useRef([]);

  const [mapWarning, setMapWarning] = useState('');
  const [fps, setFps] = useState(0);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [selectedGeo, setSelectedGeo] = useState(null);

  useEffect(() => {
    mapVisibilityRef.current = mapVisibility;
  }, [mapVisibility]);

  useEffect(() => {
    if (!enabled) return undefined;
    let frameCount = 0;
    let lastTick = performance.now();
    let rafId = 0;

    const loop = (now) => {
      frameCount += 1;
      if (now - lastTick >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTick)));
        frameCount = 0;
        lastTick = now;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fpsSamplesRef.current.push({ at: Date.now(), fps });
    if (fpsSamplesRef.current.length > 240) {
      fpsSamplesRef.current.shift();
    }
  }, [enabled, fps]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (isMobileDevice || !perfProfile.showPulse) return undefined;
    let rafId = 0;
    let lastPaintAt = 0;

    const animatePulse = (time) => {
      const map = mapRef.current;
      if (map && map.getLayer(SIM_CLUSTER_PULSE_LAYER_ID) && time - lastPaintAt >= 80) {
        lastPaintAt = time;
        const wave = (Math.sin(time / 450) + 1) / 2;
        const minRadius = 20 + wave * 3;
        const midRadius = 30 + wave * 4;
        const maxRadius = 42 + wave * 6;
        const lowOpacity = 0.12 + wave * 0.06;
        const midOpacity = 0.1 + wave * 0.05;
        const highOpacity = 0.08 + wave * 0.04;

        map.setPaintProperty(SIM_CLUSTER_PULSE_LAYER_ID, 'circle-radius', [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          180,
          minRadius,
          500,
          midRadius,
          1200,
          maxRadius
        ]);

        map.setPaintProperty(SIM_CLUSTER_PULSE_LAYER_ID, 'circle-opacity', [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          180,
          lowOpacity,
          500,
          midOpacity,
          1200,
          highOpacity
        ]);
      }
      rafId = requestAnimationFrame(animatePulse);
    };

    rafId = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, isMobileDevice, perfProfile.showPulse]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (mapRef.current) return;

    let disposed = false;
    let map = null;
    let paintSimulated = null;
    let resizeObserver = null;
    let bootRaf = 0;
    const resizeTimers = [];
    let bootAttempts = 0;

    const scheduleResizeBurst = () => {
      const instance = mapRef.current;
      if (!instance) return;
      [0, 150, 500, 1000].forEach((delay) => {
        const timer = window.setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        }, delay);
        resizeTimers.push(timer);
      });
    };

    const bootstrapMap = async () => {
      const container = mapContainerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        if (disposed) return;
        bootAttempts += 1;
        if (bootAttempts > 30) {
          setMapWarning('Falha ao preparar container do mapa.');
          return;
        }
        bootRaf = window.requestAnimationFrame(bootstrapMap);
        return;
      }

      const mapboxModule = await import('mapbox-gl');
      if (disposed) return;

      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN || '';
      mapboxRef.current = mapboxgl;

      map = new mapboxgl.Map({
        container,
        style: MAPBOX_TOKEN ? 'mapbox://styles/mapbox/dark-v11' : FALLBACK_STYLE,
        center: [0, 18],
        zoom: isMobileDevice ? 1.7 : 2.2
      });

      map.on('click', (event) => {
        const payload = { lat: event.lngLat.lat, lng: event.lngLat.lng };
        socketRef.current?.emit('location:update', payload);
      });

      paintSimulated = () => {
        if (map.getStyle()) {
          upsertSimulatedLayer(map, simulatedPoints, perfProfile);
          const userLayerVisibility = mapVisibilityRef.current?.users === false ? 'none' : 'visible';
          if (map.getLayer(SIM_LAYER_ID)) map.setLayoutProperty(SIM_LAYER_ID, 'visibility', userLayerVisibility);
          if (map.getLayer(SIM_CLUSTER_LAYER_ID)) map.setLayoutProperty(SIM_CLUSTER_LAYER_ID, 'visibility', userLayerVisibility);
          if (map.getLayer(SIM_CLUSTER_PULSE_LAYER_ID)) {
            map.setLayoutProperty(SIM_CLUSTER_PULSE_LAYER_ID, 'visibility', userLayerVisibility);
          }
          if (map.getLayer(SIM_DENSITY_LAYER_ID)) map.setLayoutProperty(SIM_DENSITY_LAYER_ID, 'visibility', userLayerVisibility);
        }
      };

      map.on('load', paintSimulated);
      map.on('styledata', paintSimulated);

      if (!isMobileDevice) {
        map.on('mousemove', (event) => {
          if (mapVisibilityRef.current?.users === false) {
            map.getCanvas().style.cursor = '';
            return;
          }
          const clusterHits = map.queryRenderedFeatures(event.point, { layers: [SIM_CLUSTER_LAYER_ID] });
          if (clusterHits.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            return;
          }
          const hits = map.queryRenderedFeatures(event.point, { layers: [SIM_LAYER_ID] });
          map.getCanvas().style.cursor = hits.length > 0 && map.getZoom() >= perfProfile.clickableZoom ? 'pointer' : '';
        });
      }

      map.on('click', (event) => {
        if (mapVisibilityRef.current?.users === false) return;
        const clusterHits = map.queryRenderedFeatures(event.point, { layers: [SIM_CLUSTER_LAYER_ID] });
        if (clusterHits.length > 0) {
          const cluster = clusterHits[0];
          const clusterId = cluster.properties?.cluster_id;
          const source = map.getSource(SIM_SOURCE_ID);
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: cluster.geometry.coordinates,
              zoom
            });
          });
          return;
        }

        if (map.getZoom() < perfProfile.clickableZoom) return;
        const hits = map.queryRenderedFeatures(event.point, { layers: [SIM_LAYER_ID] });
        if (!hits.length) return;

        const feature = hits[0];
        const clickedId = feature.properties?.id;

        if (selectedSimIdRef.current === clickedId && popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
          selectedSimIdRef.current = null;
          return;
        }

        popupRef.current?.remove();
        const [lng, lat] = feature.geometry.coordinates;
        const name = feature.properties?.name || 'Usuário';
        const track = feature.properties?.track || 'Música simulada';
        const city = feature.properties?.city || '';
        const country = feature.properties?.country || '';
        setSelectedGeo({ city, country });

        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 10,
          className: 'sim-popup'
        })
          .setLngLat([lng, lat])
          .setHTML(`<div class="sim-popup-content"><strong>${name}</strong><br/>Spotify: ${track}<br/>Local: ${city}, ${country}</div>`)
          .addTo(map);
        selectedSimIdRef.current = clickedId;
      });

      map.on('error', () => {
        const isMapboxStyle = Boolean(map.getStyle()?.sprite?.includes('mapbox'));
        if (isMapboxStyle) {
          map.setStyle(FALLBACK_STYLE);
          setMapWarning('Falha ao carregar estilo Mapbox. Exibindo mapa em fallback.');
        }
      });

      mapRef.current = map;
      window.__MUUSIC_MAP__ = map;
      scheduleResizeBurst();

      if (typeof window.ResizeObserver === 'function') {
        resizeObserver = new window.ResizeObserver(() => {
          if (mapRef.current) mapRef.current.resize();
        });
        resizeObserver.observe(container);
      }

      const onWindowResize = () => {
        if (mapRef.current) mapRef.current.resize();
      };
      window.addEventListener('resize', onWindowResize);
      window.addEventListener('orientationchange', onWindowResize);

      map.on('remove', () => {
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('orientationchange', onWindowResize);
      });
    };

    bootstrapMap().catch(() => {
      if (!disposed) {
        setMapWarning('Falha ao inicializar recursos do mapa.');
      }
    });

    return () => {
      disposed = true;
      if (bootRaf) window.cancelAnimationFrame(bootRaf);
      resizeTimers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver?.disconnect();
      if (map && paintSimulated) {
        map.off('load', paintSimulated);
        map.off('styledata', paintSimulated);
      }
      popupRef.current?.remove();
      popupRef.current = null;
      selectedSimIdRef.current = null;
      showMarkersRef.current.forEach(({ marker, element, onClick }) => {
        if (element && onClick) element.removeEventListener('click', onClick);
        marker.remove();
      });
      showMarkersRef.current.clear();
      userMarkersRef.current.forEach((entry) => {
        if (entry.element && entry.onClick) entry.element.removeEventListener('click', entry.onClick);
        entry.marker.remove();
      });
      userMarkersRef.current.clear();
      if (map?.getLayer(PRESENCE_LAYER_ID)) map.removeLayer(PRESENCE_LAYER_ID);
      if (map?.getSource(PRESENCE_SOURCE_ID)) map.removeSource(PRESENCE_SOURCE_ID);
      map?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
      window.__MUUSIC_MAP__ = null;
    };
  }, [enabled, simulatedPoints, perfProfile, isMobileDevice, socketRef]);

  useEffect(() => {
    if (!enabled) return;
    if (!mapRef.current || !mapboxRef.current) return;
    const mapboxgl = mapboxRef.current;

    const map = mapRef.current;
    const shouldUsePresenceLayer = users.length >= PRESENCE_LAYER_LIMIT && map?.isStyleLoaded?.();

    const removePresenceLayer = () => {
      if (!map) return;
      if (map.getLayer(PRESENCE_LAYER_ID)) map.removeLayer(PRESENCE_LAYER_ID);
      if (map.getSource(PRESENCE_SOURCE_ID)) map.removeSource(PRESENCE_SOURCE_ID);
    };

    if (shouldUsePresenceLayer) {
      userMarkersRef.current.forEach((entry) => {
        if (entry.element && entry.onClick) entry.element.removeEventListener('click', entry.onClick);
        entry.marker.remove();
      });
      userMarkersRef.current.clear();

      const data = toPresenceGeoJson(users);
      const source = map.getSource(PRESENCE_SOURCE_ID);
      if (source) {
        source.setData(data);
      } else {
        map.addSource(PRESENCE_SOURCE_ID, { type: 'geojson', data });
        map.addLayer({
          id: PRESENCE_LAYER_ID,
          type: 'circle',
          source: PRESENCE_SOURCE_ID,
          paint: {
            'circle-color': '#1DB954',
            'circle-radius': 4,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#06220f'
          }
        });
      }
      map.setLayoutProperty(PRESENCE_LAYER_ID, 'visibility', mapVisibility?.users === false ? 'none' : 'visible');
      return;
    }

    removePresenceLayer();

    users.forEach((user) => {
      if (!user.location) return;
      const key = user.id;
      const markerLabel = user.spotify?.display_name || user.name;
      const currentTrack =
        user?.spotify?.trackName || user?.spotify?.track || user?.spotify?.nowPlaying?.trackName || user?.nowPlaying?.trackName || 'Música indisponível';
      const safeLabel = String(markerLabel || 'Usuario').replace(/"/g, '&quot;');

      if (!userMarkersRef.current.has(key)) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'user-marker';
        el.setAttribute('aria-label', `Usuário: ${markerLabel}`);
        el.title = `${markerLabel}\n${currentTrack}`;

        const avatarUrl = String(user?.avatarUrl || user?.avatar || '').trim();
        if (avatarUrl) {
          el.innerHTML = `<img src="${avatarUrl}" alt="${safeLabel}" class="user-marker-avatar" loading="lazy" />`;
        } else {
          el.innerHTML = '<span class="user-marker-fallback" aria-hidden="true">👤</span>';
        }
        el.style.display = mapVisibility?.users === false ? 'none' : '';

        const marker = new mapboxgl.Marker({ element: el }).setLngLat([user.location.lng, user.location.lat]).addTo(mapRef.current);
        const onClick = (event) => {
          event.stopPropagation();
          onUserSelect?.({
            ...user,
            name: markerLabel,
            city: user?.city || user?.location?.city || '',
            coords: [Number(user.location.lng), Number(user.location.lat)],
            recentTracks: currentTrack && currentTrack !== 'Música indisponível' ? [currentTrack] : []
          });
        };
        el.addEventListener('click', onClick);
        userMarkersRef.current.set(key, { marker, element: el, onClick });
      } else {
        const entry = userMarkersRef.current.get(key);
        entry.marker.setLngLat([user.location.lng, user.location.lat]);
        entry.element.style.display = mapVisibility?.users === false ? 'none' : '';
        entry.element.title = `${markerLabel}\n${currentTrack}`;
      }
    });

    const activeIds = new Set(users.map((user) => user.id));
    userMarkersRef.current.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        if (entry.element && entry.onClick) entry.element.removeEventListener('click', entry.onClick);
        entry.marker.remove();
        userMarkersRef.current.delete(id);
      }
    });
  }, [enabled, users, mapVisibility?.users, onUserSelect]);

  useEffect(() => {
    if (!enabled) return;
    if (!mapRef.current || !mapboxRef.current) return;
    const mapboxgl = mapboxRef.current;
    const map = mapRef.current;
    const activeShowIds = new Set();

    shows.forEach((show) => {
      const latitude = Number(show?.latitude);
      const longitude = Number(show?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return;
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return;

      const key = String(show?.id || `${show?.artist || 'show'}:${latitude}:${longitude}`);
      activeShowIds.add(key);

      if (!showMarkersRef.current.has(key)) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'show-marker';
        el.setAttribute('aria-label', `Evento: ${show?.artist || 'Sem artista'}`);
        el.style.display = mapVisibility?.shows === false ? 'none' : '';

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([longitude, latitude]).addTo(map);

        const onClick = (event) => {
          event.stopPropagation();
          onShowSelect?.({
            ...show,
            latitude,
            longitude
          });
          setSelectedGeo({ city: show?.city || '', country: show?.country || 'Brasil' });
        };

        el.addEventListener('click', onClick);
        showMarkersRef.current.set(key, { marker, element: el, onClick });
      } else {
        const entry = showMarkersRef.current.get(key);
        entry.marker.setLngLat([longitude, latitude]);
        entry.element.style.display = mapVisibility?.shows === false ? 'none' : '';
      }
    });

    showMarkersRef.current.forEach((entry, id) => {
      if (!activeShowIds.has(id)) {
        if (entry.element && entry.onClick) entry.element.removeEventListener('click', entry.onClick);
        entry.marker.remove();
        showMarkersRef.current.delete(id);
      }
    });
  }, [enabled, onShowSelect, shows, mapVisibility?.shows]);

  useEffect(() => {
    if (!enabled) return;

    const map = mapRef.current;
    const userLayerVisibility = mapVisibility?.users === false ? 'none' : 'visible';
    const showMarkersVisibility = mapVisibility?.shows === false ? 'none' : '';
    const userMarkersVisibility = mapVisibility?.users === false ? 'none' : '';

    const toggleLayer = (layerId, visibility) => {
      if (!map?.getLayer(layerId)) return;
      map.setLayoutProperty(layerId, 'visibility', visibility);
    };

    toggleLayer(SIM_LAYER_ID, userLayerVisibility);
    toggleLayer(SIM_CLUSTER_LAYER_ID, userLayerVisibility);
    toggleLayer(SIM_CLUSTER_PULSE_LAYER_ID, userLayerVisibility);
    toggleLayer(SIM_DENSITY_LAYER_ID, userLayerVisibility);
    toggleLayer(PRESENCE_LAYER_ID, userLayerVisibility);

    userMarkersRef.current.forEach(({ element }) => {
      element.style.display = userMarkersVisibility;
    });
    showMarkersRef.current.forEach(({ element }) => {
      element.style.display = showMarkersVisibility;
    });

    if (mapVisibility?.users === false && popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
      selectedSimIdRef.current = null;
    }
  }, [enabled, mapVisibility]);

  async function runBenchmark() {
    if (!enabled) return undefined;
    const map = mapRef.current;
    if (!map || benchmarkRunning) return;

    setBenchmarkRunning(true);
    setBenchmarkResult(null);

    const startAt = Date.now();
    const startSampleIndex = fpsSamplesRef.current.length;
    const steps = [
      { center: [-46.6333, -23.5505], zoom: 3.2, wait: 7000 },
      { center: [-98.5795, 39.8283], zoom: 4.3, wait: 8000 },
      { center: [2.3522, 48.8566], zoom: 5.1, wait: 8000 },
      { center: [77.209, 28.6139], zoom: 5.1, wait: 8000 },
      { center: [139.6917, 35.6895], zoom: 5.6, wait: 8000 },
      { center: [151.2093, -33.8688], zoom: 4.8, wait: 7000 },
      { center: [31.2357, 30.0444], zoom: 4.8, wait: 7000 },
      { center: [-58.3816, -34.6037], zoom: 4.6, wait: 7000 }
    ];

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      map.flyTo({
        center: step.center,
        zoom: step.zoom,
        speed: 0.55,
        curve: 1.5,
        essential: true
      });
      await new Promise((resolve) => setTimeout(resolve, step.wait));
      if (!mapRef.current) return;
    }

    const elapsedSec = Math.round((Date.now() - startAt) / 1000);
    const samples = fpsSamplesRef.current.slice(startSampleIndex).map((s) => s.fps);
    const summary = summarizeFpsSamples(samples);
    const result = {
      durationSec: elapsedSec,
      ...summary
    };

    setBenchmarkResult(result);
    setBenchmarkRunning(false);
    window.__MUUSIC_BENCHMARK_LAST__ = result;
    return result;
  }

  useEffect(() => {
    window.runMuusicBenchmark = runBenchmark;
    return () => {
      window.runMuusicBenchmark = null;
    };
  }, [runBenchmark]);

  function focusFeedItem(item) {
    if (!mapRef.current || !item?.coords) return;
    setSelectedGeo({ city: item.city, country: item.country });
    const zoomTarget = item.city ? 7.8 : 5.8;
    mapRef.current.flyTo({
      center: item.coords,
      zoom: zoomTarget,
      speed: 0.8,
      curve: 1.4,
      essential: true
    });
  }

  return {
    mapContainerRef,
    mapWarning,
    fps,
    benchmarkRunning,
    benchmarkResult,
    runBenchmark,
    selectedGeo,
    setSelectedGeo,
    focusFeedItem
  };
}
