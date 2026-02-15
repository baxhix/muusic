import { useEffect, useRef, useState } from 'react';
import { FALLBACK_STYLE, MAPBOX_TOKEN } from '../config/appConfig';
import {
  SIM_CLUSTER_LAYER_ID,
  SIM_CLUSTER_PULSE_LAYER_ID,
  SIM_LAYER_ID,
  SIM_SOURCE_ID,
  upsertSimulatedLayer
} from '../lib/mapSimulation';
import { summarizeFpsSamples } from '../lib/perfStats';

export function useMapEngine({ enabled, isMobileDevice, perfProfile, simulatedPoints, users, socketRef }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const markersRef = useRef(new Map());
  const popupRef = useRef(null);
  const selectedSimIdRef = useRef(null);
  const fpsSamplesRef = useRef([]);

  const [mapWarning, setMapWarning] = useState('');
  const [fps, setFps] = useState(0);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [selectedGeo, setSelectedGeo] = useState(null);

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

    const animatePulse = (time) => {
      const map = mapRef.current;
      if (map && map.getLayer(SIM_CLUSTER_PULSE_LAYER_ID)) {
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

    const bootstrapMap = async () => {
      const mapboxModule = await import('mapbox-gl');
      if (disposed) return;

      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN || '';
      mapboxRef.current = mapboxgl;

      map = new mapboxgl.Map({
        container: mapContainerRef.current,
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
        }
      };

      map.on('load', paintSimulated);
      map.on('styledata', paintSimulated);

      if (!isMobileDevice) {
        map.on('mousemove', (event) => {
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
    };

    bootstrapMap().catch(() => {
      if (!disposed) {
        setMapWarning('Falha ao inicializar recursos do mapa.');
      }
    });

    return () => {
      disposed = true;
      if (map && paintSimulated) {
        map.off('load', paintSimulated);
        map.off('styledata', paintSimulated);
      }
      popupRef.current?.remove();
      popupRef.current = null;
      selectedSimIdRef.current = null;
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

    users.forEach((user) => {
      if (!user.location) return;
      const key = user.id;
      const markerLabel = user.spotify?.display_name || user.name;

      if (!markersRef.current.has(key)) {
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = `<span>${markerLabel}</span>`;

        const marker = new mapboxgl.Marker({ element: el }).setLngLat([user.location.lng, user.location.lat]).addTo(mapRef.current);

        markersRef.current.set(key, marker);
      } else {
        markersRef.current.get(key).setLngLat([user.location.lng, user.location.lat]);
      }
    });

    const activeIds = new Set(users.map((user) => user.id));
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [enabled, users]);

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
  });

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
