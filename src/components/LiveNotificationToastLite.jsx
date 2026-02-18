import { useCallback, useEffect, useRef, useState } from 'react';

const USERNAMES = [
  'Ana Souza',
  'Lucas Melo',
  'Marina Brito',
  'Guilherme Santos',
  'Lari Campos',
  'Joao Pedro',
  'Camila Rocha',
  'Thiago Ribeiro',
  'Nat Fernandes',
  'Bruno Lima'
];

const CITIES = ['Londrina', 'Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Recife', 'Porto Alegre'];
const TRACKS = ['Eu Quero Tchu, Eu Quero Tcha', 'Convite de Casamento', 'Vida Vazia', 'Amor Impossivel', 'Coracao de Violeiro'];

const COUNTRY_POINTS = {
  Brazil: [-47.9, -15.8],
  'United States': [-98.58, 39.82],
  Canada: [-106.34, 56.13],
  Mexico: [-102.55, 23.63],
  Argentina: [-63.61, -38.42],
  Colombia: [-74.3, 4.57],
  Chile: [-71.54, -35.67],
  Portugal: [-8.22, 39.39],
  Spain: [-3.7, 40.42],
  France: [2.35, 46.22],
  Germany: [10.45, 51.16],
  Italy: [12.57, 41.87]
};

const COUNTRIES = Object.keys(COUNTRY_POINTS);

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomAvatar(seed) {
  return `https://i.pravatar.cc/120?img=${seed}`;
}

function buildRandomProfile(name) {
  const avatarSeed = 10 + Math.floor(Math.random() * 55);
  const city = randomItem(CITIES);
  const recentTracks = [randomItem(TRACKS), randomItem(TRACKS), randomItem(TRACKS)];
  return {
    name,
    avatar: randomAvatar(avatarSeed),
    city,
    recentTracks
  };
}

function createNotification(excludedType = null) {
  const types = ['same-sound', 'countrybeat', 'country-top'];
  const allowedTypes = excludedType ? types.filter((type) => type !== excludedType) : types;
  const type = randomItem(allowedTypes);

  if (type === 'country-top') {
    const country = randomItem(COUNTRIES);
    return {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      variant: 'country',
      country,
      countryCoords: COUNTRY_POINTS[country],
      prefix: 'tem a maior concentracao de ouvintes de',
      highlight: 'Leo e Raphael'
    };
  }

  const username = randomItem(USERNAMES);
  const profile = buildRandomProfile(username);

  if (type === 'countrybeat') {
    return {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      variant: 'fan',
      username,
      profile,
      suffix: 'curte CountryBeat tanto quanto voce!'
    };
  }

  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type,
    variant: 'music',
    username,
    profile,
    suffix: 'esta ouvindo o mesmo som que voce'
  };
}

export default function LiveNotificationToastLite({
  enabled = true,
  paused = false,
  onCountryClick,
  onUserClick
}) {
  const [activeNotification, setActiveNotification] = useState(null);
  const [exiting, setExiting] = useState(false);
  const hideTimerRef = useRef(null);
  const removeTimerRef = useRef(null);
  const prevTypeRef = useRef(null);

  const clearLocalTimers = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (removeTimerRef.current) {
      window.clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(() => {
    clearLocalTimers();
    const next = createNotification(prevTypeRef.current);
    prevTypeRef.current = next.type;

    setExiting(false);
    setActiveNotification(next);

    hideTimerRef.current = window.setTimeout(() => {
      setExiting(true);
    }, 5000);

    removeTimerRef.current = window.setTimeout(() => {
      setActiveNotification(null);
      setExiting(false);
    }, 5400);
  }, [clearLocalTimers]);

  useEffect(() => {
    if (!enabled || paused) {
      clearLocalTimers();
      setActiveNotification(null);
      setExiting(false);
      return undefined;
    }

    showToast();
    const intervalId = window.setInterval(showToast, 7000);

    return () => {
      window.clearInterval(intervalId);
      clearLocalTimers();
    };
  }, [enabled, paused, showToast, clearLocalTimers]);

  if (!activeNotification) return null;

  return (
    <div
      className={`live-notif-toast live-notif-${activeNotification.variant} ${
        exiting ? 'is-exit' : 'is-enter'
      }`}
      role="status"
      aria-live="polite"
    >
      {activeNotification.profile?.avatar ? (
        <img
          src={activeNotification.profile.avatar}
          alt={activeNotification.username || activeNotification.country}
          className="live-notif-avatar"
          width="34"
          height="34"
        />
      ) : (
        <div className="live-notif-avatar live-notif-avatar-fallback" aria-hidden="true">
          ♪
        </div>
      )}

      <p className="live-notif-copy">
        {activeNotification.country ? (
          <>
            <button
              type="button"
              className="live-notif-token"
              onClick={() =>
                onCountryClick?.({
                  country: activeNotification.country,
                  coords: activeNotification.countryCoords
                })
              }
            >
              {activeNotification.country}
            </button>{' '}
            <span>{activeNotification.prefix}</span>{' '}
            <strong>{activeNotification.highlight}</strong>
          </>
        ) : (
          <>
            <button
              type="button"
              className="live-notif-token"
              onClick={() => onUserClick?.(activeNotification.profile)}
            >
              {activeNotification.username}
            </button>{' '}
            <span>{activeNotification.suffix}</span>
          </>
        )}
      </p>
    </div>
  );
}
