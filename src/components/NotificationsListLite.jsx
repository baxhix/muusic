import { useState } from 'react';
import { Bell, Check, ChevronLeft } from 'lucide-react';

function buildNotifications() {
  return [
    {
      id: 'n-1',
      name: 'Ana Souza',
      action: 'curtiu sua publicação',
      context: 'ha 2 min',
      unread: true,
      avatar: 'https://i.pravatar.cc/120?img=15'
    },
    {
      id: 'n-2',
      name: 'Guilherme Santos',
      action: 'comentou: "show demais"',
      context: 'ha 8 min',
      unread: true,
      avatar: 'https://i.pravatar.cc/120?img=33'
    },
    {
      id: 'n-3',
      name: 'Mariana Brito',
      action: 'respondeu seu comentario',
      context: 'ha 16 min',
      unread: false,
      avatar: 'https://i.pravatar.cc/120?img=29'
    },
    {
      id: 'n-4',
      name: 'Lucas Melo',
      action: 'comecou a seguir voce',
      context: 'ha 31 min',
      unread: false,
      avatar: 'https://i.pravatar.cc/120?img=20'
    },
    {
      id: 'n-5',
      name: 'Carol Nunes',
      action: 'marcou voce em um post',
      context: 'ha 1 h',
      unread: false,
      avatar: 'https://i.pravatar.cc/120?img=41'
    },
    {
      id: 'n-6',
      name: 'Rafa Nunes',
      action: 'enviou uma mensagem',
      context: 'ha 2 h',
      unread: false,
      avatar: 'https://i.pravatar.cc/120?img=25'
    }
  ];
}

export default function NotificationsListLite({ open, onToggle }) {
  const [notifications, setNotifications] = useState(() => buildNotifications());

  function markAsReadAndRemove(notificationId) {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  }

  if (!open) return null;

  return (
    <aside className="notif-panel">
      <header className="notif-head">
        <div className="notif-title-wrap">
          <Bell size={14} />
          <h2>Notificacoes</h2>
        </div>
        <button type="button" className="notif-hide" onClick={onToggle} aria-label="Ocultar notificacoes">
          <ChevronLeft size={16} />
        </button>
      </header>

      <div className="notif-items">
        {notifications.map((item) => (
          <article key={item.id} className={item.unread ? 'notif-item unread' : 'notif-item'}>
            <img src={item.avatar} alt={item.name} className="notif-avatar" width="42" height="42" />
            <p className="notif-copy">
              <strong>{item.name}</strong> <span>{item.action}</span>
              <small>{item.context}</small>
            </p>
            <button
              type="button"
              className="notif-check-btn"
              onClick={() => markAsReadAndRemove(item.id)}
              aria-label="Marcar como lida"
              title="Marcar como lida"
            >
              <Check size={13} />
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
