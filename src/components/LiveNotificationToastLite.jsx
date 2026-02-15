import { useEffect, useMemo, useState } from 'react';

const SAMPLE_NOTIFICATIONS = [
  {
    id: 't-1',
    name: 'Ana Souza',
    action: 'curtiu seu post agora',
    avatar: 'https://i.pravatar.cc/120?img=15'
  },
  {
    id: 't-2',
    name: 'Lucas Melo',
    action: 'comentou no seu feed',
    avatar: 'https://i.pravatar.cc/120?img=20'
  },
  {
    id: 't-3',
    name: 'Mariana Brito',
    action: 'mandou uma mensagem',
    avatar: 'https://i.pravatar.cc/120?img=29'
  },
  {
    id: 't-4',
    name: 'Guilherme Santos',
    action: 'respondeu seu comentario',
    avatar: 'https://i.pravatar.cc/120?img=33'
  }
];

function pickNotification() {
  return SAMPLE_NOTIFICATIONS[Math.floor(Math.random() * SAMPLE_NOTIFICATIONS.length)];
}

export default function LiveNotificationToastLite({ enabled = true, paused = false }) {
  const [activeNotification, setActiveNotification] = useState(null);
  const [exiting, setExiting] = useState(false);
  const payload = useMemo(() => activeNotification, [activeNotification]);

  useEffect(() => {
    if (!enabled) {
      setActiveNotification(null);
      setExiting(false);
      return undefined;
    }
    if (paused) {
      setActiveNotification(null);
      setExiting(false);
      return undefined;
    }

    let hideTimer;
    let removeTimer;

    const showToast = () => {
      const picked = pickNotification();
      setExiting(false);
      setActiveNotification({ ...picked, stamp: Date.now() });

      hideTimer = setTimeout(() => {
        setExiting(true);
      }, 4600);

      removeTimer = setTimeout(() => {
        setActiveNotification(null);
        setExiting(false);
      }, 5000);
    };

    showToast();
    const intervalId = setInterval(showToast, 10000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [enabled, paused]);

  if (!payload) return null;

  return (
    <div className={exiting ? 'live-notif-toast is-exit' : 'live-notif-toast is-enter'}>
      <img src={payload.avatar} alt={payload.name} className="live-notif-avatar" width="34" height="34" />
      <p className="live-notif-copy">
        <strong>{payload.name}</strong> <span>{payload.action}</span>
      </p>
    </div>
  );
}
